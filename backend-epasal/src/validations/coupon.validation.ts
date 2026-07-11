import Joi from 'joi';

export const createCouponSchema = {
  body: Joi.object({
    code: Joi.string().required().trim().uppercase().min(3).max(50),
    description: Joi.string().allow(null, '').optional(),
    discount_type: Joi.string().valid('percentage', 'fixed').default('fixed'),
    discount_value: Joi.number().required().greater(0),
    max_discount_cap: Joi.number().min(0).allow(null).optional(),
    apply_on: Joi.string().valid('cart', 'product', 'category').default('cart'),
    applicable_products: Joi.array().items(Joi.string()).optional(),
    applicable_categories: Joi.array().items(Joi.string()).optional(),
    validFrom: Joi.alternatives().try(Joi.string(), Joi.date()).required(),
    validTo: Joi.alternatives().try(Joi.string(), Joi.date()).required(),
    usage_limit: Joi.number().integer().min(1).allow(null).optional(),
    per_user_limit: Joi.number().integer().min(1).allow(null).optional(),
    min_order_amount: Joi.number().min(0).optional(),
    isActive: Joi.boolean().optional(),
  }),
};

export const updateCouponSchema = {
  body: Joi.object({
    code: Joi.string().trim().uppercase().min(3).max(50).optional(),
    description: Joi.string().allow(null, '').optional(),
    discount_type: Joi.string().valid('percentage', 'fixed').optional(),
    discount_value: Joi.number().min(0).optional(),
    max_discount_cap: Joi.number().min(0).allow(null).optional(),
    apply_on: Joi.string().valid('cart', 'product', 'category').optional(),
    applicable_products: Joi.array().items(Joi.string()).optional(),
    applicable_categories: Joi.array().items(Joi.string()).optional(),
    validFrom: Joi.alternatives().try(Joi.string(), Joi.date()).optional(),
    validTo: Joi.alternatives().try(Joi.string(), Joi.date()).optional(),
    usage_limit: Joi.number().integer().min(1).allow(null).optional(),
    per_user_limit: Joi.number().integer().min(1).allow(null).optional(),
    min_order_amount: Joi.number().min(0).optional(),
    isActive: Joi.boolean().optional(),
  }),
  params: Joi.object({ code: Joi.string().required() }),
};

export const getCouponByCodeSchema = {
  params: Joi.object({ code: Joi.string().required() }),
};

export const deleteCouponSchema = {
  params: Joi.object({ code: Joi.string().required() }),
};

export const getCouponsQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    isActive: Joi.boolean().optional(),
    sortBy: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').optional(),
  }),
};

export const validateCouponSchema = {
  body: Joi.object({
    code: Joi.string().required().trim().uppercase(),
    cartTotal: Joi.number().min(0).optional(),
    productIds: Joi.array().items(Joi.string()).optional(),
    categoryIds: Joi.array().items(Joi.string()).optional(),
    email: Joi.string().allow(null, '').optional(),
    phone: Joi.alternatives().try(Joi.string(), Joi.number()).allow(null, '').optional(),
  }),
};
