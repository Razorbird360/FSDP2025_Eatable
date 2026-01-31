import { z } from 'zod';
import { createTool, ToolContext } from './tool-base.js';
import { mediaService } from '../../services/media.service.js';

const dishSchema = z.object({
  menuItemId: z.string().min(1),
});

const mapUpload = (upload) => ({
  id: upload.id,
  menuItemId: upload.menuItemId,
  userId: upload.userId,
  imageUrl: upload.imageUrl,
  caption: upload.caption ?? null,
  validationStatus: upload.validationStatus,
  reviewedAt: upload.reviewedAt ?? null,
  reviewedBy: upload.reviewedBy ?? null,
  upvoteCount: upload.upvoteCount,
  downvoteCount: upload.downvoteCount,
  voteScore: upload.voteScore,
  createdAt: upload.createdAt,
  updatedAt: upload.updatedAt,
  aspectRatio: upload.aspectRatio ?? null,
  user: upload.user
    ? {
        id: upload.user.id,
        displayName: upload.user.displayName,
      }
    : null,
  menuItem: upload.menuItem
    ? {
        id: upload.menuItem.id,
        name: upload.menuItem.name,
        stallId: upload.menuItem.stallId,
      }
    : null,
  counts: upload._count
    ? {
        votes: upload._count.votes ?? 0,
        reports: upload._count.reports ?? 0,
      }
    : null,
});

const mapUploads = (uploads = []) => uploads.map(mapUpload);

export const createMediaTools = (context: ToolContext) => [
  createTool(
    {
      name: 'get_dish_uploads',
      description: 'Fetch approved community uploads for a dish.',
      schema: dishSchema,
      handler: async ({ menuItemId }) => {
        const uploads = await mediaService.getByMenuItem(menuItemId, 'approved');
        return {
          menuItemId,
          uploads: mapUploads(uploads),
        };
      },
    },
    context
  ),
];
