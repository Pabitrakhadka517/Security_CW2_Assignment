import Joi from 'joi';

/**
 * Shared strong-password rule for registration and password-change bodies.
 * Mirrors the server-side complexity/strength checks in password.service.ts —
 * this is the fast, synchronous rejection; password.service.ts adds the
 * zxcvbn strength, reuse, and "contains 'password'" checks that Joi can't
 * express as a single regex.
 */
export const strongPasswordSchema = Joi.string()
  .min(12)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/)
  .required()
  .messages({
    'string.min': 'Password must be at least 12 characters and include uppercase, lowercase, number, and special character',
    'string.max': 'Password must be at most 128 characters',
    'string.pattern.base': 'Password must be at least 12 characters and include uppercase, lowercase, number, and special character',
    'string.empty': 'Password is required',
  });
