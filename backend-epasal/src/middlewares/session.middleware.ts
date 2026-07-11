import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      sessionId?: string;
    }
  }
}

/**
 * Session middleware for guest cart tracking.
 * Creates/retrieves a session ID cookie for unauthenticated users.
 */
export const sessionMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const user = req.user;

  if (user && user.id) {
    req.sessionId = user.id;
    next();
    return;
  }

  const existingSession = req.cookies?.sessionId;

  if (existingSession) {
    req.sessionId = existingSession;
  } else {
    const newSessionId = uuidv4();
    req.sessionId = newSessionId;
    res.cookie('sessionId', newSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict',
      path: '/',
    });
  }

  next();
};

/**
 * Clear session on logout
 */
export const clearSessionMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  res.clearCookie('sessionId', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  req.sessionId = undefined;
  next();
};
