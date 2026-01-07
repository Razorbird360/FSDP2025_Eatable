import { Router } from 'express';
import Joi from 'joi';
import adminController from '../controllers/admin.controller.js';
import { authMiddleware, validate } from '../middleware/auth.middleware.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';

const router = Router();

const createVoucherSchema = Joi.object({
  code: Joi.string().trim().max(50).required(),
  description: Joi.string().allow('', null),
  discountAmount: Joi.number().integer().min(0).required(),
  discountType: Joi.string().valid('fixed', 'percentage').required(),
  minSpend: Joi.number().integer().min(0).default(0),
  expiryDate: Joi.date().iso().allow(null),
  expiryOnReceiveMonths: Joi.number().integer().min(1).allow(null),
});

const createAchievementSchema = Joi.object({
  code: Joi.string().trim().max(50).required(),
  name: Joi.string().trim().max(100).required(),
  description: Joi.string().allow('', null),
  type: Joi.string().valid('vote', 'upload').required(),
  target: Joi.number().integer().min(1).required(),
  rewardCode: Joi.string().trim().allow('', null),
  isOneTime: Joi.boolean().default(false),
});

const updateVoucherSchema = Joi.object({
  code: Joi.string().trim().max(50),
  description: Joi.string().allow('', null),
  discountAmount: Joi.number().integer().min(0),
  discountType: Joi.string().valid('fixed', 'percentage'),
  minSpend: Joi.number().integer().min(0),
  expiryDate: Joi.date().iso().allow(null),
  expiryOnReceiveMonths: Joi.number().integer().min(1).allow(null),
}).min(1);

const updateAchievementSchema = Joi.object({
  code: Joi.string().trim().max(50),
  name: Joi.string().trim().max(100),
  description: Joi.string().allow('', null),
  type: Joi.string().valid('vote', 'upload'),
  target: Joi.number().integer().min(1),
  rewardCode: Joi.string().trim().allow('', null),
  isOneTime: Joi.boolean(),
}).min(1);

const updateAchievementRewardSchema = Joi.object({
  rewardCode: Joi.string().trim().allow('', null),
});

const updateMediaStatusSchema = Joi.object({
  validationStatus: Joi.string().valid('pending', 'approved', 'rejected').required(),
});

const updateReportStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'resolved', 'dismissed').required(),
});

router.get('/vouchers', authMiddleware, adminMiddleware, adminController.listVouchers);
router.post(
  '/vouchers',
  authMiddleware,
  adminMiddleware,
  validate(createVoucherSchema),
  adminController.createVoucher
);
router.patch(
  '/vouchers/:voucherId',
  authMiddleware,
  adminMiddleware,
  validate(updateVoucherSchema),
  adminController.updateVoucher
);
router.delete(
  '/vouchers/:voucherId',
  authMiddleware,
  adminMiddleware,
  adminController.deleteVoucher
);

router.get('/achievements', authMiddleware, adminMiddleware, adminController.listAchievements);
router.post(
  '/achievements',
  authMiddleware,
  adminMiddleware,
  validate(createAchievementSchema),
  adminController.createAchievement
);
router.patch(
  '/achievements/:achievementId',
  authMiddleware,
  adminMiddleware,
  validate(updateAchievementSchema),
  adminController.updateAchievement
);
router.delete(
  '/achievements/:achievementId',
  authMiddleware,
  adminMiddleware,
  adminController.deleteAchievement
);
router.patch(
  '/achievements/:achievementId/reward',
  authMiddleware,
  adminMiddleware,
  validate(updateAchievementRewardSchema),
  adminController.updateAchievementReward
);

router.get(
  '/moderation/users',
  authMiddleware,
  adminMiddleware,
  adminController.listModerationUsers
);
router.get(
  '/moderation/media',
  authMiddleware,
  adminMiddleware,
  adminController.listModerationMedia
);
router.patch(
  '/moderation/media/:uploadId',
  authMiddleware,
  adminMiddleware,
  validate(updateMediaStatusSchema),
  adminController.updateModerationMedia
);
router.get(
  '/moderation/reports',
  authMiddleware,
  adminMiddleware,
  adminController.listModerationReports
);
router.patch(
  '/moderation/reports/:reportId',
  authMiddleware,
  adminMiddleware,
  validate(updateReportStatusSchema),
  adminController.updateModerationReport
);

export default router;
