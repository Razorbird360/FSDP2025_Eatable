import { randomInt } from 'crypto';
import prisma from '../lib/prisma.js';
import { cartService } from './cart.service.js';

const ORDER_CODE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ORDER_CODE_LENGTH = 4;
const ORDER_CODE_MAX_RETRIES = 10;

const generateOrderCode = () => {
    let code = '';
    for (let i = 0; i < ORDER_CODE_LENGTH; i += 1) {
        code += ORDER_CODE_CHARS[randomInt(ORDER_CODE_CHARS.length)];
    }
    return code;
};

const isOrderCodeUniqueError = (error) => {
    return error?.code === 'P2002';
};

const createOrderWithCode = async (tx, data) => {
    for (let attempt = 0; attempt < ORDER_CODE_MAX_RETRIES; attempt += 1) {
        const orderCode = generateOrderCode();
        try {
            return await tx.order.create({
                data: {
                    ...data,
                    orderCode,
                },
            });
        } catch (error) {
            if (isOrderCodeUniqueError(error)) {
                continue;
            }
            throw error;
        }
    }

    throw new Error('Failed to generate unique order code');
};

const getEffectiveVoucherExpiry = (userVoucher) => {
    if (!userVoucher) return null;
    if (userVoucher.expiryDate) return userVoucher.expiryDate;

    const voucher = userVoucher.voucher;
    if (voucher?.expiryDate) return voucher.expiryDate;

    if (voucher?.expiryOnReceiveMonths && userVoucher.createdAt) {
        const expiry = new Date(userVoucher.createdAt);
        expiry.setMonth(expiry.getMonth() + voucher.expiryOnReceiveMonths);
        return expiry;
    }

    return null;
};

const isVoucherExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
};


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
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });

      const voucherDiscounts = await tx.discounts_charges.findMany({
        where: {
          orderId,
          type: 'voucher',
          userVoucherId: { not: null },
        },
        select: { userVoucherId: true },
      });

      const voucherIds = [
        ...new Set(
          voucherDiscounts
            .map((discount) => discount.userVoucherId)
            .filter(Boolean)
        ),
      ];

      if (voucherIds.length > 0) {
        await tx.userVoucher.updateMany({
          where: { id: { in: voucherIds }, isUsed: false },
          data: { isUsed: true },
        });
      }

      return order;
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
            const order = await createOrderWithCode(tx, {
                userId,
                stallId,
                totalCents: totalCents + SERVICE_FEES_CENTS,
                status: "pending",
                orderStatus: "awaiting",
                netsTxnId: process.env.TEST_TXN_ID || null,
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

            // 4a.1) Check for pending voucher discount
            const pendingVoucherDiscount = await tx.discounts_charges.findFirst({
                where: {
                    userId: userId,
                    type: 'voucher',
                    orderId: null,
                },
            });

            if (pendingVoucherDiscount) {
                const userVoucherId = pendingVoucherDiscount.userVoucherId;

                if (!userVoucherId) {
                    await tx.discounts_charges.delete({
                        where: { id: pendingVoucherDiscount.id },
                    });
                } else {
                    const userVoucher = await tx.userVoucher.findUnique({
                        where: { id: userVoucherId },
                        include: { voucher: true },
                    });

                    const voucher = userVoucher?.voucher;
                    const expiryDate = getEffectiveVoucherExpiry(userVoucher);
                    const isInvalid =
                        !userVoucher ||
                        userVoucher.userId !== userId ||
                        userVoucher.isUsed ||
                        isVoucherExpired(expiryDate) ||
                        (voucher?.minSpend && totalCents < voucher.minSpend);

                    if (isInvalid) {
                        await tx.discounts_charges.delete({
                            where: { id: pendingVoucherDiscount.id },
                        });
                    } else {
                        let discountAmount = 0;
                        if (voucher.discountType === 'percentage') {
                            discountAmount = Math.round(totalCents * (voucher.discountAmount / 100));
                        } else {
                            discountAmount = voucher.discountAmount;
                        }

                        if (discountAmount > totalCents) {
                            discountAmount = totalCents;
                        }

                        await tx.discounts_charges.update({
                            where: { id: pendingVoucherDiscount.id },
                            data: {
                                orderId: order.id,
                                amountCents: discountAmount,
                            },
                        });

                        await tx.order.update({
                            where: { id: order.id },
                            data: {
                                totalCents: {
                                    decrement: discountAmount,
                                },
                            },
                        });

                        order.totalCents -= discountAmount;

                    }
                }
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
  // 1) get stall (wrap it as { stall: ... } because frontend expects data[0].stall)
  const orderWithStall = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      stall: true,
    },
  });

  // If order not found
  if (!orderWithStall) return null;

  const stall = { stall: orderWithStall.stall };

  // 2) get items
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    include: {
      menuItem: {
        include: {
          mediaUploads: true,
        },
      },
    },
  });

  // 3) get info (including voucher details)
  const info = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      discounts_charges: {
        include: {
          userVoucher: {
            include: {
              voucher: true,
            },
          },
        },
      },
    },
  });

  return [stall, items, info];
},


    async getByUserId(userId) {
        return prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                stall: {
                      select: { id: true, name: true, image_url: true, location: true },
                },
                discounts_charges: {
                    include: {
                        userVoucher: {
                            include: {
                                voucher: true
                            }
                        }
                    }
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

    async acceptOrder(orderId) {
  return prisma.order.update({
    where: { id: orderId },
    data: { orderStatus: "preparing" },
  });
},

async markOrderReady(orderId, estimatedReadyTime) {
  return prisma.order.update({
    where: { id: orderId },
    data: {
      orderStatus: "ready",
      ...(estimatedReadyTime
        ? { estimatedReadyTime: new Date(estimatedReadyTime) }
        : {}),
    },
  });
},

async markOrderCollected(orderId) {
  console.log("[service.markOrderCollected] updating:", orderId);
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { orderStatus: "collected", status: "COMPLETED", completedAt: new Date() },
  });
  console.log("[service.markOrderCollected] result:", {
    id: updated?.id,
    status: updated?.status,
    orderStatus: updated?.orderStatus,
  });
  return updated;
},




};