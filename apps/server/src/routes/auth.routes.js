import express from 'express';
import { signup } from '../controllers/auth.controller.js';
import { validate, signupSchema } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/signup', validate(signupSchema), signup);

export default router;
