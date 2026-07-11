import { Router } from 'express';
import categoryController from '../controllers/category.controller';
import { validateRequest } from '../middlewares/validateRequest';
import { requireAdmin } from '../middlewares/authMiddleware';
import { uploadSingle } from '../middlewares/upload';
import {
  createCategorySchema,
  updateCategorySchema,
  getCategoryByIdSchema,
  deleteCategorySchema,
  getCategoriesQuerySchema,
} from '../validations/category.validation';

const router = Router();

/**
 * @openapi
 * /categories/:
 *   get:
 *     tags:
 *       - categories
 *     summary: List categories
 *     responses:
 *       200:
 *         description: OK
 *   post:
 *     tags:
 *       - categories
 *     summary: Create a category (admin)
 * /categories/{id}:
 *   get:
 *     tags:
 *       - categories
 *     summary: Get category by id
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *   put:
 *     tags:
 *       - categories
 *     summary: Update category (admin)
 *   delete:
 *     tags:
 *       - categories
 *     summary: Delete category (admin)
 */

/**
 * Public routes
 */
router.get(
  '/',
  validateRequest(getCategoriesQuerySchema),
  categoryController.getCategories
);

router.get(
  '/active',
  categoryController.getActiveCategories
);

router.get(
  '/slug/:slug',
  categoryController.getCategoryBySlug
);

router.get(
  '/:id',
  validateRequest(getCategoryByIdSchema),
  categoryController.getCategoryById
);

/**
 * Admin routes
 */
router.post(
  '/',
  requireAdmin,
  uploadSingle,
  validateRequest(createCategorySchema),
  categoryController.createCategory
);

router.put(
  '/:id',
  requireAdmin,
  uploadSingle,
  validateRequest(updateCategorySchema),
  categoryController.updateCategory
);

router.delete(
  '/:id',
  requireAdmin,
  validateRequest(deleteCategorySchema),
  categoryController.deleteCategory
);

export default router;
