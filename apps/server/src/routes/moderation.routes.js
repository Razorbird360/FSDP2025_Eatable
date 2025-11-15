
import { Router } from 'express';
import { moderationController } from '../controllers/moderation.controller.js';

const router = Router();
router.post('/report/:uploadId', moderationController.reportUpload);



export default router;