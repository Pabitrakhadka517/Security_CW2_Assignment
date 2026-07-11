/**
 * Database reset — drops ALL store data and guarantees an admin account exists
 * so you can still authenticate into a clean store.
 *
 * Wipes every collection EXCEPT `admins` (products, categories, sale categories,
 * orders, coupons, coupon usage, banners, carts, users, refresh tokens, the
 * order-number counter, …). Existing admins are preserved; if none exist, a
 * default admin is created from env vars.
 *
 * LOCAL ONLY — refuses to run when NODE_ENV=production.
 * DESTRUCTIVE — requires explicit confirmation:
 *   npm run reset:db -- --yes
 *
 * Admin provisioning (only when no admin exists yet):
 *   ADMIN_EMAIL     (default: admin@epasaley.com)
 *   ADMIN_PASSWORD  (default: Admin@123)
 *   ADMIN_NAME      (default: Super Admin)
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Admin } from '../src/models/Admin';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/epasaley';
const KEEP = new Set(['admins']); // never wiped — protects admin login

async function resetDb() {
  // Hard block: this is a LOCAL-ONLY tool. Never allow it against production.
  if (process.env.NODE_ENV === 'production') {
    console.error('\u26d4 reset:db is disabled in production. This tool is for local development only.');
    process.exit(1);
  }

  if (!process.argv.includes('--yes')) {
    console.log('⚠️  This will DELETE all store data (everything except admins).');
    console.log('    Re-run with confirmation:  npm run reset:db -- --yes');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to', MONGO_URI.replace(/\/\/[^@]*@/, '//***@'));

  const collections = await mongoose.connection.db!.collections();
  let cleared = 0;
  for (const col of collections) {
    if (KEEP.has(col.collectionName)) {
      console.log(`   • kept   ${col.collectionName} (protected)`);
      continue;
    }
    const { deletedCount } = await col.deleteMany({});
    console.log(`   • wiped  ${col.collectionName} (${deletedCount} docs)`);
    cleared++;
  }
  console.log(`🧹 Cleared ${cleared} collection(s).`);

  // Guarantee an admin exists so the store stays accessible.
  const adminCount = await Admin.countDocuments();
  if (adminCount === 0) {
    const email = process.env.ADMIN_EMAIL || 'admin@epasaley.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin@123';
    const name = process.env.ADMIN_NAME || 'Super Admin';
    await new Admin({ adminId: 'admin001', email, password, name, role: 'super_admin', isActive: true }).save();
    console.log('🔑 No admin found — created default admin:');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}  (change it after first login)`);
  } else {
    console.log(`🔑 ${adminCount} admin account(s) preserved — existing logins still work.`);
  }

  await mongoose.disconnect();
  console.log('🔌 Done. Database is clean.');
}

resetDb().catch((err) => {
  console.error('❌ Reset failed:', err.message);
  process.exit(1);
});
