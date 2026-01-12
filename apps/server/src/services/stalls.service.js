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

    return { ...stall, maxPrepTimeMins, avgPriceCents };
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
