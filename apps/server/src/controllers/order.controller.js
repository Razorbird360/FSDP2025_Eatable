import { orderService } from "../services/order.service.js";

export const orderController = {
  async createOrderFromUserCart(req, res, next) {
    try {
      const userId = req.user?.id; // assuming auth middleware sets this
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const order = await orderService.createOrderFromCart(userId);
      return res.status(200).json({ orderId: order.id });
    } catch (err) {
      // If service set a status, reuse it
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      next(err); // let your global error handler deal with it
    }
  },

  async getOrderById(req, res, next) {
    try {
      const orderId = req.params.orderId;
      const order = await orderService.getOrderItems(orderId);
      return res.status(200).json(order);
    } catch (err) {
      next(err); // let your global error handler deal with it
    }
  },

  async getMyOrders(req, res, next) {
    try {
      const orders = await orderService.getByUserId(req.user.id);
      res.json({ orders });
    } catch (error) {
      next(error);
    }
  },
};