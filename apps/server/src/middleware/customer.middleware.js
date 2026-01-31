import { userService } from '../services/user.service.js';

export async function customerMiddleware(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await userService.findById(userId);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (user.role !== 'user') {
      return res.status(403).json({ error: 'Customer access required' });
    }

    next();
  } catch (error) {
    console.error('Customer middleware error:', error);
    return res.status(500).json({ error: 'Authorization failed' });
  }
}
