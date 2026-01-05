import { achievementService } from '../services/achievement.service.js';
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

            // Define all achievement milestones
            const achievements = [
                { id: 'vote_3', name: 'Casual Voter', type: 'vote', target: 3, current: monthlyAction.voteCount, reward: 'VOTER_REWARD' },
                { id: 'vote_5', name: 'Active Voter', type: 'vote', target: 5, current: monthlyAction.voteCount, reward: null },
                { id: 'vote_10', name: 'Super Voter', type: 'vote', target: 10, current: monthlyAction.voteCount, reward: null },
                { id: 'upload_5', name: 'Content Creator', type: 'upload', target: 5, current: monthlyAction.uploadCount, reward: null },
            ];

            // Calculate progress for each achievement
            const achievementsWithProgress = achievements.map(ach => ({
                ...ach,
                progress: Math.min(ach.current, ach.target),
                percentage: (Math.min(ach.current, ach.target) / ach.target) * 100,
                completed: ach.current >= ach.target,
                remaining: Math.max(0, ach.target - ach.current),
            }));

            // Find the closest achievement (not yet completed, highest percentage)
            const incompleteAchievements = achievementsWithProgress.filter(a => !a.completed);
            const closestAchievement = incompleteAchievements.length > 0
                ? incompleteAchievements.reduce((prev, curr) =>
                    curr.percentage > prev.percentage ? curr : prev
                )
                : achievementsWithProgress[achievementsWithProgress.length - 1]; // If all complete, show the last one

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
