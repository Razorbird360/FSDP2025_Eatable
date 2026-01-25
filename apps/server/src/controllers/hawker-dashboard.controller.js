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
};
