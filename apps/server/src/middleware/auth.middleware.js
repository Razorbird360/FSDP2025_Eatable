import Joi from 'joi';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';

export const syncUserSchema = Joi.object({
  displayName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Display name must be at least 2 characters long',
      'string.max': 'Display name cannot exceed 50 characters',
      'any.required': 'Display name is required',
    }),
});

// Validation middleware

export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    req.validatedBody = value;
    next();
  };
};

// JWT middleware

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}
