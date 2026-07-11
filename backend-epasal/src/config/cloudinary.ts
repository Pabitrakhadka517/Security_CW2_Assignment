import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger';

// ===========================================
// CLOUDINARY CONFIGURATION
// ===========================================
// All images are uploaded to Cloudinary CDN
// No local disk storage is used

/**
 * Initialize Cloudinary with credentials from environment
 */
const connectCloudinary = (): void => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // Validate credentials
  if (!cloudName || !apiKey || !apiSecret) {
    logger.warn('Cloudinary credentials missing in .env', {
      required: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
    });
    return;
  }

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true, // Always use HTTPS
  });

  logger.info('Cloudinary configured successfully', { cloudName });
};

export { cloudinary, connectCloudinary };
