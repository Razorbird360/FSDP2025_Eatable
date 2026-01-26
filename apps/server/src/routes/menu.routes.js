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

router.get('/likes', authMiddleware, async (req, res, next) => {
  try {
    const likes = await menuService.getLikedMenuItems(req.user.id);
    res.json({ count: likes.length, likes });
  } catch (error) {
    console.error('Error fetching liked menu items:', error);
    next(error);
  }
});

router.get('/:menuItemId/likes', authMiddleware, async (req, res, next) => {
  try {
    const { menuItemId } = req.params;
    const result = await menuService.getLikeStatus(menuItemId, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Error fetching menu item like status:', error);
    next(error);
  }
});

router.post('/:menuItemId/likes', authMiddleware, async (req, res, next) => {
  try {
    const { menuItemId } = req.params;
    const result = await menuService.like(menuItemId, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Error liking menu item:', error);
    next(error);
  }
});

router.delete('/:menuItemId/likes', authMiddleware, async (req, res, next) => {
  try {
    const { menuItemId } = req.params;
    const result = await menuService.unlike(menuItemId, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Error unliking menu item:', error);
    next(error);
  }
});

export default router;
