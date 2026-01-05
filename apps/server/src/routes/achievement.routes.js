import { Router } from 'express';
import { achievementController } from '../controllers/achievement.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/status', authMiddleware, achievementController.getMonthlyStatus);

export default router;
