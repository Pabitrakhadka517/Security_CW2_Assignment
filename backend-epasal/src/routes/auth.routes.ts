import { Router } from 'express';
import Joi from 'joi';
import * as authController from '../controllers/auth.controller';
import * as userController from '../controllers/user.controller';
import * as sessionController from '../controllers/session.controller';
import * as passwordResetController from '../controllers/passwordReset.controller';
import { validateRequest } from '../middlewares/validateRequest';
import { requireAdmin, requireAuth } from '../middlewares/authMiddleware';
import { loginLimiter, registerLimiter, refreshLimiter, accountChangeLimiter, forgotPasswordLimiter, resetPasswordLimiter } from '../middlewares/rateLimiter';
import { requireCaptcha } from '../middlewares/captcha';
import { conditionalCaptcha } from '../middlewares/conditionalCaptcha';
import { requireCsrfToken } from '../middlewares/csrf.middleware';
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
// CAPTCHA is always required on registration — account creation is cheap to
// automate and there's no "loginAttempts" signal to gate on like there is
// for login.
router.post('/register', registerLimiter, validateRequest({
  body: Joi.object({
    name: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[0-9\-\+\(\)\s]{7,15}$/).optional().messages({
      'string.pattern.base': 'Phone number must be 7-15 digits',
    }),
    password: strongPasswordSchema,
    captchaToken: Joi.string().optional(),
  }),
}), requireCaptcha, userController.register);

// CAPTCHA is only required once there's a brute-force signal (see
// conditionalCaptcha) — always-on CAPTCHA here would hurt UX for the common
// case of a correct password on the first try.
router.post('/user/login', loginLimiter, validateRequest({
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    captchaToken: Joi.string().optional(),
    forceCaptcha: Joi.boolean().optional(),
  }),
}), conditionalCaptcha, userController.login);

// Google Sign-In — body carries the ID token from Google Identity Services,
// verified server-side against Google's public keys (no redirect/client-secret
// flow needed). Reuses loginLimiter since it's a login-adjacent endpoint.
router.post('/google', loginLimiter, validateRequest({
  body: Joi.object({
    credential: Joi.string().required(),
  }),
}), userController.googleLogin);

router.post('/refresh', refreshLimiter, requireCsrfToken, authController.refresh);
router.post('/logout', requireCsrfToken, authController.logout);

// Password recovery — user accounts only (see passwordReset.controller.ts).
// Generic responses on both routes: never reveal whether an email is
// registered, and never distinguish "expired" from "invalid" tokens.
router.post('/forgot-password', forgotPasswordLimiter, validateRequest({
  body: Joi.object({ email: Joi.string().email().required() }),
}), passwordResetController.forgotPassword);

router.post('/reset-password', resetPasswordLimiter, validateRequest({
  body: Joi.object({
    token: Joi.string().required(),
    newPassword: strongPasswordSchema,
  }),
}), passwordResetController.resetPassword);

// Logged-in user's own recent security activity (never another user's).
router.get('/me/activity', requireAuth, authController.getMyActivity);

// Session management — view/revoke the caller's own active sessions across
// devices. Mounted under /auth (not /user) since admins use these too.
router.get('/sessions', requireAuth, sessionController.listMySessions);
router.delete('/sessions', requireAuth, sessionController.revokeOtherSessions);
router.delete('/sessions/:sessionId', requireAuth, validateRequest({
  params: Joi.object({ sessionId: Joi.string().hex().length(24).required() }),
}), sessionController.revokeMySession);

// Admin profile management
// NOTE: deliberately NOT behind checkPasswordExpiry, unlike the rest of the
// admin API (products/orders/coupons/etc. — see those route files). An
// expired-password admin still needs to see their own name/email and reach
// the change-password form (the admin header's Profile panel calls
// /admin/me and /admin/profile on every open); only the change-password
// endpoint itself would need excluding either way, or they could never fix
// it, but excluding all three keeps the header usable while they do.
router.get('/admin/me', requireAdmin, authController.getAdminProfile);
router.put('/admin/profile', requireAdmin, accountChangeLimiter, validateRequest({
  body: Joi.object({
    name:  Joi.string().min(2).optional(),
    email: Joi.string().email().optional(),
    // Deliberately NOT required-when-email-present here: the profile form
    // always submits the current email even when it isn't changing, and
    // this schema has no way to know the stored value to tell the two
    // cases apart. updateAdminProfile itself compares against the stored
    // email and enforces currentPassword only when it's an actual change.
    currentPassword: Joi.string().optional(),
  }),
}), authController.updateAdminProfile);
router.put('/admin/password', requireAdmin, accountChangeLimiter, validateRequest({
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword:     strongPasswordSchema,
  }),
}), authController.changeAdminPassword);

export default router;
