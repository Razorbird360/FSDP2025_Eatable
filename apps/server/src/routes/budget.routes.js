import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { budgetController } from '../controllers/budget.controller.js';


const router = Router();



export default router;