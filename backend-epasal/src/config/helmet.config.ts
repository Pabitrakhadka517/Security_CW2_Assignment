import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

// ===========================================
// HELMET / SECURITY HEADERS CONFIGURATION
// ===========================================
// This API only ever serves JSON (Swagger's HTML pages are the one
// exception — they get `swaggerCsp` layered on top, see below), so the
// default policy can be maximally strict: no scripts, no styles, no
// framing, nothing embeddable, nothing but same-origin JSON fetches.
//
// Note on hCaptcha: the hCaptcha widget (script/iframe/XHR) runs inside the
// React SPA, not inside anything this API renders. Backend responses never
// load hCaptcha, so its domains do NOT need to appear in this CSP — they
// belong in the frontend's CSP instead (see frontend index.html / hosting
// headers). Adding them here would be a no-op at best and a false sense of
// coverage at worst.

const isProduction = process.env.NODE_ENV === 'production';

export const helmetConfig = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      // Nothing loads by default; every capability below is opt-in.
      'default-src': ["'none'"],
      'script-src': ["'none'"],
      'style-src': ["'none'"],
      'img-src': ["'none'"],
      'font-src': ["'none'"],
      // JSON responses are same-origin fetch/XHR only — CORS (not CSP)
      // governs who may read them; this just stops the API's own
      // (nonexistent) pages from reaching out anywhere.
      'connect-src': ["'self'"],
      'object-src': ["'none'"],
      'base-uri': ["'none'"],
      'form-action': ["'none'"],
      // Belt-and-suspenders with the X-Frame-Options header below.
      'frame-ancestors': ["'none'"],
      // Send real CSP violations here for evidence (e.g. Swagger docs pages).
      'report-uri': ['/api/v1/security/csp-report'],
      // Upgrading to HTTPS only makes sense once we're actually served over
      // HTTPS — on localhost HTTP it would just break every request.
      ...(isProduction ? { 'upgrade-insecure-requests': [] } : {}),
    },
  },

  // Force HTTPS for a year incl. subdomains — production only. HSTS on
  // localhost would get the "always HTTPS" pin stuck in the dev browser.
  hsts: isProduction
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,

  // Belt-and-suspenders with CSP's frame-ancestors above, for browsers old
  // enough to not enforce that directive. Helmet's own default is
  // SAMEORIGIN; this API has no same-origin page that should ever be
  // framed either, so it's tightened to DENY.
  frameguard: { action: 'deny' },

  // Everything else below uses helmet's hardened defaults (X-Content-Type-Options:
  // nosniff, X-DNS-Prefetch-Control: off, X-Download-Options, hidden
  // X-Powered-By, X-Permitted-Cross-Domain-Policies: none,
  // Origin-Agent-Cluster, X-XSS-Protection: 0 — the legacy XSS-Filter header
  // is deliberately left disabled per current OWASP/MDN guidance: it's been
  // removed from all modern browsers and enabling it on old IE/Edge could
  // itself be leveraged for XSS, so CSP is the actual XSS defense here).
  // Only the two cross-origin knobs are overridden:
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // product images/files may be fetched cross-origin
  crossOriginEmbedderPolicy: false, // COEP would break third-party embeds (e.g. payment/captcha widgets) on any HTML this API ever serves
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// Swagger UI ships inline <script>/<style> tags, so its pages need a looser
// policy than the rest of the API. This middleware only overrides the CSP
// header — mount it AFTER `helmetConfig` on the docs routes so it replaces
// just that one header while every other Helmet header set globally still
// applies.
export const swaggerCsp = helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
  },
});

/**
 * Helmet 7 dropped its old `featurePolicy`/Permissions-Policy component, so
 * there's no built-in Helmet option for it — set it by hand. Every feature
 * this API has no reason to grant is denied for any document that ends up
 * rendering an API response (Swagger, the JSON root page, etc.).
 */
export const permissionsPolicy = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)'
  );
  next();
};
