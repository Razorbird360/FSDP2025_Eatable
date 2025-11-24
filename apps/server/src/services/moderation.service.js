
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
        reason,
        details: details || "",
        upload: {
          connect: { id: uploadId },
        },
        reporter: {
          connect: { id: reporterId },
        },
      },
    });

    return report;
  },

  async getReports(userid) {
    return await prisma.contentReport.findMany({
      where: {
        reporterId: userid
      },
      include: {
        upload: {
          include: {
            menuItem: {
              include: {
                stall: true
              }
            },
            user: {
              select: {
                displayName: true,
                id: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  },

  async deleteReport(reportId, userId) {
    const report = await prisma.contentReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      const err = new Error('Report not found');
      err.status = 404;
      throw err;
    }

    if (report.reporterId !== userId) {
      const err = new Error('Unauthorized to delete this report');
      err.status = 403;
      throw err;
    }

    await prisma.contentReport.delete({
      where: { id: reportId },
    });
  },
};