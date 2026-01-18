import { Router } from 'express';
import Joi from 'joi';
import { eventsController } from '../controllers/events.controller.js';
import { validate } from '../middleware/auth.middleware.js';

const eventSchema = Joi.object({
  userId: Joi.string().guid({ version: 'uuidv4' }).allow(null),
  anonId: Joi.string().trim().max(128).allow(null),
  sessionId: Joi.string().trim().max(128).required(),
  eventType: Joi.string().valid('view', 'click', 'add_to_cart', 'order').required(),
  itemId: Joi.string().guid({ version: 'uuidv4' }).required(),
  categoryId: Joi.string().trim().allow('', null),
  timestamp: Joi.date().iso().required(),
  metadata: Joi.object().unknown(true).allow(null),
})
  .custom((value, helpers) => {
    if (!value.userId && !value.anonId) {
      return helpers.error('any.custom');
    }
    return value;
  }, 'user or anon validation')
  .messages({
    'any.custom': 'Either userId or anonId is required',
  });

const eventsPayloadSchema = Joi.object({
  events: Joi.array().items(eventSchema).min(1).required(),
});

const router = Router();

router.post('/', validate(eventsPayloadSchema), eventsController.ingestEvents);

export default router;
