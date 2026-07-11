import multer from 'multer';
import { Request } from 'express';
import { cloudinary } from '../config/cloudinary';
import { Readable } from 'stream';
import { BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';

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
export const uploadSingle = upload.single('image');
export const uploadMultiple = upload.array('images', 10);
export const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 10 },
]);

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

  return new Promise((resolve, reject) => {
    // Create upload stream to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error', error);
          reject(new BadRequestError('Failed to upload image to Cloudinary'));
        } else if (result) {
          logger.info('Image uploaded to Cloudinary', { secureUrl: result.secure_url });
          resolve(result.secure_url);
        } else {
          reject(new BadRequestError('No result from Cloudinary'));
        }
      }
    );

    // Stream file buffer to Cloudinary
    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);
  });
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
      await cloudinary.uploader.destroy(publicId);
      logger.info('Deleted image from Cloudinary', { publicId });
    }
  } catch (error) {
    logger.error('Error deleting from Cloudinary', error instanceof Error ? error : { error });
    // Don't throw - deletion failure shouldn't break the request
  }
};
