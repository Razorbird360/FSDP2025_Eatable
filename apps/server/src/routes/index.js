import { Router } from 'express';
import stallsRoutes from './stalls.routes.js';
// Import other routes as they are created
// import menuRoutes from './menu.routes.js';
// import photosRoutes from './photos.routes.js';
// import votingRoutes from './voting.routes.js';
// import ordersRoutes from './orders.routes.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
router.use('/stalls', stallsRoutes);
// router.use('/menu', menuRoutes);
// router.use('/photos', photosRoutes);
// router.use('/votes', votingRoutes);
// router.use('/orders', ordersRoutes);

export default router;
