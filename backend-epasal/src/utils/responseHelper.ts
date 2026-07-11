import { Response } from 'express';

interface SuccessResponse {
  success: true;
  message?: string;
  data?: any;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

interface ErrorResponse {
  success: false;
  message: string;
  error?: any;
  stack?: string;
}

/**
 * Send success response
 */
export const sendSuccess = (
  res: Response,
  statusCode: number = 200,
  message: string = 'Success',
  data?: any,
  meta?: any
): Response => {
  const response: SuccessResponse = {
    success: true,
    message,
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  statusCode: number = 500,
  message: string = 'Internal Server Error',
  error?: any
): Response => {
  const response: ErrorResponse = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error;
    if (error.stack) {
      response.stack = error.stack;
    }
  }

  return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 */
export const sendPaginatedResponse = (
  res: Response,
  data: any[],
  page: number,
  limit: number,
  total: number,
  message: string = 'Data retrieved successfully'
): Response => {
  // Defensive coercion — services should already feed us safe numbers via
  // `safePagination`, but a 500 here would defeat the whole point of the
  // empty-state work. Belt and braces.
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 20;
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safeTotal = Number.isFinite(total) && total >= 0 ? total : 0;
  const totalPages = safeTotal > 0 ? Math.ceil(safeTotal / safeLimit) : 0;

  return sendSuccess(res, 200, message, Array.isArray(data) ? data : [], {
    page: safePage,
    limit: safeLimit,
    total: safeTotal,
    totalPages,
  });
};
