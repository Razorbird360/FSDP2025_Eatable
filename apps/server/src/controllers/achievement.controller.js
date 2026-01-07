import prisma from '../lib/prisma.js';

export const achievementController = {
    /**
     * Get the current user's monthly achievement status.
     * GET /api/achievements/status
     */
    async getMonthlyStatus(req, res, next) {
        try {
            const userId = req.user.id;
            const date = new Date();
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const [year, month] = monthYear.split('-').map(Number);
            const monthStart = new Date(Date.UTC(year, month - 1, 1));

            await prisma.userMonthlyAction.deleteMany({
                where: {
                    userId,
                    monthYear: { lt: monthYear },
                },
            });

            await prisma.userAchievement.deleteMany({
                where: {
                    userId,
                    unlockedAt: { lt: monthStart },
                    achievement: { isOneTime: false },
                },
            });

            let monthlyAction = await prisma.userMonthlyAction.findUnique({
                where: {
                    userId_monthYear: {
                        userId,
                        monthYear,
                    },
                },
            });

            // If no record exists, return default zero state
            if (!monthlyAction) {
                monthlyAction = {
                    voteCount: 0,
                    uploadCount: 0,
                    rewarded: false,
                };
            }

            const [achievementDefinitions, voteTotal, uploadTotal, unlockedAchievements] = await Promise.all([
                prisma.achievement.findMany({
                    where: {
                        type: { in: ['vote', 'upload'] },
                        target: { gt: 0 },
                    },
                    orderBy: [
                        { type: 'asc' },
                        { target: 'asc' },
                    ],
                }),
                prisma.mediaUploadVote.count({
                    where: { userId },
                }),
                prisma.mediaUpload.count({
                    where: { userId },
                }),
                prisma.userAchievement.findMany({
                    where: { userId },
                    select: { achievementId: true },
                }),
            ]);

            const actionCounts = {
                vote: monthlyAction.voteCount,
                upload: monthlyAction.uploadCount,
            };
            const totalCounts = {
                vote: voteTotal || 0,
                upload: uploadTotal || 0,
            };
            const unlockedIds = new Set(unlockedAchievements.map(item => item.achievementId));

            const achievements = achievementDefinitions
                .filter(definition => actionCounts[definition.type] !== undefined)
                .map(definition => {
                    const isOneTime = Boolean(definition.isOneTime);
                    const baseCurrent = isOneTime
                        ? totalCounts[definition.type]
                        : actionCounts[definition.type];
                    const unlocked = isOneTime && unlockedIds.has(definition.id);
                    const current = unlocked && baseCurrent < definition.target
                        ? definition.target
                        : baseCurrent;

                    return {
                        id: definition.id,
                        code: definition.code,
                        name: definition.name,
                        description: definition.description,
                        badgeUrl: definition.badgeUrl,
                        type: definition.type,
                        target: definition.target,
                        current,
                        reward: definition.rewardCode || null,
                        isOneTime,
                        unlocked,
                    };
                });

            // Calculate progress for each achievement
            const achievementsWithProgress = achievements.map(ach => ({
                ...ach,
                progress: Math.min(ach.current, ach.target),
                percentage: (Math.min(ach.current, ach.target) / ach.target) * 100,
                completed: ach.unlocked || ach.current >= ach.target,
                remaining: Math.max(0, ach.target - ach.current),
            }));

            let closestAchievement = null;
            if (achievementsWithProgress.length > 0) {
                const incompleteAchievements = achievementsWithProgress.filter(a => !a.completed);
                closestAchievement = incompleteAchievements.length > 0
                    ? incompleteAchievements.reduce((prev, curr) =>
                        curr.percentage > prev.percentage ? curr : prev
                    )
                    : achievementsWithProgress[achievementsWithProgress.length - 1];
            }

            res.json({
                monthYear,
                monthlyAction,
                achievements: achievementsWithProgress,
                closestAchievement,
            });
        } catch (error) {
            next(error);
        }
    },
};
