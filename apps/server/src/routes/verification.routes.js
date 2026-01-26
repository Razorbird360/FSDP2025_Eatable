import express from 'express';
import { verificationController } from '../controllers/verification.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post(
  '/submit',
  authMiddleware,
  verificationController.submitVerification
);

export default router;
