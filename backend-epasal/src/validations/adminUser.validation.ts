import Joi from 'joi';

// All documents in the User collection represent role 'user' — there is no
// staff/role concept on this schema (Admin accounts are a separate
// collection, see models/Admin.ts). 'role' is still accepted as a filter for
// forward-compatibility and API-shape parity with the AuditLog role enum;
// any value other than 'user' simply yields an empty result set.
const ROLE_FILTER_VALUES = ['user', 'admin', 'super_admin'];
const STATUS_FILTER_VALUES = ['active', 'inactive', 'locked', 'deleted'];
const SORT_BY_VALUES = ['createdAt', 'lastLoginAt'];

export const objectIdParamSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

export const listUsersSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().trim().max(200).allow('').optional(),
    role: Joi.string().valid(...ROLE_FILTER_VALUES).optional(),
    status: Joi.string().valid(...STATUS_FILTER_VALUES).optional(),
    sortBy: Joi.string().valid(...SORT_BY_VALUES).optional(),
    order: Joi.string().valid('asc', 'desc').optional(),
  }),
};

export const lockUserSchema = {
  params: objectIdParamSchema.params,
  body: Joi.object({
    reason: Joi.string().trim().min(3).max(500).optional(),
    durationMinutes: Joi.number().integer().min(1).max(43200).optional(), // max 30 days
  }),
};

export const setUserStatusSchema = {
  params: objectIdParamSchema.params,
  body: Joi.object({
    isActive: Joi.boolean().required(),
    reason: Joi.string().trim().min(3).max(500).optional(),
  }),
};
