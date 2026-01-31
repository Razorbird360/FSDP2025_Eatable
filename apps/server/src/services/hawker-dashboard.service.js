import prisma from '../lib/prisma.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MENU_ITEM_UPDATE_FIELDS = ['name', 'description', 'category', 'priceCents', 'prepTimeMins', 'imageUrl'];

const buildMenuItemUpdateData = (payload = {}) => {
  const data = {};

  for (const field of MENU_ITEM_UPDATE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) {
      continue;
    }

    const value = payload[field];

    if (field === 'name') {
      const trimmed = typeof value === 'string' ? value.trim() : value;
      if (!trimmed) {
        throw new Error('Dish name is required');
      }
      data.name = trimmed;
      continue;
    }

    if (field === 'priceCents' || field === 'prepTimeMins') {
      if (value === null && field === 'prepTimeMins') {
        data.prepTimeMins = null;
        continue;
      }

      const numeric = typeof value === 'string' && value.trim() === '' ? NaN : Number(value);
      if (!Number.isFinite(numeric) || numeric < 0) {
        throw new Error(`${field} must be a non-negative number`);
      }
      data[field] = Math.round(numeric);
      continue;
    }

    if (field === 'imageUrl') {
      data.imageUrl = value || null;
      continue;
    }

    if (field === 'category') {
      data.category = (typeof value === 'string' ? value.trim() : value) || null;
      continue;
    }

    data[field] = value;
  }

  if (Object.keys(data).length === 0) {
    throw new Error('No valid fields provided for update');
  }

  return data;
};

const menuItemResponseSelect = {
  id: true,
  name: true,
  description: true,
  priceCents: true,
  category: true,
  prepTimeMins: true,
  imageUrl: true,
  isActive: true,
};

const getChartGranularity = (timePeriod) => {
  // Day-level for shorter periods
  if (timePeriod === 'yesterday' || timePeriod === 'lastWeek') {
    return 'day';
  }
  // Week-level for longer periods
  return 'week';
};

const buildDateRanges = (timePeriod = 'lastMonth') => {
  const now = new Date();

  // Define period lengths in days
  const periodDays = {
    yesterday: 1,
    lastWeek: 7,
    lastMonth: 30,
    threeMonths: 90,
  };

  const days = periodDays[timePeriod] || 30;

  const currentFrom = new Date(now.getTime() - days * DAY_MS);
  const currentTo = now;
  const previousFrom = new Date(currentFrom.getTime() - days * DAY_MS);
  const previousTo = currentFrom;

  return {
    current: { from: currentFrom, to: currentTo },
    previous: { from: previousFrom, to: previousTo },
    timePeriod,
    days,
  };
};

const sumCounts = (items) => items.reduce((total, item) => total + item.count, 0);

const mapOrdersByDish = async (grouped) => {
  if (grouped.length === 0) {
    return [];
  }

  const menuItemIds = grouped.map((row) => row.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    select: { id: true, name: true },
  });

  const namesById = new Map(menuItems.map((item) => [item.id, item.name]));

  return grouped
    .map((row) => ({
      menuItemId: row.menuItemId,
      name: namesById.get(row.menuItemId) ?? 'Unknown',
      count: row._sum.quantity ?? 0,
    }))
    .sort((a, b) => b.count - a.count);
};

const normalizeDateKey = (value) => {
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  if (typeof value === 'string') {
    return value.split('T')[0];
  }

  return value;
};

const mapOrdersByDayRows = (rows) =>
  rows.map((row) => ({
    date: normalizeDateKey(row.day),
    count: Number(row.count) || 0,
  }));

const mapOrdersByWeekRows = (rows) =>
  rows.map((row) => ({
    weekStart: normalizeDateKey(row.week_start),
    count: Number(row.count) || 0,
  }));

const buildOrderSummary = (orderItems) => {
  if (!orderItems || orderItems.length === 0) {
    return 'Ordered items';
  }

  const [firstItem, ...rest] = orderItems;
  const qty = firstItem.quantity ?? 1;
  const name = firstItem.menuItem?.name ?? 'item';
  const extraCount = rest.length;

  if (extraCount > 0) {
    return `Ordered ${qty}x ${name} +${extraCount} more`;
  }

  return `Ordered ${qty}x ${name}`;
};

export const hawkerDashboardService = {
  buildDateRanges,

  async getSummary(stallId, timePeriod = 'lastMonth') {
    const { current, previous, days } = buildDateRanges(timePeriod);
    const granularity = getChartGranularity(timePeriod);

    const promises = [
      prisma.order.count({
        where: {
          stallId,
          status: 'PAID',
          createdAt: { gte: current.from, lt: current.to },
        },
      }),
      prisma.order.count({
        where: {
          stallId,
          status: 'PAID',
          createdAt: { gte: previous.from, lt: previous.to },
        },
      }),
      prisma.mediaUpload.count({
        where: {
          validationStatus: 'approved',
          createdAt: { gte: current.from, lt: current.to },
          menuItem: { stallId },
        },
      }),
      prisma.mediaUpload.count({
        where: {
          validationStatus: 'approved',
          createdAt: { gte: previous.from, lt: previous.to },
          menuItem: { stallId },
        },
      }),
      prisma.mediaUploadVote.count({
        where: {
          vote: 1,
          createdAt: { gte: current.from, lt: current.to },
          upload: { menuItem: { stallId } },
        },
      }),
      prisma.mediaUploadVote.count({
        where: {
          vote: 1,
          createdAt: { gte: previous.from, lt: previous.to },
          upload: { menuItem: { stallId } },
        },
      }),
      prisma.orderItem.groupBy({
        by: ['menuItemId'],
        where: {
          order: {
            stallId,
            status: 'PAID',
            createdAt: { gte: current.from, lt: current.to },
          },
        },
        _sum: { quantity: true },
      }),
    ];

    // Always fetch daily data for drill-down support
    const numDays = days;
    promises.push(
      prisma.$queryRaw`
        WITH params AS (
          SELECT ${current.from}::date AS start_date, ${current.to}::date AS end_date
        ),
        series AS (
          SELECT (start_date + (gs * interval '1 day'))::date AS day
          FROM params, generate_series(0, ${numDays - 1}) AS gs
        ),
        orders AS (
          SELECT
            date_trunc('day', timezone('Asia/Singapore', created_at))::date AS day,
            COUNT(*)::int AS count
          FROM "orders", params
          WHERE stall_id = ${stallId}::uuid
            AND status = 'PAID'
            AND timezone('Asia/Singapore', created_at)::date >= start_date
            AND timezone('Asia/Singapore', created_at)::date < end_date
          GROUP BY day
        )
        SELECT
          series.day,
          COALESCE(orders.count, 0) AS count
        FROM series
        LEFT JOIN orders USING (day)
        ORDER BY series.day ASC;
      `
    );

    // Fetch weekly data only for week-level granularity
    if (granularity === 'week') {
      const weekCount = Math.ceil(days / 7);
      promises.push(
        prisma.$queryRaw`
          WITH params AS (
            SELECT ${current.from}::date AS start_date, ${current.to}::date AS end_date
          ),
          series AS (
            SELECT (date_trunc('week', start_date::timestamp)::date + (gs * interval '1 week'))::date AS week_start
            FROM params, generate_series(0, ${weekCount - 1}) AS gs
          ),
          orders AS (
            SELECT
              date_trunc('week', timezone('Asia/Singapore', created_at))::date AS week_start,
              COUNT(*)::int AS count
            FROM "orders", params
            WHERE stall_id = ${stallId}::uuid
              AND status = 'PAID'
              AND timezone('Asia/Singapore', created_at)::date >= start_date
              AND timezone('Asia/Singapore', created_at)::date < end_date
            GROUP BY week_start
          )
          SELECT
            series.week_start,
            COALESCE(orders.count, 0) AS count
          FROM series
          LEFT JOIN orders USING (week_start)
          ORDER BY series.week_start ASC;
        `
      );
    } else {
      promises.push([]); // Empty array for week data when not needed
    }

    const [
      ordersCount,
      previousOrdersCount,
      photosCount,
      previousPhotosCount,
      upvotesCount,
      previousUpvotesCount,
      ordersByDishGrouped,
      ordersByDayRows,
      ordersByWeekRows,
    ] = await Promise.all(promises);

    const ordersByDish = await mapOrdersByDish(ordersByDishGrouped);
    const ordersByDay = mapOrdersByDayRows(ordersByDayRows);
    const ordersByWeek = granularity === 'week' ? mapOrdersByWeekRows(ordersByWeekRows) : [];

    return {
      period: {
        from: current.from.toISOString(),
        to: current.to.toISOString(),
        timePeriod,
      },
      granularity,
      totals: {
        orders: ordersCount,
        photos: photosCount,
        upvotes: upvotesCount,
        delta: {
          orders: ordersCount - previousOrdersCount,
          photos: photosCount - previousPhotosCount,
          upvotes: upvotesCount - previousUpvotesCount,
        },
      },
      ordersByDish,
      totalOrdersByDish: sumCounts(ordersByDish),
      ordersByWeek,
      ordersByDay,
      totalOrdersByDay: sumCounts(ordersByDay),
    };
  },

  async getActivity(stallId, { limit = 10 } = {}) {
    const { current } = buildDateRanges();
    const take = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const [orders, upvotes, uploads] = await Promise.all([
      prisma.order.findMany({
        where: {
          stallId,
          status: 'PAID',
          createdAt: { gte: current.from, lt: current.to },
        },
        orderBy: { createdAt: 'desc' },
        take,
        include: {
          user: { select: { id: true, displayName: true } },
          orderItems: {
            include: {
              menuItem: { select: { name: true } },
            },
          },
        },
      }),
      prisma.mediaUploadVote.findMany({
        where: {
          vote: 1,
          createdAt: { gte: current.from, lt: current.to },
          upload: { menuItem: { stallId } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        include: {
          user: { select: { id: true, displayName: true } },
          upload: {
            select: {
              id: true,
              menuItem: { select: { name: true } },
            },
          },
        },
      }),
      prisma.mediaUpload.findMany({
        where: {
          validationStatus: 'approved',
          createdAt: { gte: current.from, lt: current.to },
          menuItem: { stallId },
        },
        orderBy: { createdAt: 'desc' },
        take,
        include: {
          user: { select: { id: true, displayName: true } },
          menuItem: { select: { name: true } },
        },
      }),
    ]);

    const orderEvents = orders.map((order) => ({
      type: 'order',
      createdAt: order.createdAt,
      user: {
        id: order.user?.id ?? null,
        displayName: order.user?.displayName ?? 'Customer',
      },
      data: {
        orderId: order.id,
        orderCode: order.orderCode ?? null,
        summary: buildOrderSummary(order.orderItems),
      },
    }));

    const upvoteEvents = upvotes.map((vote) => ({
      type: 'upvote',
      createdAt: vote.createdAt,
      user: {
        id: vote.user?.id ?? null,
        displayName: vote.user?.displayName ?? 'Customer',
      },
      data: {
        uploadId: vote.upload?.id ?? null,
        menuItem: vote.upload?.menuItem?.name ?? 'menu item',
      },
    }));

    const uploadEvents = uploads.map((upload) => ({
      type: 'photo_upload',
      createdAt: upload.createdAt,
      user: {
        id: upload.user?.id ?? null,
        displayName: upload.user?.displayName ?? 'Customer',
      },
      data: {
        uploadId: upload.id,
        menuItem: upload.menuItem?.name ?? 'menu item',
        imageUrl: upload.imageUrl ?? null,
      },
    }));

    const items = [...orderEvents, ...upvoteEvents, ...uploadEvents]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, take);

    return {
      items,
      nextCursor: null,
    };
  },

  async getMenuItems(stallId, { sortBy = 'name', sortDir = 'asc' } = {}) {
    const validSortFields = {
      name: 'name',
      price: 'priceCents',
      category: 'category',
      prepTime: 'prepTimeMins',
    };

    const orderByField = validSortFields[sortBy] || 'name';
    const orderByDir = sortDir === 'desc' ? 'desc' : 'asc';

    const menuItems = await prisma.menuItem.findMany({
      where: {
        stallId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        priceCents: true,
        category: true,
        prepTimeMins: true,
        imageUrl: true,
        mediaUploads: {
          where: { validationStatus: 'approved' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { imageUrl: true },
        },
      },
      orderBy: {
        [orderByField]: orderByDir,
      },
    });

    return menuItems.map(({ mediaUploads, ...item }) => ({
      ...item,
      imageUrl: item.imageUrl || mediaUploads?.[0]?.imageUrl || null,
    }));
  },

  async getMenuItemOwner(menuItemId) {
    return await prisma.menuItem.findUnique({
      where: { id: menuItemId },
      select: { id: true, stallId: true, isActive: true },
    });
  },

  async updateMenuItem(menuItemId, payload) {
    const data = buildMenuItemUpdateData(payload);
    return await prisma.menuItem.update({
      where: { id: menuItemId },
      data,
      select: menuItemResponseSelect,
    });
  },

  async createMenuItem(stallId, payload) {
    const data = buildMenuItemUpdateData(payload);

    // Add required fields for creation
    data.stallId = stallId;
    data.isActive = true;

    return await prisma.menuItem.create({
      data,
      select: menuItemResponseSelect,
    });
  },

  async setMenuItemActive(menuItemId, isActive) {
    return await prisma.menuItem.update({
      where: { id: menuItemId },
      data: { isActive },
      select: menuItemResponseSelect,
    });
  },

  async deleteMenuItem(menuItemId) {
    return await prisma.menuItem.delete({
      where: { id: menuItemId },
      select: { id: true },
    });
  },
};
