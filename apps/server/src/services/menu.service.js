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

  async getFeaturedMenuItemsByCuisine({ minUpvotes = 500, cuisines } = {}) {
    const defaultCuisines = ['malay', 'indian', 'western', 'chinese', 'desserts', 'local'];
    const cuisineList = Array.isArray(cuisines) && cuisines.length > 0 ? cuisines : defaultCuisines;
    const normalizedCuisines = Array.from(
      new Set(
        cuisineList
          .map((cuisine) => (cuisine ?? '').toString().trim().toLowerCase())
          .filter(Boolean)
      )
    );

    const upvoteTotals = await prisma.mediaUpload.groupBy({
      by: ['menuItemId'],
      where: {
        validationStatus: 'approved',
      },
      _sum: {
        upvoteCount: true,
      },
    });

    const filteredTotals = upvoteTotals.filter(
      (row) => (row._sum.upvoteCount ?? 0) >= minUpvotes
    );

    const emptyItems = normalizedCuisines.reduce((acc, cuisine) => {
      acc[cuisine] = null;
      return acc;
    }, {});

    if (filteredTotals.length === 0) {
      return {
        minUpvotes,
        items: emptyItems,
      };
    }

    const menuItemIds = filteredTotals.map((row) => row.menuItemId);

    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        priceCents: true,
        stall: {
          select: {
            id: true,
            name: true,
            cuisineType: true,
            location: true,
          },
        },
      },
    });

    const menuItemById = new Map(menuItems.map((item) => [item.id, item]));

    const topImages = await prisma.mediaUpload.findMany({
      where: {
        menuItemId: { in: menuItemIds },
        validationStatus: 'approved',
      },
      select: {
        menuItemId: true,
        imageUrl: true,
        upvoteCount: true,
      },
      orderBy: {
        upvoteCount: 'desc',
      },
      distinct: ['menuItemId'],
    });

    const imageByMenuItem = new Map(
      topImages.map((image) => [image.menuItemId, image.imageUrl ?? null])
    );

    const itemsByCuisine = new Map();
    for (const row of filteredTotals) {
      const item = menuItemById.get(row.menuItemId);
      if (!item) {
        continue;
      }

      const cuisineKey = (item.stall?.cuisineType ?? 'Other').toString().trim().toLowerCase();
      if (normalizedCuisines.length > 0 && !normalizedCuisines.includes(cuisineKey)) {
        continue;
      }

      const entry = {
        id: item.id,
        name: item.name,
        priceCents: item.priceCents,
        stallId: item.stall?.id ?? null,
        stallName: item.stall?.name ?? null,
        stallLocation: item.stall?.location ?? null,
        imageUrl: imageByMenuItem.get(item.id) ?? null,
        upvotes: row._sum.upvoteCount ?? 0,
        cuisine: cuisineKey,
      };

      const bucket = itemsByCuisine.get(cuisineKey) ?? [];
      bucket.push(entry);
      itemsByCuisine.set(cuisineKey, bucket);
    }

    const featured = normalizedCuisines.reduce((acc, cuisine) => {
      const pool = itemsByCuisine.get(cuisine) ?? [];
      acc[cuisine] = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
      return acc;
    }, {});

    return {
      minUpvotes,
      items: featured,
    };
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

  async getLikeStatus(menuItemId, userId) {
    const [count, like] = await prisma.$transaction([
      prisma.menuItemLike.count({ where: { menuItemId } }),
      prisma.menuItemLike.findUnique({
        where: {
          userId_menuItemId: {
            userId,
            menuItemId,
          },
        },
        select: { userId: true },
      }),
    ]);

    return { liked: Boolean(like), count };
  },

  async getLikedMenuItems(userId) {
    return await prisma.menuItemLike.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        menuItemId: true,
        createdAt: true,
        menuItem: {
          select: {
            id: true,
            name: true,
            priceCents: true,
            imageUrl: true,
            stall: {
              select: {
                id: true,
                name: true,
              },
            },
            mediaUploads: {
              where: {
                validationStatus: 'approved',
              },
              orderBy: [{ upvoteCount: 'desc' }, { voteScore: 'desc' }],
              take: 1,
              select: {
                imageUrl: true,
                upvoteCount: true,
              },
            },
          },
        },
      },
    });
  },

  async like(menuItemId, userId) {
    await prisma.menuItemLike.upsert({
      where: {
        userId_menuItemId: {
          userId,
          menuItemId,
        },
      },
      update: {},
      create: {
        userId,
        menuItemId,
      },
    });

    const count = await prisma.menuItemLike.count({ where: { menuItemId } });
    return { liked: true, count };
  },

  async unlike(menuItemId, userId) {
    await prisma.menuItemLike.deleteMany({
      where: {
        userId,
        menuItemId,
      },
    });

    const count = await prisma.menuItemLike.count({ where: { menuItemId } });
    return { liked: false, count };
  },
};


