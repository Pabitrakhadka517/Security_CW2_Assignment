import zxcvbn from 'zxcvbn';
import {
  IPasswordStrengthResult,
  IPasswordComplexityResult,
  IPasswordChangeResult,
} from '../types';

/**
 * Structural interface (not IUser directly) so the same validation pipeline
 * works for both the User and Admin models — both implement this surface.
 */
interface PasswordCheckable {
  comparePassword(password: string): Promise<boolean>;
  checkPasswordReuse(newPassword: string): Promise<boolean>;
}

const MIN_ZXCVBN_SCORE = 3;
const MIN_LENGTH = 12;
const SPECIAL_CHAR_PATTERN = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

// Top 20 common passwords that otherwise pass the complexity regex.
const COMMON_PASSWORDS = new Set([
  'password1!', 'admin123!', 'welcome1!', 'qwerty123!', 'letmein1!',
  'iloveyou1!', 'monkey123!', 'dragon123!', 'football1!', 'baseball1!',
  'sunshine1!', 'master123!', 'password123!', 'passw0rd!', 'p@ssw0rd!',
  'abc12345!', 'trustno1!', 'login123!', 'changeme1!', 'superman1!',
]);

/**
 * Client-side zxcvbn feedback is UX-only — this re-runs the same check
 * server-side so a tampered/skipped client can't submit a weak password.
 */
export const validatePasswordStrength = (password: string): IPasswordStrengthResult => {
  const result = zxcvbn(password);
  return {
    valid: result.score >= MIN_ZXCVBN_SCORE,
    score: result.score,
    feedback: result.feedback?.suggestions || [],
  };
};

export const validatePasswordComplexity = (password: string): IPasswordComplexityResult => {
  const errors: string[] = [];

  if (password.length < MIN_LENGTH) errors.push(`Password must be at least ${MIN_LENGTH} characters long`);
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
  if (!SPECIAL_CHAR_PATTERN.test(password)) errors.push('Password must contain at least one special character');
  if (/password/i.test(password)) errors.push('Password cannot contain the word "password"');
  if (COMMON_PASSWORDS.has(password.toLowerCase())) errors.push('Password is too common; please choose a stronger password');

  return { valid: errors.length === 0, errors };
};

/**
 * Full validation pipeline for a password CHANGE (not initial registration):
 * current-password check, no-op check, complexity, strength, then history reuse.
 * Returns the first failure encountered so the caller can surface one clear message.
 */
export const validatePasswordChange = async (
  user: PasswordCheckable,
  currentPassword: string,
  newPassword: string
): Promise<IPasswordChangeResult> => {
  const currentMatches = await user.comparePassword(currentPassword);
  if (!currentMatches) return { valid: false, error: 'Current password is incorrect' };

  if (newPassword === currentPassword) {
    return { valid: false, error: 'New password cannot be the same as your current password' };
  }

  const complexity = validatePasswordComplexity(newPassword);
  if (!complexity.valid) return { valid: false, error: complexity.errors.join(', ') };

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    return { valid: false, error: `Password is too weak. ${strength.feedback.join(' ')}`.trim() };
  }

  const reused = await user.checkPasswordReuse(newPassword);
  if (reused) return { valid: false, error: 'You cannot reuse your last 5 passwords' };

  return { valid: true, error: '' };
};
