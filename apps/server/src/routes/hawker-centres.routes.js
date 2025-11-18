import express from 'express';
import hawkerCentresController from '../controllers/hawker-centres.controller.js';

const router = express.Router();

router.get('/', hawkerCentresController.getNearby);

router.get('/:slug/stalls/random', hawkerCentresController.getRandomStalls);

export default router;
