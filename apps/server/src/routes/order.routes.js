import { Router } from 'express';
import { orderController } from '../controllers/order.controller.js';
import { orderService } from '../services/order.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';


const router = Router();

router.get('/serviceFees', orderService.getServiceFees);

router.post('/newOrder', authMiddleware, orderController.createOrderFromUserCart);
router.get('/getOrder/:orderId', authMiddleware, orderController.getOrderById);



export default router;