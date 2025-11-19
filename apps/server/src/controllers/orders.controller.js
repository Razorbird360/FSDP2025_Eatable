import { ordersService } from '../services/orders.service.js';

export const ordersController = {
  async getMyOrders(req, res, next) {
    try {
      const orders = await ordersService.getByUserId(req.user.id);
      res.json({ orders });
    } catch (error) {
      next(error);
    }
  },
};
