import { Router } from 'express';
import { menuService } from '../services/menu.service.js';

const router = Router();

/**
 * @route GET /api/menu/top-voted
 * @description Get top-voted menu items across all stalls
 * @query {number} limit - Maximum number of items to return (default: 3)
 * @returns {Array} Top voted menu items with stall info
 */
router.get('/top-voted', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 3;
    const items = await menuService.getTopVotedMenuItems(limit);
    res.json(items);
  } catch (error) {
    console.error('Error fetching top-voted items:', error);
    next(error);
  }
});

export default router;
