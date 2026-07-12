import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const BACKUP_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const BACKUP_CODE_COUNT = 8;
const BACKUP_CODE_LENGTH = 10;

export const generateMFASecret = (userEmail: string): { secret: string; otpauthUrl: string } => {
  // speakeasy.generateSecret() silently drops an `issuer` option — it never
  // reaches the otpauth_url it returns — so build the URI ourselves via
  // otpauthURL() to get a spec-compliant `issuer=` query param. Without it,
  // most authenticator apps still work by parsing "Issuer:Account" out of
  // the label, but stricter ones (Microsoft Authenticator, some Google
  // Authenticator versions) expect the explicit param.
  const generated = speakeasy.generateSecret({ length: 20 });
  const label = `Epasaley:${userEmail}`;
  const otpauthUrl = speakeasy.otpauthURL({
    secret: generated.ascii,
    label,
    issuer: 'Epasaley',
    encoding: 'ascii',
  });
  return { secret: generated.base32, otpauthUrl };
};

export const generateQRCode = async (otpauthUrl: string): Promise<string> => {
  return qrcode.toDataURL(otpauthUrl);
};

export const verifyTOTP = (secret: string, token: string): boolean => {
  return speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
};

export const generateBackupCodes = (): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    let code = '';
    for (let j = 0; j < BACKUP_CODE_LENGTH; j++) {
      code += BACKUP_CODE_ALPHABET[crypto.randomInt(BACKUP_CODE_ALPHABET.length)];
    }
    codes.push(code);
  }
  return codes;
};

export const hashBackupCode = (code: string): string => {
  return bcrypt.hashSync(code, 10);
};

export const verifyBackupCode = async (plain: string, hashed: string[]): Promise<number> => {
  for (let i = 0; i < hashed.length; i++) {
    const match = await bcrypt.compare(plain, hashed[i]);
    if (match) return i;
  }
  return -1;
};
