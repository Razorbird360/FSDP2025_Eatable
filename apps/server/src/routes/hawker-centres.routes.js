import express from 'express';
import hawkerCentresController from '../controllers/hawker-centres.controller.js';

const router = express.Router();

router.get('/', hawkerCentresController.getNearby);

router.get('/:slug/stalls/random', hawkerCentresController.getRandomStalls);

router.get('/stalls/:hawkerId', hawkerCentresController.getHawkerStalls);
router.get(
  '/dishes/:hawkerId/recommended',
  hawkerCentresController.getHawkerRecommendedDishes
);
router.get('/dishes/:hawkerId', hawkerCentresController.getHawkerDishes);
router.get('/info/:hawkerId', hawkerCentresController.getHawkerInfo);

export default router;
