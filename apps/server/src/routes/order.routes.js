import { Router } from 'express';
import { orderController } from '../controllers/order.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';


const router = Router();

router.post('/newOrder', authMiddleware, orderController.createOrderFromUserCart);



export default router;