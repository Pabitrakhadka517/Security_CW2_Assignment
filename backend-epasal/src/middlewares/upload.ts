import multer from 'multer';
import { Request } from 'express';
import { cloudinary } from '../config/cloudinary';
import { Readable } from 'stream';
import { BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';
import { validateImageContent } from './validateImageContent';
import { withTimeout, withRetry } from '../utils/asyncResilience';

const CLOUDINARY_TIMEOUT_MS = 15000;

// ===========================================
// CLOUDINARY-ONLY IMAGE UPLOAD
// ===========================================
// NO disk storage - files go directly to Cloudinary
// Works on Render, Heroku, Vercel, etc.

// ===========================================
// 1. MULTER CONFIGURATION (Memory Storage)
// ===========================================
const storage = multer.memoryStorage();

// File filter - only allow images
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// ===========================================
// 2. EXPORT MULTER MIDDLEWARES
// ===========================================
// Each export is multer's parser followed by a magic-byte/extension check on
// the now-populated file buffer(s) -- multer's own fileFilter runs before the
// body is read, so it can only see the client-declared mimetype/filename,
// not the real content. Route files reference these exports unchanged;
// Express flattens array-valued middleware automatically.
export const uploadSingle = [upload.single('image'), validateImageContent];
export const uploadMultiple = [upload.array('images', 10), validateImageContent];
export const uploadFields = [
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 10 },
  ]),
  validateImageContent,
];

// ===========================================
// 3. CLOUDINARY UPLOAD FUNCTION
// ===========================================
/**
 * Upload image to Cloudinary
 * @param file - Multer file from req.file
 * @param folder - Cloudinary folder (default: 'epasaley')
 * @returns Cloudinary secure_url
 */
export const uploadImage = async (
  file: Express.Multer.File,
  folder: string = 'epasaley'
): Promise<string> => {
  if (!file || !file.buffer) {
    throw new BadRequestError('No file provided for upload');
  }

  // For testing - skip actual upload
  if (process.env.DISABLE_CLOUDINARY === 'true') {
    return 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
  }

  const attemptUpload = (): Promise<string> =>
    new Promise((resolve, reject) => {
      // Create upload stream to Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          timeout: CLOUDINARY_TIMEOUT_MS,
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result.secure_url);
          } else {
            reject(new Error('No result from Cloudinary'));
          }
        }
      );

      // Stream file buffer to Cloudinary. `file.buffer` is a plain Buffer
      // (not a consumed network stream), so it's safe to re-wrap into a
      // fresh Readable on every retry attempt.
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);
      bufferStream.pipe(uploadStream);
    });

  try {
    const secureUrl = await withRetry(
      () => withTimeout(attemptUpload(), CLOUDINARY_TIMEOUT_MS, 'Cloudinary upload'),
      { attempts: 2, delayMs: 500, label: 'Cloudinary upload' }
    );
    logger.info('Image uploaded to Cloudinary', { secureUrl });
    return secureUrl;
  } catch (error) {
    logger.error('Cloudinary upload error', error instanceof Error ? error : { error });
    throw new BadRequestError('Failed to upload image to Cloudinary');
  }
};

// ===========================================
// 4. CLOUDINARY DELETE FUNCTION
// ===========================================
/**
 * Delete image from Cloudinary
 * @param imageUrl - Full Cloudinary URL
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
  if (!imageUrl) return;

  // Only delete Cloudinary images
  if (!imageUrl.includes('cloudinary.com')) {
    logger.debug('Skipping non-Cloudinary image', { imageUrl });
    return;
  }

  try {
    // Extract public_id from URL
    // Format: https://res.cloudinary.com/cloud/image/upload/v123/folder/filename.ext
    const urlParts = imageUrl.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    
    if (uploadIndex === -1) return;

    // Get path after version (v123456)
    const pathAfterUpload = urlParts.slice(uploadIndex + 2).join('/');
    // Remove extension
    const publicId = pathAfterUpload.replace(/\.[^/.]+$/, '');

    if (publicId) {
      await withTimeout(cloudinary.uploader.destroy(publicId), CLOUDINARY_TIMEOUT_MS, 'Cloudinary delete');
      logger.info('Deleted image from Cloudinary', { publicId });
    }
  } catch (error) {
    logger.error('Error deleting from Cloudinary', error instanceof Error ? error : { error });
    // Don't throw - deletion failure shouldn't break the request
  }
};
