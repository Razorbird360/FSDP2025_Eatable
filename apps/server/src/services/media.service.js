import prisma from '../lib/prisma.js';

/**
 * MediaUpload table CRUD operations
 * Follows the pattern of menu.service.js, stalls.service.js, user.service.js
 */
const ALLOWED_UPDATE_FIELDS = ['caption', 'validationStatus', 'rejectionReason'];

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
};
