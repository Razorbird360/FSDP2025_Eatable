import prisma from '../lib/prisma.js';

function addTagAggregate(map, { label, confidence }) {
  if (!label) return;

  const existing = map.get(label);
  if (!existing) {
    map.set(label, {
      label,
      count: 1,
      sumConfidence: typeof confidence === 'number' ? confidence : 0,
    });
    return;
  }

  existing.count += 1;
  if (typeof confidence === 'number') {
    existing.sumConfidence += confidence;
  }
}

function buildTagList(map, limit = 3) {
  return Array.from(map.values())
    .map((tag) => ({
      label: tag.label,
      count: tag.count,
      avgConfidence: tag.count > 0 ? tag.sumConfidence / tag.count : 0,
      reliabilityPercent: Math.round(
        (tag.count > 0 ? tag.sumConfidence / tag.count : 0) * 100
      ),
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.avgConfidence - a.avgConfidence;
    })
    .slice(0, limit);
}

async function buildTagGroupsByMenuItem(menuItemIds) {
  if (!Array.isArray(menuItemIds) || menuItemIds.length === 0) {
    return new Map();
  }

  const uploadTags = await prisma.uploadTag.findMany({
    where: {
      upload: {
        menuItemId: { in: menuItemIds },
        validationStatus: 'approved',
      },
    },
    select: {
      confidence: true,
      evidenceFrom: true,
      upload: { select: { menuItemId: true } },
      tag: { select: { normalized: true, displayLabel: true } },
    },
  });

  const tagGroupsByMenuItem = new Map();

  for (const row of uploadTags) {
    const menuItemId = row.upload?.menuItemId;
    if (!menuItemId) continue;

    const label = row.tag?.displayLabel || row.tag?.normalized;
    if (!label) continue;

    const evidence = Array.isArray(row.evidenceFrom) ? row.evidenceFrom : [];
    let groups = tagGroupsByMenuItem.get(menuItemId);
    if (!groups) {
      groups = {
        caption: new Map(),
        image: new Map(),
      };
      tagGroupsByMenuItem.set(menuItemId, groups);
    }

    if (evidence.includes('caption')) {
      addTagAggregate(groups.caption, {
        label,
        confidence: row.confidence,
      });
    }

    if (evidence.includes('image')) {
      addTagAggregate(groups.image, {
        label,
        confidence: row.confidence,
      });
    }
  }

  const normalizedGroupsByMenuItem = new Map();
  tagGroupsByMenuItem.forEach((groups, menuItemId) => {
    normalizedGroupsByMenuItem.set(menuItemId, {
      caption: buildTagList(groups.caption, 3),
      image: buildTagList(groups.image, 3),
    });
  });

  return normalizedGroupsByMenuItem;
}

export const stallsService = {
  async getAll(limit) {
    const query = {
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
          },
        },
        _count: {
          select: {
            menuItems: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    };

    if (Number.isInteger(limit) && limit > 0) {
      query.take = limit;
    }

    return await prisma.stall.findMany(query);
  },

  async getById(id) {
    const stall = await prisma.stall.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
          },
        },
        _count: {
          select: {
            favoriteStalls: true,
          },
        },
        menuItems: {
          where: { isActive: true },
          include: {
            // 1️⃣ Get TOP upload per menu item
            mediaUploads: {
              where: {
                validationStatus: 'approved',
              },
              orderBy: [
                { upvoteCount: 'desc' },   // main sort: most upvotes
                { voteScore: 'desc' },     // optional tie-breaker
                { createdAt: 'asc' },      // oldest first (or 'desc' for newest)
              ],
              take: 1, // only the top one
            },
            menuItemTagAggs: {
              orderBy: { count: 'desc' },
              take: 12,
              include: {
                tag: {
                  select: {
                    normalized: true,
                    displayLabel: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!stall) {
      return null;
    }

    const prepTimes = stall.menuItems
      .map((item) => item.prepTimeMins)
      .filter((value) => typeof value === 'number');
    const maxPrepTimeMins = prepTimes.length ? Math.max(...prepTimes) : 5;
    const prices = stall.menuItems
      .map((item) => item.priceCents)
      .filter((value) => typeof value === 'number');
    const avgPriceCents = prices.length
      ? Math.round(prices.reduce((sum, value) => sum + value, 0) / prices.length)
      : null;

    const { _count, ...stallData } = stall;
    const menuItems = stall.menuItems || [];
    if (menuItems.length === 0) {
      return {
        ...stallData,
        likeCount: _count?.favoriteStalls ?? 0,
        menuItems: [],
      };
    }

    const menuItemIds = menuItems.map((item) => item.id);
    const uploadCounts = await prisma.mediaUpload.groupBy({
      by: ['menuItemId'],
      where: {
        menuItemId: { in: menuItemIds },
        validationStatus: 'approved',
      },
      _count: { _all: true },
    });
    const orderCounts = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        menuItemId: { in: menuItemIds },
      },
      _sum: { quantity: true },
    });
    const orderRecency = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        menuItemId: { in: menuItemIds },
      },
      _max: { createdAt: true },
    });
    const uploadRecency = await prisma.mediaUpload.groupBy({
      by: ['menuItemId'],
      where: {
        menuItemId: { in: menuItemIds },
        validationStatus: 'approved',
      },
      _max: { createdAt: true },
    });

    const uploadCountsByMenuItem = new Map(
      uploadCounts.map((row) => [row.menuItemId, row._count?._all ?? 0])
    );
    const orderCountsByMenuItem = new Map(
      orderCounts.map((row) => [row.menuItemId, row._sum?.quantity ?? 0])
    );
    const orderRecencyByMenuItem = new Map(
      orderRecency.map((row) => [row.menuItemId, row._max?.createdAt ?? null])
    );
    const uploadRecencyByMenuItem = new Map(
      uploadRecency.map((row) => [row.menuItemId, row._max?.createdAt ?? null])
    );

    const tagGroupsByMenuItem = await buildTagGroupsByMenuItem(menuItemIds);

    return {
      ...stallData,
      likeCount: _count?.favoriteStalls ?? 0,
      menuItems: menuItems.map((item) => ({
        ...item,
        approvedUploadCount: uploadCountsByMenuItem.get(item.id) || 0,
        orderCount: orderCountsByMenuItem.get(item.id) || 0,
        lastOrderedAt: orderRecencyByMenuItem.get(item.id) || null,
        lastUploadAt: uploadRecencyByMenuItem.get(item.id) || null,
        maxPrepTimeMins,
        avgPriceCents,
        tagGroups: tagGroupsByMenuItem.get(item.id) || { caption: [], image: [] },
      })),
    };
  },

  async findByNameOrLocation(query) {
    if (!query) return null;
    return await prisma.stall.findFirst({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { location: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        location: true,
      },
    });
  },

  async addFavoriteStall(userId, stallId) {
    if (!userId || !stallId) {
      throw new Error('userId and stallId are required');
    }

    return await prisma.favoriteStall.upsert({
      where: {
        userId_stallId: {
          userId,
          stallId,
        },
      },
      update: {},
      create: {
        userId,
        stallId,
      },
    });
  },

  async removeFavoriteStall(userId, stallId) {
    if (!userId || !stallId) {
      throw new Error('userId and stallId are required');
    }

    await prisma.favoriteStall.deleteMany({
      where: {
        userId,
        stallId,
      },
    });
  },

  async getUserFavoriteStalls(userId) {
    if (!userId) {
      throw new Error('userId is required');
    }

    const favorites = await prisma.favoriteStall.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        stall: {
          select: {
            id: true,
            name: true,
            cuisineType: true,
            location: true,
            image_url: true,
            _count: {
              select: {
                menuItems: true,
                favoriteStalls: true,
              },
            },
          },
        },
      },
    });

    return favorites.map((favorite) => {
      const stall = favorite.stall;
      if (!stall) {
        return {
          id: favorite.id,
          userId: favorite.userId,
          stallId: favorite.stallId,
          createdAt: favorite.createdAt,
          likedAt: favorite.createdAt,
          stall: null,
        };
      }

      const { _count, ...stallData } = stall;
      return {
        id: favorite.id,
        userId: favorite.userId,
        stallId: favorite.stallId,
        createdAt: favorite.createdAt,
        likedAt: favorite.createdAt,
        stall: {
          ...stallData,
          menuItemCount: _count?.menuItems ?? 0,
          likeCount: _count?.favoriteStalls ?? 0,
        },
      };
    });
  },

  async create(data) {
    // Validate required fields
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      throw new Error('Stall name is required');
    }

    if (!data.location || typeof data.location !== 'string' || !data.location.trim()) {
      throw new Error('Stall location is required');
    }

    if (!data.hawkerCentreId) {
      throw new Error('Hawker centre selection is required');
    }

    if (!data.cuisineType || !data.cuisineType.trim()) {
      throw new Error('Cuisine type is required');
    }

    if (!data.image_url) {
      throw new Error('Stall image is required');
    }

    // Trim and validate data
    const stallData = {
      name: data.name.trim(),
      location: data.location.trim(),
      description: data.description?.trim() || null,
      cuisineType: data.cuisineType.trim(),
      hawkerCentreId: data.hawkerCentreId,
      image_url: data.image_url,
      tags: Array.isArray(data.tags) ? data.tags : [],
      dietaryTags: Array.isArray(data.dietaryTags) ? data.dietaryTags : [],
      ownerId: data.ownerId,
    };

    return await prisma.stall.create({
      data: stallData,
      include: {
        hawkerCentre: true,
        owner: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  },

  async update(id, data) {
    return await prisma.stall.update({
      where: { id },
      data,
    });
  },

  async delete(id) {
    return await prisma.stall.delete({
      where: { id },
    });
  },

  async getApprovedMediaByStallId(stallId) {
    if (!stallId) {
      throw new Error('stallId is required');
    }

    const uploads = await prisma.mediaUpload.findMany({
      where: {
        // all media whose menu item belongs to this stall
        menuItem: {
          stallId: stallId, // shorthand `stallId` is also fine
          isActive: true,
        },
        validationStatus: 'approved',
      },
      orderBy: {
        upvoteCount: 'desc', // or createdAt, etc.
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
            username: true,
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

    return uploads;
  },

  async findByOwnerId(userId) {
    return await prisma.stall.findMany({
      where: { ownerId: userId },
      include: {
        menuItems: true,
        hawkerCentre: true,
      },
    });
  },
};
