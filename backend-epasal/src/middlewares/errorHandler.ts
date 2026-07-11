import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Global error handler.
 *
 * Goals:
 *  - Never return an uncategorised 500. Every known failure mode (validation,
 *    casting, duplicate key, JWT, upload, network, BSON) maps to a clean HTTP
 *    status with a human-readable message.
 *  - Never leak internals (stack, query, raw mongo message) to clients in
 *    production. Stacks are emitted to logs only.
 *  - Be resilient to non-Error throws — somebody doing `throw "boom"` should
 *    still produce a 500 JSON response, not crash the response cycle.
 *
 * Operational vs programmer error:
 *  - `AppError` (and its subclasses) is operational: message is safe to show.
 *  - Anything else is a programmer error: log full detail, show generic msg.
 */

type ErrorLike = Error & {
  statusCode?: number;
  status?: number;
  code?: string | number;
  codeName?: string;
  errors?: Record<string, { message?: string }>;
  type?: string;
  keyValue?: Record<string, unknown>;
  path?: string;
  value?: unknown;
  details?: unknown;
};

const isErrorObject = (e: unknown): e is ErrorLike =>
  !!e && typeof e === 'object' && ('name' in (e as any) || 'message' in (e as any));

const isMongooseValidationError = (err: ErrorLike): boolean =>
  err.name === 'ValidationError' && !!err.errors;

const isMongoNetworkError = (err: ErrorLike): boolean => {
  if (!err?.name) return false;
  return (
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoNotConnectedError' ||
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoTimeoutError' ||
    err.name === 'MongoPoolClosedError'
  );
};

const isBsonError = (err: ErrorLike): boolean =>
  err?.name === 'BSONError' || err?.name === 'BSONTypeError';

const normalizeMessage = (err: ErrorLike): string => {
  if (err instanceof AppError) return err.message;

  if (err.name === 'SyntaxError' && err.type === 'entity.parse.failed') {
    return 'Invalid JSON payload';
  }

  if (err.name === 'MulterError') {
    const code = String(err.code || '');
    if (code === 'LIMIT_FILE_SIZE') return 'Uploaded file is too large';
    if (code === 'LIMIT_FILE_COUNT') return 'Too many files uploaded';
    if (code === 'LIMIT_UNEXPECTED_FILE') return 'Unexpected file field';
    return 'File upload error';
  }

  if (isMongooseValidationError(err)) {
    const details = Object.values(err.errors || {})
      .map((entry) => entry?.message)
      .filter(Boolean) as string[];
    return details.length ? details.join(', ') : 'Validation Error';
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : null;
    return field ? `Duplicate value for field: ${field}` : 'Duplicate field value entered';
  }

  if (err.name === 'CastError') {
    const path = err.path ? ` for field '${err.path}'` : '';
    return `Invalid ID format${path}`;
  }

  if (isBsonError(err)) return 'Invalid identifier format';

  if (err.name === 'JsonWebTokenError') return 'Invalid token';
  if (err.name === 'TokenExpiredError') return 'Token expired';
  if (err.name === 'NotBeforeError') return 'Token not active yet';

  if (isMongoNetworkError(err)) return 'Database temporarily unavailable, please retry';

  // Express request abort / timeout
  if ((err as any).code === 'ECONNABORTED' || err.name === 'TimeoutError') {
    return 'Request timed out';
  }

  // Generic Mongo error fallback — never leak driver message verbatim.
  if (err.name === 'MongoServerError') return 'Database operation failed';

  // For everything unknown, surface a safe generic message. The real error
  // details are written to the log.
  return 'Internal Server Error';
};

const normalizeStatusCode = (err: ErrorLike): number => {
  if (err instanceof AppError) return err.statusCode;

  if (err.name === 'SyntaxError' && err.type === 'entity.parse.failed') return 400;
  if (err.name === 'MulterError') {
    return String(err.code || '') === 'LIMIT_FILE_SIZE' ? 413 : 400;
  }
  if (isMongooseValidationError(err)) return 422;
  if (err.name === 'MongoServerError' && err.code === 11000) return 409;
  if (err.name === 'CastError' || isBsonError(err)) return 400;
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NotBeforeError') return 401;
  if (isMongoNetworkError(err)) return 503;
  if ((err as any).code === 'ECONNABORTED' || err.name === 'TimeoutError') return 408;
  if (err.name === 'MongoServerError') return 500;

  if (typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600) {
    return err.statusCode;
  }
  if (typeof err.status === 'number' && err.status >= 400 && err.status < 600) {
    return err.status;
  }

  return 500;
};

const safeErrorView = (raw: unknown): ErrorLike => {
  if (isErrorObject(raw)) return raw;
  // Convert non-Error throws ("string", null, {}) into a real Error so the rest
  // of the pipeline can operate on a consistent shape.
  return Object.assign(new Error(typeof raw === 'string' ? raw : 'Unknown error'), { name: 'UnknownError' });
};

export const errorHandler = (
  rawErr: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const err = safeErrorView(rawErr);
  const statusCode = normalizeStatusCode(err);
  const message = normalizeMessage(err);
  const requestId = res.locals?.requestId;

  // Always log — the operator needs the truth even when the client gets a
  // sanitised message.
  const logPayload = {
    requestId,
    statusCode,
    method: req.method,
    path: req.originalUrl,
    name: err.name,
    code: (err as any).code,
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  };

  if (statusCode >= 500) {
    logger.error('Request failed', logPayload);
  } else {
    logger.warn('Request rejected', logPayload);
  }

  // Defensive: if headers already went out (e.g. error thrown after res.send),
  // we cannot send another response — just close the connection.
  if (res.headersSent) {
    try { res.end(); } catch { /* ignore */ }
    return;
  }

  const body: Record<string, unknown> = {
    success: false,
    message,
    requestId,
  };

  // Surface validation details (without internal stack) so frontends can
  // render field-level errors.
  if (err instanceof AppError && err.details !== undefined) {
    body.details = err.details;
  }

  if (process.env.NODE_ENV !== 'production') {
    body.error = { name: err.name, code: (err as any).code };
  }

  try {
    res.status(statusCode).json(body);
  } catch (sendErr) {
    // Last-resort fallback if JSON serialisation itself blows up.
    logger.error('Failed to serialise error response', { sendErr: sendErr instanceof Error ? sendErr.message : sendErr });
    try { res.status(statusCode).end(); } catch { /* ignore */ }
  }
};

/**
 * 404 catch-all. Must be registered AFTER all routes.
 */
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};
