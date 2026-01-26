import { z } from 'zod';
import { orderService } from '../../services/order.service.js';
import { cartService } from '../../services/cart.service.js';
import { createTool, ToolContext } from './tool-base.js';

const orderIdSchema = z.object({
  orderId: z.string().min(1),
});

const mapUploads = (uploads = []) =>
  uploads.map((upload) => ({
    id: upload.id,
    menuItemId: upload.menuItemId,
    userId: upload.userId,
    imageUrl: upload.imageUrl,
    caption: upload.caption ?? null,
    validationStatus: upload.validationStatus,
    reviewedAt: upload.reviewedAt ?? null,
    reviewedBy: upload.reviewedBy ?? null,
    upvoteCount: upload.upvoteCount,
    downvoteCount: upload.downvoteCount,
    voteScore: upload.voteScore,
    createdAt: upload.createdAt,
    updatedAt: upload.updatedAt,
    aspectRatio: upload.aspectRatio ?? null,
  }));

const mapOrderSummary = (order) => ({
  id: order.id,
  userId: order.userId,
  stallId: order.stallId,
  status: order.status,
  orderStatus: order.orderStatus,
  orderCode: order.orderCode ?? null,
  totalCents: order.totalCents,
  netsTxnId: order.netsTxnId ?? null,
  estimatedReadyTime: order.estimatedReadyTime ?? null,
  acceptedAt: order.acceptedAt ?? null,
  estimatedMinutes: order.estimatedMinutes ?? null,
  readyAt: order.readyAt ?? null,
  collectedAt: order.collectedAt ?? null,
  completedAt: order.completedAt ?? null,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const mapOrderDetails = (orderData) => {
  if (!Array.isArray(orderData) || orderData.length < 3) {
    return null;
  }

  const [stallWrapper, items, info] = orderData;
  return {
    stall: stallWrapper?.stall
      ? {
          id: stallWrapper.stall.id,
          name: stallWrapper.stall.name,
          location: stallWrapper.stall.location ?? null,
          image_url: stallWrapper.stall.image_url ?? null,
        }
      : null,
    items: (items ?? []).map((item) => ({
      id: item.id,
      orderId: item.orderId,
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      unitCents: item.unitCents,
      request: item.request ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      menuItem: item.menuItem
        ? {
            id: item.menuItem.id,
            stallId: item.menuItem.stallId,
            name: item.menuItem.name,
            description: item.menuItem.description ?? null,
            priceCents: item.menuItem.priceCents,
            category: item.menuItem.category ?? null,
            prepTimeMins: item.menuItem.prepTimeMins ?? null,
            isActive: item.menuItem.isActive,
            imageUrl: item.menuItem.imageUrl ?? null,
            mediaUploads: mapUploads(item.menuItem.mediaUploads ?? []),
          }
        : null,
    })),
    info: info
      ? {
          ...mapOrderSummary(info),
          discounts: (info.discounts_charges ?? []).map((discount) => ({
            id: discount.id,
            type: discount.type ?? null,
            amountCents: discount.amountCents ?? null,
            orderId: discount.orderId ?? null,
            userId: discount.userId ?? null,
            userVoucherId: discount.userVoucherId ?? null,
            userVoucher: discount.userVoucher
              ? {
                  id: discount.userVoucher.id,
                  voucherId: discount.userVoucher.voucherId,
                  isUsed: discount.userVoucher.isUsed,
                  expiryDate: discount.userVoucher.expiryDate ?? null,
                  voucher: discount.userVoucher.voucher
                    ? {
                        id: discount.userVoucher.voucher.id,
                        code: discount.userVoucher.voucher.code,
                        description: discount.userVoucher.voucher.description ?? null,
                        discountAmount: discount.userVoucher.voucher.discountAmount,
                        discountType: discount.userVoucher.voucher.discountType,
                        minSpend: discount.userVoucher.voucher.minSpend,
                        expiryDate: discount.userVoucher.voucher.expiryDate ?? null,
                        expiryOnReceiveMonths:
                          discount.userVoucher.voucher.expiryOnReceiveMonths ?? null,
                      }
                    : null,
                }
              : null,
          })),
        }
      : null,
  };
};

const fetchOrders = async (userId) => {
  const orders = await orderService.getByUserId(userId);
  return orders.map((order) => ({
    ...mapOrderSummary(order),
    stall: order.stall
      ? {
          id: order.stall.id,
          name: order.stall.name,
          location: order.stall.location ?? null,
          image_url: order.stall.image_url ?? null,
        }
      : null,
    discounts: (order.discounts_charges ?? []).map((discount) => ({
      id: discount.id,
      type: discount.type ?? null,
      amountCents: discount.amountCents ?? null,
      orderId: discount.orderId ?? null,
      userId: discount.userId ?? null,
      userVoucherId: discount.userVoucherId ?? null,
    })),
    orderItems: (order.orderItems ?? []).map((item) => ({
      id: item.id,
      orderId: item.orderId,
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      unitCents: item.unitCents,
      request: item.request ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      menuItem: item.menuItem
        ? {
            id: item.menuItem.id,
            stallId: item.menuItem.stallId,
            name: item.menuItem.name,
            description: item.menuItem.description ?? null,
            priceCents: item.menuItem.priceCents,
            category: item.menuItem.category ?? null,
            prepTimeMins: item.menuItem.prepTimeMins ?? null,
            isActive: item.menuItem.isActive,
            imageUrl: item.menuItem.imageUrl ?? null,
            mediaUploads: mapUploads(item.menuItem.mediaUploads ?? []),
          }
        : null,
    })),
  }));
};

export const createOrderTools = (context: ToolContext) => [
  createTool(
    {
      name: 'create_order_from_cart',
      description: 'Create an order from the current cart.',
      schema: z.object({}).strict(),
      handler: async () => {
        const cart = await cartService.getCartByUserId(context.userId);
        if (!cart || cart.length === 0) {
          throw new Error('Your cart is empty. Add items before placing an order.');
        }

        const order = await orderService.createOrderFromCart(context.userId);
        return {
          orderId: order.id,
          order: mapOrderSummary(order),
        };
      },
    },
    context
  ),
  createTool(
    {
      name: 'get_order_by_id',
      description: 'Fetch order details by order id.',
      schema: orderIdSchema,
      handler: async ({ orderId }) => {
        const details = await orderService.getOrderItems(orderId);
        const normalized = mapOrderDetails(details);
        if (!normalized) {
          throw new Error('Order not found.');
        }
        return normalized;
      },
    },
    context
  ),
  createTool(
    {
      name: 'get_my_orders',
      description: 'Fetch the current user order history.',
      schema: z.object({}).strict(),
      handler: async () => ({
        orders: await fetchOrders(context.userId),
      }),
    },
    context
  ),
];
