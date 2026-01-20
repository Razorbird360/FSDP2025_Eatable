import { Router } from 'express';
import { orderController } from '../controllers/order.controller.js';
import { orderService } from '../services/order.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';


const router = Router();

router.get('/serviceFees', orderService.getServiceFees);

router.post('/newOrder', authMiddleware, orderController.createOrderFromUserCart);
router.get('/getOrder/:orderId', authMiddleware, orderController.getOrderById);

router.get('/my', authMiddleware, orderController.getMyOrders);

router.post('/:orderId/accept', authMiddleware, orderController.acceptOrder);
router.post('/:orderId/ready', authMiddleware, orderController.markOrderReady);
router.post('/:orderId/collected', authMiddleware, orderController.markOrderCollected);


export default router;