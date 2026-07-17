import { Router } from 'express';
import productController from '../controllers/product.controller';
import { validateRequest } from '../middlewares/validateRequest';
import { requireAdmin, optionalAuth } from '../middlewares/authMiddleware';
import { checkPasswordExpiry } from '../middlewares/passwordExpiry';
import { uploadSingle } from '../middlewares/upload';
import { requirePermission } from '../middlewares/rbac';
import {
  createProductSchema,
  updateProductSchema,
  getProductByIdSchema,
  deleteProductSchema,
  getProductsQuerySchema,
} from '../validations/product.validation';

const router = Router();

/**
 * @openapi
 * /products/:
 *   get:
 *     tags:
 *       - products
 *     summary: List products
 *     responses:
 *       200:
 *         description: OK
 *   post:
 *     tags:
 *       - products
 *     summary: Create a product (admin)
 *     responses:
 *       201:
 *         description: Created
 * /products/{id}:
 *   get:
 *     tags:
 *       - products
 *     summary: Get product by id
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *   put:
 *     tags:
 *       - products
 *     summary: Update product (admin)
 *   delete:
 *     tags:
 *       - products
 *     summary: Delete product (admin)
 */

/**
 * Public routes
 */
router.get(
  '/',
  optionalAuth, // lets admins request inactive products with ?includeInactive=true
  validateRequest(getProductsQuerySchema),
  productController.getProducts
);

router.get(
  '/offers',
  validateRequest(getProductsQuerySchema),
  productController.getProductsWithOffers
);

router.get(
  '/category/:categoryId',
  validateRequest(getProductsQuerySchema),
  productController.getProductsByCategory
);

router.get(
  '/:id',
  validateRequest(getProductByIdSchema),
  productController.getProductById
);

/**
 * Admin routes
 */
router.post(
  '/',
  requireAdmin,
  checkPasswordExpiry,
  requirePermission('product:create'),
  uploadSingle,
  validateRequest(createProductSchema),
  productController.createProduct
);

router.put(
  '/:id',
  requireAdmin,
  checkPasswordExpiry,
  requirePermission('product:update:any'),
  uploadSingle,
  validateRequest(updateProductSchema),
  productController.updateProduct
);

router.delete(
  '/:id',
  requireAdmin,
  checkPasswordExpiry,
  requirePermission('product:delete:any'),
  validateRequest(deleteProductSchema),
  productController.deleteProduct
);

export default router;
