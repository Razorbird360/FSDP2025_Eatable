import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { ordersController } from '../controllers/orders.controller.js';

const router = Router();

router.get('/my', authMiddleware, ordersController.getMyOrders);

export default router;
