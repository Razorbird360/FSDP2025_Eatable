import prisma from '../lib/prisma.js';
import { stallsService } from '../services/stalls.service.js';

export const stallsController = {
  async getAll(req, res, next) {
    try {
      const stalls = await stallsService.getAll();
      res.json(stalls);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const stall = await stallsService.getById(req.params.id);
      if (!stall) {
        return res.status(404).json({ error: 'Stall not found' });
      }
      res.json(stall);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      // Verify user is authenticated hawker (use local DB role)
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true, verified: true },
      });

      if (!user || user.role !== 'hawker') {
        return res.status(403).json({ error: 'Only hawkers can create stalls' });
      }

      if (!user.verified) {
        return res.status(403).json({ error: 'Hawker must be verified to create a stall' });
      }

      // Check if user already has a stall
      const existingStall = await stallsService.findByOwnerId(req.user.id);
      if (existingStall.length > 0) {
        return res.status(400).json({ error: 'User already owns a stall' });
      }

      // Add ownerId to request body
      const stallData = {
        ...req.body,
        ownerId: req.user.id,
      };

      const stall = await stallsService.create(stallData);
      res.status(201).json(stall);
    } catch (error) {
      // Handle unique constraint violation (duplicate stall name)
      if (error.code === 'P2002') {
        return res.status(400).json({
          error: 'A stall with this name already exists',
        });
      }

      // Handle validation errors
      if (error.message.includes('required')) {
        return res.status(400).json({ error: error.message });
      }

      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const stall = await stallsService.update(req.params.id, req.body);
      res.json(stall);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await stallsService.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async getGallery(req, res, next) {
    try {
      const gallery = await stallsService.getApprovedMediaByStallId(req.params.id);
      res.json(gallery);
    } catch (error) {
      next(error);
    }
  },

  async getMyStall(req, res, next) {
    try {
      const stalls = await stallsService.findByOwnerId(req.user.id);

      if (stalls.length === 0) {
        return res.status(200).json(null);
      }

      res.status(200).json(stalls[0]); // Return first stall
    } catch (error) {
      next(error);
    }
  },

  async getLikes(req, res, next) {
    try {
      const likes = await stallsService.getUserFavoriteStalls(req.user.id);
      res.json({ likes });
    } catch (error) {
      next(error);
    }
  },

  async likeStall(req, res, next) {
    try {
      await stallsService.addFavoriteStall(req.user.id, req.params.id);
      res.status(201).json({ liked: true });
    } catch (error) {
      next(error);
    }
  },

  async unlikeStall(req, res, next) {
    try {
      await stallsService.removeFavoriteStall(req.user.id, req.params.id);
      res.json({ liked: false });
    } catch (error) {
      next(error);
    }
  },
};
