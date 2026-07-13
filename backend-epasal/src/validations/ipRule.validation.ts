import Joi from 'joi';

export const blockIPSchema = {
  body: Joi.object({
    ip: Joi.string().ip().required(),
    reason: Joi.string().trim().min(5).max(500).required(),
    permanent: Joi.boolean().default(false),
    expiresInHours: Joi.number().integer().min(1).max(8760).optional(), // max 1 year
  }),
};

export const allowIPSchema = {
  body: Joi.object({
    ip: Joi.string().ip().required(),
    reason: Joi.string().trim().min(5).max(500).required(),
  }),
};

export const ipParamSchema = {
  params: Joi.object({
    ip: Joi.string().ip().required(),
  }),
};
