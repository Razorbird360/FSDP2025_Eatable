import { eventsService } from '../services/events.service.js';

export const eventsController = {
  async ingestEvents(req, res, next) {
    try {
      const { events } = req.validatedBody;
      const result = await eventsService.ingestEvents(events);
      return res.status(202).json({ accepted: result.inserted });
    } catch (error) {
      next(error);
    }
  },
};
