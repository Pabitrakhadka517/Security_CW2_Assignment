/**
 * One-time backfill: encrypts any TOTP mfaSecret values that were stored as
 * plaintext before mfaSecret encryption was added (models/User.ts,
 * models/Admin.ts). Safe to re-run — encryptIfNotEncrypted is idempotent, and
 * this script only ever touches values that aren't already ciphertext.
 *
 * Reads/writes go through the native MongoDB driver, not the Mongoose models,
 * so the models' post-find decrypt hooks don't mask which values are still
 * plaintext.
 *
 * Usage:
 *   npm run migrate:encrypt-mfa-secrets -- --dry-run   # preview only
 *   npm run migrate:encrypt-mfa-secrets                # apply
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { encryptionService } from '../src/services/encryption.service';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/epasaley';
const DRY_RUN = process.argv.includes('--dry-run');

interface Stats {
  scanned: number;
  migrated: number;
  failed: number;
}

async function encryptCollection(collectionName: string, stats: Stats): Promise<void> {
  const collection = mongoose.connection.collection(collectionName);
  const cursor = collection.find({ mfaSecret: { $exists: true, $ne: null } });

  for await (const doc of cursor) {
    stats.scanned++;
    const secret = (doc as any).mfaSecret;
    if (typeof secret !== 'string' || encryptionService.isEncrypted(secret)) continue;

    try {
      const encrypted = encryptionService.encrypt(secret);
      console.log(`  ${collectionName} ${doc._id}: mfaSecret${DRY_RUN ? ' (dry-run)' : ''}`);
      if (!DRY_RUN) {
        await collection.updateOne({ _id: doc._id }, { $set: { mfaSecret: encrypted } });
      }
      stats.migrated++;
    } catch (err) {
      stats.failed++;
      console.error(`  ❌ ${collectionName} ${doc._id} failed:`, (err as Error).message);
    }
  }
}

async function main(): Promise<void> {
  if (!process.env.ENCRYPTION_KEY) {
    console.error('❌ ENCRYPTION_KEY is not set.');
    process.exit(1);
  }

  console.log(DRY_RUN ? '🔍 Dry run — no data will be written.' : '🔐 Encrypting plaintext mfaSecret values...');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to', MONGO_URI.replace(/\/\/[^@]*@/, '//***@'));

  const userStats: Stats = { scanned: 0, migrated: 0, failed: 0 };
  const adminStats: Stats = { scanned: 0, migrated: 0, failed: 0 };

  console.log('\n📋 Users:');
  await encryptCollection('users', userStats);

  console.log('\n📋 Admins:');
  await encryptCollection('admins', adminStats);

  console.log('\n— Summary —');
  console.log(`Users:  scanned ${userStats.scanned}, migrated ${userStats.migrated}, failed ${userStats.failed}`);
  console.log(`Admins: scanned ${adminStats.scanned}, migrated ${adminStats.migrated}, failed ${adminStats.failed}`);

  if (DRY_RUN) {
    console.log('\nDry run complete — re-run without --dry-run to apply.');
  } else {
    console.log('\nMigration complete.');
  }

  await mongoose.disconnect();

  if (userStats.failed + adminStats.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
