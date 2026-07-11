import Joi from 'joi';

// Category Validation
export const createCategorySchema = {
  body: Joi.object({
    name: Joi.string().required().trim().min(2).max(100),
    description: Joi.string().required().trim(),
    imageUrl: Joi.string().uri().optional(),
    isActive: Joi.boolean().optional(),
  }),
};

export const updateCategorySchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    description: Joi.string().trim().optional(),
    imageUrl: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
  }),
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

export const getCategoryByIdSchema = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

export const deleteCategorySchema = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

export const getCategoriesQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
    sortBy: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').optional(),
  }),
};
