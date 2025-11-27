import { Router } from 'express';
import voucherController from '../controllers/voucher.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js'; // Assuming this middleware exists

const router = Router();

router.get('/user', authMiddleware, voucherController.getUserVouchers);
router.post('/apply/:voucherId', authMiddleware, voucherController.applyVoucher);

export default router;
