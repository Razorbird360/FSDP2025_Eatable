import prisma from '../lib/prisma.js';

const HIGH_SIGNAL_EVENT_TYPES = new Set(['click', 'add_to_cart', 'order']);
const EVENT_WEIGHTS = {
  click: 1,
  add_to_cart: 2,
  order: 3,
};
const STAT_FIELDS_BY_TYPE = {
  view: 'views',
  click: 'clicks',
  add_to_cart: 'adds',
  order: 'orders',
};
const MAX_RECENT_ITEMS = 20;

const toDateOnly = (date) => {
  const day = date.toISOString().slice(0, 10);
  return new Date(`${day}T00:00:00.000Z`);
};

const computeCtr = (views, clicks) => (views > 0 ? clicks / views : 0);
const computeConversion = (clicks, orders) => (clicks > 0 ? orders / clicks : 0);

const normalizeEvent = (event) => ({
  userId: event.userId ?? null,
  anonId: event.anonId ?? null,
  sessionId: event.sessionId,
  eventType: event.eventType,
  itemId: event.itemId,
  categoryId: event.categoryId || null,
  timestamp:
    event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp),
  metadata: event.metadata ?? {},
});

const getCategoryId = (event) => {
  if (event.categoryId) return event.categoryId;
  const metadata = event.metadata;
  if (!metadata || typeof metadata !== 'object') return null;
  return metadata.categoryId || metadata.category_id || null;
};

const getTags = (event) => {
  const metadata = event.metadata;
  if (!metadata || typeof metadata !== 'object') return [];
  const tags = metadata.tags;
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
    .filter(Boolean);
};

const getPriceCents = (event) => {
  const metadata = event.metadata;
  if (!metadata || typeof metadata !== 'object') return null;
  const raw =
    metadata.priceCents ?? metadata.price_cents ?? metadata.price ?? null;
  if (raw === null || raw === undefined) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.round(value) : null;
};

const mergeScores = (base, increments) => {
  const baseScores =
    base && typeof base === 'object' && !Array.isArray(base) ? base : {};
  const result = { ...baseScores };
  Object.entries(increments).forEach(([key, value]) => {
    const current = Number(result[key]) || 0;
    result[key] = current + value;
  });
  return result;
};

const mergeRecentItems = (existing, incoming, maxItems) => {
  const result = [];
  const seen = new Set();
  for (let i = incoming.length - 1; i >= 0; i -= 1) {
    const itemId = incoming[i];
    if (!itemId || seen.has(itemId)) continue;
    result.push(itemId);
    seen.add(itemId);
  }
  for (let i = 0; i < existing.length && result.length < maxItems; i += 1) {
    const itemId = existing[i];
    if (!itemId || seen.has(itemId)) continue;
    result.push(itemId);
    seen.add(itemId);
  }
  return result.slice(0, maxItems);
};

const resolveMin = (current, incoming) => {
  if (incoming === null || incoming === undefined) return current ?? null;
  if (current === null || current === undefined) return incoming;
  return Math.min(current, incoming);
};

const resolveMax = (current, incoming) => {
  if (incoming === null || incoming === undefined) return current ?? null;
  if (current === null || current === undefined) return incoming;
  return Math.max(current, incoming);
};

const buildItemStatsUpdates = (events) => {
  const statsMap = new Map();
  events.forEach((event) => {
    const statField = STAT_FIELDS_BY_TYPE[event.eventType];
    if (!statField) return;
    const date = toDateOnly(event.timestamp);
    const key = `${date.toISOString()}|${event.itemId}`;
    if (!statsMap.has(key)) {
      statsMap.set(key, {
        date,
        itemId: event.itemId,
        views: 0,
        clicks: 0,
        adds: 0,
        orders: 0,
      });
    }
    const entry = statsMap.get(key);
    entry[statField] += 1;
  });
  return Array.from(statsMap.values());
};

const buildProfileUpdates = (events) => {
  const profileMap = new Map();
  events.forEach((event) => {
    if (!HIGH_SIGNAL_EVENT_TYPES.has(event.eventType)) return;
    const key = event.userId ? `user:${event.userId}` : `anon:${event.anonId}`;
    if (!profileMap.has(key)) {
      profileMap.set(key, {
        userId: event.userId ?? null,
        anonId: event.anonId ?? null,
        categoryScores: {},
        tagScores: {},
        recentItems: [],
        priceMin: null,
        priceMax: null,
      });
    }
    const update = profileMap.get(key);
    const weight = EVENT_WEIGHTS[event.eventType] || 1;
    const categoryId = getCategoryId(event);
    if (categoryId) {
      update.categoryScores[categoryId] =
        (update.categoryScores[categoryId] || 0) + weight;
    }
    const tags = getTags(event);
    tags.forEach((tag) => {
      update.tagScores[tag] = (update.tagScores[tag] || 0) + weight;
    });
    update.recentItems.push(event.itemId);
    const priceCents = getPriceCents(event);
    if (priceCents !== null) {
      update.priceMin =
        update.priceMin === null ? priceCents : Math.min(update.priceMin, priceCents);
      update.priceMax =
        update.priceMax === null ? priceCents : Math.max(update.priceMax, priceCents);
    }
  });
  return Array.from(profileMap.values());
};

const applyItemStatsUpdates = async (tx, events) => {
  const updates = buildItemStatsUpdates(events);
  for (const entry of updates) {
    const updated = await tx.itemStatsDaily.upsert({
      where: {
        date_itemId: {
          date: entry.date,
          itemId: entry.itemId,
        },
      },
      update: {
        views: { increment: entry.views },
        clicks: { increment: entry.clicks },
        adds: { increment: entry.adds },
        orders: { increment: entry.orders },
      },
      create: {
        date: entry.date,
        itemId: entry.itemId,
        views: entry.views,
        clicks: entry.clicks,
        adds: entry.adds,
        orders: entry.orders,
        ctr: computeCtr(entry.views, entry.clicks),
        conversion: computeConversion(entry.clicks, entry.orders),
      },
      select: {
        date: true,
        itemId: true,
        views: true,
        clicks: true,
        orders: true,
      },
    });
    const ctr = computeCtr(updated.views, updated.clicks);
    const conversion = computeConversion(updated.clicks, updated.orders);
    await tx.itemStatsDaily.update({
      where: {
        date_itemId: {
          date: updated.date,
          itemId: updated.itemId,
        },
      },
      data: {
        ctr,
        conversion,
      },
    });
  }
};

const applyProfileUpdates = async (tx, events) => {
  const updates = buildProfileUpdates(events);
  for (const update of updates) {
    const where = update.userId
      ? { userId: update.userId }
      : { anonId: update.anonId };
    const existing = await tx.userProfile.findUnique({ where });
    const categoryScores = mergeScores(
      existing?.categoryScores,
      update.categoryScores
    );
    const tagScores = mergeScores(existing?.tagScores, update.tagScores);
    const recentItems = mergeRecentItems(
      existing?.recentItems ?? [],
      update.recentItems,
      MAX_RECENT_ITEMS
    );
    const pricePrefMin = resolveMin(existing?.pricePrefMin, update.priceMin);
    const pricePrefMax = resolveMax(existing?.pricePrefMax, update.priceMax);
    if (existing) {
      await tx.userProfile.update({
        where,
        data: {
          categoryScores,
          tagScores,
          recentItems,
          pricePrefMin,
          pricePrefMax,
        },
      });
    } else {
      await tx.userProfile.create({
        data: {
          userId: update.userId ?? undefined,
          anonId: update.anonId ?? undefined,
          categoryScores,
          tagScores,
          recentItems,
          pricePrefMin,
          pricePrefMax,
        },
      });
    }
  }
};

export const eventsService = {
  async ingestEvents(events) {
    if (!events || events.length === 0) {
      return { inserted: 0 };
    }

    const normalizedEvents = events.map(normalizeEvent);

    return prisma.$transaction(async (tx) => {
      const result = await tx.event.createMany({
        data: normalizedEvents,
      });
      await applyItemStatsUpdates(tx, normalizedEvents);
      await applyProfileUpdates(tx, normalizedEvents);
      return { inserted: result.count };
    });
  },
};
