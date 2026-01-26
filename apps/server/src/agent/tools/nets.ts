import { z } from 'zod';
import axios from 'axios';
import { createTool, ToolContext } from './tool-base.js';
import { orderService } from '../../services/order.service.js';

const NETS_BASE_URL =
  process.env.NETS_BASE_URL || 'https://sandbox.nets.openapipaas.com/api/v1';

const NETS_HEADERS = {
  'api-key': process.env.NETS_SANDBOX_API_KEY,
  'project-id': process.env.NETS_SANDBOX_PROJECT_ID,
};

const requestSchema = z.object({
  orderId: z.string().min(1),
});

const querySchema = z.object({
  orderId: z.string().min(1),
  txnRetrievalRef: z.string().min(1),
  frontendTimeoutStatus: z.string().optional(),
});

const ensureOrderOwnership = (order, userId) => {
  if (!order) {
    throw new Error('Order not found.');
  }
  if (order.userId !== userId) {
    throw new Error('Unauthorized for this order.');
  }
};

export const createNetsTools = (context: ToolContext) => [
  createTool(
    {
      name: 'request_nets_qr',
      description: 'Request a NETS QR payload for payment.',
      schema: requestSchema,
      handler: async ({ orderId }) => {
        const order = await orderService.getOrderById(orderId);
        ensureOrderOwnership(order, context.userId);

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

        return {
          orderId,
          nets: response.data,
        };
      },
    },
    context
  ),
  createTool(
    {
      name: 'query_nets_qr_status',
      description: 'Query NETS payment status for a QR transaction.',
      schema: querySchema,
      handler: async ({ orderId, txnRetrievalRef, frontendTimeoutStatus }) => {
        const order = await orderService.getOrderById(orderId);
        ensureOrderOwnership(order, context.userId);

        if (!NETS_HEADERS['api-key'] || !NETS_HEADERS['project-id']) {
          throw new Error('NETS credentials are not configured.');
        }

        const body = {
          txn_retrieval_ref: txnRetrievalRef,
          frontend_timeout_status: frontendTimeoutStatus ?? undefined,
        };

        const response = await axios.post(
          `${NETS_BASE_URL}/common/payments/nets-qr/query`,
          body,
          { headers: NETS_HEADERS }
        );

        return {
          orderId,
          nets: response.data,
        };
      },
    },
    context
  ),
];
