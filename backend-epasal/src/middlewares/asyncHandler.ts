import { Request, Response, NextFunction } from 'express';

/**
 * Wrap async route handlers so any thrown error or rejected promise is
 * funneled into the global error middleware instead of crashing the
 * process.
 *
 * Also catches synchronous throws (a bare `throw new Error(...)` before
 * the first `await`) — without this wrap, Express would let those escape
 * to `uncaughtException` and kill the worker.
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any> | any
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = fn(req, res, next);
      if (result && typeof (result as Promise<any>).catch === 'function') {
        (result as Promise<any>).catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
};
