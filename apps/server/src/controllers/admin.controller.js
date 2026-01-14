import prisma from '../lib/prisma.js';

const REPORT_STATUSES = new Set(['pending', 'resolved', 'dismissed']);
const MEDIA_STATUSES = new Set(['pending', 'approved', 'rejected']);

const parseLimit = (value, fallback = 20, max = 50) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
};

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

  async listModerationUsers(req, res) {
    try {
      const { status } = req.query;
      if (status && !REPORT_STATUSES.has(status)) {
        return res.status(400).json({ error: 'Invalid report status' });
      }
      const limit = parseLimit(req.query.limit, 10, 50);

      const reports = await prisma.contentReport.findMany({
        where: status ? { status } : undefined,
        include: {
          upload: {
            select: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                  role: true,
                  createdAt: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const flaggedMap = new Map();
      reports.forEach((report) => {
        const uploader = report.upload?.user;
        if (!uploader) return;

        const existing = flaggedMap.get(uploader.id);
        if (existing) {
          existing.reportCount += 1;
          if (report.createdAt > existing.latestReportAt) {
            existing.latestReportAt = report.createdAt;
          }
        } else {
          flaggedMap.set(uploader.id, {
            id: uploader.id,
            displayName: uploader.displayName,
            email: uploader.email,
            role: uploader.role,
            createdAt: uploader.createdAt,
            reportCount: 1,
            latestReportAt: report.createdAt,
          });
        }
      });

      const flaggedUsers = Array.from(flaggedMap.values()).sort(
        (a, b) => b.reportCount - a.reportCount
      );

      res.json({
        totalReports: reports.length,
        flaggedUserCount: flaggedUsers.length,
        flaggedUsers: flaggedUsers.slice(0, limit),
      });
    } catch (error) {
      console.error('Error listing moderation users:', error);
      res.status(500).json({ error: 'Failed to fetch moderation users' });
    }
  }

  async listModerationMedia(req, res) {
    try {
      const { status, reported } = req.query;
      if (status && !MEDIA_STATUSES.has(status)) {
        return res.status(400).json({ error: 'Invalid media status' });
      }

      const limit = parseLimit(req.query.limit, 12, 50);
      const reportedOnly = reported === 'true';
      const where = {};

      if (status) {
        where.validationStatus = status;
      } else if (!reportedOnly) {
        where.validationStatus = 'pending';
      }

      if (reportedOnly) {
        where.reports = { some: {} };
      }

      const [totalCount, uploads] = await Promise.all([
        prisma.mediaUpload.count({ where }),
        prisma.mediaUpload.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
            menuItem: {
              select: {
                id: true,
                name: true,
                stall: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            _count: {
              select: {
                reports: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
      ]);

      const formattedUploads = uploads.map((upload) => ({
        ...upload,
        reportCount: upload._count?.reports ?? 0,
        _count: undefined,
      }));

      res.json({
        total: totalCount,
        count: formattedUploads.length,
        uploads: formattedUploads,
      });
    } catch (error) {
      console.error('Error listing moderation media:', error);
      res.status(500).json({ error: 'Failed to fetch moderation media' });
    }
  }

  async updateModerationMedia(req, res) {
    try {
      const { uploadId } = req.params;
      const { validationStatus } = req.validatedBody;

      const upload = await prisma.mediaUpload.update({
        where: { id: uploadId },
        data: {
          validationStatus,
          reviewedAt: new Date(),
          reviewedBy: req.user?.id || null,
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          menuItem: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              reports: true,
            },
          },
        },
      });

      res.json({
        ...upload,
        reportCount: upload._count?.reports ?? 0,
        _count: undefined,
      });
    } catch (error) {
      console.error('Error updating moderation media:', error);
      res.status(500).json({ error: 'Failed to update media status' });
    }
  }

  async listModerationReports(req, res) {
    try {
      const { status } = req.query;
      if (status && !REPORT_STATUSES.has(status)) {
        return res.status(400).json({ error: 'Invalid report status' });
      }

      const limit = parseLimit(req.query.limit, 12, 50);
      const where = status ? { status } : undefined;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [totalCount, reports, statusCounts, resolvedTodayCount] = await Promise.all([
        prisma.contentReport.count({ where }),
        prisma.contentReport.findMany({
          where,
          include: {
            reporter: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
            upload: {
              select: {
                id: true,
                imageUrl: true,
                validationStatus: true,
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    email: true,
                  },
                },
                menuItem: {
                  select: {
                    id: true,
                    name: true,
                    stall: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        prisma.contentReport.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        prisma.contentReport.count({
          where: {
            status: 'resolved',
            updatedAt: { gte: todayStart },
          },
        }),
      ]);

      const summary = { pending: 0, resolved: 0, dismissed: 0, resolvedToday: resolvedTodayCount };
      statusCounts.forEach((row) => {
        summary[row.status] = row._count?._all ?? 0;
      });

      res.json({
        total: totalCount,
        count: reports.length,
        reports,
        summary,
      });
    } catch (error) {
      console.error('Error listing moderation reports:', error);
      res.status(500).json({ error: 'Failed to fetch moderation reports' });
    }
  }

  async updateModerationReport(req, res) {
    try {
      const { reportId } = req.params;
      const { status } = req.validatedBody;

      const report = await prisma.contentReport.update({
        where: { id: reportId },
        data: { status },
      });

      res.json(report);
    } catch (error) {
      console.error('Error updating moderation report:', error);
      res.status(500).json({ error: 'Failed to update report status' });
    }
  }
}

export default new AdminController();
