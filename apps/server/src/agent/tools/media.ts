import { z } from 'zod';
import { createTool, ToolContext } from './tool-base.js';
import { mediaService } from '../../services/media.service.js';

const dishSchema = z.object({
  menuItemId: z.string().min(1),
});

const voteSchema = z.object({
  uploadId: z.string().min(1),
});

const uploadSchema = z.object({
  menuItemId: z.string().min(1),
  caption: z.string().max(500).optional(),
  aspectRatio: z.enum(['square', 'rectangle']).optional(),
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

const fetchUpload = async (uploadId) => {
  const upload = await mediaService.getById(uploadId);
  return upload ? mapUpload(upload) : null;
};

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
  createTool(
    {
      name: 'upvote_upload',
      description: 'Upvote a community upload.',
      schema: voteSchema,
      handler: async ({ uploadId }) => {
        const result = await mediaService.upvote(uploadId, context.userId);
        return {
          message: result?.message ?? null,
          vote: result?.vote ?? null,
          upload: await fetchUpload(uploadId),
        };
      },
    },
    context
  ),
  createTool(
    {
      name: 'downvote_upload',
      description: 'Downvote a community upload.',
      schema: voteSchema,
      handler: async ({ uploadId }) => {
        const result = await mediaService.downvote(uploadId, context.userId);
        return {
          message: result?.message ?? null,
          vote: result?.vote ?? null,
          upload: await fetchUpload(uploadId),
        };
      },
    },
    context
  ),
  createTool(
    {
      name: 'remove_upload_upvote',
      description: 'Remove an upvote from a community upload.',
      schema: voteSchema,
      handler: async ({ uploadId }) => {
        const result = await mediaService.removeUpvote(uploadId, context.userId);
        return {
          message: result?.message ?? null,
          removed: result?.removed ?? 0,
          upload: await fetchUpload(uploadId),
        };
      },
    },
    context
  ),
  createTool(
    {
      name: 'remove_upload_downvote',
      description: 'Remove a downvote from a community upload.',
      schema: voteSchema,
      handler: async ({ uploadId }) => {
        const result = await mediaService.removeDownvote(uploadId, context.userId);
        return {
          message: result?.message ?? null,
          removed: result?.removed ?? 0,
          upload: await fetchUpload(uploadId),
        };
      },
    },
    context
  ),
  createTool(
    {
      name: 'prepare_upload_photo',
      description: 'Return instructions for uploading a dish photo.',
      schema: uploadSchema,
      handler: async ({ menuItemId, caption, aspectRatio }) => {
        return {
          menuItemId,
          upload: {
            method: 'POST',
            url: '/api/media/upload',
            contentType: 'multipart/form-data',
            fields: {
              menuItemId,
              caption: caption ?? null,
              aspectRatio: aspectRatio ?? 'square',
            },
            fileField: 'image',
          },
          errorHandling: {
            messageKeys: ['error', 'message'],
            fallback: 'Upload failed. Please try again.',
          },
        };
      },
    },
    context
  ),
];
