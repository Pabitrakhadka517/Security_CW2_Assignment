// Jest global setup — runs before each test file (setupFilesAfterEach).
import dotenv from 'dotenv'
dotenv.config()

process.env.NODE_ENV = 'test'
// dotenv just loaded real SMTP/Slack credentials from .env. Tests like
// refreshTokenReuse.spec.ts deliberately trigger alertService.triggerAlert(),
// which would otherwise send a genuine email/Slack message on every test run.
// Clearing these makes getTransporter()/sendSlackAlert() degrade to their
// already-coded no-op paths instead of reaching real services.
delete process.env.SMTP_HOST
delete process.env.SMTP_USER
delete process.env.SMTP_PASS
delete process.env.SLACK_WEBHOOK_URL
// Deterministic JWT secrets so auth tests are self-contained even without .env.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_user_secret'
process.env.JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET || 'test_admin_secret'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_user_refresh'
process.env.JWT_ADMIN_REFRESH_SECRET = process.env.JWT_ADMIN_REFRESH_SECRET || 'test_admin_refresh'
process.env.MFA_PENDING_SECRET = process.env.MFA_PENDING_SECRET || 'test_mfa_pending_secret'
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/epasaley_test'
// Deterministic 32-byte key so encryption tests are self-contained even without .env.
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '5dd3a31dadeeca787e2f267240259f1563b763719417bb2d5b4b51a325bd506e'
process.env.ENCRYPTION_KEY_VERSION = process.env.ENCRYPTION_KEY_VERSION || '1'
// eSewa's own publicly documented UAT/sandbox merchant secret (see
// .env.example) — not a real credential, safe to default here so
// esewaPayment.spec.ts's HMAC signing is self-contained even without .env.
process.env.ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q'
process.env.ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST'

// No real Mongo in CI/sandbox: make DB operations fail fast instead of buffering
// for serverSelectionTimeoutMS. Pure-logic and routing/auth/validation tests
// never touch the DB; the few that would are asserted as "reached service".
import mongoose from 'mongoose'
mongoose.set('bufferCommands', false)

jest.setTimeout(20000)
