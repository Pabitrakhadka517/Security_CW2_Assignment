import { Request, Response, NextFunction } from 'express';
import { RequestTimeoutError } from '../utils/errors';

/**
 * Hard-cap per-request execution time. Without this, a slow downstream call
 * (e.g. a hung Mongo cursor) can hold a request open indefinitely, and the
 * client eventually sees a confusing 502 from the reverse proxy.
 *
 * On timeout we forward a RequestTimeoutError to the global error handler so
 * the client gets a clean 408 with the standard error envelope.
 *
 * @param ms  Timeout in milliseconds (default 30s)
 */
export const requestTimeout = (ms: number = 30_000) => {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        next(new RequestTimeoutError(`Request exceeded ${ms}ms time limit`));
      }
    }, ms);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    next();
  };
};
