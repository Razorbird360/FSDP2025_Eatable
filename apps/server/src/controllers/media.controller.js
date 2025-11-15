import sharp from 'sharp';
import { mediaService } from '../services/media.service.js';
import { menuService } from '../services/menu.service.js';
import { storageService } from '../services/storage.service.js';
import { report } from 'process';

const BUCKET_NAME = 'food-images';
const VALID_STATUSES = ['pending', 'approved', 'rejected'];

export const mediaController = {
  /**
   * Upload image for a menu item
   * POST /api/media/upload
   */
  async uploadImage(req, res, next) {
    try {
      // 1. Validate file exists (from Multer)
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // 2. Validate required fields
      const { menuItemId, caption } = req.body;
      if (!menuItemId) {
        return res.status(400).json({ error: 'menuItemId is required' });
      }

      // 3. Check if menu item exists
      const menuItem = await menuService.getById(menuItemId);
      if (!menuItem) {
        return res.status(404).json({ error: 'Menu item not found' });
      }

      // 4. Validate aspect ratio BEFORE compression (early fail)
      const metadata = await sharp(req.file.buffer).metadata();
      const aspect_ratio = metadata.width / metadata.height;
      const aspect_tolerance = 0.05;
      const rectangle_ratio = 16 / 9;

      const is_square = Math.abs(aspect_ratio - 1) <= aspect_tolerance;
      const is_rectangle = Math.abs(aspect_ratio - rectangle_ratio) <= aspect_tolerance;

      if (!is_square && !is_rectangle) {
        return res.status(400).json({
          error: 'Invalid aspect ratio. Only 1:1 (square) or 16:9 (rectangle) images are allowed.',
          received: aspect_ratio.toFixed(3),
          expected: '1.000 or 1.778',
        });
      }

      // 5. Compress image
      const compressed_buffer = await storageService.compressImage(req.file.buffer);

      // 6. Generate file path
      const file_path = storageService.generateFilePath(
        menuItem.stallId,
        menuItemId,
        'jpg'
      );

      // 7. Upload to Supabase Storage
      const image_url = await storageService.uploadFile(
        BUCKET_NAME,
        file_path,
        compressed_buffer,
        'image/jpeg'
      );

      // 8. Save to database
      const upload = await mediaService.create({
        menuItemId,
        userId: req.user.id,
        imageUrl: image_url,
        caption: caption || null,
      });

      // 9. Return success
      res.status(201).json({
        message: 'Image uploaded successfully',
        upload,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all media uploads for a menu item
   * GET /api/media/menu-item/:menuItemId
   */
  async getByMenuItem(req, res, next) {
    try {
      const { menuItemId } = req.params;
      const { status } = req.query;

      // Validate status filter if provided
      if (status && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        });
      }

      const uploads = await mediaService.getByMenuItem(menuItemId, status || null);

      res.json({
        menuItemId,
        count: uploads.length,
        uploads,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get single media upload by ID
   * GET /api/media/:uploadId
   */
  async getById(req, res, next) {
    try {
      const { uploadId } = req.params;

      const upload = await mediaService.getById(uploadId);

      if (!upload) {
        return res.status(404).json({ error: 'Upload not found' });
      }

      res.json({ upload });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete media upload (storage + database)
   * DELETE /api/media/:uploadId
   */
  async deleteUpload(req, res, next) {
    try {
      const { uploadId } = req.params;
      const userId = req.user.id;

      // 1. Get upload record
      const upload = await mediaService.getById(uploadId);

      if (!upload) {
        return res.status(404).json({ error: 'Upload not found' });
      }

      // 2. Check authorization (owner or admin)
      const user = await import('../services/user.service.js').then(m => m.userService.findById(userId));

      if (upload.userId !== userId && user?.role !== 'admin') {
        return res.status(403).json({
          error: 'Unauthorized. You can only delete your own uploads.'
        });
      }

      // 3. Extract file path from URL
      const file_path = storageService.extractPathFromUrl(upload.imageUrl, BUCKET_NAME);

      // 4. Validate path format (defense against path traversal)
      // Expected format: stallId/menuItemId/uuid.jpg
      const uuid_pattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
      const path_segments = file_path.split('/');

      if (path_segments.length !== 3 ||
          !uuid_pattern.test(path_segments[0]) ||
          !uuid_pattern.test(path_segments[1]) ||
          !path_segments[2].match(/^[a-f0-9-]+\.(jpg|jpeg)$/i)) {
        return res.status(400).json({
          error: 'Invalid file path format. File may have been corrupted.'
        });
      }

      // 5. Delete from Supabase Storage (non-blocking if fails)
      try {
        await storageService.deleteFile(BUCKET_NAME, file_path);
      } catch (storage_error) {
        console.error('Storage deletion failed:', storage_error);
        // Continue with database deletion even if storage fails
      }

      // 6. Delete from database
      await mediaService.delete(uploadId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all uploads by a user
   * GET /api/media/user/:userId
   */
  async getByUser(req, res, next) {
    try {
      const { userId } = req.params;
      const requesting_user_id = req.user.id;

      // Check authorization (own profile or admin)
      const user = await import('../services/user.service.js').then(m => m.userService.findById(requesting_user_id));

      if (userId !== requesting_user_id && user?.role !== 'admin') {
        return res.status(403).json({
          error: 'Unauthorized. You can only view your own uploads.',
        });
      }

      const uploads = await mediaService.getByUser(userId);

      res.json({
        userId,
        count: uploads.length,
        uploads,
      });
    } catch (error) {
      next(error);
    }
  },


  /* * Gets all APPROVED uploads for a stall */
  async getByStall(req, res, next) {
    try {
      const { stallId } = req.params;
      const uploads = await mediaService.getByStall(stallId);
      res.json({
        stallId,
        count: uploads.length,
        uploads,
      });
    } catch (error) {
      next(error);
    }
  },

  async getVotes(req, res, next) {
    try {
      const { userid } = req.params;
      const votes = await mediaService.getVotesByUserId(userid);
      res.json({
        userId: userid,
        count: votes.length,
        votes,
      });
    } catch (error) {
      next(error);
    }
  },

  async upvote(req, res, next) {
    try {
      const { uploadId, userid } = req.params;
      const result = await mediaService.upvote(uploadId, userid);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async downvote(req, res, next) {
    try {
      const { uploadId, userid } = req.params;
      const result = await mediaService.downvote(uploadId, userid);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async removeUpvote(req, res, next) {
    try {
      const { uploadId, userid } = req.params;
      const result = await mediaService.removeUpvote(uploadId, userid);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async removeDownvote(req, res, next) {
    try {
      const { uploadId, userid } = req.params;
      const result = await mediaService.removeDownvote(uploadId, userid);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

};