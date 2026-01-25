import { Router } from 'express';
import { stallsController } from '../controllers/stalls.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';


const router = Router();

// Public routes
router.get('/', stallsController.getAll);
router.get('/likes', authMiddleware, stallsController.getLikedStalls);
router.get('/:id/gallery', stallsController.getGallery);
router.get('/:id', stallsController.getById);
router.get('/:id/likes', authMiddleware, stallsController.getLikes);
router.post('/:id/likes', authMiddleware, stallsController.like);
router.delete('/:id/likes', authMiddleware, stallsController.unlike);

// Protected routes
router.get('/my-stall', authMiddleware, stallsController.getMyStall);
router.post('/', authMiddleware, stallsController.create);
router.put('/:id', authMiddleware, stallsController.update);
router.delete('/:id', authMiddleware, stallsController.delete);

export default router;
