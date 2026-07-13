import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { requireAdmin } from '../middlewares/authMiddleware';
import { alertService } from '../services/alert.service';

const router = Router();

router.use(requireAdmin);

/**
 * GET /api/v1/admin/alerts/test
 * Fires a synthetic HIGH-risk alert through both channels so an operator can
 * confirm SMTP/Slack are wired up correctly during setup. Bypasses the
 * cooldown by using a dedicated alert type per call (timestamp-suffixed) so
 * repeated test clicks each actually send.
 */
router.get('/test', asyncHandler(async (req: Request, res: Response) => {
  const { emailSent, slackSent } = await alertService.triggerAlert({
    type: `ALERT_TEST_${Date.now()}`,
    riskLevel: 'HIGH',
    message: 'This is a test alert triggered from the admin security dashboard',
    ipAddress: req.ip || 'unknown',
    userId: req.user?.id,
    userEmail: req.user?.email,
    metadata: { triggeredBy: 'admin_test_endpoint' },
    timestamp: new Date(),
  });

  res.status(200).json({
    success: true,
    message: 'Test alert dispatched',
    data: { emailSent, slackSent },
  });
}));

export default router;
