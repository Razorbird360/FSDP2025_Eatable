import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

  // Shuffle stalls array and take first N items
  const shuffled = stalls.sort(() => 0.5 - Math.random());
  const randomStalls = shuffled.slice(0, limit);

  // Format stalls with image URL
  const formattedStalls = randomStalls.map(stall => {
    // Try to get image from first menu item's top media upload
    let imageUrl = stall.image_url;

    if (stall.menuItems.length > 0 && stall.menuItems[0].mediaUploads.length > 0) {
      imageUrl = stall.menuItems[0].mediaUploads[0].imageUrl;
    }

    return {
      id: stall.id,
      name: stall.name,
      cuisineType: stall.cuisineType,
      imageUrl,
      menuItemCount: stall._count.menuItems
    };
  });

  return formattedStalls;
}

export default {
  getNearbyHawkerCentres,
  getRandomStallsBySlug
};
