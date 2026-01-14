import prisma from '../lib/prisma.js';
import { achievementService } from './achievement.service.js';

/**
 * MediaUpload table CRUD operations
 * Follows the pattern of menu.service.js, stalls.service.js, user.service.js
 */
const ALLOWED_UPDATE_FIELDS = ['caption', 'validationStatus'];

const sanitizeUpdateData = (data = {}) => {
  const safeData = {};

  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(data, field) && data[field] !== undefined) {
      safeData[field] = data[field];
    }
  }

  if (Object.keys(safeData).length === 0) {
    throw new Error('No valid fields provided for media update');
  }

  return safeData;
};

export const mediaService = {
  /**
   * Create new media upload record
   * @param {Object} data - MediaUpload data
   * @param {string} data.menuItemId - Menu item UUID
   * @param {string} data.userId - User UUID
   * @param {string} data.imageUrl - Public URL from Supabase Storage
   * @param {string} data.caption - Optional caption
   * @returns {Promise<Object>} Created MediaUpload record
   */
  async create({
    menuItemId,
    userId,
    imageUrl,
    caption = null,
    aspectRatio = null,
    validationStatus = 'pending'
  }) {
    return await prisma.mediaUpload.create({
      data: {
        menuItemId,
        userId,
        imageUrl,
        caption,
        aspectRatio,
        validationStatus,
      },
      include: {
        menuItem: {
          select: {
            id: true,
            name: true,
            stallId: true,
          },
        },
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  },

  /**
   * Get media upload by ID
   * @param {string} id - MediaUpload UUID
   * @returns {Promise<Object|null>} MediaUpload record or null
   */
  async getById(id) {
    return await prisma.mediaUpload.findUnique({
      where: { id },
      include: {
        menuItem: {
          select: {
            id: true,
            name: true,
            stallId: true,
          },
        },
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
        _count: {
          select: {
            votes: true,
            reports: true,
          },
        },
      },
    });
  },

  /**
   * Get all media uploads for a menu item
   * @param {string} menuItemId - Menu item UUID
   * @param {string} status - Optional validation status filter
   * @returns {Promise<Array>} List of MediaUpload records
   */
  async getByMenuItem(menuItemId, status = null) {
    const where = { menuItemId };

    if (status) {
      where.validationStatus = status;
    }

    return await prisma.mediaUpload.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
        _count: {
          select: {
            votes: true,
            reports: true,
          },
        },
      },
      orderBy: {
        voteScore: 'desc',
      },
    });
  },

  /**
   * Update media upload
   * @param {string} id - MediaUpload UUID
   * @param {Object} data - Fields to update
   * @returns {Promise<Object>} Updated MediaUpload record
   */
  async update(id, data) {
    const sanitizedData = sanitizeUpdateData(data);

    return await prisma.mediaUpload.update({
      where: { id },
      data: sanitizedData,
      include: {
        menuItem: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  },

  /**
   * Delete media upload record
   * @param {string} id - MediaUpload UUID
   * @returns {Promise<Object>} Deleted MediaUpload record
   */
  async delete(id) {
    return await prisma.mediaUpload.delete({
      where: { id },
    });
  },

  /**
   * Get all media uploads by user
   * @param {string} userId - User UUID
   * @returns {Promise<Array>} List of MediaUpload records
   */
  async getByUser(userId) {
    return await prisma.mediaUpload.findMany({
      where: { userId },
      include: {
        menuItem: {
          select: {
            id: true,
            name: true,
            stall: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            votes: true,
            reports: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },


  async getVotesByUserId(userId) {
    return await prisma.mediaUploadVote.findMany({
      where: { userId },
      include: {
        upload: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                stall: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            _count: {
              select: {
                votes: true,
                reports: true,
              },
            },
          },
        },
      },
    });
  },

  async upvote(uploadId, userId) {
    const result = await prisma.$transaction(async (tx) => {
      // Check if user has already voted
      const existingVote = await tx.mediaUploadVote.findUnique({
        where: {
          uploadId_userId: {
            uploadId,
            userId,
          },
        },
      });

      if (existingVote?.vote === 1) {
        // User has already upvoted
        return { message: 'already upvoted', vote: existingVote };
      } else if (existingVote?.vote === -1) {
        // User has already downvoted
        return { message: 'already downvoted', vote: existingVote };
      }

      // Create new upvote
      const newVote = await tx.mediaUploadVote.create({
        data: {
          uploadId,
          userId,
          vote: 1,
        },
      });

      await tx.mediaUpload.update({
        where: { id: uploadId },
        data: {
          upvoteCount: { increment: 1 },
        },
      });

      return { message: 'Upvote recorded.', vote: newVote };
    });

    // Track achievement outside transaction to avoid locking issues if possible, 
    // or keep it simple. Since achievementService uses its own transaction for reward,
    // we can call it after the vote transaction completes.
    try {
      const date = new Date();
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      await achievementService.trackVote(userId, monthYear);
    } catch (e) {
      console.error("Failed to track vote achievement:", e);
    }

    return result;
  },

  async downvote(uploadId, userId) {
    const result = await prisma.$transaction(async (tx) => {
      // Check if user has already voted
      const existingVote = await tx.mediaUploadVote.findUnique({
        where: {
          uploadId_userId: {
            uploadId,
            userId,
          },
        },
      });

      if (existingVote?.vote === 1) {
        return { message: 'already upvoted', vote: existingVote };
      } else if (existingVote?.vote === -1) {
        return { message: 'already downvoted', vote: existingVote };
      }

      // Create new downvote
      const newVote = await tx.mediaUploadVote.create({
        data: {
          uploadId,
          userId,
          vote: -1,
        },
      });

      await tx.mediaUpload.update({
        where: { id: uploadId },
        data: {
          downvoteCount: { increment: 1 },
        },
      });

      return { message: 'Downvote recorded.', vote: newVote };
    });

    // Track achievement
    try {
      const date = new Date();
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      await achievementService.trackVote(userId, monthYear);
    } catch (e) {
      console.error("Failed to track vote achievement:", e);
    }

    return result;
  },

  async removeUpvote(uploadId, userId) {
    return prisma.$transaction(async (tx) => {
      const deletedVote = await tx.mediaUploadVote.deleteMany({
        where: {
          uploadId,
          userId,
          vote: 1,
        },
      });

      if (deletedVote.count > 0) {
        // Clamp: decrement but never below zero
        await tx.mediaUpload.update({
          where: { id: uploadId },
          data: {
            upvoteCount: {
              decrement: deletedVote.count,
            },
          },
        });

        // Force clamp to zero in case DB inconsistent
        await tx.$queryRaw`
          UPDATE "media_uploads"
          SET upvote_count = GREATEST(upvote_count, 0)
          WHERE id = ${uploadId}::uuid;
        `;
      }

      return { message: "Upvote removed.", removed: deletedVote.count };
    });
  },

  async removeDownvote(uploadId, userId) {
    return prisma.$transaction(async (tx) => {
      const deletedVote = await tx.mediaUploadVote.deleteMany({
        where: {
          uploadId,
          userId,
          vote: -1,
        },
      });

      if (deletedVote.count > 0) {
        // Decrement but never below zero
        await tx.mediaUpload.update({
          where: { id: uploadId },
          data: {
            downvoteCount: {
              decrement: deletedVote.count,
            },
          },
        });

        // Clamp negative safety
        await tx.$queryRaw`
          UPDATE "media_uploads"
          SET downvote_count = GREATEST(downvote_count, 0)
          WHERE id = ${uploadId}::uuid;
        `;
      }

      return { message: "Downvote removed.", removed: deletedVote.count };
    });
  },

};
