import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ServiceUnavailableError } from '../utils/errors';

/**
 * Short-circuit requests with a clean 503 when Mongo isn't connected.
 *
 * Mongoose connection.readyState codes:
 *   0 = disconnected
 *   1 = connected
 *   2 = connecting
 *   3 = disconnecting
 *
 * We ONLY let requests through when fully connected (state 1). The connection
 * pool is configured with bufferCommands:false (see config/db.ts), so the
 * driver will NOT queue operations while connecting or disconnected; it throws
 * immediately ("Cannot call coll.find() before initial connection is
 * complete"), which surfaces as a confusing 500. Gating on state 1 turns that
 * window into a clean, retryable 503 instead.
 *
 * This matters most during boot on a cold platform (e.g. Render free tier)
 * and during reconnect flaps, where the connection briefly drops to state 2.
 */
export const dbReady = (req: Request, _res: Response, next: NextFunction): void => {
  // The /health endpoint must stay green even when Mongo flaps, so platform
  // load balancers don't take the pod out of rotation unnecessarily.
  if (req.path === '/health' || req.path.endsWith('/health')) {
    next();
    return;
  }

  const state = mongoose.connection.readyState;
  if (state === 1) {
    next();
    return;
  }

  next(new ServiceUnavailableError('Database is not ready, please retry shortly'));
};
