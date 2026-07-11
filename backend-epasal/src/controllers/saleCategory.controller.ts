import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import saleCategoryService from '../services/saleCategory.service';
import { sendSuccess, sendPaginatedResponse } from '../utils/responseHelper';
import { uploadImage } from '../middlewares/upload';
import { BadRequestError } from '../utils/errors';

export class SaleCategoryController {
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await saleCategoryService.getAll(req.query);
    sendPaginatedResponse(res, result.items, result.pagination.page, result.pagination.limit, result.pagination.total, 'Sale categories retrieved');
  });

  getActive = asyncHandler(async (_req: Request, res: Response) => {
    const items = await saleCategoryService.getActive();
    sendSuccess(res, 200, 'Active sale categories retrieved', items);
  });

  getBySlug = asyncHandler(async (req: Request, res: Response) => {
    const sale = await saleCategoryService.getBySlug(req.params.slug);
    sendSuccess(res, 200, 'Sale category retrieved', sale);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const sale = await saleCategoryService.getById(req.params.id);
    sendSuccess(res, 200, 'Sale category retrieved', sale);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const sale = await saleCategoryService.create(req.body);
    sendSuccess(res, 201, 'Sale category created', sale);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const sale = await saleCategoryService.update(req.params.id, req.body);
    sendSuccess(res, 200, 'Sale category updated', sale);
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const result = await saleCategoryService.delete(req.params.id);
    sendSuccess(res, 200, result.message);
  });

  setProducts = asyncHandler(async (req: Request, res: Response) => {
    const { products } = req.body;
    if (!Array.isArray(products)) throw new BadRequestError('products must be an array');
    const sale = await saleCategoryService.setProducts(req.params.id, products);
    sendSuccess(res, 200, 'Products updated', sale);
  });

  uploadBanner = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new BadRequestError('No file provided');
    const bannerUrl = await uploadImage(req.file, 'sale-categories/banners');
    sendSuccess(res, 200, 'Banner uploaded', { bannerUrl });
  });

  /** GET /sale-categories/homepage — public, aggregated homepage data */
  homepage = asyncHandler(async (_req: Request, res: Response) => {
    const data = await saleCategoryService.getHomepage();
    sendSuccess(res, 200, 'Homepage data retrieved', data);
  });

  /** POST /sale-categories/:id/products-by-category — admin, bulk-adds products from a category */
  addProductsByCategory = asyncHandler(async (req: Request, res: Response) => {
    const { categoryId, discount_percentage } = req.body;
    if (!categoryId) throw new BadRequestError('categoryId is required');
    if (discount_percentage === undefined || discount_percentage === null) {
      throw new BadRequestError('discount_percentage is required');
    }
    const sale = await saleCategoryService.addProductsByCategory(
      req.params.id,
      categoryId,
      Number(discount_percentage)
    );
    sendSuccess(res, 200, 'Products added from category', sale);
  });
}

export default new SaleCategoryController();
