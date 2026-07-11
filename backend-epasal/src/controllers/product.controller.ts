import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import productService from '../services/product.service';
import { sendSuccess, sendPaginatedResponse } from '../utils/responseHelper';
import { uploadImage, deleteImage } from '../middlewares/upload';

// ===========================================
// PRODUCT CONTROLLER
// ===========================================
// All image uploads go to Cloudinary

export class ProductController {
  // GET /api/v1/products
  getProducts = asyncHandler(async (req: Request, res: Response) => {
    const query = { ...(req.query as any) };

    // Public callers only ever see active products. Authenticated admins may
    // opt in to the full catalogue with ?includeInactive=true (optionalAuth
    // runs on this route so req.user is set when a valid token is sent).
    const isAdminCaller = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const includeInactive = isAdminCaller && String(query.includeInactive) === 'true';
    delete query.includeInactive;
    if (!includeInactive && query.isActive === undefined) {
      query.isActive = true;
    }

    const result = await productService.getProducts(query);
    sendPaginatedResponse(
      res,
      result.products,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total,
      'Products retrieved successfully'
    );
  });

  // GET /api/v1/products/:id
  getProductById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    sendSuccess(res, 200, 'Product retrieved successfully', product);
  });

  // POST /api/v1/products (Admin)
  createProduct = asyncHandler(async (req: Request, res: Response) => {
    let imageUrl: string | undefined;

    if (req.file) {
      imageUrl = await uploadImage(req.file, 'products');
    }

    const product = await productService.createProduct(req.body, imageUrl);
    sendSuccess(res, 201, 'Product created successfully', product);
  });

  // PUT /api/v1/products/:id (Admin)
  updateProduct = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    let imageUrl: string | undefined;

    if (req.file) {
      const oldProduct = await productService.getProductById(id);
      if (oldProduct.imageUrl) {
        await deleteImage(oldProduct.imageUrl);
      }
      imageUrl = await uploadImage(req.file, 'products');
    }

    const product = await productService.updateProduct(id, req.body, imageUrl);
    sendSuccess(res, 200, 'Product updated successfully', product);
  });

  // DELETE /api/v1/products/:id (Admin)
  deleteProduct = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const product = await productService.getProductById(id);
    if (product.imageUrl) {
      await deleteImage(product.imageUrl);
    }

    const result = await productService.deleteProduct(id);
    sendSuccess(res, 200, result.message);
  });

  // GET /api/v1/products/category/:categoryId
  getProductsByCategory = asyncHandler(async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    const query = req.query as any;
    const result = await productService.getProductsByCategory(categoryId, query);
    sendPaginatedResponse(
      res,
      result.products,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total,
      'Products retrieved successfully'
    );
  });

  // GET /api/v1/products/offers
  getProductsWithOffers = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as any;
    const result = await productService.getProductsWithOffers(query);
    sendPaginatedResponse(
      res,
      result.products,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total,
      'Products with offers retrieved successfully'
    );
  });
}

export default new ProductController();
