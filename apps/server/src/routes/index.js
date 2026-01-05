import { Router } from 'express';
import stallsRoutes from './stalls.routes.js';
import authRoutes from './auth.routes.js';
import mediaRoutes from './media.routes.js';
import moderationRoutes from './moderation.routes.js';
import profileRoutes from "./profile.routes.js";
import hawkerCentresRoutes from './hawker-centres.routes.js';
import cartRoutes from './cart.routes.js';
import orderRoutes from './order.routes.js';
import netsRoutes from '../services/payment.service.js';
import verificationRoutes from './verification.routes.js';
import voucherRoutes from './voucher.routes.js';
import dataRoutes from './data.routes.js';
import achievementRoutes from './achievement.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
router.use("/profile", profileRoutes);

router.use('/stalls', stallsRoutes);
router.use('/auth', authRoutes);
router.use('/media', mediaRoutes);
router.use('/moderation', moderationRoutes);
router.use('/hawker-centres', hawkerCentresRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/nets-qr', netsRoutes);
router.use('/verification', verificationRoutes);
router.use('/vouchers', voucherRoutes);
router.use('/data', dataRoutes);
router.use('/achievements', achievementRoutes);

export default router;
