import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { budgetController } from '../controllers/budget.controller.js';

const router = Router();

router.get(
  '/monthly',
  authMiddleware,
  budgetController.getMonthly
);

router.put(
  '/monthly',
  authMiddleware,
  budgetController.updateMonthly
);



export default router;
