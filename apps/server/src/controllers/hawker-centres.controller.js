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

async function getHawkerStalls(req, res) {
  
  // Implementation for fetching hawker stalls by hawkerId
  try  {
    const { hawkerId } = req.params;
    const stalls = await hawkerCentresService.getHawkerStallsById(hawkerId);
    res.json(stalls);
  } catch (error) {
    console.error(`Error fetching stalls for hawkerId ${req.params.hawkerId}:`, error);
    res.status(500).json({ error: 'Failed to fetch stalls' });
  }

}

async function getHawkerDishes(req, res) {
  // Implementation for fetching hawker dishes by hawkerId
  try  {
    const { hawkerId } = req.params;
    const dishes = await hawkerCentresService.getHawkerDishesById(hawkerId);
    res.json(dishes);
  } catch (error) {
    console.error(`Error fetching dishes for hawkerId ${req.params.hawkerId}:`, error);
    res.status(500).json({ error: 'Failed to fetch dishes' });
  }
}

async function getHawkerRecommendedDishes(req, res) {
  try {
    const { hawkerId } = req.params;
    const userId = req.query.userId || null;
    const anonId = req.query.anonId || null;
    const dishes = await hawkerCentresService.getHawkerRecommendedDishesById(
      hawkerId,
      { userId, anonId }
    );
    res.json(dishes);
  } catch (error) {
    console.error(
      `Error fetching recommended dishes for hawkerId ${req.params.hawkerId}:`,
      error
    );
    res.status(500).json({ error: 'Failed to fetch recommended dishes' });
  }
}

async function getHawkerInfo(req, res) {
  // Implementation for fetching hawker centre info by hawkerId
  try {
    const { hawkerId } = req.params;
    const info = await hawkerCentresService.getHawkerInfoById(hawkerId);
    res.json(info);
  } catch (error) {
    console.error(`Error fetching info for hawkerId ${req.params.hawkerId}:`, error);
    res.status(500).json({ error: 'Failed to fetch hawker centre info' });
  }
}

async function getAll(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const centres = await hawkerCentresService.getAllHawkerCentres(limit);
    res.json(centres);
  } catch (error) {
    console.error('Error fetching all hawker centres:', error);
    res.status(500).json({ error: 'Failed to fetch hawker centres' });
  }
}

export default {
  getNearby,
  getRandomStalls,
  getHawkerStalls,
  getHawkerDishes,
  getHawkerRecommendedDishes,
  getHawkerInfo,
  getAll
};
