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
    return await prisma.stall.findUnique({
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
        },
      },
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
      validationStatus: 'approved',
      // only media whose menu item belongs to this stall
      menuItem: {
        stallId,
      },
    },
    orderBy: {
      voteScore: 'desc', // you can change this (createdAt, upvoteCount, etc.)
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
      // Optional: counts of votes/reports if you want them
      _count: {
        select: {
          votes: true,
          reports: true,
        },
      },
    },
  });
  return uploads;

}

};
