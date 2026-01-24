import searchService from '../services/search.service.js';

const MIN_QUERY_LENGTH = 1;

function emptyResponse() {
  return { hawkerCentres: [], stalls: [], dishes: [] };
}

async function search(req, res, next) {
  try {
    const rawQuery = typeof req.query.q === 'string' ? req.query.q : '';
    const query = rawQuery.trim();

    if (query.length < MIN_QUERY_LENGTH) {
      return res.json(emptyResponse());
    }

    const limitParam = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined;

    const results = await searchService.search(query, limit);
    return res.json(results);
  } catch (error) {
    return next(error);
  }
}

export default {
  search,
};
