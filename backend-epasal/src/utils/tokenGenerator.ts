import jwt from 'jsonwebtoken';

interface TokenPayload {
  id: string;
  email?: string;
  role?: 'admin' | 'user' | 'super_admin';
}

const getSecret = (isAdmin: boolean, type: 'access' | 'refresh') => {
  if (type === 'refresh') {
    return isAdmin ? process.env.JWT_ADMIN_REFRESH_SECRET : process.env.JWT_REFRESH_SECRET;
  }

  return isAdmin ? process.env.JWT_ADMIN_SECRET : process.env.JWT_SECRET;
};

const ensureSecret = (s: string | undefined, name: string) => {
  if (!s) throw new Error(`${name} is not defined`);
  return s as jwt.Secret;
};

export const generateAccessToken = (payload: TokenPayload, expiresIn?: string): string => {
  const expiry = expiresIn || process.env.JWT_ACCESS_EXPIRE || '15m';
  const isAdmin = payload.role === 'admin' || payload.role === 'super_admin';
  const secret = ensureSecret(getSecret(isAdmin, 'access'), 'JWT secret');
  return jwt.sign(payload as jwt.JwtPayload, secret, { expiresIn: expiry } as any);
};

export const generateRefreshToken = (payload: TokenPayload, expiresIn?: string): string => {
  const expiry = expiresIn || process.env.JWT_REFRESH_EXPIRE || '7d';
  const isAdmin = payload.role === 'admin' || payload.role === 'super_admin';
  const secret = ensureSecret(getSecret(isAdmin, 'refresh'), 'JWT refresh secret');
  return jwt.sign(payload as jwt.JwtPayload, secret, { expiresIn: expiry } as any);
};

export const verifyAccessToken = (token: string, isAdmin: boolean = false): TokenPayload => {
  const secretEnv = getSecret(isAdmin, 'access');
  const secret = ensureSecret(secretEnv, 'JWT secret');
  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch (e) {
    throw new Error('Invalid or expired access token');
  }
};

export const verifyRefreshToken = (token: string, isAdmin: boolean = false): TokenPayload => {
  const secretEnv = getSecret(isAdmin, 'refresh');
  const secret = ensureSecret(secretEnv, 'JWT refresh secret');
  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch (e) {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Decode token without verification (useful for debugging).
 */
export const decodeToken = (token: string): any => {
  return jwt.decode(token);
};

interface MFAPendingPayload {
  userId: string;
  purpose: 'mfa-pending';
}

/**
 * Short-lived token issued after credential + lockout checks pass but before
 * the TOTP/backup-code step, so a stolen access token can never be minted
 * without also clearing MFA. Signed with its own secret (not JWT_SECRET) so
 * it can't be confused with — or replayed as — a normal access token.
 */
export const generateMFAPendingToken = (userId: string): string => {
  const secret = ensureSecret(process.env.MFA_PENDING_SECRET, 'MFA pending secret');
  const payload: MFAPendingPayload = { userId, purpose: 'mfa-pending' };
  return jwt.sign(payload, secret, { expiresIn: '5m' });
};

export const verifyMFAPendingToken = (token: string): MFAPendingPayload => {
  const secret = ensureSecret(process.env.MFA_PENDING_SECRET, 'MFA pending secret');
  let decoded: any;
  try {
    decoded = jwt.verify(token, secret);
  } catch (e) {
    throw new Error('Invalid or expired MFA session');
  }
  if (decoded.purpose !== 'mfa-pending') {
    throw new Error('Invalid MFA session token');
  }
  return decoded as MFAPendingPayload;
};

// no default export; functions exported above
