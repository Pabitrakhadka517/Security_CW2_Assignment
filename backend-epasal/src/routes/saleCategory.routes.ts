import { Router } from 'express';
import Joi from 'joi';
import saleCategoryController from '../controllers/saleCategory.controller';
import { requireAdmin } from '../middlewares/authMiddleware';
import { checkPasswordExpiry } from '../middlewares/passwordExpiry';
import { validateRequest } from '../middlewares/validateRequest';
import { uploadSingle } from '../middlewares/upload';

const router = Router();

const ALLOWED_SEASONS = ['dashain', 'tihar', 'new_year', 'summer', 'winter'] as const;

const productItemSchema = Joi.object({
  product_id: Joi.string().required(),
  discount_percentage: Joi.number().min(0).max(100).required(),
  display_order: Joi.number().integer().min(0).optional(),
  stock_limit: Joi.number().integer().min(0).allow(null).optional(),
  badge_label: Joi.string().allow(null, '').optional(),
});

const createSchema = {
  body: Joi.object({
    title: Joi.string().required().trim(),
    slug: Joi.string().optional().lowercase().trim(),
    banner: Joi.string().allow(null, '').optional(),
    description: Joi.string().allow(null, '').optional(),
    is_active: Joi.boolean().optional(),
    start_date: Joi.string().allow(null, '').optional(),
    end_date: Joi.string().allow(null, '').optional(),
    priority: Joi.number().integer().min(0).optional(),
    cta_label: Joi.string().allow(null, '').optional(),
    cta_url: Joi.string().allow(null, '').optional(),
    products: Joi.array().items(productItemSchema).optional(),
    season: Joi.string().valid(...ALLOWED_SEASONS).allow(null).optional(),
    badge_label: Joi.string().allow(null, '').optional(),
    badge_color: Joi.string().allow(null, '').optional(),
  }),
};

const idParamSchema = Joi.object({ id: Joi.string().required() });

const updateSchema = {
  params: idParamSchema,
  body: Joi.object({
    title: Joi.string().optional().trim(),
    slug: Joi.string().optional().lowercase().trim(),
    banner: Joi.string().allow(null, '').optional(),
    description: Joi.string().allow(null, '').optional(),
    is_active: Joi.boolean().optional(),
    start_date: Joi.string().allow(null, '').optional(),
    end_date: Joi.string().allow(null, '').optional(),
    priority: Joi.number().integer().min(0).optional(),
    cta_label: Joi.string().allow(null, '').optional(),
    cta_url: Joi.string().allow(null, '').optional(),
    products: Joi.array().items(productItemSchema).optional(),
    season: Joi.string().valid(...ALLOWED_SEASONS).allow(null).optional(),
    badge_label: Joi.string().allow(null, '').optional(),
    badge_color: Joi.string().allow(null, '').optional(),
  }),
};

// ---- Public routes --------------------------------------------------------
// NOTE: /homepage must be declared BEFORE /:id so it is not captured as a param
router.get('/homepage', saleCategoryController.homepage);
router.get('/active', saleCategoryController.getActive);
router.get('/slug/:slug', saleCategoryController.getBySlug);

// ---- Admin routes ---------------------------------------------------------
router.get('/', requireAdmin, checkPasswordExpiry, saleCategoryController.getAll);
router.get('/:id', requireAdmin, checkPasswordExpiry, validateRequest({ params: idParamSchema }), saleCategoryController.getById);
router.post('/', requireAdmin, checkPasswordExpiry, validateRequest(createSchema), saleCategoryController.create);
router.put('/:id', requireAdmin, checkPasswordExpiry, validateRequest(updateSchema), saleCategoryController.update);
router.delete('/:id', requireAdmin, checkPasswordExpiry, validateRequest({ params: idParamSchema }), saleCategoryController.delete);
router.put('/:id/products', requireAdmin, checkPasswordExpiry, validateRequest({
  params: idParamSchema,
  body: Joi.object({ products: Joi.array().items(productItemSchema).required() }),
}), saleCategoryController.setProducts);
router.post('/:id/banner', requireAdmin, checkPasswordExpiry, validateRequest({ params: idParamSchema }), uploadSingle, saleCategoryController.uploadBanner);

router.post(
  '/:id/products-by-category',
  requireAdmin,
  checkPasswordExpiry,
  validateRequest({
    params: idParamSchema,
    body: Joi.object({
      categoryId: Joi.string().required(),
      discount_percentage: Joi.number().min(0).max(100).required(),
    }),
  }),
  saleCategoryController.addProductsByCategory
);

export default router;
