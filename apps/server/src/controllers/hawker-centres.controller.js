import hawkerCentresService from '../services/hawker-centres.service.js';

/**
 * Get nearby hawker centres sorted by distance
 * Query params: lat, lng, limit
 */
async function getNearby(req, res) {
  try {
    const lat = parseFloat(req.query.lat) || 1.315528101289874; // Default: Clementi MRT
    const lng = parseFloat(req.query.lng) || 103.76508385110719; // Default: Clementi MRT
    const limit = parseInt(req.query.limit) || 10;

    const centres = await hawkerCentresService.getNearbyHawkerCentres({
      lat,
      lng,
      limit
    });

    res.json(centres);
  } catch (error) {
    console.error('Error fetching nearby hawker centres:', error);
    res.status(500).json({ error: 'Failed to fetch hawker centres' });
  }
}

/**
 * Get random stalls for a hawker centre
 * Params: slug
 * Query params: limit
 */
async function getRandomStalls(req, res) {
  try {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit) || 3;

    const stalls = await hawkerCentresService.getRandomStallsBySlug(slug, limit);

    res.json(stalls);
  } catch (error) {
    console.error(`Error fetching random stalls for ${req.params.slug}:`, error);

    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch stalls' });
    }
  }
}

export default {
  getNearby,
  getRandomStalls
};
