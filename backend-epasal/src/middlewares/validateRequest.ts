import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/errors';

/**
 * Middleware to validate request data using Joi schema
 */
export const validateRequest = (schema: {
  body?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
}) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Validate body — and KEEP the converted value so Joi defaults,
    // trim(), uppercase() and type coercion actually apply downstream.
    if (schema.body) {
      const { error, value } = schema.body.validate(req.body, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map((detail) => detail.message));
      } else {
        req.body = value;
      }
    }

    // Validate params
    if (schema.params) {
      const { error, value } = schema.params.validate(req.params, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map((detail) => detail.message));
      } else {
        req.params = value;
      }
    }

    // Validate query
    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map((detail) => detail.message));
      } else {
        req.query = value;
      }
    }

    // If there are errors, throw validation error
    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }

    next();
  };
};
