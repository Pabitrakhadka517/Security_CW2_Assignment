import Joi from 'joi';

// Banner Validation
export const createBannerSchema = {
  body: Joi.object({
    title: Joi.string().required().trim().min(3).max(200),
    subtitle: Joi.string().allow(null, '').optional(),
    imageUrl: Joi.string().uri().optional(),
    linkUrl: Joi.string().allow(null, '').optional(),
    position: Joi.string().valid('hero', 'promo', 'strip').optional(),
    displayOrder: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().optional(),
  }),
};

export const updateBannerSchema = {
  body: Joi.object({
    title: Joi.string().trim().min(3).max(200).optional(),
    subtitle: Joi.string().allow(null, '').optional(),
    imageUrl: Joi.string().optional(),
    linkUrl: Joi.string().allow(null, '').optional(),
    position: Joi.string().valid('hero', 'promo', 'strip').optional(),
    displayOrder: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().optional(),
  }),
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

export const getBannerByIdSchema = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

export const deleteBannerSchema = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

export const getBannersQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    isActive: Joi.boolean().optional(),
    sortBy: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').optional(),
  }),
};
