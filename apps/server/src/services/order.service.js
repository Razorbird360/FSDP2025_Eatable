import prisma from '../lib/prisma.js';

export const orderService = {
    async getOrderById(orderId) {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: true,
                stall: true,
            },
        });
        return order;
    },

    async orderPaymentSuccess(orderId) {
        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { status: 'PAID' },
        });
        return updatedOrder;
    }
};