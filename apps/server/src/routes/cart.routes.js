import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { cartController } from '../controllers/cart.controller.js';


const router = Router();

router.get('/get', authMiddleware, cartController.getCart);
router.post('/add', authMiddleware, cartController.addItemToCart);
router.put('/update', authMiddleware, cartController.updateCartItem);
router.delete('/remove', authMiddleware, cartController.removeItemFromCart);
router.delete('/clear', authMiddleware, cartController.clearCart);


export default router;