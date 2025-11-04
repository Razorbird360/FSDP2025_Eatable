import prisma from '../lib/prisma.js';

export const menuService = {
  async getByStallId(stallId) {
    return await prisma.menuItem.findMany({
      where: { stallId },
      include: {
        stall: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  async getById(id) {
    return await prisma.menuItem.findUnique({
      where: { id },
      include: {
        stall: true,
        mediaUploads: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
              },
            },
            _count: {
              select: {
                votes: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  },

  async create(data) {
    return await prisma.menuItem.create({
      data,
    });
  },

  async update(id, data) {
    return await prisma.menuItem.update({
      where: { id },
      data,
    });
  },

  async delete(id) {
    return await prisma.menuItem.delete({
      where: { id },
    });
  },
};
