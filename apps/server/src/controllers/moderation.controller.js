import { moderationService } from '../services/moderation.service.js';

export const moderationController = {
    async reportUpload(req, res, next) {
        try {
            const { uploadId } = req.params;
            const { reason, reportedBy } = req.body;
            const result = await moderationService.reportUpload(uploadId, reason, reportedBy);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

};

