import { orderService } from "../services/order.service.js";

export const orderController = {
  async createOrderFromUserCart(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const order = await orderService.createOrderFromCart(userId);
      return res.status(200).json({ orderId: order.id });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  },

  async getOrderById(req, res, next) {
    try {
      const { orderId } = req.params;
      const order = await orderService.getOrderItems(orderId);
      return res.status(200).json(order);
    } catch (err) {
      next(err);
    }
  },

  async getMyOrders(req, res, next) {
    try {
      const orders = await orderService.getByUserId(req.user.id);
      return res.json({ orders });
    } catch (err) {
      next(err);
    }
  },

  async acceptOrder(req, res, next) {
    try {
      const { orderId } = req.params;
      console.log("[acceptOrder] hit:", { orderId, user: req.user?.id });

      const updated = await orderService.acceptOrder(orderId);

      console.log("[acceptOrder] updated:", {
        id: updated?.id,
        status: updated?.status,
        orderStatus: updated?.orderStatus,
      });

      return res.status(200).json(updated);
    } catch (err) {
      console.error("[acceptOrder] error:", err);
      next(err);
    }
  },

  //  mark ready should generate + return pickupToken (QR)
  async markOrderReady(req, res, next) {
    try {
      const { orderId } = req.params;
      const { estimatedReadyTime } = req.body;

      console.log("[markOrderReady] hit:", {
        orderId,
        estimatedReadyTime,
        user: req.user?.id,
      });

      // Expect service to generate token and store it (pickupToken + pickupTokenHash)
      // and return either:
      //   1) { order, pickupToken }
      //   2) updated order object containing pickupToken
      const result = await orderService.markOrderReady(orderId, estimatedReadyTime);

      const updatedOrder = result?.order ?? result;
      const pickupToken = result?.pickupToken ?? updatedOrder?.pickupToken ?? null;

      console.log("[markOrderReady] updated:", {
        id: updatedOrder?.id,
        status: updatedOrder?.status,
        orderStatus: updatedOrder?.orderStatus,
        estimatedReadyTime: updatedOrder?.estimatedReadyTime,
        hasPickupToken: Boolean(pickupToken),
      });

      return res.status(200).json({
        order: updatedOrder,
        pickupToken,
      });
    } catch (err) {
      console.error("[markOrderReady] error:", err);
      next(err);
    }
  },

  //  collected must be verified by token (scanned QR)
  async markOrderCollected(req, res, next) {
    try {
      const { orderId } = req.params;
      const token = String(req.body?.token || "");

      console.log("[markOrderCollected] hit:", {
        orderId,
        user: req.user?.id,
        hasToken: Boolean(token),
      });

      if (!token) {
        return res.status(400).json({ error: "token is required" });
      }

      // Expect service to verify tokenHash, ensure ready, ensure not used, then mark collected.
      const updated = await orderService.collectOrderByToken(orderId, token);

      console.log("[markOrderCollected] updated:", {
        id: updated?.id,
        status: updated?.status,
        orderStatus: updated?.orderStatus,
        completedAt: updated?.completedAt,
        collectedAt: updated?.collectedAt,
      });

      return res.status(200).json(updated);
    } catch (err) {
      console.error("[markOrderCollected] error:", err);
      next(err);
    }
  },
};
