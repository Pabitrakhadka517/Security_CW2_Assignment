import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { requireAdmin } from '../middlewares/authMiddleware';
import * as auditService from '../services/audit.service';
import { sendSuccess } from '../utils/responseHelper';

const router = Router();

router.use(requireAdmin);

/**
 * GET /api/v1/admin/audit/logs
 * Query: userId, action, riskLevel, from, to, ipAddress, page, limit
 */
router.get('/logs', asyncHandler(async (req: Request, res: Response) => {
  const { userId, action, riskLevel, from, to, ipAddress, page, limit } = req.query as Record<string, string | undefined>;

  const filters = {
    userId: userId || undefined,
    action: action || undefined,
    riskLevel: riskLevel || undefined,
    ipAddress: ipAddress || undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  };

  const result = await auditService.getSecurityEvents(
    filters,
    page ? parseInt(page, 10) : 1,
    limit ? parseInt(limit, 10) : 50
  );

  sendSuccess(res, 200, 'Audit logs retrieved', result);
}));

/**
 * GET /api/v1/admin/audit/summary
 */
router.get('/summary', asyncHandler(async (_req: Request, res: Response) => {
  const summary = await auditService.getAuditSummary();
  sendSuccess(res, 200, 'Audit summary retrieved', summary);
}));

/**
 * GET /api/v1/admin/audit/user/:userId
 */
router.get('/user/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const result = await auditService.getSecurityEvents({ userId }, 1, 200);
  sendSuccess(res, 200, 'User audit logs retrieved', result);
}));

export default router;
