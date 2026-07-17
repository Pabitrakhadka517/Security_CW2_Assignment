/**
 * Admin bootstrap / migration.
 * ----------------------------------------------------------------------------
 * Creates the admin account from environment variables, or RESETS an existing
 * one when ADMIN_FORCE_RESET=true. Idempotent and safe to run on every deploy.
 *
 *   npm run setup-admin      (alias: npm run seed)
 *
 * Environment:
 *   ADMIN_EMAIL        default: admin@epasaley.com
 *   ADMIN_PASSWORD     REQUIRED in production; defaults to Admin@123 in dev
 *   ADMIN_NAME         default: Super Admin
 *   ADMIN_FORCE_RESET  'true' to overwrite name/role/password of an existing admin
 *
 * Notes:
 *   - The password is hashed by the Admin model's pre-save hook.
 *   - In production we refuse to seed a default password.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Admin } from './models/Admin';

dotenv.config();

const isProd = (process.env.NODE_ENV || 'development') === 'production';
const MONGO_URI = process.env.MONGODB_URI;

const email = (process.env.ADMIN_EMAIL || 'admin@epasaley.com').toLowerCase().trim();
const name = process.env.ADMIN_NAME || 'Super Admin';
const passwordFromEnv = process.env.ADMIN_PASSWORD;
const forceReset = String(process.env.ADMIN_FORCE_RESET || '').toLowerCase() === 'true';

async function run(): Promise<void> {
  if (!MONGO_URI) {
    throw new Error('MONGODB_URI is not set in the environment.');
  }

  // Production must never fall back to a baked-in default password.
  if (isProd && !passwordFromEnv) {
    throw new Error(
      'ADMIN_PASSWORD must be set in production — refusing to seed a default password.'
    );
  }

  const password = passwordFromEnv || 'Admin@123';
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  }

  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  const existing = await Admin.findOne({ email });

  if (!existing) {
    const admin = await new Admin({
      adminId: 'admin001',
      name,
      email,
      password,
      role: 'super_admin',
      isActive: true,
    }).save();
    // Seed password history with the hash the pre-save hook just produced, so
    // the very first change-password call can already check reuse against it
    // (mirrors User's register flow — see user.controller.ts#register).
    await admin.updatePasswordHistory(admin.password as string);
    console.log(`🎉 Admin created: ${email}`);
    console.log('   Password set from ADMIN_PASSWORD. Change it after first login.');
  } else if (forceReset) {
    existing.name = name;
    existing.role = 'super_admin';
    existing.isActive = true;
    existing.password = password; // marks modified -> pre-save hook re-hashes
    await existing.save();
    await existing.updatePasswordHistory(existing.password as string);
    console.log(`♻️  Admin reset (name/role/password updated): ${email}`);
  } else {
    console.log(`ℹ️  Admin already exists: ${email} — left unchanged.`);
    console.log('   Set ADMIN_FORCE_RESET=true to overwrite its password/name/role.');
  }

  await mongoose.disconnect();
  console.log('🔌 Disconnected. Done.');
}

run().catch((err: unknown) => {
  console.error('❌ Admin setup failed:', (err as Error).message);
  process.exit(1);
});
