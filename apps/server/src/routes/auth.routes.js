import express from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validate, syncUserSchema, authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/me', authMiddleware, authController.getCurrentUser);
router.post('/sync-user', authMiddleware, validate(syncUserSchema), authController.syncUser);

export default router;
