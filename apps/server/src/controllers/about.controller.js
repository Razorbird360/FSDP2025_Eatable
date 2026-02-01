import aboutService from '../services/about.service.js';

async function getStats(req, res, next) {
  try {
    const stats = await aboutService.getAboutStats();
    return res.status(200).json(stats);
  } catch (error) {
    return next(error);
  }
}

export const aboutController = { getStats };
