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

const RECOMMENDATION_WINDOW_DAYS = 30;
const MAX_SIMILARITY_SEEDS = 5;
const POPULARITY_WEIGHTS = {
  views: 0.5,
  clicks: 2,
  adds: 3,
  orders: 5,
};
const CATEGORY_WEIGHT = 2.5;
const TAG_WEIGHT = 1.5;
const SIMILARITY_WEIGHT = 2;

function normalizeScoreMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw;
}

function getScoreValue(scores, key) {
  if (!key || !scores || typeof scores !== 'object' || Array.isArray(scores)) {
    return 0;
  }
  if (Object.prototype.hasOwnProperty.call(scores, key)) {
    const value = Number(scores[key]);
    return Number.isFinite(value) ? value : 0;
  }
  const normalizedKey = String(key).toLowerCase();
  if (
    normalizedKey !== key &&
    Object.prototype.hasOwnProperty.call(scores, normalizedKey)
  ) {
    const value = Number(scores[normalizedKey]);
    return Number.isFinite(value) ? value : 0;
  }
  return 0;
}

function collectDishTags(dish) {
  const tags = new Set();
  const tagAggs = Array.isArray(dish.menuItemTagAggs)
    ? dish.menuItemTagAggs
    : [];

  tagAggs.forEach((agg) => {
    const label = agg?.tag?.displayLabel || agg?.tag?.normalized;
    if (label) {
      tags.add(label);
    }
  });

  const tagGroups = dish.tagGroups || {};
  const captionGroups = Array.isArray(tagGroups.caption) ? tagGroups.caption : [];
  const imageGroups = Array.isArray(tagGroups.image) ? tagGroups.image : [];

  captionGroups.forEach((group) => {
    if (group?.label) tags.add(group.label);
  });
  imageGroups.forEach((group) => {
    if (group?.label) tags.add(group.label);
  });

  return Array.from(tags);
}

function computePopularityScore(stats) {
  const views = stats?.views ?? 0;
  const clicks = stats?.clicks ?? 0;
  const adds = stats?.adds ?? 0;
  const orders = stats?.orders ?? 0;

  return (
    views * POPULARITY_WEIGHTS.views +
    clicks * POPULARITY_WEIGHTS.clicks +
    adds * POPULARITY_WEIGHTS.adds +
    orders * POPULARITY_WEIGHTS.orders
  );
}

/**
 * Convert degrees to radians
 */
function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Get hawker centres sorted by distance from given coordinates
 * @param {object} options - Query options
 * @param {number} options.lat - User's latitude
 * @param {number} options.lng - User's longitude
 * @param {number} options.limit - Maximum number of results
 * @returns {Promise<Array>} Array of hawker centres with distance
 */
async function getNearbyHawkerCentres({ lat, lng, limit = 10 }) {
  // Fetch all hawker centres with stall count
  const centres = await prisma.hawkerCentre.findMany({
    include: {
      _count: {
        select: { stalls: true }
      }
    }
  });

  // Calculate distance for each centre and add to object
  const centresWithDistance = centres.map(centre => ({
    id: centre.id,
    name: centre.name,
    slug: centre.slug,
    address: centre.address,
    postalCode: centre.postalCode,
    latitude: centre.latitude,
    longitude: centre.longitude,
    imageUrl: centre.imageUrl,
    distance: calculateDistance(lat, lng, centre.latitude, centre.longitude),
    stallCount: centre._count.stalls
  }));

  // Sort by distance (nearest first) and limit results
  const sortedCentres = centresWithDistance
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);

  return sortedCentres;
}

/**
 * Get random stalls for a specific hawker centre
 * @param {string} slug - Hawker centre slug
 * @param {number} limit - Number of random stalls to return
 * @returns {Promise<Array>} Array of random stalls
 */
async function getRandomStallsBySlug(slug, limit = 3) {
  // Find hawker centre by slug
  const hawkerCentre = await prisma.hawkerCentre.findUnique({
    where: { slug }
  });

  if (!hawkerCentre) {
    throw new Error(`Hawker centre with slug "${slug}" not found`);
  }

  // Get all stalls for this hawker centre with menu items and media uploads
  const stalls = await prisma.stall.findMany({
    where: { hawkerCentreId: hawkerCentre.id },
    include: {
      menuItems: {
        where: { isActive: true },
        include: {
          mediaUploads: {
            where: { validationStatus: 'approved' },
            orderBy: { upvoteCount: 'desc' },
            take: 1
          }
        }
      },
      _count: {
        select: { menuItems: true }
      }
    }
  });

  const stallsWithActiveMenuItems = stalls.filter((stall) => stall.menuItems.length > 0);

  // Shuffle stalls array and take first N items
  const shuffled = stallsWithActiveMenuItems.sort(() => 0.5 - Math.random());
  const randomStalls = shuffled.slice(0, limit);

  // Format stalls with image URL
  const formattedStalls = randomStalls.map(stall => {
    const topUpload = stall.menuItems?.[0]?.mediaUploads?.[0]?.imageUrl ?? null;
    const prepTimes = stall.menuItems
      .map((item) => item.prepTimeMins)
      .filter((value) => typeof value === 'number');
    const maxPrepTimeMins = prepTimes.length ? Math.max(...prepTimes) : 5;
    const prices = stall.menuItems
      .map((item) => item.priceCents)
      .filter((value) => typeof value === 'number');
    const maxPriceCents = prices.length
      ? Math.max(...prices)
      : null;

    return {
      id: stall.id,
      name: stall.name,
      cuisineType: stall.cuisineType,
      dietaryTags: stall.dietaryTags ?? [],
      imageUrl: topUpload ?? stall.image_url ?? null,
      maxPrepTimeMins,
      maxPriceCents,
      menuItemCount: stall._count.menuItems
    };
  });

  return formattedStalls;
}

async function getHawkerStallsById(hawkerId) {
  // Implementation for fetching hawker stalls by hawkerId
  try {
    const stalls = await prisma.stall.findMany({
      where: { hawkerCentreId: hawkerId },
      include: {
        menuItems: {
          where: { isActive: true },
          include: {
            mediaUploads: {
              where: { validationStatus: 'approved' },
              orderBy: { upvoteCount: 'desc' },
              take: 1
            }
          }
        },
        _count: {
          select: { menuItems: true }
        }
      }
    });
    const stallsWithActiveMenuItems = stalls.filter((stall) => stall.menuItems.length > 0);
    return stallsWithActiveMenuItems.map((stall) => {
      const prepTimes = stall.menuItems
        .map((item) => item.prepTimeMins)
        .filter((value) => typeof value === 'number');
      const maxPrepTimeMins = prepTimes.length ? Math.max(...prepTimes) : 5;
      const prices = stall.menuItems
        .map((item) => item.priceCents)
        .filter((value) => typeof value === 'number');
      const maxPriceCents = prices.length
        ? Math.max(...prices)
        : null;
      return { ...stall, maxPrepTimeMins, maxPriceCents };
    });
  } catch (error) {
    console.error(`Error fetching stalls for hawkerId ${hawkerId}:`, error);
    throw new Error('Failed to fetch stalls');
  }
}

async function getHawkerDishesById(hawkerId) {
  // Implementation for fetching hawker dishes by hawkerId
  try {
    const dishes = await prisma.menuItem.findMany({
      where: {
        stall: { hawkerCentreId: hawkerId },
        isActive: true
      },
      include: {
        mediaUploads: {
          where: { validationStatus: 'approved' },
          orderBy: { upvoteCount: 'desc' },
          take: 1
        },
        menuItemTagAggs: {
          orderBy: { count: 'desc' },
          take: 6,
          include: {
            tag: {
              select: {
                normalized: true,
                displayLabel: true
              }
            }
          }
        }
      }
    });
    if (dishes.length === 0) {
      return dishes;
    }

    const dishIds = dishes.map((dish) => dish.id);
    const upvoteTotals = await prisma.mediaUpload.groupBy({
      by: ['menuItemId'],
      where: {
        menuItemId: { in: dishIds },
        validationStatus: 'approved',
      },
      _sum: {
        upvoteCount: true,
      },
    });

    const upvoteByItem = new Map(
      upvoteTotals.map((row) => [row.menuItemId, row._sum.upvoteCount ?? 0])
    );

    const uploadStats = await prisma.mediaUpload.groupBy({
      by: ['menuItemId'],
      where: {
        menuItemId: { in: dishIds },
        validationStatus: 'approved',
      },
      _count: { _all: true },
      _max: { createdAt: true },
    });

    const uploadStatsByMenuItem = new Map(
      uploadStats.map((stat) => [
        stat.menuItemId,
        {
          approvedUploadCount: stat._count?._all ?? 0,
          lastApprovedUploadAt: stat._max?.createdAt ?? null,
        },
      ])
    );

    const uploadTags = await prisma.uploadTag.findMany({
      where: {
        upload: {
          menuItemId: { in: dishIds },
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



    return dishes.map((dish) => {
      const stats = uploadStatsByMenuItem.get(dish.id) || {
        approvedUploadCount: 0,
        lastApprovedUploadAt: null,
      };

      const groups = tagGroupsByMenuItem.get(dish.id);
      const tagGroups = {
        caption: groups ? buildTagList(groups.caption, 3) : [],
        image: groups ? buildTagList(groups.image, 3) : [],
      };

      return {
        ...dish,
        approvedUploadCount: stats.approvedUploadCount,
        lastApprovedUploadAt: stats.lastApprovedUploadAt,
        tagGroups,
        upvoteCount: upvoteByItem.get(dish.id) ?? 0,
      };
    });


  } catch (error) {
    console.error(`Error fetching dishes for hawkerId ${hawkerId}:`, error);
    throw new Error('Failed to fetch dishes');
  }
}

async function getHawkerRecommendedDishesById(hawkerId, options = {}) {
  const { userId = null, anonId = null } = options;
  const dishes = await getHawkerDishesById(hawkerId);

  if (dishes.length === 0) {
    return dishes;
  }

  const dishIds = dishes.map((dish) => dish.id);
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - RECOMMENDATION_WINDOW_DAYS);

  const [statsRows, profile] = await Promise.all([
    prisma.itemStatsDaily.groupBy({
      by: ['itemId'],
      where: {
        itemId: { in: dishIds },
        date: { gte: windowStart },
      },
      _sum: {
        views: true,
        clicks: true,
        adds: true,
        orders: true,
      },
    }),
    userId
      ? prisma.userProfile.findUnique({ where: { userId } })
      : anonId
        ? prisma.userProfile.findUnique({ where: { anonId } })
        : null,
  ]);

  const statsByItemId = new Map(
    statsRows.map((row) => [
      row.itemId,
      {
        views: row._sum.views ?? 0,
        clicks: row._sum.clicks ?? 0,
        adds: row._sum.adds ?? 0,
        orders: row._sum.orders ?? 0,
      },
    ])
  );

  const similarityByItemId = new Map();
  const recentItems = Array.isArray(profile?.recentItems)
    ? profile.recentItems.filter(Boolean).slice(0, MAX_SIMILARITY_SEEDS)
    : [];

  if (recentItems.length > 0) {
    const recencyWeights = new Map();
    recentItems.forEach((itemId, index) => {
      recencyWeights.set(itemId, Math.max(1, recentItems.length - index));
    });

    const similarityRows = await prisma.itemSimilarity.findMany({
      where: {
        itemId: { in: recentItems },
        similarItemId: { in: dishIds },
      },
    });

    similarityRows.forEach((row) => {
      const weight = recencyWeights.get(row.itemId) ?? 1;
      const existing = similarityByItemId.get(row.similarItemId) ?? 0;
      similarityByItemId.set(row.similarItemId, existing + row.score * weight);
    });
  }

  const categoryScores = normalizeScoreMap(profile?.categoryScores);
  const tagScores = normalizeScoreMap(profile?.tagScores);

  const ranked = dishes.map((dish, index) => {
    const popularityScore = computePopularityScore(
      statsByItemId.get(dish.id)
    );
    const categoryScore = getScoreValue(categoryScores, dish.category);
    const dishTags = collectDishTags(dish);
    const tagScore = dishTags.reduce(
      (sum, tag) => sum + getScoreValue(tagScores, tag),
      0
    );
    const similarityScore = similarityByItemId.get(dish.id) ?? 0;
    const recommendationScore =
      popularityScore +
      categoryScore * CATEGORY_WEIGHT +
      tagScore * TAG_WEIGHT +
      similarityScore * SIMILARITY_WEIGHT;

    return {
      ...dish,
      recommendationScore,
      _rankIndex: index,
    };
  });

  return ranked
    .sort((a, b) => {
      const scoreDiff = b.recommendationScore - a.recommendationScore;
      if (scoreDiff !== 0) return scoreDiff;
      return a._rankIndex - b._rankIndex;
    })
    .map(({ _rankIndex, ...dish }) => dish);
}

async function getHawkerInfoById(hawkerId) {
  // Implementation for fetching hawker centre info by hawkerId
  try {
    const info = await prisma.hawkerCentre.findUnique({
      where: { id: hawkerId }
    });
    return info;
  } catch (error) {
    console.error(`Error fetching info for hawkerId ${hawkerId}:`, error);
    throw new Error('Failed to fetch hawker centre info');
  }
}



export default {
  getNearbyHawkerCentres,
  getRandomStallsBySlug,
  getHawkerStallsById,
  getHawkerDishesById,
  getHawkerRecommendedDishesById,
  getHawkerInfoById
};
