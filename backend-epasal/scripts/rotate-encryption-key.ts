/**
 * Encryption key rotation — migrates encrypted PII fields (User.phone/address/
 * savedAddresses, Order.phone/address) from the old key (ENCRYPTION_KEY_V0)
 * to the current key (ENCRYPTION_KEY).
 *
 * Reads/writes go through the native MongoDB driver, not the Mongoose models —
 * the models' post-find hooks auto-decrypt on read, which would hide the raw
 * ciphertext this script needs to inspect and rewrite.
 *
 * Run during a maintenance window (each write is a targeted $set, but a
 * mid-rotation crash would leave some docs on the old key and some on the
 * new one — both remain readable, since decrypt() picks the key by the
 * version prefix embedded in the ciphertext, so it's safe to just re-run).
 *
 * Usage:
 *   npm run rotate:encryption-key -- --dry-run   # preview only, no writes
 *   npm run rotate:encryption-key                # apply
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { encryptionService } from '../src/services/encryption.service';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/epasaley';
const DRY_RUN = process.argv.includes('--dry-run');

const USER_TOP_LEVEL_FIELDS = ['phone'];
const USER_ADDRESS_FIELDS = ['addressLine', 'city', 'postalCode'];
const USER_SAVED_ADDRESS_FIELDS = ['addressLine', 'city', 'postalCode', 'phone'];
const ORDER_FIELDS = ['phone', 'address'];

interface Stats {
  scanned: number;
  migrated: number;
  failed: number;
}

/** Rotates one field value if it's encrypted; returns the new value or null if unchanged. */
function rotateField(value: unknown): string | null {
  if (typeof value !== 'string' || !encryptionService.isEncrypted(value)) return null;
  return encryptionService.rotateEncryption(value);
}

async function rotateUsers(stats: Stats): Promise<void> {
  const collection = mongoose.connection.collection('users');
  const cursor = collection.find({});

  for await (const doc of cursor) {
    stats.scanned++;
    const set: Record<string, string> = {};

    try {
      for (const field of USER_TOP_LEVEL_FIELDS) {
        const rotated = rotateField((doc as any)[field]);
        if (rotated) set[field] = rotated;
      }

      if (doc.address) {
        for (const field of USER_ADDRESS_FIELDS) {
          const rotated = rotateField(doc.address[field]);
          if (rotated) set[`address.${field}`] = rotated;
        }
      }

      if (Array.isArray(doc.savedAddresses)) {
        doc.savedAddresses.forEach((addr: any, i: number) => {
          for (const field of USER_SAVED_ADDRESS_FIELDS) {
            const rotated = rotateField(addr?.[field]);
            if (rotated) set[`savedAddresses.${i}.${field}`] = rotated;
          }
        });
      }

      if (Object.keys(set).length === 0) continue;

      console.log(`  user ${doc._id}: ${Object.keys(set).join(', ')}${DRY_RUN ? ' (dry-run)' : ''}`);
      if (!DRY_RUN) {
        await collection.updateOne({ _id: doc._id }, { $set: set });
      }
      stats.migrated++;
    } catch (err) {
      stats.failed++;
      console.error(`  ❌ user ${doc._id} failed:`, (err as Error).message);
    }
  }
}

async function rotateOrders(stats: Stats): Promise<void> {
  const collection = mongoose.connection.collection('orders');
  const cursor = collection.find({});

  for await (const doc of cursor) {
    stats.scanned++;
    const set: Record<string, string> = {};

    try {
      for (const field of ORDER_FIELDS) {
        const rotated = rotateField((doc as any)[field]);
        if (rotated) set[field] = rotated;
      }

      if (Object.keys(set).length === 0) continue;

      console.log(`  order ${doc.id}: ${Object.keys(set).join(', ')}${DRY_RUN ? ' (dry-run)' : ''}`);
      if (!DRY_RUN) {
        await collection.updateOne({ _id: doc._id }, { $set: set });
      }
      stats.migrated++;
    } catch (err) {
      stats.failed++;
      console.error(`  ❌ order ${doc.id} failed:`, (err as Error).message);
    }
  }
}

async function main(): Promise<void> {
  if (!process.env.ENCRYPTION_KEY_V0) {
    console.error('❌ ENCRYPTION_KEY_V0 is not set — nothing to rotate from. Set it to the previous ENCRYPTION_KEY value before running this script.');
    process.exit(1);
  }
  if (!process.env.ENCRYPTION_KEY) {
    console.error('❌ ENCRYPTION_KEY is not set — nothing to rotate to.');
    process.exit(1);
  }

  console.log(DRY_RUN ? '🔍 Dry run — no data will be written.' : '🔐 Rotating encryption keys...');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to', MONGO_URI.replace(/\/\/[^@]*@/, '//***@'));

  const userStats: Stats = { scanned: 0, migrated: 0, failed: 0 };
  const orderStats: Stats = { scanned: 0, migrated: 0, failed: 0 };

  console.log('\n📋 Users:');
  await rotateUsers(userStats);

  console.log('\n📋 Orders:');
  await rotateOrders(orderStats);

  console.log('\n— Summary —');
  console.log(`Users:  scanned ${userStats.scanned}, migrated ${userStats.migrated}, failed ${userStats.failed}`);
  console.log(`Orders: scanned ${orderStats.scanned}, migrated ${orderStats.migrated}, failed ${orderStats.failed}`);

  if (DRY_RUN) {
    console.log('\nDry run complete — re-run without --dry-run to apply.');
  } else {
    console.log('\nRotation complete. Once verified, move ENCRYPTION_KEY_V0 out of the environment.');
  }

  await mongoose.disconnect();

  if (userStats.failed + orderStats.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('❌ Rotation failed:', err.message);
  process.exit(1);
});
