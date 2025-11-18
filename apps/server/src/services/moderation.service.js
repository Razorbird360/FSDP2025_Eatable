
import prisma from '../lib/prisma.js';

export const moderationService = {
      /**
   * Create a new content report
   * @param {Object} params
   * @param {string} params.uploadId - ID of the media upload being reported
   * @param {string} params.reporterId - ID of the user submitting the report
   * @param {string} params.reason - Reason text for the report
   */
  async createReport({ uploadId, reporterId, reason, details = null }) {
    // Optional: verify upload exists
    const upload = await prisma.mediaUpload.findUnique({
      where: { id: uploadId },
      select: { id: true },
    });

    if (!upload) {
      const err = new Error('Upload not found');
      err.status = 404;
      throw err;
    }

    const alreadyReported = await prisma.contentReport.findFirst({
      where: {
        uploadId,
        reporterId,
        },
    });
    if (alreadyReported) {
      const err = new Error('You have already reported this upload');
      err.status = 400;
      throw err;
    }


    const report = await prisma.contentReport.create({
      data: {
        uploadId,
        reporterId,
        reason,
        details,
      },
    });

    return report;
  },

  async getReports(userid) {
    return await prisma.contentReport.findMany({
        where: {
            reporterId: userid
        }
    });
  },
    

};