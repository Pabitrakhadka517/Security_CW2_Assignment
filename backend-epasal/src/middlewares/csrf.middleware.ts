import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ForbiddenError } from '../utils/errors';

/**
 * Double-submit-cookie CSRF check for the two auth routes that authenticate
 * via the refresh-token cookie ALONE (no Bearer header) — /auth/refresh and
 * /auth/logout. Every other route requires a Bearer access token, which a
 * cross-site attacker can't forge, so this is deliberately not applied
 * everywhere (see the CSRF plan for the full attack-surface analysis).
 *
 * If there's no refreshToken cookie at all, there's no session to protect —
 * let the request through so /logout's existing "already logged out" no-op
 * and /refresh's own "no token" error still behave exactly as before.
 */
export const requireCsrfToken = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.cookies?.refreshToken) {
    next();
    return;
  }

  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers['x-csrf-token'];

  if (typeof cookieToken !== 'string' || typeof headerToken !== 'string' || !cookieToken || !headerToken) {
    throw new ForbiddenError('Invalid or missing CSRF token');
  }

  const cookieBuf = Buffer.from(cookieToken);
  const headerBuf = Buffer.from(headerToken);

  if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
    throw new ForbiddenError('Invalid or missing CSRF token');
  }

  next();
};
