
import { Router } from 'express';
import { moderationController } from '../controllers/moderation.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();
router.post('/report/:uploadId', authMiddleware, moderationController.reportUpload);
router.get('/reports', authMiddleware, moderationController.getReports);
router.delete('/report/:reportId', authMiddleware, moderationController.deleteReport);


export default router;