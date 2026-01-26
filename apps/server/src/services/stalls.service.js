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
        _count: {
          select: {
            favoriteStalls: true,
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

    const { _count, ...stallData } = stall;

    return {
      ...stallData,
      likeCount: _count?.favoriteStalls ?? 0,
      menuItems: menuItems.map((item) => ({
        ...item,
        approvedUploadCount: uploadCountsByMenuItem.get(item.id) || 0,
        maxPrepTimeMins,
        avgPriceCents
      })),
    };
  },

  async addFavoriteStall(userId, stallId) {
    if (!userId || !stallId) {
      throw new Error('userId and stallId are required');
    }

    return await prisma.favoriteStall.upsert({
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
  },

  async removeFavoriteStall(userId, stallId) {
    if (!userId || !stallId) {
      throw new Error('userId and stallId are required');
    }

    await prisma.favoriteStall.deleteMany({
      where: {
        userId,
        stallId,
      },
    });
  },

  async getUserFavoriteStalls(userId) {
    if (!userId) {
      throw new Error('userId is required');
    }

    const favorites = await prisma.favoriteStall.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        stall: {
          select: {
            id: true,
            name: true,
            cuisineType: true,
            location: true,
            image_url: true,
            _count: {
              select: {
                menuItems: true,
                favoriteStalls: true,
              },
            },
          },
        },
      },
    });

    return favorites.map((favorite) => {
      const stall = favorite.stall;
      if (!stall) {
        return {
          id: favorite.id,
          userId: favorite.userId,
          stallId: favorite.stallId,
          createdAt: favorite.createdAt,
          likedAt: favorite.createdAt,
          stall: null,
        };
      }

      const { _count, ...stallData } = stall;
      return {
        id: favorite.id,
        userId: favorite.userId,
        stallId: favorite.stallId,
        createdAt: favorite.createdAt,
        likedAt: favorite.createdAt,
        stall: {
          ...stallData,
          menuItemCount: _count?.menuItems ?? 0,
          likeCount: _count?.favoriteStalls ?? 0,
        },
      };
    });
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
};
