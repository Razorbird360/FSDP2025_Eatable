import express from 'express';
import { syncUser, getCurrentUser } from '../controllers/auth.controller.js';
import { validate, syncUserSchema, authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/me', authMiddleware, getCurrentUser);
router.post('/sync-user', authMiddleware, validate(syncUserSchema), syncUser);

export default router;
