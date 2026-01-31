import { z } from 'zod';
import axios from 'axios';
import { orderService } from '../../services/order.service.js';
import { cartService } from '../../services/cart.service.js';
import { createTool, ToolContext } from './tool-base.js';
import type { ToolRegistryOptions } from './index.js';

const orderIdSchema = z.object({
  orderId: z.string().min(1),
});

const checkoutSchema = z.object({}).strict();

const NETS_BASE_URL =
  process.env.NETS_BASE_URL || 'https://sandbox.nets.openapipaas.com/api/v1';

const NETS_HEADERS = {
  'api-key': process.env.NETS_SANDBOX_API_KEY,
  'project-id': process.env.NETS_SANDBOX_PROJECT_ID,
};

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

const requestNetsQr = async (order) => {
  if (!order.totalCents || order.totalCents <= 0) {
    throw new Error('Invalid order amount.');
  }

  if (!NETS_HEADERS['api-key'] || !NETS_HEADERS['project-id']) {
    throw new Error('NETS credentials are not configured.');
  }

  const amountDollars = (order.totalCents / 100).toFixed(2);
  const body = {
    txn_id: order.netsTxnId,
    amt_in_dollars: amountDollars,
    notify_mobile: 88286909,
  };

  const response = await axios.post(
    `${NETS_BASE_URL}/common/payments/nets-qr/request`,
    body,
    { headers: NETS_HEADERS }
  );

  return response.data?.result?.data ?? null;
};

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

const NETS_DISABLED_MESSAGE = 'NETS payment is currently unavailable.';

export const createOrderTools = (
  context: ToolContext,
  options: ToolRegistryOptions = {}
) => [
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
      name: 'checkout_and_pay',
      description:
        'Create an order from the cart and return a NETS QR payload for payment.',
      schema: checkoutSchema,
      handler: async () => {
        if (options.netsEnabled === false) {
          throw new Error(NETS_DISABLED_MESSAGE);
        }
        const cart = await cartService.getCartByUserId(context.userId);
        if (!cart || cart.length === 0) {
          throw new Error('Your cart is empty. Add items before checking out.');
        }

        const order = await orderService.createOrderFromCart(context.userId);
        const qrData = await requestNetsQr(order);
        if (!qrData) {
          throw new Error('Failed to request NETS QR.');
        }

        return {
          order: mapOrderSummary(order),
          payment: {
            orderId: order.id,
            txnRetrievalRef: qrData.txn_retrieval_ref ?? null,
            qrCode: qrData.qr_code ?? null,
            responseCode: qrData.response_code ?? null,
            networkStatus: qrData.network_status ?? null,
            txnStatus: qrData.txn_status ?? null,
            instruction: qrData.instruction ?? null,
            polling: {
              url: `/api/nets-qr/query/${order.id}`,
              intervalMs: 5000,
              timeoutSeconds: 300,
            },
          },
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
        if (normalized.info.userId !== context.userId) {
          throw new Error('You do not have permission to access this order.');
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
      handler: async () => {
        try {
          const orders = await fetchOrders(context.userId);
          return { orders };
        } catch (error) {
          console.error('[get_my_orders] Error fetching orders:', error);
          throw new Error('Failed to fetch order history. Please try again.');
        }
      },
    },
    context
  ),
];
