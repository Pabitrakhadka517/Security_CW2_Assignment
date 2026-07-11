import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import categoryService from '../services/category.service';
import { sendSuccess, sendPaginatedResponse } from '../utils/responseHelper';
import { uploadImage, deleteImage } from '../middlewares/upload';

// ===========================================
// CATEGORY CONTROLLER
// ===========================================
// All image uploads go to Cloudinary

export class CategoryController {
  // GET /api/v1/categories
  getCategories = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as any;
    const result = await categoryService.getCategories(query);
    sendPaginatedResponse(
      res,
      result.categories,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total,
      'Categories retrieved successfully'
    );
  });

  // GET /api/v1/categories/active
  getActiveCategories = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await categoryService.getActiveCategories();
    sendSuccess(res, 200, 'Active categories retrieved successfully', categories);
  });

  // GET /api/v1/categories/:id
  getCategoryById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const category = await categoryService.getCategoryById(id);
    sendSuccess(res, 200, 'Category retrieved successfully', category);
  });

  // GET /api/v1/categories/slug/:slug
  getCategoryBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const category = await categoryService.getCategoryBySlug(slug);
    sendSuccess(res, 200, 'Category retrieved successfully', category);
  });

  // POST /api/v1/categories (Admin)
  createCategory = asyncHandler(async (req: Request, res: Response) => {
    let imageUrl: string | undefined;

    if (req.file) {
      imageUrl = await uploadImage(req.file, 'categories');
    }

    const category = await categoryService.createCategory(req.body, imageUrl);
    sendSuccess(res, 201, 'Category created successfully', category);
  });

  // PUT /api/v1/categories/:id (Admin)
  updateCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    let imageUrl: string | undefined;

    if (req.file) {
      const oldCategory = await categoryService.getCategoryById(id);
      if (oldCategory.imageUrl) {
        await deleteImage(oldCategory.imageUrl);
      }
      imageUrl = await uploadImage(req.file, 'categories');
    }

    const category = await categoryService.updateCategory(id, req.body, imageUrl);
    sendSuccess(res, 200, 'Category updated successfully', category);
  });

  // DELETE /api/v1/categories/:id (Admin)
  deleteCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const category = await categoryService.getCategoryById(id);
    if (category.imageUrl) {
      await deleteImage(category.imageUrl);
    }

    const result = await categoryService.deleteCategory(id);
    sendSuccess(res, 200, result.message);
  });
}

export default new CategoryController();
