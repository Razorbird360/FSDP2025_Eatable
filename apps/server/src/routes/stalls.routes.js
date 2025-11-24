import { Router } from 'express';
import { stallsController } from '../controllers/stalls.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';


const router = Router();

// Public routes
router.get('/', stallsController.getAll);
router.get('/:id/gallery', stallsController.getGallery);
router.get('/:id', stallsController.getById);

// Protected routes
router.get('/my-stall', authMiddleware, stallsController.getMyStall);
router.post('/', authMiddleware, stallsController.create);
router.put('/:id', authMiddleware, stallsController.update);
router.delete('/:id', authMiddleware, stallsController.delete);

export default router;
