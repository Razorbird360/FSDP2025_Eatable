import prisma from '../lib/prisma.js';
import voucherService from './voucher.service.js';

export const achievementService = {
    /**
     * Track a vote action for a user and check for achievements/rewards.
     * @param {string} userId - The ID of the user voting.
     * @param {string} monthYear - The month and year of the vote (e.g., "2023-10").
     */
    async trackVote(userId, monthYear) {
        // 1. Find or create the monthly action record
        let monthlyAction = await this.getOrCreateMonthlyAction(userId, monthYear);

        // 2. Increment vote count
        const updatedAction = await prisma.userMonthlyAction.update({
            where: { id: monthlyAction.id },
            data: {
                voteCount: { increment: 1 },
            },
        });

        // 3. Check if reward criteria met (3 votes) and not yet rewarded
        // Note: Currently only rewarding for the first milestone (3 votes)
        if (updatedAction.voteCount >= 3 && !updatedAction.rewarded) {
            await this.grantMonthlyVoterReward(userId, updatedAction.id);
        }

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

        // Future: Check for upload rewards (e.g. 5 uploads)

        return updatedAction;
    },

    async getOrCreateMonthlyAction(userId, monthYear) {
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

    /**
     * Grant the monthly voter reward to the user.
     * @param {string} userId - The user ID.
     * @param {string} monthlyActionId - The ID of the monthly action record.
     */
    async grantMonthlyVoterReward(userId, monthlyActionId) {
        const VOUCHER_CODE = 'VOTER_REWARD'; // Ensure this exists in ExistingVoucher

        try {
            // 1. Get the voucher definition
            const voucher = await prisma.existingVoucher.findUnique({
                where: { code: VOUCHER_CODE },
            });

            if (!voucher) {
                console.error(`Voucher code ${VOUCHER_CODE} not found. Cannot grant reward.`);
                return;
            }

            // 2. Assign voucher to user
            // We use a transaction to ensure we mark the action as rewarded only if voucher is given
            await prisma.$transaction(async (tx) => {
                // Create UserVoucher
                await tx.userVoucher.create({
                    data: {
                        userId,
                        voucherId: voucher.id,
                        isUsed: false,
                        // Set expiry to 30 days from now, or use voucher default if logic requires
                        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    },
                });

                // Mark monthly action as rewarded
                await tx.userMonthlyAction.update({
                    where: { id: monthlyActionId },
                    data: { rewarded: true },
                });
            });

            console.log(`Granted ${VOUCHER_CODE} to user ${userId}`);
        } catch (error) {
            console.error('Error granting monthly voter reward:', error);
            // Don't throw, just log. We don't want to fail the vote action if reward fails.
        }
    },
};
