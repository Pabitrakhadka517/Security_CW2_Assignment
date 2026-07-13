import express, { Application, Request, Response, NextFunction } from 'express'; // NextFunction used by middlewares above

import cors from 'cors';
import compression from 'compression';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { dbReady } from './middlewares/dbReady';
import { requestTimeout } from './middlewares/requestTimeout';
import mongoose from 'mongoose';
import routes from './routes';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger';
import { logger } from './utils/logger';
import { randomUUID } from 'crypto';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { helmetConfig, swaggerCsp, permissionsPolicy } from './config/helmet.config';
import { encryptionService } from './services/encryption.service';
import { ipFilter } from './middlewares/ipFilter';

// ===========================================
// ENCRYPTION KEY VALIDATION (fail fast on bad config)
// ===========================================
// Runs at module load — before server.ts ever calls app.listen() — so a
// missing/malformed encryption key crashes startup instead of surfacing
// later as a cryptic decrypt failure on the first request that touches PII.
function validateEncryptionKey(): void {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('FATAL: ENCRYPTION_KEY not set in environment');
  }

  if (key.length !== 64) {
    throw new Error(`FATAL: ENCRYPTION_KEY must be 64 hex chars (32 bytes). Current length: ${key.length}`);
  }

  if (!/^[a-f0-9]+$/i.test(key)) {
    throw new Error('FATAL: ENCRYPTION_KEY must be hex encoded');
  }

  const testValue = 'key-validation-test';
  try {
    const encrypted = encryptionService.encrypt(testValue);
    const decrypted = encryptionService.decrypt(encrypted);
    if (decrypted !== testValue) {
      throw new Error('Roundtrip test failed');
    }
  } catch (err) {
    throw new Error(`FATAL: Encryption key validation failed: ${err}`);
  }

  logger.info('[Security] Encryption key validated successfully');
}

validateEncryptionKey();

// ===========================================
// CREATE EXPRESS APP
// ===========================================
const app: Application = express();

// ===========================================
// 1. CORS CONFIGURATION - MUST BE FIRST
// ===========================================
// In development: allow all localhost origins automatically.
// In production: restrict to the comma-separated list in CORS_ORIGIN env var.
//   CORS_ORIGIN=https://epasaley.com,https://www.epasaley.com

const isDev = process.env.NODE_ENV !== 'production';
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Non-browser tools (Postman, curl) send no origin — always allow
    if (!origin) return callback(null, true);
    // In development allow any localhost / 127.0.0.1 port automatically
    if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    // Allow explicitly listed origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Block everything else — but respond with 200 so browser sees CORS error, not 500
    return callback(null, false);
  },
  methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  allowedHeaders: 'Content-Type,Authorization,X-Requested-With,Accept,Origin,X-Client-Role',
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400,
};

// Apply CORS — must be before every other middleware
app.use(cors(corsOptions));
// Handle preflight for all routes
app.options('*', cors(corsOptions));

// ===========================================
// 2. TRUST PROXY (Required for Render/Heroku)
// ===========================================
app.set('trust proxy', 1);

// ===========================================
// 2b. IP ALLOW/BLOCK LIST (separate enforcement layer on top of rate limiting)
// ===========================================
// Must run after trust proxy (needs the real client IP) and before rate
// limiters/routes, so a blocked IP never consumes a rate-limit slot.
app.use(ipFilter);

// ===========================================
// 3. SECURITY MIDDLEWARE
// ===========================================
// Full config (CSP, HSTS, Permissions-Policy, etc.) lives in
// ./config/helmet.config.ts — see that file for the justification behind
// each directive. `swaggerCsp` overrides just the CSP header on the doc
// routes below, since Swagger UI needs inline scripts/styles.
app.use(helmetConfig);
app.use(permissionsPolicy);

// Additional headers not covered by Helmet.
app.use((req: Request, res: Response, next: NextFunction) => {
  // Defense in depth — Helmet already hides X-Powered-By by default.
  res.removeHeader('X-Powered-By');

  // Sensitive JSON must never be cached by browsers or intermediate proxies.
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }

  next();
});

// ===========================================
// 4. BODY PARSERS
// ===========================================
// Browsers POST CSP violation reports with Content-Type: application/csp-report,
// which the generic JSON parser below won't match — parse it here, scoped to
// just that route, before the catch-all parsers run.
app.use('/api/v1/security/csp-report', express.json({ type: 'application/csp-report' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Lightweight cookie parser (avoids external dependency)
app.use((req, _res, next) => {
  const cookieHeader = req.headers?.cookie;
  (req as any).cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach((c) => {
      const idx = c.indexOf('=');
      if (idx > -1) {
        const key = c.slice(0, idx).trim();
        const val = c.slice(idx + 1).trim();
        (req as any).cookies[key] = decodeURIComponent(val);
      }
    });
  }
  next();
});

// ===========================================
// 5. COMPRESSION
// ===========================================
app.use(compression());

// ===========================================
// 6. RATE LIMITING
// ===========================================
// No blanket global limiter — applied per-route (see middlewares/rateLimiter.ts)
// on the endpoints that are actually abusable: login/register (brute force),
// refresh, password/email change, and coupon validation/order-total preview
// (coupon-code guessing / per-user usage enumeration).

// ===========================================
// 6b. INPUT SANITIZATION & HPP
// ===========================================
// Strip any $ or . from request bodies/queries to prevent MongoDB operator injection.
app.use(mongoSanitize({ replaceWith: '_', dryRun: false }));

// Prevent HTTP Parameter Pollution — duplicate query params are collapsed to last value.
app.use(hpp({ whitelist: ['sort', 'fields', 'page', 'limit', 'category', 'status'] }));

// ===========================================
// 6c. HEALTH CHECK (Render / load balancer probes)
// ===========================================
// Liveness probe — always 200 if the process can answer. Don't fail this
// when Mongo is down or the platform will kill the pod and we can't even
// serve "503, retrying" to clients.
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Readiness probe — true only when downstream dependencies are healthy.
// Use this from internal traffic routing if you want to drain a pod whose
// database connection is currently flapping.
app.get('/ready', (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  const ready = dbState === 1;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not-ready',
    dependencies: { mongo: dbState === 1 ? 'up' : 'down' },
    timestamp: new Date().toISOString(),
  });
});

// ===========================================
// 7. REQUEST CONTEXT + LOGGING
// ===========================================
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = randomUUID();
  const startedAt = Date.now();

  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const meta = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    if (res.statusCode >= 500) {
      logger.error('Request completed with server error', meta);
      return;
    }

    if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', meta);
      return;
    }

    logger.info('Request completed', meta);
  });

  next();
});

// (JSON-parse SyntaxError handling is delegated to the global errorHandler.)

// ===========================================
// 8. API ROUTES
// ===========================================
// Per-request safety net before any business logic runs:
//   - requestTimeout aborts requests that hang past 30s with a clean 408.
//   - dbReady short-circuits with 503 when Mongo isn't connected, so
//     callers don't wait on the driver's internal queue.
// Health/ready probes above are NOT gated by these so the platform can
// still observe the process during a degraded state.
app.use('/api/v1', requestTimeout(30_000), dbReady, routes);

// ===========================================
// 9. SWAGGER DOCUMENTATION
// ===========================================
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/api-docs', swaggerCsp, swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.use('/api/v1/docs', swaggerCsp, swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

// ===========================================
// 10. UTILITY ROUTES
// ===========================================
app.get('/swagger', (_req: Request, res: Response) => res.redirect('/api-docs'));
app.get('/favicon.ico', (_req: Request, res: Response) => res.sendStatus(204));

app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Epasaley E-Commerce API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health',
  });
});

// ===========================================
// 11. ERROR HANDLERS (Must be last)
// ===========================================
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
