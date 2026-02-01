import { Router } from 'express';
import { aboutController } from '../controllers/about.controller.js';

const router = Router();

router.get('/stats', aboutController.getStats);

export default router;
