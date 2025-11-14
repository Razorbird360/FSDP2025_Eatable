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

  async getGallery(stallId) {
    return await prisma.mediaUpload.findMany({
      where: { stallId: stallId },
      orderBy: {
        uploadCount: 'desc',
      },
    });
  }
};
