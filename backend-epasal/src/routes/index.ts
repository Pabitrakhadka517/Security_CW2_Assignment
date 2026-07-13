import { Router } from 'express';
import authRoutes from './auth.routes';
import mfaRoutes from './mfa.routes';
import productRoutes from './product.routes';
import orderRoutes from './order.routes';
import categoryRoutes from './category.routes';
import bannerRoutes from './banner.routes';
import couponRoutes from './coupon.routes';
import userRoutes from './user.routes';
import saleCategoryRoutes from './saleCategory.routes';
import bulkRoutes from './bulk.routes';
import auditRoutes from './audit.routes';
import securityRoutes from './security.routes';
import adminSessionRoutes from './adminSession.routes';
import adminAlertsRoutes from './adminAlerts.routes';
import ipManagementRoutes from './ipManagement.routes';

const router = Router();

// Mount all routes
router.use('/auth', authRoutes);
router.use('/auth/mfa', mfaRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/categories', categoryRoutes);
router.use('/banners', bannerRoutes);
router.use('/coupons', couponRoutes);
router.use('/user', userRoutes);
// NOTE: the legacy DB-cart module (./cart.routes) is intentionally NOT mounted.
// It was written against an ObjectId/variant product model that doesn't match
// this catalogue (string product ids, no variants) and had no ownership checks.
// The cart is client-side; it syncs via /user/cart (see user.routes).
router.use('/sale-categories', saleCategoryRoutes);
// Admin bulk upload (CSV/XLSX/JSON + optional images ZIP)
router.use('/admin/bulk', bulkRoutes);
// Admin security audit log dashboard
router.use('/admin/audit', auditRoutes);
// Admin session monitoring/force-revoke for any user
router.use('/admin/sessions', adminSessionRoutes);
// Admin alert-delivery test endpoint (email/Slack)
router.use('/admin/alerts', adminAlertsRoutes);
// Admin IP allow/block list management
router.use('/admin/ip', ipManagementRoutes);
// CSP violation reporting (browsers POST here automatically, no auth)
router.use('/security', securityRoutes);

// Health check route
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - health
 *     summary: Health check
 *     responses:
 *       200:
 *         description: OK
 */

export default router;
