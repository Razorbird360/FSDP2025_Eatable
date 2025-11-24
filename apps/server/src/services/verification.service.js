import { storageService } from './storage.service.js';
import prisma from '../lib/prisma.js';

export const verificationService = {
  async submitVerification(userId, photoBuffer) {
    try {
      // Upload photo to Supabase Storage
      const fileName = `${userId}_${Date.now()}.jpg`;
      const photoUrl = await storageService.uploadImage({
        buffer: photoBuffer,
        fileName,
        bucket: 'verification-photos',
        aspectRatio: 'square',
      });

      // Update user verification status
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          verified: true,
          verificationPhotoUrl: photoUrl,
          verificationSubmittedAt: new Date(),
        },
      });

      return { verified: true, photoUrl };
    } catch (error) {
      console.error('Verification submission error:', error);
      throw error;
    }
  },
};
