import { Router } from 'express';
import { stallsController } from '../controllers/stalls.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';


const router = Router();

// Public routes
router.get('/', stallsController.getAll);
router.get('/:id', stallsController.getById);

router.get('/:id/gallery', stallsController.getGallery);


// Protected routes
router.post('/', authMiddleware, stallsController.create);
router.put('/:id', authMiddleware, stallsController.update);
router.delete('/:id', authMiddleware, stallsController.delete);

export default router;
