import prisma from '../lib/prisma.js';

export const achievementService = {
    /**
     * Track a vote action for a user and check for achievements/rewards.
     * @param {string} userId - The ID of the user voting.
     * @param {string} monthYear - The month and year of the vote (e.g., "2023-10").
     */
    async trackVote(userId, monthYear) {
        let monthlyAction = await this.getOrCreateMonthlyAction(userId, monthYear);

        const updatedAction = await prisma.userMonthlyAction.update({
            where: { id: monthlyAction.id },
            data: {
                voteCount: { increment: 1 },
            },
        });

        await this.grantRewardsIfEligible({
            userId,
            actionType: 'vote',
            actionCount: updatedAction.voteCount,
            monthYear,
            monthlyActionId: updatedAction.id,
        });

        return updatedAction;
    },

    /**
     * Track an upload action for a user.
     * @param {string} userId - The ID of the user uploading.
     * @param {string} monthYear - The month and year.
     */
    async trackUpload(userId, monthYear) {
        let monthlyAction = await this.getOrCreateMonthlyAction(userId, monthYear);

        const updatedAction = await prisma.userMonthlyAction.update({
            where: { id: monthlyAction.id },
            data: {
                uploadCount: { increment: 1 },
            },
        });

        await this.grantRewardsIfEligible({
            userId,
            actionType: 'upload',
            actionCount: updatedAction.uploadCount,
            monthYear,
            monthlyActionId: updatedAction.id,
        });

        return updatedAction;
    },

    async getOrCreateMonthlyAction(userId, monthYear) {
        await this.cleanupMonthlyRecords(userId, monthYear);

        let monthlyAction = await prisma.userMonthlyAction.findUnique({
            where: {
                userId_monthYear: {
                    userId,
                    monthYear,
                },
            },
        });

        if (!monthlyAction) {
            monthlyAction = await prisma.userMonthlyAction.create({
                data: {
                    userId,
                    monthYear,
                    voteCount: 0,
                    uploadCount: 0,
                    rewarded: false,
                },
            });
        }
        return monthlyAction;
    },

    async cleanupMonthlyRecords(userId, monthYear) {
        await prisma.userMonthlyAction.deleteMany({
            where: {
                userId,
                monthYear: { lt: monthYear },
            },
        });

        const [year, month] = monthYear.split('-').map(Number);
        const monthStart = new Date(Date.UTC(year, month - 1, 1));

        await prisma.userAchievement.deleteMany({
            where: {
                userId,
                unlockedAt: { lt: monthStart },
                achievement: { isOneTime: false },
            },
        });
    },

    async grantRewardsIfEligible({ userId, actionType, actionCount, monthYear, monthlyActionId }) {
        const achievements = await prisma.achievement.findMany({
            where: {
                type: actionType,
                target: { gt: 0 },
            },
            orderBy: {
                target: 'asc',
            },
        });

        if (achievements.length === 0) {
            return;
        }

        const monthlyAchievements = achievements.filter((achievement) => !achievement.isOneTime);
        const oneTimeAchievements = achievements.filter((achievement) => achievement.isOneTime);

        await this.grantMonthlyRewards({
            userId,
            actionCount,
            monthYear,
            monthlyActionId,
            achievements: monthlyAchievements,
        });

        await this.grantOneTimeAchievements({
            userId,
            actionType,
            monthlyActionId,
            achievements: oneTimeAchievements,
        });
    },

    async grantMonthlyRewards({ userId, actionCount, monthYear, monthlyActionId, achievements }) {
        const rewardAchievements = achievements.filter(
            (achievement) => achievement.rewardCode && achievement.target <= actionCount
        );

        if (rewardAchievements.length === 0) {
            return;
        }

        const [year, month] = monthYear.split('-').map(Number);
        const monthStart = new Date(Date.UTC(year, month - 1, 1));
        const nextMonthStart = new Date(Date.UTC(year, month, 1));

        const rewardedVouchers = await prisma.userVoucher.findMany({
            where: {
                userId,
                createdAt: {
                    gte: monthStart,
                    lt: nextMonthStart,
                },
                voucher: {
                    code: {
                        in: rewardAchievements.map((achievement) => achievement.rewardCode),
                    },
                },
            },
            select: {
                voucher: {
                    select: { code: true },
                },
            },
        });

        const rewardedCodes = new Set(rewardedVouchers.map((reward) => reward.voucher.code));

        for (const rewardAchievement of rewardAchievements) {
            if (!rewardAchievement.rewardCode || rewardedCodes.has(rewardAchievement.rewardCode)) {
                continue;
            }

            await this.grantMonthlyReward(userId, monthlyActionId, rewardAchievement.rewardCode);
            rewardedCodes.add(rewardAchievement.rewardCode);
        }
    },

    async grantOneTimeAchievements({ userId, actionType, monthlyActionId, achievements }) {
        if (achievements.length === 0) {
            return;
        }

        const totalCount = actionType === 'vote'
            ? await prisma.mediaUploadVote.count({ where: { userId } })
            : await prisma.mediaUpload.count({ where: { userId } });

        const eligible = achievements.filter((achievement) => achievement.target <= totalCount);

        if (eligible.length === 0) {
            return;
        }

        const unlockedAchievements = await prisma.userAchievement.findMany({
            where: {
                userId,
                achievementId: {
                    in: eligible.map((achievement) => achievement.id),
                },
            },
            select: { achievementId: true },
        });

        const unlockedIds = new Set(unlockedAchievements.map((item) => item.achievementId));

        for (const achievement of eligible) {
            if (unlockedIds.has(achievement.id)) {
                continue;
            }

            await this.grantOneTimeAchievement(userId, achievement, monthlyActionId);
        }
    },

    async grantOneTimeAchievement(userId, achievement, monthlyActionId) {
        try {
            await prisma.$transaction(async (tx) => {
                await tx.userAchievement.create({
                    data: {
                        userId,
                        achievementId: achievement.id,
                    },
                });

                if (!achievement.rewardCode) {
                    return;
                }

                const voucher = await tx.existingVoucher.findUnique({
                    where: { code: achievement.rewardCode },
                });

                if (!voucher) {
                    console.error(`Voucher code ${achievement.rewardCode} not found. Cannot grant reward.`);
                    return;
                }

                const expiryDate = this.calculateExpiryDate(voucher);

                await tx.userVoucher.create({
                    data: {
                        userId,
                        voucherId: voucher.id,
                        isUsed: false,
                        expiryDate,
                    },
                });

                if (monthlyActionId) {
                    await tx.userMonthlyAction.update({
                        where: { id: monthlyActionId },
                        data: { rewarded: true },
                    });
                }
            });

            console.log(`Unlocked one-time achievement ${achievement.code} for user ${userId}`);
        } catch (error) {
            if (error?.code === 'P2002') {
                return;
            }
            console.error('Error granting one-time achievement:', error);
        }
    },

    /**
     * Grant the monthly reward to the user.
     * @param {string} userId - The user ID.
     * @param {string} monthlyActionId - The ID of the monthly action record.
     * @param {string} rewardCode - The voucher code to grant.
     */
    async grantMonthlyReward(userId, monthlyActionId, rewardCode) {
        try {
            const voucher = await prisma.existingVoucher.findUnique({
                where: { code: rewardCode },
            });

            if (!voucher) {
                console.error(`Voucher code ${rewardCode} not found. Cannot grant reward.`);
                return;
            }

            const expiryDate = this.calculateExpiryDate(voucher);

            await prisma.$transaction(async (tx) => {
                await tx.userVoucher.create({
                    data: {
                        userId,
                        voucherId: voucher.id,
                        isUsed: false,
                        expiryDate,
                    },
                });

                await tx.userMonthlyAction.update({
                    where: { id: monthlyActionId },
                    data: { rewarded: true },
                });
            });

            console.log(`Granted ${rewardCode} to user ${userId}`);
        } catch (error) {
            console.error('Error granting monthly reward:', error);
        }
    },

    calculateExpiryDate(voucher) {
        if (voucher.expiryOnReceiveMonths && voucher.expiryOnReceiveMonths > 0) {
            const expiry = new Date();
            expiry.setMonth(expiry.getMonth() + voucher.expiryOnReceiveMonths);
            return expiry;
        }

        if (voucher.expiryDate) {
            return voucher.expiryDate;
        }

        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    },
};
