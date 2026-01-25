import prisma from '../lib/prisma.js';

export const stallsService = {
  async getAll() {
    return await prisma.stall.findMany({
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
          },
        },
        _count: {
          select: {
            menuItems: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async getById(id) {
    const stall = await prisma.stall.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
          },
        },
        menuItems: {
          where: { isActive: true },
          include: {
            // 1️⃣ Get TOP upload per menu item
            mediaUploads: {
              where: {
                validationStatus: 'approved',
              },
              orderBy: [
                { upvoteCount: 'desc' },   // main sort: most upvotes
                { voteScore: 'desc' },     // optional tie-breaker
                { createdAt: 'asc' },      // oldest first (or 'desc' for newest)
              ],
              take: 1, // only the top one
            },
            menuItemTagAggs: {
              orderBy: { count: 'desc' },
              take: 12,
              include: {
                tag: {
                  select: {
                    normalized: true,
                    displayLabel: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!stall) {
      return null;
    }

    const prepTimes = stall.menuItems
      .map((item) => item.prepTimeMins)
      .filter((value) => typeof value === 'number');
    const maxPrepTimeMins = prepTimes.length ? Math.max(...prepTimes) : 5;
    const prices = stall.menuItems
      .map((item) => item.priceCents)
      .filter((value) => typeof value === 'number');
    const avgPriceCents = prices.length
      ? Math.round(prices.reduce((sum, value) => sum + value, 0) / prices.length)
      : null;

    const menuItems = stall.menuItems || [];
    if (menuItems.length === 0) {
      return stall;
    }

    const menuItemIds = menuItems.map((item) => item.id);
    const uploadCounts = await prisma.mediaUpload.groupBy({
      by: ['menuItemId'],
      where: {
        menuItemId: { in: menuItemIds },
        validationStatus: 'approved',
      },
      _count: { _all: true },
    });

    const uploadCountsByMenuItem = new Map(
      uploadCounts.map((row) => [row.menuItemId, row._count?._all ?? 0])
    );

    return {
      ...stall,
      menuItems: menuItems.map((item) => ({
        ...item,
        approvedUploadCount: uploadCountsByMenuItem.get(item.id) || 0,
        maxPrepTimeMins,
        avgPriceCents
      })),
    };
  },


  async create(data) {
    return await prisma.stall.create({
      data,
    });
  },

  async update(id, data) {
    return await prisma.stall.update({
      where: { id },
      data,
    });
  },

  async delete(id) {
    return await prisma.stall.delete({
      where: { id },
    });
  },

  async getApprovedMediaByStallId(stallId) {
    if (!stallId) {
      throw new Error('stallId is required');
    }

    const uploads = await prisma.mediaUpload.findMany({
      where: {
        // all media whose menu item belongs to this stall
        menuItem: {
          stallId: stallId, // shorthand `stallId` is also fine
          isActive: true,
        },
        validationStatus: 'approved',
      },
      orderBy: {
        upvoteCount: 'desc', // or createdAt, etc.
      },
      include: {
        menuItem: {
          select: {
            id: true,
            name: true,
            stallId: true,
          },
        },
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
          },
        },
        _count: {
          select: {
            votes: true,
            reports: true,
          },
        },
      },
    });

    return uploads;
  },

  async findByOwnerId(userId) {
    return await prisma.stall.findMany({
      where: { ownerId: userId },
      include: {
        menuItems: true,
        hawkerCentre: true,
      },
    });
  },

  async exists(id) {
    if (!id) return false;
    const stall = await prisma.stall.findUnique({
      where: { id },
      select: { id: true },
    });
    return Boolean(stall);
  },

  async getLikeStatus(stallId, userId) {
    const [count, like] = await prisma.$transaction([
      prisma.stallLike.count({ where: { stallId } }),
      prisma.stallLike.findUnique({
        where: {
          userId_stallId: {
            userId,
            stallId,
          },
        },
        select: { userId: true },
      }),
    ]);

    return { liked: Boolean(like), count };
  },

  async getLikedStalls(userId) {
    const likes = await prisma.stallLike.findMany({
      where: { userId },
      include: {
        stall: {
          select: {
            id: true,
            name: true,
            location: true,
            cuisineType: true,
            image_url: true,
            _count: {
              select: {
                menuItems: true,
                stallLikes: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return likes.map((like) => ({
      likedAt: like.createdAt,
      stall: {
        ...like.stall,
        likeCount: like.stall?._count?.stallLikes ?? 0,
        menuItemCount: like.stall?._count?.menuItems ?? 0,
      },
    }));
  },

  async like(stallId, userId) {
    await prisma.stallLike.upsert({
      where: {
        userId_stallId: {
          userId,
          stallId,
        },
      },
      update: {},
      create: {
        userId,
        stallId,
      },
    });

    const count = await prisma.stallLike.count({ where: { stallId } });
    return { liked: true, count };
  },

  async unlike(stallId, userId) {
    await prisma.stallLike.deleteMany({
      where: {
        userId,
        stallId,
      },
    });

    const count = await prisma.stallLike.count({ where: { stallId } });
    return { liked: false, count };
  },
};
