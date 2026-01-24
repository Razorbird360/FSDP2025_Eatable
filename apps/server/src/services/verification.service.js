import prisma from '../lib/prisma.js';

export const verificationService = {
  async submitVerification(userId) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          verified: true,
          verificationPhotoUrl: null,
          verificationSubmittedAt: new Date(),
        },
      });

      return { verified: true };
    } catch (error) {
      console.error('Verification submission error:', error);
      throw error;
    }
  },
};
