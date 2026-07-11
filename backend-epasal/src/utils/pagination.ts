/**
 * Safe pagination helpers.
 *
 * These never produce NaN, never divide by zero, and never return a negative
 * `skip` value even if the caller passes garbage (negative page, limit=0,
 * stringified numbers, etc.). Services should funnel pagination through here
 * instead of doing the math inline, which is where most "500 Internal Server
 * Error" surprises sneak in.
 */

export interface SafePaginationInput {
  page?: number | string | null | undefined;
  limit?: number | string | null | undefined;
}

export interface SafePagination {
  page: number;
  limit: number;
  skip: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const toPositiveInt = (val: unknown, fallback: number): number => {
  const n = typeof val === 'string' ? parseInt(val, 10) : Number(val);
  if (!Number.isFinite(n) || Number.isNaN(n) || n < 1) return fallback;
  return Math.floor(n);
};

export const safePagination = (input: SafePaginationInput = {}): SafePagination => {
  const page = toPositiveInt(input.page, DEFAULT_PAGE);
  const rawLimit = toPositiveInt(input.limit, DEFAULT_LIMIT);
  const limit = Math.min(rawLimit, MAX_LIMIT);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const buildPaginationMeta = (page: number, limit: number, total: number) => {
  const safeLimit = limit > 0 ? limit : DEFAULT_LIMIT;
  return {
    page,
    limit: safeLimit,
    total: Number.isFinite(total) && total >= 0 ? total : 0,
    totalPages: total > 0 ? Math.ceil(total / safeLimit) : 0,
  };
};
