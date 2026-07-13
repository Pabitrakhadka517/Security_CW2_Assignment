import { CookieOptions } from 'express';

/**
 * Central cookie policy for the refresh-token cookie.
 *
 * COOKIE_SAMESITE env var:
 *   - 'lax'  (default) — frontend and API share a site (same domain or localhost).
 *   - 'none' — frontend and API are on different domains (e.g. Vercel + Render).
 *              Browsers require `secure: true` with SameSite=None, so we force it.
 *
 * The old hardcoded `sameSite: 'strict'` silently broke token refresh and
 * guest sessions on any cross-site deployment.
 */
export const refreshCookieOptions = (maxAge?: number): CookieOptions => {
  const sameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase() === 'none' ? 'none' : 'lax';
  const secure = process.env.NODE_ENV === 'production' || sameSite === 'none';
  const opts: CookieOptions = {
    httpOnly: true,
    secure,
    sameSite,
    path: '/api/v1/auth',
  };
  // Leading-dot COOKIE_DOMAIN (e.g. ".epasaley.com") shares the cookie across
  // subdomains. Only set in production — in dev the API and frontend are
  // usually on different hosts/ports where a fixed domain would just break
  // the cookie outright.
  if (process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN) {
    opts.domain = process.env.COOKIE_DOMAIN;
  }
  if (maxAge !== undefined) opts.maxAge = maxAge;
  return opts;
};
