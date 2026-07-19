# Epasaley — E-Commerce Backend

A Node.js/Express/TypeScript backend for the Epasaley store: product catalogue, orders,
coupons, and a security-focused authentication system (JWT with refresh rotation, TOTP/email
MFA, CSRF, rate limiting, encryption at rest, audit logging).

## What it does

### Catalogue
* Products, categories, banners, and seasonal sale categories — full CRUD for admins,
  filtered/paginated/searchable reads for the public storefront.
* Coupons with validation and per-code usage analytics.
* Orders: server-side pricing (client-submitted totals are never trusted), atomic stock
  decrement/rollback, cash-on-delivery only.

### Authentication & account security
* JWT access + refresh tokens, with refresh-token rotation and reuse detection (a reused,
  already-rotated-out token revokes its entire session family).
* MFA via TOTP (authenticator app + QR code + backup codes) or emailed one-time codes —
  either method works for both user and admin accounts.
* Forgot/reset password (hashed, time-limited tokens) and optional email verification on
  registration.
* Password complexity rules, reuse prevention, and expiry.
* CSRF protection (double-submit cookie) on the two cookie-authenticated endpoints
  (`/auth/refresh`, `/auth/logout`).
* Session management: list/revoke individual sessions or all sessions, device tracking.

### Access control & abuse protection
* Role-based access control (admin/user) enforced by middleware on every protected route.
* Rate limiting per sensitive endpoint (login, register, password reset, MFA, exports, …),
  account lockout after repeated failures, hCaptcha on high-risk attempts, and an IP
  allow/block list.

### Data protection
* AES-256-GCM encryption at rest for PII (phone, address) and MFA secrets.
* Input sanitization (HTML stripping) and Mongoose-level validation on every write path.
* Image uploads validated by both declared MIME type and actual file signature (magic
  bytes), then stored on Cloudinary — never on local disk.

### Observability
* Structured audit log for auth events, profile changes, and admin actions (never logs
  passwords, tokens, or OTP codes).
* Real-time alerts (email/Slack) for high/critical security events, plus an admin security
  dashboard (suspicious IPs, login activity, audit trail).

## Stack

* Node.js + Express + TypeScript
* MongoDB + Mongoose
* JWT (`jsonwebtoken`), `bcryptjs`, `speakeasy` (TOTP)
* Cloudinary (image storage)
* Jest (unit/integration tests)

## Getting started

```bash
npm install
cp .env.example .env   # fill in the values described below
npm run dev
```

Run the test suite with `npm test`.

## CORS configuration

Allowed origins are set via the `CORS_ORIGINS` environment variable. This is required
whenever the frontend sends credentials (cookies) — browsers reject credentialed requests
if the server responds with `Access-Control-Allow-Origin: *`.

- Local dev: `http://localhost:5174`
- Production: `https://your-frontend-domain.com`
- Multiple origins: `CORS_ORIGINS="http://localhost:5174,https://frontend.example.com"`

The server echoes back the validated `Origin` as `Access-Control-Allow-Origin` and sets
`Access-Control-Allow-Credentials: true` only when that origin is on the allow list.

## Encryption keys

Phone numbers and address fields (`User.phone`, `User.address`, `User.savedAddresses`,
`Order.phone`, `Order.address`) and MFA secrets are encrypted at rest with AES-256-GCM —
see `src/services/encryption.service.ts`. Email, name, and order metadata (status, amounts,
ids) stay plaintext since they're needed for lookup, search, and queries.

Generate a key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set it as `ENCRYPTION_KEY` in `.env` (64 hex characters). Use a **different** key per
environment — never reuse the dev key in production, and never commit a real key to
version control.

```
ENCRYPTION_KEY=<64 hex chars>
ENCRYPTION_KEY_VERSION=1
ENCRYPTION_KEY_V0=          # only set during a key rotation
```

The server validates `ENCRYPTION_KEY` on startup (`src/app.ts`) and refuses to boot if
it's missing, the wrong length, or fails a roundtrip encrypt/decrypt test.

**Rotating a key** — generate a new key, move the current `ENCRYPTION_KEY` value to
`ENCRYPTION_KEY_V0`, set the new value as `ENCRYPTION_KEY`, bump `ENCRYPTION_KEY_VERSION`,
then run the migration during a maintenance window:

```bash
npm run rotate:encryption-key -- --dry-run   # preview
npm run rotate:encryption-key                # apply
```

Once every document is confirmed migrated, remove `ENCRYPTION_KEY_V0`.

## License

Released under the ISC License.
