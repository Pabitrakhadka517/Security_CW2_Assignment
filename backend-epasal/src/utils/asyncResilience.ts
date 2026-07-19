import { logger } from './logger';

/**
 * Races a promise against a timer so a hung third-party call (Cloudinary,
 * SMTP, hCaptcha, Google) fails fast instead of holding the request open
 * indefinitely. Rejects with a plain Error carrying `label` for logging.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Retries a transient failure a small, fixed number of times with linear
 * backoff. `isRetryable` lets callers skip retrying errors that will never
 * succeed on a second try (bad credentials, invalid input) so those fail
 * immediately instead of adding latency for no benefit.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; delayMs?: number; label?: string; isRetryable?: (err: unknown) => boolean } = {}
): Promise<T> {
  const attempts = opts.attempts ?? 2;
  const delayMs = opts.delayMs ?? 300;
  const isRetryable = opts.isRetryable ?? (() => true);

  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const willRetry = attempt < attempts && isRetryable(err);
      logger.warn(`${opts.label || 'operation'} failed`, {
        attempt,
        willRetry,
        error: err instanceof Error ? err.message : err,
      });
      if (!willRetry) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  throw lastErr;
}
