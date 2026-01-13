import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    // Try to get image from first menu item's top media upload
    let imageUrl = stall.image_url;

    if (stall.menuItems.length > 0 && stall.menuItems[0].mediaUploads.length > 0) {
      imageUrl = stall.menuItems[0].mediaUploads[0].imageUrl;
    }
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
      imageUrl: stall.image_url,
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
  getHawkerInfoById
};
