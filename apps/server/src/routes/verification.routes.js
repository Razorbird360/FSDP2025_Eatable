import express from 'express';
import { verificationController } from '../controllers/verification.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = express.Router();

router.post(
  '/submit',
  authMiddleware,
  upload.single('image'),
  verificationController.submitVerification
);

export default router;
