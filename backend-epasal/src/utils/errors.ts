/**
 * Custom error classes for operational (expected) errors.
 *
 * The global errorHandler middleware uses `instanceof AppError` to decide
 * whether to surface the message to the client. Any error NOT derived from
 * AppError is treated as an unknown internal failure and surfaced as a
 * generic "Internal Server Error" with the real details only in the log.
 *
 * This is the single source of truth for HTTP error mapping — please add
 * new HTTP statuses here instead of throwing raw `Error` objects.
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: unknown;

  constructor(message: string, statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: unknown) {
    super(message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  public code?: string;

  constructor(message: string = 'Unauthorized', code?: string) {
    super(message, 401);
    this.code = code;
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class LockedError extends AppError {
  constructor(message: string = 'Account locked', details?: unknown) {
    super(message, 423, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class RequestTimeoutError extends AppError {
  constructor(message: string = 'Request timed out') {
    super(message, 408);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message: string = 'Payload too large') {
    super(message, 413);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 422, details);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message: string = 'Unprocessable entity', details?: unknown) {
    super(message, 422, details);
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(message: string = 'Unsupported media type', details?: unknown) {
    super(message, 415, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

/**
 * Service is up but cannot fulfill the request right now — e.g. database
 * unreachable, third-party dependency down. Always retryable.
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503);
  }
}
