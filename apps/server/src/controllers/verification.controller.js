import { verificationService } from '../services/verification.service.js';
import prisma from '../lib/prisma.js';

export const verificationController = {
  async submitVerification(req, res) {
    try {
      const profile = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (profile?.role !== 'hawker') {
        return res.status(403).json({ error: 'Only hawkers can submit verification' });
      }

      if (profile?.verified) {
        return res.status(400).json({ error: 'Already verified' });
      }
      const result = await verificationService.submitVerification(req.user.id);

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
