import crypto from 'crypto';
import { logger } from '../utils/logger';

/**
 * Field-level encryption at rest (AES-256-GCM) for PII stored in MongoDB.
 *
 * GCM gives us authenticated encryption in one primitive: the auth tag
 * detects ciphertext tampering (e.g. a compromised DB write), which plain
 * CBC would not. A fresh random IV per call is mandatory for GCM — reusing
 * an IV with the same key breaks both confidentiality and the integrity
 * guarantee, so every encrypt() call generates its own.
 *
 * Encoded format: "<keyVersion>:<ivHex>:<authTagHex>:<ciphertextHex>"
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const CURRENT_KEY_VERSION = parseInt(process.env.ENCRYPTION_KEY_VERSION || '1', 10);

const ENCRYPTED_PATTERN = /^\d+:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/i;

function getEncryptionKey(version: number = CURRENT_KEY_VERSION): Buffer {
  const envVar = version === CURRENT_KEY_VERSION ? 'ENCRYPTION_KEY' : `ENCRYPTION_KEY_V${version}`;
  const hex = process.env[envVar];

  if (!hex) {
    throw new Error(`Encryption key not found for version ${version} (expected ${envVar} in environment)`);
  }

  const key = Buffer.from(hex, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Encryption key ${envVar} must decode to ${KEY_LENGTH} bytes, got ${key.length}`);
  }

  return key;
}

function encrypt(plaintext: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getEncryptionKey(CURRENT_KEY_VERSION);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${CURRENT_KEY_VERSION}:${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
  } catch (err) {
    logger.error('Encryption failed', { message: (err as Error)?.message });
    throw new Error('Encryption failed');
  }
}

function decrypt(encryptedData: string): string {
  try {
    const [versionStr, ivHex, tagHex, ciphertextHex] = encryptedData.split(':');
    if (!versionStr || !ivHex || !tagHex || !ciphertextHex) {
      throw new Error('Malformed encrypted payload');
    }

    const version = parseInt(versionStr, 10);
    const key = getEncryptionKey(version);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
  } catch (err) {
    logger.error('Decryption failed', { message: (err as Error)?.message });
    throw new Error('Decryption failed: data integrity check failed');
  }
}

function isEncrypted(value: string): boolean {
  if (!value) return false;
  return ENCRYPTED_PATTERN.test(value);
}

function encryptIfNotEncrypted(value: string): string {
  if (isEncrypted(value)) return value;
  return encrypt(value);
}

function encryptObject(obj: Record<string, string>, fields: string[]): Record<string, string> {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field]) {
      result[field] = encryptIfNotEncrypted(result[field]);
    }
  }
  return result;
}

function decryptObject(obj: Record<string, string>, fields: string[]): Record<string, string> {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] && isEncrypted(result[field])) {
      try {
        result[field] = decrypt(result[field]);
      } catch (err) {
        logger.error('Field decryption failed', { field, message: (err as Error)?.message });
        result[field] = '[DECRYPTION_FAILED]';
      }
    }
  }
  return result;
}

function rotateEncryption(encryptedData: string): string {
  const plaintext = decrypt(encryptedData);
  return encrypt(plaintext);
}

export const encryptionService = {
  encrypt,
  decrypt,
  isEncrypted,
  encryptIfNotEncrypted,
  encryptObject,
  decryptObject,
  rotateEncryption,
  getEncryptionKey,
};
