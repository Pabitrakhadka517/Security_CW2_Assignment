import { Router } from 'express';
import bannerController from '../controllers/banner.controller';
import { validateRequest } from '../middlewares/validateRequest';
import { requireAdmin } from '../middlewares/authMiddleware';
import { uploadSingle } from '../middlewares/upload';
import {
  createBannerSchema,
  updateBannerSchema,
  getBannerByIdSchema,
  deleteBannerSchema,
  getBannersQuerySchema,
} from '../validations/banner.validation';

const router = Router();

/**
 * @openapi
 * /banners/:
 *   get:
 *     tags:
 *       - banners
 *     summary: List banners
 *     responses:
 *       200:
 *         description: OK
 *   post:
 *     tags:
 *       - banners
 *     summary: Create banner (admin)
 * /banners/{id}:
 *   get:
 *     tags:
 *       - banners
 *     summary: Get banner by id
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *   put:
 *     tags:
 *       - banners
 *     summary: Update banner (admin)
 *   delete:
 *     tags:
 *       - banners
 *     summary: Delete banner (admin)
 */

/**
 * Public routes
 */
router.get(
  '/',
  validateRequest(getBannersQuerySchema),
  bannerController.getBanners
);

router.get(
  '/active',
  bannerController.getActiveBanners
);

router.get(
  '/:id',
  validateRequest(getBannerByIdSchema),
  bannerController.getBannerById
);

/**
 * Admin routes
 */
router.post(
  '/',
  requireAdmin,
  uploadSingle,
  validateRequest(createBannerSchema),
  bannerController.createBanner
);

router.put(
  '/:id',
  requireAdmin,
  uploadSingle,
  validateRequest(updateBannerSchema),
  bannerController.updateBanner
);

router.delete(
  '/:id',
  requireAdmin,
  validateRequest(deleteBannerSchema),
  bannerController.deleteBanner
);

export default router;
