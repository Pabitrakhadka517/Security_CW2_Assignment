import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import * as auditService from '../services/audit.service';
import { createAuditContext } from '../middlewares/auditLogger';

const router = Router();

/**
 * POST /api/v1/security/csp-report
 * Browsers POST here automatically on a CSP violation (no auth, no CSRF
 * token — this is a fire-and-forget beacon, not a user action). Body is
 * parsed by the `application/csp-report` body-parser mounted in app.ts.
 */
router.post('/csp-report', asyncHandler(async (req: Request, res: Response) => {
  const report = (req.body && req.body['csp-report']) || {};
  const ctx = createAuditContext(req);

  await auditService.log({
    ...ctx,
    action: 'SUSPICIOUS_ACTIVITY',
    status: 'FAILURE',
    riskLevel: 'MEDIUM',
    metadata: {
      type: 'csp_violation',
      blockedUri: report['blocked-uri'],
      violatedDirective: report['violated-directive'],
      documentUri: report['document-uri'],
      sourceFile: report['source-file'],
      lineNumber: report['line-number'],
    },
  });

  res.status(204).end();
}));

export default router;
