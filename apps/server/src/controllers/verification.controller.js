import { verificationService } from '../services/verification.service.js';
import prisma from '../lib/prisma.js';

export const verificationController = {
  async submitVerification(req, res) {
    try {
      // Check if user is hawker
      const profile = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (profile?.role !== 'hawker') {
        return res.status(403).json({ error: 'Only hawkers can submit verification' });
      }

      // Check if already verified
      if (profile.verified) {
        return res.status(400).json({ error: 'Already verified' });
      }

      // Check if file uploaded
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const result = await verificationService.submitVerification(
        req.user.id,
        req.file.buffer
      );

      res.status(200).json({
        success: true,
        verified: result.verified,
        message: 'Verification submitted successfully',
      });
    } catch (error) {
      console.error('Submit verification error:', error);
      res.status(500).json({ error: 'Failed to submit verification' });
    }
  },
};
