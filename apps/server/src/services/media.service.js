import prisma from '../lib/prisma.js';

/**
 * MediaUpload table CRUD operations
 * Follows the pattern of menu.service.js, stalls.service.js, user.service.js
 */
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
  async create({ menuItemId, userId, imageUrl, caption = null }) {
    return await prisma.mediaUpload.create({
      data: {
        menuItemId,
        userId,
        imageUrl,
        caption,
        validationStatus: 'pending',
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
    return await prisma.mediaUpload.update({
      where: { id },
      data,
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

  async getByStall(stallId) {
    return this.prisma.mediaUpload.findMany({
      where: {
        menuItem: {
          stallId, // from the Stall relation
        },
        // "verified" uploads only – change 'approved' if your enum/string differs
        validationStatus: 'approved',
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
        menuItem: {
          select: {
            id: true,
            name: true,
            stallId: true,
          },
        },
      },
      orderBy: [
        { voteScore: 'desc' },  // highest-scoring first
        { createdAt: 'desc' },  // newest first when score ties
      ],
    });
  },

  async getVotesByUserId(userId) {
    return await prisma.mediaUploadVote.findMany({
      where: { userId }
    });
  },

  async upvote(uploadId, userId) {
    // Check if user has already voted
    const existingVote = await prisma.mediaUploadVote.findUnique({
      where: {
        uploadId_userId: {
          uploadId,
          userId,
        },
      },
    });

    if (existingVote) {
      // User has already voted; return existing vote
      return { message: 'User has already upvoted this upload.', vote: existingVote };
    }

    // Create new upvote
    const newVote = await prisma.mediaUploadVote.create({
      data: {
        uploadId,
        userId,
        vote: 1,
      },
    });

    await prisma.mediaUpload.update({
      where: { id: uploadId },
      data: {
        upvoteCount: { increment: 1 },
      },
    }); 

    return { message: 'Upvote recorded.', vote: newVote };
  },


  async downvote(uploadId, userId) {
    // Check if user has already voted
    const existingVote = await prisma.mediaUploadVote.findUnique({
      where: {
        uploadId_userId: {
          uploadId,
          userId,
        },
      },
    });
    if (existingVote) {
      // User has already voted; return existing vote
      return { message: 'User has already downvoted this upload.', vote: existingVote };
    }

    // Create new downvote
    const newVote = await prisma.mediaUploadVote.create({
      data: {
        uploadId,
        userId,
        vote: -1,
      },
    });

      await prisma.mediaUpload.update({
      where: { id: uploadId },
      data: {
        downvoteCount: { increment: 1 },
      },
    }); 

    return { message: 'Downvote recorded.', vote: newVote };


  },

  async removeUpvote(uploadId, userId) {
    const deletedVote = await prisma.mediaUploadVote.deleteMany({
      where: {
        uploadId,
        userId,
        vote: 1,
      },
    });
    await prisma.mediaUpload.update({
      where: { id: uploadId },
      data: {
        upvoteCount: { decrement: 1 },
      },
    }); 
  },

  async removeDownvote(uploadId, userId) {
    const deletedVote = await prisma.mediaUploadVote.deleteMany({
      where: {
        uploadId,
        userId,
        vote: -1,
      },
    });
    await prisma.mediaUpload.update({
      where: { id: uploadId },
      data: {
        downvoteCount: { decrement: 1 },
      },
    }); 
  }
};