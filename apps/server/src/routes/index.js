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
import hawkerDashboardRoutes from './hawker-dashboard.routes.js';
import budgetRoutes from './budget.routes.js';
import menuRoutes from './menu.routes.js';
import voucherRoutes from './voucher.routes.js';
import achievementRoutes from './achievement.routes.js';
import adminRoutes from './admin.routes.js';

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
router.use('/hawker', hawkerDashboardRoutes);
router.use('/budget', budgetRoutes);
router.use('/menu', menuRoutes);
router.use('/vouchers', voucherRoutes);
router.use('/achievements', achievementRoutes);
router.use('/admin', adminRoutes);

export default router;
