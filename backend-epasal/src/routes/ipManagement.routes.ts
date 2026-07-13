import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { requireAdmin } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { ipListService } from '../services/ipList.service';
import { sendSuccess } from '../utils/responseHelper';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { blockIPSchema, allowIPSchema, ipParamSchema } from '../validations/ipRule.validation';

const router = Router();

router.use(requireAdmin);

/**
 * GET /api/v1/admin/ip/stats
 */
router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = await ipListService.getStats();
    sendSuccess(res, 200, 'IP stats retrieved', { stats });
  })
);

/**
 * GET /api/v1/admin/ip/blocked
 */
router.get(
  '/blocked',
  asyncHandler(async (_req: Request, res: Response) => {
    const ips = await ipListService.getBlockedIPs();
    sendSuccess(res, 200, 'Blocked IPs retrieved', { count: ips.length, ips });
  })
);

/**
 * GET /api/v1/admin/ip/allowed
 */
router.get(
  '/allowed',
  asyncHandler(async (_req: Request, res: Response) => {
    const ips = await ipListService.getAllowedIPs();
    sendSuccess(res, 200, 'Allowed IPs retrieved', { count: ips.length, ips });
  })
);

/**
 * POST /api/v1/admin/ip/block
 */
router.post(
  '/block',
  validateRequest(blockIPSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { ip, reason, permanent, expiresInHours } = req.body;
    const adminId = req.user?.id;

    // Never let an admin block an IP that's currently allow-listed — it
    // would silently do nothing (allow always wins) and hide the mistake.
    if (await ipListService.isAllowed(ip)) {
      throw new BadRequestError('Cannot block an allow-listed IP. Remove it from the allow list first.');
    }

    const rule = await ipListService.blockIP({
      ip,
      reason,
      adminId,
      permanent: permanent ?? false,
      expiresInHours,
    });

    sendSuccess(res, 200, `IP ${ip} blocked successfully`, { rule });
  })
);

/**
 * POST /api/v1/admin/ip/allow
 */
router.post(
  '/allow',
  validateRequest(allowIPSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { ip, reason } = req.body;
    const adminId = req.user!.id;

    const rule = await ipListService.allowIP({ ip, reason, adminId });
    sendSuccess(res, 200, `IP ${ip} added to allow list`, { rule });
  })
);

/**
 * DELETE /api/v1/admin/ip/block/:ip
 */
router.delete(
  '/block/:ip',
  validateRequest(ipParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { ip } = req.params;
    const deleted = await ipListService.unblockIP(ip);
    if (!deleted) {
      throw new NotFoundError(`IP ${ip} was not in the block list`);
    }
    sendSuccess(res, 200, `IP ${ip} unblocked successfully`);
  })
);

/**
 * DELETE /api/v1/admin/ip/allow/:ip
 */
router.delete(
  '/allow/:ip',
  validateRequest(ipParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { ip } = req.params;
    const deleted = await ipListService.removeFromAllowList(ip);
    if (!deleted) {
      throw new NotFoundError(`IP ${ip} was not in the allow list`);
    }
    sendSuccess(res, 200, `IP ${ip} removed from allow list`);
  })
);

/**
 * POST /api/v1/admin/ip/refresh-cache
 * Forces the in-memory allow/block cache to reload from Mongo immediately,
 * instead of waiting for the 5-minute TTL.
 */
router.post(
  '/refresh-cache',
  asyncHandler(async (_req: Request, res: Response) => {
    await ipListService.invalidateCache();
    const stats = await ipListService.getStats();
    sendSuccess(res, 200, 'Cache refreshed successfully', { stats });
  })
);

export default router;
