import prisma from '../lib/prisma.js';

class AdminController {
  async listVouchers(req, res) {
    try {
      const vouchers = await prisma.existingVoucher.findMany({
        orderBy: { createdAt: 'desc' },
      });
      res.json(vouchers);
    } catch (error) {
      console.error('Error listing vouchers:', error);
      res.status(500).json({ error: 'Failed to fetch vouchers' });
    }
  }

  async createVoucher(req, res) {
    try {
      const {
        code,
        description,
        discountAmount,
        discountType,
        minSpend,
        expiryDate,
        expiryOnReceiveMonths,
      } = req.validatedBody;

      const voucher = await prisma.existingVoucher.create({
        data: {
          code,
          description: description || null,
          discountAmount,
          discountType,
          minSpend,
          expiryDate: expiryDate || null,
          expiryOnReceiveMonths: expiryOnReceiveMonths || null,
        },
      });

      res.status(201).json(voucher);
    } catch (error) {
      console.error('Error creating voucher:', error);
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Voucher code already exists' });
      }
      res.status(500).json({ error: 'Failed to create voucher' });
    }
  }

  async updateVoucher(req, res) {
    try {
      const { voucherId } = req.params;
      const {
        code,
        description,
        discountAmount,
        discountType,
        minSpend,
        expiryDate,
        expiryOnReceiveMonths,
      } = req.validatedBody;

      const data = {};
      if (code !== undefined) data.code = code;
      if (description !== undefined) data.description = description || null;
      if (discountAmount !== undefined) data.discountAmount = discountAmount;
      if (discountType !== undefined) data.discountType = discountType;
      if (minSpend !== undefined) data.minSpend = minSpend;
      if (expiryDate !== undefined) data.expiryDate = expiryDate || null;
      if (expiryOnReceiveMonths !== undefined) {
        data.expiryOnReceiveMonths = expiryOnReceiveMonths || null;
      }

      const voucher = await prisma.existingVoucher.update({
        where: { id: voucherId },
        data,
      });

      res.json(voucher);
    } catch (error) {
      console.error('Error updating voucher:', error);
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Voucher code already exists' });
      }
      res.status(500).json({ error: 'Failed to update voucher' });
    }
  }

  async deleteVoucher(req, res) {
    try {
      const { voucherId } = req.params;
      await prisma.existingVoucher.delete({
        where: { id: voucherId },
      });
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting voucher:', error);
      res.status(500).json({ error: 'Failed to delete voucher' });
    }
  }

  async listAchievements(req, res) {
    try {
      const achievements = await prisma.achievement.findMany({
        orderBy: { createdAt: 'desc' },
      });
      res.json(achievements);
    } catch (error) {
      console.error('Error listing achievements:', error);
      res.status(500).json({ error: 'Failed to fetch achievements' });
    }
  }

  async createAchievement(req, res) {
    try {
      const { code, name, description, type, target, rewardCode, isOneTime } = req.validatedBody;

      let resolvedRewardCode = rewardCode || null;
      if (resolvedRewardCode) {
        const voucher = await prisma.existingVoucher.findUnique({
          where: { code: resolvedRewardCode },
        });
        if (!voucher) {
          return res.status(400).json({ error: 'Reward voucher code not found' });
        }
      }

      const achievement = await prisma.achievement.create({
        data: {
          code,
          name,
          description: description || null,
          type,
          target,
          rewardCode: resolvedRewardCode,
          isOneTime: Boolean(isOneTime),
        },
      });

      res.status(201).json(achievement);
    } catch (error) {
      console.error('Error creating achievement:', error);
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Achievement code already exists' });
      }
      res.status(500).json({ error: 'Failed to create achievement' });
    }
  }

  async updateAchievement(req, res) {
    try {
      const { achievementId } = req.params;
      const { code, name, description, type, target, rewardCode, isOneTime } = req.validatedBody;

      let resolvedRewardCode = rewardCode;
      if (resolvedRewardCode !== undefined) {
        resolvedRewardCode = resolvedRewardCode || null;
        if (resolvedRewardCode) {
          const voucher = await prisma.existingVoucher.findUnique({
            where: { code: resolvedRewardCode },
          });
          if (!voucher) {
            return res.status(400).json({ error: 'Reward voucher code not found' });
          }
        }
      }

      const data = {};
      if (code !== undefined) data.code = code;
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description || null;
      if (type !== undefined) data.type = type;
      if (target !== undefined) data.target = target;
      if (resolvedRewardCode !== undefined) data.rewardCode = resolvedRewardCode;
      if (isOneTime !== undefined) data.isOneTime = Boolean(isOneTime);

      const achievement = await prisma.achievement.update({
        where: { id: achievementId },
        data,
      });

      res.json(achievement);
    } catch (error) {
      console.error('Error updating achievement:', error);
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Achievement code already exists' });
      }
      res.status(500).json({ error: 'Failed to update achievement' });
    }
  }

  async deleteAchievement(req, res) {
    try {
      const { achievementId } = req.params;
      await prisma.achievement.delete({
        where: { id: achievementId },
      });
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting achievement:', error);
      res.status(500).json({ error: 'Failed to delete achievement' });
    }
  }

  async updateAchievementReward(req, res) {
    try {
      const { achievementId } = req.params;
      const { rewardCode } = req.validatedBody;

      let resolvedRewardCode = rewardCode || null;
      if (resolvedRewardCode) {
        const voucher = await prisma.existingVoucher.findUnique({
          where: { code: resolvedRewardCode },
        });
        if (!voucher) {
          return res.status(400).json({ error: 'Reward voucher code not found' });
        }
      }

      const achievement = await prisma.achievement.update({
        where: { id: achievementId },
        data: { rewardCode: resolvedRewardCode },
      });

      res.json(achievement);
    } catch (error) {
      console.error('Error updating achievement reward:', error);
      res.status(500).json({ error: 'Failed to update achievement reward' });
    }
  }
}

export default new AdminController();
