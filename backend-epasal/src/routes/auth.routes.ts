import { Router } from 'express';
import Joi from 'joi';
import * as authController from '../controllers/auth.controller';
import * as userController from '../controllers/user.controller';
import { validateRequest } from '../middlewares/validateRequest';
import { requireAdmin } from '../middlewares/authMiddleware';
import { loginLimiter, registerLimiter, refreshLimiter, accountChangeLimiter } from '../middlewares/rateLimiter';
import { strongPasswordSchema } from '../validations/password.validation';

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Admin Login
 *     description: Login with email and password to get JWT token for admin operations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@epasaley.com
 *               password:
 *                 type: string
 *                 example: ePasaley@SecureAdmin2025!
 *     responses:
 *       200:
 *         description: Login successful - Returns JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT token for authorization
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     admin:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: 507f1f77bcf86cd799439011
 *                         adminId:
 *                           type: string
 *                           example: ADMIN001
 *                         name:
 *                           type: string
 *                           example: Admin User
 *                         email:
 *                           type: string
 *                           example: admin@epasaley.com
 *                         role:
 *                           type: string
 *                           enum: [admin, super_admin]
 *                           example: super_admin
 *       400:
 *         description: Bad Request - Missing or invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Email is required
 *       401:
 *         description: Unauthorized - Invalid email or password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid email or password
 */
router.post('/login', loginLimiter, validateRequest({
  body: Joi.object({
    email: Joi.string().email().required().messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email',
    }),
    password: Joi.string().required().min(6).messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 6 characters',
    }),
  }),
}), authController.login);

// User registration and login
router.post('/register', registerLimiter, validateRequest({
  body: Joi.object({
    name: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[0-9\-\+\(\)\s]{7,15}$/).optional().messages({
      'string.pattern.base': 'Phone number must be 7-15 digits',
    }),
    password: strongPasswordSchema,
  }),
}), userController.register);

router.post('/user/login', loginLimiter, validateRequest({
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),
}), userController.login);

// Google Sign-In — body carries the ID token from Google Identity Services,
// verified server-side against Google's public keys (no redirect/client-secret
// flow needed). Reuses loginLimiter since it's a login-adjacent endpoint.
router.post('/google', loginLimiter, validateRequest({
  body: Joi.object({
    credential: Joi.string().required(),
  }),
}), userController.googleLogin);

router.post('/refresh', refreshLimiter, authController.refresh);
router.post('/logout', authController.logout);

// Admin profile management
router.get('/admin/me', requireAdmin, authController.getAdminProfile);
router.put('/admin/profile', requireAdmin, accountChangeLimiter, validateRequest({
  body: Joi.object({
    name:  Joi.string().min(2).optional(),
    email: Joi.string().email().optional(),
    currentPassword: Joi.string().when('email', { is: Joi.exist(), then: Joi.required(), otherwise: Joi.optional() })
      .messages({ 'any.required': 'Current password is required to change email' }),
  }),
}), authController.updateAdminProfile);
router.put('/admin/password', requireAdmin, accountChangeLimiter, validateRequest({
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword:     Joi.string().min(6).required(),
  }),
}), authController.changeAdminPassword);

export default router;
