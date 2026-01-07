import prisma from '../lib/prisma.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const buildDateRanges = () => {
  const now = new Date();
  const currentFrom = new Date(now.getTime() - 30 * DAY_MS);
  const currentTo = now;
  const previousFrom = new Date(currentFrom.getTime() - 30 * DAY_MS);
  const previousTo = currentFrom;

  return {
    current: { from: currentFrom, to: currentTo },
    previous: { from: previousFrom, to: previousTo },
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

const mapOrdersByDayRows = (rows) =>
  rows.map((row) => {
    const rawDay = row.day instanceof Date ? row.day.toISOString() : row.day;
    const day = typeof rawDay === 'string' ? rawDay.split('T')[0] : rawDay;

    return {
      date: day,
      count: Number(row.count) || 0,
    };
  });

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

  async getSummary(stallId) {
    const { current, previous } = buildDateRanges();

    const [
      ordersCount,
      previousOrdersCount,
      photosCount,
      previousPhotosCount,
      upvotesCount,
      previousUpvotesCount,
      ordersByDishGrouped,
      ordersByDayRows,
    ] = await Promise.all([
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
      prisma.$queryRaw`
        SELECT
          date_trunc('day', timezone('Asia/Singapore', created_at))::date AS day,
          COUNT(*)::int AS count
        FROM "orders"
        WHERE stall_id = ${stallId}::uuid
          AND status = 'PAID'
          AND created_at >= ${current.from}
          AND created_at < ${current.to}
        GROUP BY day
        ORDER BY day ASC;
      `,
    ]);

    const ordersByDish = await mapOrdersByDish(ordersByDishGrouped);
    const ordersByDay = mapOrdersByDayRows(ordersByDayRows);

    return {
      period: {
        from: current.from.toISOString(),
        to: current.to.toISOString(),
      },
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
};
