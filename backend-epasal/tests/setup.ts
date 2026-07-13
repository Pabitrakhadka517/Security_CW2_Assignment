// Jest global setup — runs before each test file (setupFilesAfterEach).
import dotenv from 'dotenv'
dotenv.config()

process.env.NODE_ENV = 'test'
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

// No real Mongo in CI/sandbox: make DB operations fail fast instead of buffering
// for serverSelectionTimeoutMS. Pure-logic and routing/auth/validation tests
// never touch the DB; the few that would are asserted as "reached service".
import mongoose from 'mongoose'
mongoose.set('bufferCommands', false)

jest.setTimeout(20000)
