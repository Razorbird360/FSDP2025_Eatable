import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { hawkerDashboardController } from '../controllers/hawker-dashboard.controller.js';

const router = Router();

router.get('/dashboard', authMiddleware, hawkerDashboardController.getDashboard);
router.get('/dashboard/activity', authMiddleware, hawkerDashboardController.getActivity);
router.get('/dashboard/dishes', authMiddleware, hawkerDashboardController.getDishes);

export default router;
