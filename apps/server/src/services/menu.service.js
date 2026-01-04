import prisma from '../lib/prisma.js';

export const menuService = {
  async getByStallId(stallId) {
    return await prisma.menuItem.findMany({
      where: { stallId },
      include: {
        stall: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  async getById(id) {
    return await prisma.menuItem.findUnique({
      where: { id },
      include: {
        stall: true,
        mediaUploads: {
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
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  },

  async create(data) {
    return await prisma.menuItem.create({
      data,
    });
  },

  async update(id, data) {
    return await prisma.menuItem.update({
      where: { id },
      data,
    });
  },

  async delete(id) {
    return await prisma.menuItem.delete({
      where: { id },
    });
  },

  /**
   * Get top-voted menu items across all stalls
   * @param {number} limit - Maximum number of items to return
   * @returns {Promise<Array>} Top voted menu items with stall info
   */
  async getTopVotedMenuItems(limit = 3) {
    try {
      // Get all approved media uploads with their upvote counts
      const uploads = await prisma.mediaUpload.findMany({
        where: { 
          validationStatus: 'approved',
          menuItem: { isActive: true }
        },
        select: {
          menuItemId: true,
          upvoteCount: true,
          imageUrl: true,
          menuItem: {
            select: {
              id: true,
              name: true,
              priceCents: true,
              stall: {
                select: { id: true, name: true }
              }
            }
          }
        }
      });

      // Aggregate upvotes by menuItemId
      const upvoteMap = new Map();
      const imageMap = new Map();
      
      for (const upload of uploads) {
        if (!upload.menuItemId) continue;
        
        const current = upvoteMap.get(upload.menuItemId) || 0;
        upvoteMap.set(upload.menuItemId, current + (upload.upvoteCount || 0));
        
        // Store the first image for each menu item (highest upvote will be first if sorted)
        if (!imageMap.has(upload.menuItemId) && upload.imageUrl) {
          imageMap.set(upload.menuItemId, upload.imageUrl);
        }
      }

      // Convert to array and sort by upvotes
      const menuItemUpvotes = Array.from(upvoteMap.entries())
        .map(([menuItemId, upvotes]) => {
          const upload = uploads.find(u => u.menuItemId === menuItemId);
          if (!upload?.menuItem) return null;
          return {
            id: upload.menuItem.id,
            name: upload.menuItem.name,
            priceCents: upload.menuItem.priceCents,
            stallId: upload.menuItem.stall?.id,
            stallName: upload.menuItem.stall?.name,
            imageUrl: imageMap.get(menuItemId) || null,
            upvotes,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.upvotes - a.upvotes)
        .slice(0, limit);

      return menuItemUpvotes;
    } catch (error) {
      console.error('Error in getTopVotedMenuItems:', error);
      throw error;
    }
  },
};


