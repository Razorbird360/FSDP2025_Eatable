import prisma from '../lib/prisma.js';
import { stallsService } from '../services/stalls.service.js';
import { hawkerDashboardService } from '../services/hawker-dashboard.service.js';

const resolveOwnedStallId = async (userId, requestedStallId) => {
  const stalls = await stallsService.findByOwnerId(userId);

  if (!stalls || stalls.length === 0) {
    return { stallId: null, error: 'No stall found for this user.' };
  }

  if (requestedStallId) {
    const match = stalls.find((stall) => stall.id === requestedStallId);
    if (!match) {
      return { stallId: null, error: 'Stall does not belong to this user.' };
    }
    return { stallId: match.id };
  }

  return { stallId: stalls[0].id };
};

const ensureMenuItemOwnership = async (menuItemId, stallId) => {
  const menuItem = await hawkerDashboardService.getMenuItemOwner(menuItemId);

  if (!menuItem) {
    return { menuItem: null, error: 'Dish not found.', status: 404 };
  }

  if (menuItem.stallId !== stallId) {
    return { menuItem: null, error: 'Dish does not belong to this stall.', status: 403 };
  }

  return { menuItem, error: null };
};

const handleMenuItemValidationError = (res, error) => {
  const message = error?.message;
  if (!message) {
    return false;
  }

  if (
    message === 'Dish name is required' ||
    message === 'No valid fields provided for update' ||
    message.includes('must be a non-negative number')
  ) {
    res.status(400).json({ error: message });
    return true;
  }

  return false;
};

const ensureVerifiedHawker = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, verified: true },
  });

  if (!user || user.role !== 'hawker') {
    return { error: 'Unauthorized' };
  }

  if (!user.verified) {
    return { error: 'Hawker not verified' };
  }

  return { user };
};

export const hawkerDashboardController = {
  async getDashboard(req, res, next) {
    try {
      const verification = await ensureVerifiedHawker(req.user.id);
      if (verification.error) {
        return res.status(403).json({ error: verification.error });
      }

      const { stallId: requestedStallId } = req.query;
      const { stallId, error } = await resolveOwnedStallId(
        req.user.id,
        requestedStallId
      );

      if (error) {
        return res.status(403).json({ error });
      }

      const summary = await hawkerDashboardService.getSummary(stallId);
      return res.status(200).json(summary);
    } catch (err) {
      next(err);
    }
  },

  async getActivity(req, res, next) {
    try {
      const verification = await ensureVerifiedHawker(req.user.id);
      if (verification.error) {
        return res.status(403).json({ error: verification.error });
      }

      const { stallId: requestedStallId, limit } = req.query;
      const { stallId, error } = await resolveOwnedStallId(
        req.user.id,
        requestedStallId
      );

      if (error) {
        return res.status(403).json({ error });
      }

      const activity = await hawkerDashboardService.getActivity(stallId, {
        limit,
      });

      return res.status(200).json(activity);
    } catch (err) {
      next(err);
    }
  },

  async getDishes(req, res, next) {
    try {
      const verification = await ensureVerifiedHawker(req.user.id);
      if (verification.error) {
        return res.status(403).json({ error: verification.error });
      }

      const { stallId: requestedStallId, sortBy, sortDir } = req.query;
      const { stallId, error } = await resolveOwnedStallId(
        req.user.id,
        requestedStallId
      );

      if (error) {
        return res.status(403).json({ error });
      }

      const dishes = await hawkerDashboardService.getMenuItems(stallId, {
        sortBy,
        sortDir,
      });

      return res.status(200).json(dishes);
    } catch (err) {
      next(err);
    }
  },

  async updateDish(req, res, next) {
    try {
      const verification = await ensureVerifiedHawker(req.user.id);
      if (verification.error) {
        return res.status(403).json({ error: verification.error });
      }

      const { menuItemId } = req.params;
      const { stallId: requestedStallId } = req.query;

      if (!menuItemId) {
        return res.status(400).json({ error: 'menuItemId is required' });
      }

      const { stallId, error } = await resolveOwnedStallId(
        req.user.id,
        requestedStallId
      );

      if (error) {
        return res.status(403).json({ error });
      }

      const ownership = await ensureMenuItemOwnership(menuItemId, stallId);
      if (ownership.error) {
        return res.status(ownership.status || 403).json({ error: ownership.error });
      }

      const updated = await hawkerDashboardService.updateMenuItem(menuItemId, req.body);
      return res.status(200).json(updated);
    } catch (err) {
      if (handleMenuItemValidationError(res, err)) {
        return;
      }
      next(err);
    }
  },

  async removeDish(req, res, next) {
    try {
      const verification = await ensureVerifiedHawker(req.user.id);
      if (verification.error) {
        return res.status(403).json({ error: verification.error });
      }

      const { menuItemId } = req.params;
      const { stallId: requestedStallId } = req.query;

      if (!menuItemId) {
        return res.status(400).json({ error: 'menuItemId is required' });
      }

      const { stallId, error } = await resolveOwnedStallId(
        req.user.id,
        requestedStallId
      );

      if (error) {
        return res.status(403).json({ error });
      }

      const ownership = await ensureMenuItemOwnership(menuItemId, stallId);
      if (ownership.error) {
        return res.status(ownership.status || 403).json({ error: ownership.error });
      }

      const updated = await hawkerDashboardService.setMenuItemActive(menuItemId, false);
      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },

  async deleteDish(req, res, next) {
    try {
      const verification = await ensureVerifiedHawker(req.user.id);
      if (verification.error) {
        return res.status(403).json({ error: verification.error });
      }

      const { menuItemId } = req.params;
      const { stallId: requestedStallId } = req.query;

      if (!menuItemId) {
        return res.status(400).json({ error: 'menuItemId is required' });
      }

      const { stallId, error } = await resolveOwnedStallId(
        req.user.id,
        requestedStallId
      );

      if (error) {
        return res.status(403).json({ error });
      }

      const ownership = await ensureMenuItemOwnership(menuItemId, stallId);
      if (ownership.error) {
        return res.status(ownership.status || 403).json({ error: ownership.error });
      }

      await hawkerDashboardService.deleteMenuItem(menuItemId);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
