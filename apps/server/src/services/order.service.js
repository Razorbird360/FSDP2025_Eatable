import prisma from '../lib/prisma.js';
import { cartService } from './cart.service.js';


export const orderService = {
    async getServiceFees(req, res, next) {
        const config = await prisma.system_configuration.findUnique({
            where: { id: 1 },
        });
        const serviceFeesCents = config ? config.servicefeecents : 0;
        return res.status(200).json({ serviceFeesCents });
    },

    async getOrderById(orderId) {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: true,
                stall: true,
                discounts_charges: true,
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
    },

    async createOrderFromCart(userId) {
        // 1) Fetch the user's cart
        const cart = await cartService.getCartByUserId(userId);

        if (!cart || cart.length === 0) {
            const error = new Error("Cart is empty");
            error.status = 400;
            throw error;
        }

        // 2) Stall ID from first cart item
        const firstItem = cart[0];
        const stallId =
            firstItem.menu_items.stallId ||
            firstItem.menu_items.stall?.id;

        if (!stallId) {
            const error = new Error("Could not determine stallId from cart");
            error.status = 500;
            throw error;
        }


        // 3) Calculate total in cents
        const totalCents = cart.reduce((sum, item) => {
            const menuItem = item.menu_items;

            const priceCents =
                menuItem.priceCents ??
                menuItem.price_cents ??
                menuItem.price ??
                0;

            const qty = item.quantity ?? item.qty ?? 1;

            return sum + priceCents * qty;
        }, 0);


        if (!Number.isFinite(totalCents)) {
            throw new Error("totalCents is NaN – fix cart mapping.");
        }

        const SERVICE_FEES_QUERY = await prisma.system_configuration.findUnique({
            where: { id: 1 },
        });
        const SERVICE_FEES_CENTS = SERVICE_FEES_QUERY ? SERVICE_FEES_QUERY.servicefeecents : 0;

        console.log('Service fees cents:', SERVICE_FEES_CENTS);

        // 4) Run everything in a single transaction
        const order = await prisma.$transaction(async (tx) => {
            // 4a) Create the order
            const order = await tx.order.create({
                data: {
                    userId,
                    stallId,
                    totalCents: totalCents + SERVICE_FEES_CENTS,
                    status: "pending",
                    netsTxnId: process.env.TEST_TXN_ID || null,
                },
            });

            if (SERVICE_FEES_CENTS > 0) {
                await tx.discounts_charges.create({
                    data: {
                        orderId: order.id,
                        amountCents: SERVICE_FEES_CENTS,
                        type: "fee",
                    },
                });
            }

            // 4b) Create order items for each cart row
            await Promise.all(
                cart.map((cartRow) => {
                    const menuItem = cartRow.menu_items;
                    const qty = cartRow.quantity ?? cartRow.qty ?? 1;
                    const unitCents = cartRow.menu_items.priceCents * qty;
                    return tx.orderItem.create({
                        data: {
                            order: { connect: { id: order.id } },           // sets orderId
                            menuItem: { connect: { id: menuItem.id } },     // sets menuItemId
                            quantity: qty,
                            unitCents,
                            request: cartRow.request                                // per-unit cents
                        },
                    });
                })
            );

            // 4c) Clear user's cart
            await tx.user_cart.deleteMany({
                where: { userid: userId },
            });

            // Whatever you return here is what $transaction resolves to
            return order;
        });

        // 5) Return the created order to the caller
        return order;
    },

    async getOrderItems(orderId) {
        const stall = await prisma.order.findUnique({
            where: { id: orderId },
            select: { stall: true }
        });
        const items = await prisma.orderItem.findMany({
            where: { orderId },
            include: {
                menuItem: {
                    include: {
                        mediaUploads: true,
                    },
                }
            },
        });
        const info = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                discounts_charges: true,
            },
        });


        const result = [stall, items, info];
        return result;
    },

    async getByUserId(userId) {
        return prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                stall: {
                    select: { id: true, name: true, image_url: true },
                },
                orderItems: {
                    include: {
                        menuItem: {
                            include: {
                                mediaUploads: {
                                    orderBy: {
                                        upvoteCount: 'desc',
                                    },
                                    take: 1,
                                }
                            },
                        },
                    },
                },
            },
        });
    },

};