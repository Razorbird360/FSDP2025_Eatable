import { Router } from 'express';
import stallsRoutes from './stalls.routes.js';
import authRoutes from './auth.routes.js';
import mediaRoutes from './media.routes.js';
import moderationRoutes from './moderation.routes.js';
import profileRoutes from "./profile.routes.js";

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
router.use("/profile", profileRoutes);

router.use('/stalls', stallsRoutes);
router.use('/auth', authRoutes);
router.use('/media', mediaRoutes);
router.use('/moderation', moderationRoutes);

export default router;
