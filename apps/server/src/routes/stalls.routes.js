import { Router } from 'express';
import { stallsController } from '../controllers/stalls.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';


const router = Router();

// Public routes
router.get('/', stallsController.getAll);
router.get('/:id/gallery', stallsController.getGallery);

// Protected routes (must come before /:id to prevent route collision)
router.get('/my-stall', authMiddleware, stallsController.getMyStall);
router.post('/', authMiddleware, stallsController.create);
router.put('/:id', authMiddleware, stallsController.update);
router.patch('/:id', authMiddleware, stallsController.update);
router.delete('/:id', authMiddleware, stallsController.delete);

// Public routes (specific ID lookup last)
router.get('/:id', stallsController.getById);

export default router;
