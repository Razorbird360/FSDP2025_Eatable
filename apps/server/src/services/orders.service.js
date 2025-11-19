import prisma from '../lib/prisma.js';

export const ordersService = {
  async getByUserId(userId) {
    return prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        stall: {
          select: { id: true, name: true },
        },
        orderItems: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                priceCents: true,
              },
            },
          },
        },
      },
    });
  },
};
