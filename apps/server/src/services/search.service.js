import prisma from '../lib/prisma.js';

const DEFAULT_LIMIT = 5;
const CANDIDATE_MULTIPLIER = 5;
const STOP_WORDS = new Set(['stall', 'stalls', 'the', 'a', 'an']);

function getMatchTier(name, query) {
  const normalizedName = name.toLowerCase();
  if (normalizedName === query) return 0;
  if (normalizedName.startsWith(query)) return 1;
  return 2;
}

function sortByRelevance(items, query) {
  const normalizedQuery = query.toLowerCase();
  return items.sort((a, b) => {
    const tierA = getMatchTier(a.name, normalizedQuery);
    const tierB = getMatchTier(b.name, normalizedQuery);
    if (tierA !== tierB) return tierA - tierB;
    return a.name.localeCompare(b.name);
  });
}

const buildTokens = (query) => {
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length >= 3)
    .filter((token) => !STOP_WORDS.has(token));

  return Array.from(new Set(tokens));
};

const buildNameFilter = ({ query, tokens }) => {
  if (tokens && tokens.length > 0) {
    return {
      OR: tokens.map((token) => ({
        name: { contains: token, mode: 'insensitive' },
      })),
    };
  }
  return { name: { contains: query, mode: 'insensitive' } };
};

const runSearch = async ({ query, tokens, limit }) => {
  const take = limit * CANDIDATE_MULTIPLIER;
  const nameFilter = buildNameFilter({ query, tokens });
  const [hawkerCentres, stalls, dishes] = await Promise.all([
    prisma.hawkerCentre.findMany({
      where: nameFilter,
      select: {
        id: true,
        name: true,
        imageUrl: true,
        address: true,
      },
      take,
    }),
    prisma.stall.findMany({
      where: nameFilter,
      select: {
        id: true,
        name: true,
        image_url: true,
        hawkerCentre: {
          select: { name: true },
        },
      },
      take,
    }),
    prisma.menuItem.findMany({
      where: {
        isActive: true,
        ...nameFilter,
      },
      select: {
        id: true,
        stallId: true,
        name: true,
        imageUrl: true,
        priceCents: true,
        stall: {
          select: { name: true },
        },
        mediaUploads: {
          where: { validationStatus: 'approved' },
          orderBy: { upvoteCount: 'desc' },
          take: 1,
          select: { imageUrl: true },
        },
      },
      take,
    }),
  ]);

  return { hawkerCentres, stalls, dishes };
};

async function search(query, limit = DEFAULT_LIMIT) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { hawkerCentres: [], stalls: [], dishes: [] };
  }

  let { hawkerCentres, stalls, dishes } = await runSearch({
    query: trimmedQuery,
    tokens: [],
    limit,
  });

  if (
    hawkerCentres.length === 0 &&
    stalls.length === 0 &&
    dishes.length === 0
  ) {
    const tokens = buildTokens(trimmedQuery);
    if (tokens.length > 0) {
      ({ hawkerCentres, stalls, dishes } = await runSearch({
        query: trimmedQuery,
        tokens,
        limit,
      }));
    }
  }

  const hawkerCentreResults = sortByRelevance(
    hawkerCentres.map((centre) => ({
      id: centre.id,
      name: centre.name,
      imageUrl: centre.imageUrl ?? null,
      subtitle: centre.address ?? null,
      entityType: 'hawkerCentre',
    })),
    trimmedQuery
  ).slice(0, limit);

  const stallResults = sortByRelevance(
    stalls.map((stall) => ({
      id: stall.id,
      name: stall.name,
      imageUrl: stall.image_url ?? null,
      subtitle: stall.hawkerCentre?.name ?? null,
      entityType: 'stall',
    })),
    trimmedQuery
  ).slice(0, limit);

  const dishResults = sortByRelevance(
    dishes.map((dish) => ({
      id: dish.id,
      name: dish.name,
      imageUrl: dish.mediaUploads?.[0]?.imageUrl ?? dish.imageUrl ?? null,
      stallId: dish.stallId,
      subtitle: dish.stall?.name
        ? `${dish.stall.name} • $${(dish.priceCents / 100).toFixed(2)}`
        : `$${(dish.priceCents / 100).toFixed(2)}`,
      entityType: 'dish',
    })),
    trimmedQuery
  ).slice(0, limit);

  return {
    hawkerCentres: hawkerCentreResults,
    stalls: stallResults,
    dishes: dishResults,
  };
}

export default {
  search,
};
