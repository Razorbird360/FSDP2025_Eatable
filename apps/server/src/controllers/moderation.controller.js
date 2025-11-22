import { moderationService } from '../services/moderation.service.js';

export const moderationController = {
    async reportUpload(req, res, next) {
        try {
            const uploadId = req.params.uploadId;
            const { reason, details } = req.body;
            const reporterId = req.user?.id; // assuming auth middleware sets this

            if (!reporterId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            if (!uploadId || !reason) {
                return res.status(400).json({
                    error: 'uploadId and reason are required',
                });
            }

            const report = await moderationService.createReport({
                uploadId,
                reporterId,
                reason: String(reason).trim(),
                details: details ? String(details).trim() : null,
            });

            return res.status(201).json(report);
        } catch (err) {
            // If service set a status, reuse it
            if (err.status) {
                return res.status(err.status).json({ error: err.message });
            }
            next(err); // let your global error handler deal with it
        }
    },

    async getReports(req, res, next) {
        try {
            const userid = req.user?.id;
            const reports = await moderationService.getReports(userid);
            return res.status(200).json(reports);
        } catch (err) {
            if (err.status) {
                return res.status(err.status).json({ error: err.message });
            }
            next(err);
        }
    },

    async deleteReport(req, res, next) {
        try {
            const reportId = req.params.reportId;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            await moderationService.deleteReport(reportId, userId);
            return res.status(200).json({ message: 'Report withdrawn successfully' });
        } catch (err) {
            if (err.status) {
                return res.status(err.status).json({ error: err.message });
            }
            next(err);
        }
    },
};