import { Router } from 'express';
import { menuService } from '../services/menu.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

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

router.get('/likes', authMiddleware, async (req, res, next) => {
  try {
    const likes = await menuService.getUserFavoriteDishes(req.user.id);
    res.json({ likes });
  } catch (error) {
    console.error('Error fetching favorite dishes:', error);
    next(error);
  }
});

router.post('/:id/like', authMiddleware, async (req, res, next) => {
  try {
    await menuService.addFavoriteDish(req.user.id, req.params.id);
    res.status(201).json({ liked: true });
  } catch (error) {
    console.error('Error liking dish:', error);
    next(error);
  }
});

router.delete('/:id/like', authMiddleware, async (req, res, next) => {
  try {
    await menuService.removeFavoriteDish(req.user.id, req.params.id);
    res.json({ liked: false });
  } catch (error) {
    console.error('Error unliking dish:', error);
    next(error);
  }
});

/**
 * @route GET /api/menu/featured
 * @description Get featured menu items by cuisine with min upvotes
 * @query {number} minUpvotes - Minimum total upvotes per menu item (default: 500)
 * @query {string} cuisines - Comma-separated cuisine keys (optional)
 * @returns {Object} Featured item per cuisine
 */
router.get('/featured', async (req, res, next) => {
  try {
    const minUpvotes = Number.parseInt(req.query.minUpvotes, 10);
    const cuisinesParam = typeof req.query.cuisines === 'string' ? req.query.cuisines : '';
    const cuisines = cuisinesParam
      .split(',')
      .map((cuisine) => cuisine.trim())
      .filter(Boolean);
    const featured = await menuService.getFeaturedMenuItemsByCuisine({
      minUpvotes: Number.isFinite(minUpvotes) ? minUpvotes : undefined,
      cuisines: cuisines.length > 0 ? cuisines : undefined,
    });
    res.json(featured);
  } catch (error) {
    console.error('Error fetching featured items:', error);
    next(error);
  }
});

export default router;
