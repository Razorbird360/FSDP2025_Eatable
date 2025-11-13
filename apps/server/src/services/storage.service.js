import sharp from 'sharp';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { randomUUID } from 'crypto';

const square_size = 1200;  
const rectangle_width = 1280;
const rectangle_height = 720;
const jpeg_quality = 80;
const aspect_tolerance = 0.05; // allow camera variance
const rectangle_ratio = 16 / 9;

/**
 * Generic Supabase Storage service
 * Handles file compression, upload, deletion for any bucket
 */
export const storageService = {
  /**
   * Compress image to JPEG with aspect-ratio aware sizing
   * Supports square (1:1) and rectangle (16:9) formats
   * @param {Buffer} imageBuffer - Original image buffer
   * @returns {Promise<Buffer>} Compressed image buffer
   */
  async compressImage(imageBuffer) {
    const metadata = await sharp(imageBuffer).metadata();
    const aspect_ratio = metadata.width / metadata.height;

    let resize_options;

    // Check if square (aspect ratio close to 1:1)
    if (Math.abs(aspect_ratio - 1) <= aspect_tolerance) {
      // Square image
      resize_options = {
        width: square_size,
        height: square_size,
        fit: 'cover',
      };
    } else if (Math.abs(aspect_ratio - rectangle_ratio) <= aspect_tolerance) {
      // Rectangle image (16:9)
      resize_options = {
        width: rectangle_width,
        height: rectangle_height,
        fit: 'cover',
      };
    } else {
      throw new Error('Unsupported aspect ratio. Only 1:1 or 16:9 images are allowed.');
    }

    return await sharp(imageBuffer)
      .resize(resize_options)
      .jpeg({ quality: jpeg_quality })
      .toBuffer();
  },

  /**
   * Upload file to Supabase Storage bucket
   * @param {string} bucket - Bucket name
   * @param {string} path - File path within bucket
   * @param {Buffer} fileBuffer - File buffer to upload
   * @param {string} contentType - MIME type (default: image/jpeg)
   * @returns {Promise<string>} Public URL of uploaded file
   */
  async uploadFile(bucket, path, fileBuffer, contentType = 'image/jpeg') {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, fileBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);

    return urlData.publicUrl;
  },

  /**
   * Delete file from Supabase Storage bucket
   * @param {string} bucket - Bucket name
   * @param {string} path - File path within bucket
   * @returns {Promise<void>}
   */
  async deleteFile(bucket, path) {
    const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);

    if (error) {
      throw new Error(`Storage deletion failed: ${error.message}`);
    }
  },

  /**
   * Get public URL for a file
   * @param {string} bucket - Bucket name
   * @param {string} path - File path within bucket
   * @returns {string} Public URL
   */
  getPublicUrl(bucket, path) {
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Generate unique file path for organized storage
   * @param {string} folder - Folder name (e.g., stallId)
   * @param {string} subfolder - Subfolder name (e.g., menuItemId)
   * @param {string} extension - File extension (e.g., 'jpg')
   * @returns {string} Generated path (e.g., 'stallId/menuItemId/uuid.jpg')
   */
  generateFilePath(folder, subfolder, extension = 'jpg') {
    const fileName = `${randomUUID()}.${extension}`;
    return `${folder}/${subfolder}/${fileName}`;
  },

  /**
   * Extract file path from Supabase Storage public URL
   * @param {string} publicUrl - Full public URL
   * @param {string} bucket - Bucket name
   * @returns {string} File path within bucket
   */
  extractPathFromUrl(publicUrl, bucket) {
    const urlParts = publicUrl.split('/');
    const bucketIndex = urlParts.indexOf(bucket);

    if (bucketIndex === -1) {
      throw new Error('Invalid storage URL');
    }

    return urlParts.slice(bucketIndex + 1).join('/');
  },
};
