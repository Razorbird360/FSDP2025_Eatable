import { Router } from 'express';
import stallsRoutes from './stalls.routes.js';
import authRoutes from './auth.routes.js';
import mediaRoutes from './media.routes.js';
import moderationRoutes from './moderation.routes.js';
import hawkerCentresRoutes from './hawker-centres.routes.js';
import netsRoutes from '../services/payment.service.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/stalls', stallsRoutes);
router.use('/auth', authRoutes);
router.use('/media', mediaRoutes);
router.use('/moderation', moderationRoutes);
router.use('/hawker-centres', hawkerCentresRoutes);

router.use('/nets-qr', netsRoutes);

export default router;
