import { mediaService } from '../services/media.service.js';
import { menuService } from '../services/menu.service.js';
import { storageService } from '../services/storage.service.js';
import { userService } from '../services/user.service.js';
import { aiValidationService } from '../services/ai-validation.service.js';
import { taggingService } from '../services/tagging.service.js';

const BUCKET_NAME = 'food-images';
const VALID_STATUSES = ['pending', 'approved', 'rejected'];

export const mediaController = {
  /**
   * Validate if image contains food (generic check)
   * POST /api/media/validate-generic
   */
  async validateGeneric(req, res, _next) {
    try {
      // 1. Validate file exists (from Multer)
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // 2. Call AI validation service
      const result = await aiValidationService.validateFoodGeneric(req.file.buffer);

      // 3. Return validation result
      res.json(result);
    } catch (error) {
      console.error('Generic validation error:', error);
      res.status(500).json({
        error: 'Failed to validate image',
        message: error.message
      });
    }
  },

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
      const { menuItemId, caption, aspectRatio: requestedAspect, setAsMenuItemImage } = req.body;
      if (!menuItemId) {
        return res.status(400).json({ error: 'menuItemId is required' });
      }

      // 3. Check if menu item exists
      const menuItem = await menuService.getById(menuItemId);
      if (!menuItem) {
        return res.status(404).json({ error: 'Menu item not found' });
      }

      const shouldUpdateMenuItemImage =
        setAsMenuItemImage === true ||
        setAsMenuItemImage === 'true' ||
        setAsMenuItemImage === '1';

      if (shouldUpdateMenuItemImage) {
        const ownerId = menuItem?.stall?.ownerId || null;
        if (!ownerId || ownerId !== req.user.id) {
          return res.status(403).json({
            error: 'Only the stall owner can set the dish primary image.',
          });
        }
      }

      // 4. AI Validation - Verify dish matches the menu item
      let validationStatus = 'pending';
      try {
        const dishName = menuItem.name;
        const validationResult = await aiValidationService.validateFoodSpecific(
          req.file.buffer,
          dishName
        );

        if (validationResult.is_match === 0) {
          return res.status(400).json({
            error: 'Image validation failed',
            message: `This image does not appear to contain ${dishName}. Please upload a photo of the correct dish.`,
            dish_name: dishName
          });
        }

        // AI matched: mark as approved
        validationStatus = 'approved';
      } catch (validationError) {
        console.error('AI validation error during upload:', validationError);
        return res.status(503).json({
          error: 'Image validation unavailable. Please try again shortly.',
        });
      }

      // 5. Determine requested aspect ratio (defaults to square)
      const normalizedAspect = (requestedAspect || 'square').toString().toLowerCase();
      const allowedAspects = ['square', 'rectangle'];
      if (!allowedAspects.includes(normalizedAspect)) {
        return res.status(400).json({
          error: 'Invalid aspectRatio. Expected "square" or "rectangle".',
        });
      }

      // 6. Compress image
      const compressed_buffer = await storageService.compressImage(
        req.file.buffer,
        normalizedAspect
      );

      // 7. Generate file path
      const file_path = storageService.generateFilePath(
        menuItem.stallId,
        menuItemId,
        'jpg'
      );

      // 8. Upload to Supabase Storage
      const image_url = await storageService.uploadFile(
        BUCKET_NAME,
        file_path,
        compressed_buffer,
        'image/jpeg'
      );

      // 9. Save to database
      const upload = await mediaService.create({
        menuItemId,
        userId: req.user.id,
        imageUrl: image_url,
        caption: caption || null,
        aspectRatio: normalizedAspect,
        validationStatus,
      });

      // 9a. Optionally set as the menu item's primary image (stall owner only)
      if (shouldUpdateMenuItemImage) {
        await menuService.update(menuItemId, { imageUrl: image_url });
      }

      // 9b. AI tagging (non-blocking to upload success if it fails)
      let tags = [];
      try {
        const tagResult = await taggingService.generateAndSaveUploadTags({
          uploadId: upload.id,
          menuItemId,
          imageUrl: image_url,
          caption: caption || '',
          menuItemName: menuItem.name,
        });
        tags = tagResult.tags.map((tag) => ({
          label: tag.label,
          confidence: tag.confidence,
          reliabilityPercent: Math.round(tag.confidence * 100),
        }));
      } catch (taggingError) {
        console.error('AI tagging failed during upload:', taggingError);
      }

      // Track upload for achievements
      try {
        const { achievementService } = await import('../services/achievement.service.js');
        const date = new Date();
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        await achievementService.trackUpload(req.user.id, monthYear);
      } catch (e) {
        console.error("Failed to track upload achievement:", e);
      }

      // 10. Return success
      res.status(201).json({
        message: 'Image uploaded successfully',
        upload,
        tags,
        menuItemImageUrl: shouldUpdateMenuItemImage ? image_url : null,
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

      console.log("Fetching upload with ID:", uploadId);
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
          error: 'Unauthorized. You can only delete your own uploads.',
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
          error: 'Invalid file path format. File may have been corrupted.',
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

  /* Gets all APPROVED uploads for a stall */
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
      const userid = req.user.id;
      console.log("Getting votes for userId:", userid);
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
      const { uploadId } = req.params;
      const userid = req.user.id;
      console.log("Upvoting uploadId:", uploadId, "by userId:", userid);
      const result = await mediaService.upvote(uploadId, userid);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async downvote(req, res, next) {
    try {
      const { uploadId } = req.params;
      const userid = req.user.id;
      console.log("Downvoting uploadId:", uploadId, "by userId:", userid);
      const result = await mediaService.downvote(uploadId, userid);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async removeUpvote(req, res, next) {
    try {
      const { uploadId } = req.params;
      const userid = req.user.id;
      console.log("Removing upvote for uploadId:", uploadId, "by userId:", userid);
      const result = await mediaService.removeUpvote(uploadId, userid);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async removeDownvote(req, res, next) {
    try {
      const { uploadId } = req.params;
      const userid = req.user.id;
      console.log("Removing downvote for uploadId:", uploadId, "by userId:", userid);
      const result = await mediaService.removeDownvote(uploadId, userid);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  // apps/server/src/controllers/media.controller.js

  async getSkipOnboarding(req, res, next) {
    try {
      const userId = req.user?.id;
      console.log("Getting skipOnboarding for userId:", userId);


      if (!userId) {
        return res.json({ skipOnboarding: false });
      }

      const user = await userService.findById(userId);

      console.log("User skipOnboarding value:", user?.skipOnboarding);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return user.skipOnboarding === true
        ? res.json({ skipOnboarding: true })
        : res.json({ skipOnboarding: false });
    } catch (error) {
      next(error);
    }
  },


  // POST /api/media/skip-onboarding
  async setSkipOnboarding(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { skip } = req.body;

      const result = await userService.setSkipOnboarding(userId, skip);

      if (!result.ok) {
        return res.status(500).json({ error: 'Failed to update skipOnboarding flag' });
      }

      return res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get current user's uploads
   * GET /api/media/my-uploads
   */
  async getMyUploads(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const uploads = await mediaService.getByUser(userId);

      res.json({
        count: uploads.length,
        uploads,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get recent community uploaders (unique users)
   * GET /api/media/recent-uploaders?limit=6
   */
  async getRecentUploaders(req, res, next) {
    try {
      const limit = Number(req.query?.limit ?? 6);
      const uploaders = await mediaService.getRecentUploaders(limit);
      res.json({ uploaders });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Upload stall image (no AI validation)
   * POST /api/media/upload/stall-image
   */
  async uploadStallImage(req, res, next) {
    try {
      // 1. Validate file exists (from Multer)
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // 2. Verify user is authenticated hawker (use local DB role)
      const dbUser = await userService.findById(req.user.id);
      if (!dbUser || dbUser.role !== 'hawker') {
        return res.status(403).json({ error: 'Only hawkers can upload stall images' });
      }
      if (!dbUser.verified) {
        return res.status(403).json({ error: 'Hawker must be verified to upload stall images' });
      }

      // 3. Compress image
      const compressed_buffer = await storageService.compressImage(
        req.file.buffer,
        'square' // Stalls use square images
      );

      // 4. Generate file path for stall image
      const file_path = `stalls/${req.user.id}/${Date.now()}.jpg`;

      // 5. Upload to Supabase Storage
      const image_url = await storageService.uploadFile(
        'stall-images',
        file_path,
        compressed_buffer,
        'image/jpeg'
      );

      // 6. Return success with image URL
      res.status(200).json({ imageUrl: image_url });
    } catch (error) {
      console.error('Stall image upload error:', error);
      next(error);
    }
  },

  /**
   * Delete uploaded stall image (cleanup only)
   * DELETE /api/media/stall-image
   * Body: { imageUrl }
   */
  async deleteStallImage(req, res, next) {
    try {
      const { imageUrl } = req.body ?? {};
      if (!imageUrl || typeof imageUrl !== 'string') {
        return res.status(400).json({ error: 'imageUrl is required' });
      }

      const dbUser = await userService.findById(req.user.id);
      if (!dbUser || dbUser.role !== 'hawker') {
        return res.status(403).json({ error: 'Only hawkers can delete stall images' });
      }
      if (!dbUser.verified) {
        return res.status(403).json({ error: 'Hawker must be verified to delete stall images' });
      }

      let bucket = null;
      let filePath = null;
      try {
        const url = new URL(imageUrl);
        const match = url.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
        if (match) {
          bucket = match[1];
          filePath = match[2];
        }
      } catch (_err) {
        return res.status(400).json({ error: 'Invalid imageUrl' });
      }

      if (!bucket || !filePath) {
        return res.status(400).json({ error: 'Invalid imageUrl' });
      }

      if (bucket !== 'stall-images') {
        return res.status(400).json({ error: 'Invalid bucket for stall image' });
      }

      const expectedPrefix = `stalls/${req.user.id}/`;
      if (!filePath.startsWith(expectedPrefix)) {
        return res.status(403).json({ error: 'Not allowed to delete this image' });
      }

      await storageService.deleteFile(bucket, filePath);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Stall image delete error:', error);
      next(error);
    }
  }

};
