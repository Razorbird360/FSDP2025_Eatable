import { Router } from 'express';
import { mediaController } from '../controllers/media.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

// Public routes - anyone can view uploads
router.get('/menu-item/:menuItemId', mediaController.getByMenuItem);
router.get('/user/:userId', authMiddleware, mediaController.getByUser);
router.get('/:uploadId', mediaController.getById);

// Protected routes - require authentication
router.post(
  '/upload',
  authMiddleware,
  upload.single('image'),
  mediaController.uploadImage
);

router.delete('/:uploadId', authMiddleware, mediaController.deleteUpload);

export default router;
