import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/tokenGenerator';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: 'admin' | 'user' | 'super_admin';
      };
    }
  }
}

/**
 * Middleware to verify JWT token
 */
export const authenticate = (isAdmin: boolean = false) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Get token from header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('No token provided');
      }

      const token = authHeader.split(' ')[1];

      if (!token) {
        throw new UnauthorizedError('Invalid token format');
      }

      // Verify token
      const decoded = verifyAccessToken(token, isAdmin);

      // Check if admin role is required
      if (isAdmin && decoded.role !== 'admin') {
        throw new ForbiddenError('Admin access required');
      }

      // Attach user to request
      req.user = decoded;

      next();
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
        next(error);
      } else if (error instanceof Error && error.name === 'TokenExpiredError') {
        // Distinguished from a merely invalid token so the frontend can
        // silently call /auth/refresh instead of forcing a full re-login.
        next(new UnauthorizedError('Access token expired', 'TOKEN_EXPIRED'));
      } else {
        next(new UnauthorizedError('Invalid or expired token'));
      }
    }
  };
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = authenticate(true);

/**
 * Middleware to authenticate user (admin or regular user)
 */
export const requireAuth = authenticate(false);

/**
 * Authenticate either a user or admin token — tries the user secret first,
 * then falls back to the admin secret. Unlike `optionalAuth`, this fails
 * closed with a 401 if neither verifies. Used for self-service routes both
 * roles legitimately hit (e.g. MFA setup/challenge), where a plain
 * `requireAuth`/`requireAdmin` split would otherwise lock one role out.
 */
export const requireAuthAny = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new UnauthorizedError('No token provided'));
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    next(new UnauthorizedError('Invalid token format'));
    return;
  }

  try {
    req.user = verifyAccessToken(token, false);
    next();
    return;
  } catch {
    // Fall through to the admin secret below.
  }

  try {
    req.user = verifyAccessToken(token, true);
    next();
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Access token expired', 'TOKEN_EXPIRED'));
    } else {
      next(new UnauthorizedError('Invalid or expired token'));
    }
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      // User and admin tokens are signed with different secrets — try the
      // user secret first, then fall back to the admin secret so admin
      // callers are recognised on public/optional routes too.
      try {
        req.user = verifyAccessToken(token, false);
      } catch {
        const decoded = verifyAccessToken(token, true);
        if (decoded.role === 'admin' || decoded.role === 'super_admin') {
          req.user = decoded;
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
