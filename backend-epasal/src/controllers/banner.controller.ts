import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import bannerService from '../services/banner.service';
import { sendSuccess, sendPaginatedResponse } from '../utils/responseHelper';
import { uploadImage, deleteImage } from '../middlewares/upload';

// ===========================================
// BANNER CONTROLLER
// ===========================================
// All image uploads go to Cloudinary
// secure_url is stored in MongoDB

export class BannerController {
  // ===========================================
  // GET /api/v1/banners
  // Get all banners with pagination
  // ===========================================
  getBanners = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as any;
    const result = await bannerService.getBanners(query);

    sendPaginatedResponse(
      res,
      result.banners,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total,
      'Banners retrieved successfully'
    );
  });

  // ===========================================
  // GET /api/v1/banners/active
  // Get only active banners (for frontend)
  // ===========================================
  getActiveBanners = asyncHandler(async (_req: Request, res: Response) => {
    const banners = await bannerService.getActiveBanners();
    sendSuccess(res, 200, 'Active banners retrieved successfully', banners);
  });

  // ===========================================
  // GET /api/v1/banners/:id
  // Get single banner by ID
  // ===========================================
  getBannerById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const banner = await bannerService.getBannerById(id);
    sendSuccess(res, 200, 'Banner retrieved successfully', banner);
  });

  // ===========================================
  // POST /api/v1/banners
  // Create new banner (Admin only)
  // Image → Cloudinary → secure_url → MongoDB
  // ===========================================
  createBanner = asyncHandler(async (req: Request, res: Response) => {
    let imageUrl: string | undefined;

    // Upload image to Cloudinary
    if (req.file) {
      imageUrl = await uploadImage(req.file, 'banners');
    }

    const banner = await bannerService.createBanner(req.body, imageUrl);
    sendSuccess(res, 201, 'Banner created successfully', banner);
  });

  // ===========================================
  // PUT /api/v1/banners/:id
  // Update banner (Admin only)
  // ===========================================
  updateBanner = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    let imageUrl: string | undefined;

    // If new image provided, upload to Cloudinary
    if (req.file) {
      // Delete old image from Cloudinary
      const oldBanner = await bannerService.getBannerById(id);
      if (oldBanner.imageUrl) {
        await deleteImage(oldBanner.imageUrl);
      }

      // Upload new image
      imageUrl = await uploadImage(req.file, 'banners');
    }

    const banner = await bannerService.updateBanner(id, req.body, imageUrl);
    sendSuccess(res, 200, 'Banner updated successfully', banner);
  });

  // ===========================================
  // DELETE /api/v1/banners/:id
  // Delete banner (Admin only)
  // ===========================================
  deleteBanner = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Delete image from Cloudinary
    const banner = await bannerService.getBannerById(id);
    if (banner.imageUrl) {
      await deleteImage(banner.imageUrl);
    }

    const result = await bannerService.deleteBanner(id);
    sendSuccess(res, 200, result.message);
  });
}

export default new BannerController();
