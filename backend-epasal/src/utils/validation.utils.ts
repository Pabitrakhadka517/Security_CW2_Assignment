/**
 * ============================================
 * SHARED VALIDATION UTILITIES
 * ============================================
 *
 * These validation functions MUST be identical on frontend and backend.
 * Use these functions in BOTH:
 * - Backend validation middleware
 * - Frontend form validation
 *
 * This ensures perfect alignment between client and server validation.
 */

// ============================================
// STRING VALIDATORS
// ============================================

/**
 * Validate first name
 * Rules: Required, 2-50 chars, letters/spaces/hyphens/apostrophes only
 */
export function validateFirstName(value: any): {
  valid: boolean;
  error?: string;
} {
  if (!value) {
    return { valid: false, error: 'First name is required' };
  }

  const str = String(value).trim();

  if (str.length < 2) {
    return { valid: false, error: 'First name must be at least 2 characters' };
  }

  if (str.length > 50) {
    return { valid: false, error: 'First name cannot exceed 50 characters' };
  }

  if (!/^[a-zA-Z\s'-]+$/.test(str)) {
    return {
      valid: false,
      error: 'First name can only contain letters, spaces, hyphens, and apostrophes',
    };
  }

  return { valid: true };
}

/**
 * Validate last name
 * Rules: Required, 2-50 chars, letters/spaces/hyphens/apostrophes only
 */
export function validateLastName(value: any): {
  valid: boolean;
  error?: string;
} {
  if (!value) {
    return { valid: false, error: 'Last name is required' };
  }

  const str = String(value).trim();

  if (str.length < 2) {
    return { valid: false, error: 'Last name must be at least 2 characters' };
  }

  if (str.length > 50) {
    return { valid: false, error: 'Last name cannot exceed 50 characters' };
  }

  if (!/^[a-zA-Z\s'-]+$/.test(str)) {
    return {
      valid: false,
      error: 'Last name can only contain letters, spaces, hyphens, and apostrophes',
    };
  }

  return { valid: true };
}

/**
 * Validate email
 * Rules: Required, valid email format, unique (checked on server)
 */
export function validateEmail(value: any): {
  valid: boolean;
  error?: string;
} {
  if (!value) {
    return { valid: false, error: 'Email is required' };
  }

  const str = String(value).trim().toLowerCase();

  // Check basic email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(str)) {
    return { valid: false, error: 'Please provide a valid email address' };
  }

  return { valid: true };
}

/**
 * Validate phone number
 * Rules: Required, valid phone format (digits, +, -, (), spaces)
 */
export function validatePhone(value: any): {
  valid: boolean;
  error?: string;
} {
  if (!value) {
    return { valid: false, error: 'Phone number is required' };
  }

  const str = String(value).trim();

  // Check phone format
  const phoneRegex = /^[0-9\-\+\(\)\s]+$/;
  if (!phoneRegex.test(str)) {
    return { valid: false, error: 'Please provide a valid phone number' };
  }

  // Check minimum length (at least 10 digits)
  const digitsOnly = str.replace(/\D/g, '');
  if (digitsOnly.length < 10) {
    return {
      valid: false,
      error: 'Phone number must contain at least 10 digits',
    };
  }

  return { valid: true };
}

/**
 * Validate password
 * Rules: Required, 6-100 chars
 */
export function validatePassword(value: any): {
  valid: boolean;
  error?: string;
} {
  if (!value) {
    return { valid: false, error: 'Password is required' };
  }

  const str = String(value);

  if (str.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }

  if (str.length > 100) {
    return { valid: false, error: 'Password cannot exceed 100 characters' };
  }

  return { valid: true };
}

/**
 * Validate password confirmation
 * Rules: Required, must match password
 */
export function validatePasswordConfirm(
  value: any,
  password: string
): {
  valid: boolean;
  error?: string;
} {
  if (!value) {
    return { valid: false, error: 'Please confirm your password' };
  }

  if (value !== password) {
    return { valid: false, error: 'Passwords do not match' };
  }

  return { valid: true };
}

/**
 * Validate bio
 * Rules: Optional, max 500 chars
 */
export function validateBio(value: any): {
  valid: boolean;
  error?: string;
} {
  if (!value) {
    return { valid: true }; // Optional
  }

  const str = String(value);

  if (str.length > 500) {
    return { valid: false, error: 'Bio cannot exceed 500 characters' };
  }

  return { valid: true };
}

/**
 * Validate profile image URL
 * Rules: Optional, must be valid URL if provided
 */
export function validateProfileImage(value: any): {
  valid: boolean;
  error?: string;
} {
  if (!value) {
    return { valid: true }; // Optional
  }

  const str = String(value);

  try {
    new URL(str);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Profile image must be a valid URL' };
  }
}

// ============================================
// PASSWORD STRENGTH VALIDATION
// ============================================

/**
 * Calculate password strength
 * Returns: 'weak' | 'fair' | 'good' | 'strong'
 */
export function calculatePasswordStrength(
  password: string
): 'weak' | 'fair' | 'good' | 'strong' {
  if (!password) return 'weak';

  let strength = 0;

  // Length checks
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;

  // Character type checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  if (strength < 2) return 'weak';
  if (strength < 3) return 'fair';
  if (strength < 4) return 'good';
  return 'strong';
}

/**
 * Check if password is strong enough
 * Minimum: 'fair' strength
 */
export function isPasswordStrong(password: string): boolean {
  const strength = calculatePasswordStrength(password);
  return strength !== 'weak';
}

// ============================================
// ENUM VALIDATORS
// ============================================

/**
 * Validate role
 */
export function validateRole(value: any): {
  valid: boolean;
  error?: string;
} {
  const validRoles = ['customer', 'admin', 'staff'];

  if (!validRoles.includes(value)) {
    return {
      valid: false,
      error: `Role must be one of: ${validRoles.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validate account type
 */
export function validateAccountType(value: any): {
  valid: boolean;
  error?: string;
} {
  const validTypes = ['customer', 'seller', 'admin'];

  if (!validTypes.includes(value)) {
    return {
      valid: false,
      error: `Account type must be one of: ${validTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validate account status
 */
export function validateStatus(value: any): {
  valid: boolean;
  error?: string;
} {
  const validStatus = ['active', 'inactive', 'suspended'];

  if (!validStatus.includes(value)) {
    return {
      valid: false,
      error: `Status must be one of: ${validStatus.join(', ')}`,
    };
  }

  return { valid: true };
}

// ============================================
// FORM VALIDATORS (Complete Forms)
// ============================================

/**
 * Validate registration form
 */
export function validateRegisterForm(data: any): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // Validate each field
  const firstNameValidation = validateFirstName(data.firstName);
  if (!firstNameValidation.valid) {
    errors.firstName = firstNameValidation.error || '';
  }

  const lastNameValidation = validateLastName(data.lastName);
  if (!lastNameValidation.valid) {
    errors.lastName = lastNameValidation.error || '';
  }

  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    errors.email = emailValidation.error || '';
  }

  const phoneValidation = validatePhone(data.phone);
  if (!phoneValidation.valid) {
    errors.phone = phoneValidation.error || '';
  }

  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) {
    errors.password = passwordValidation.error || '';
  } else if (!isPasswordStrong(data.password)) {
    errors.password = 'Password is too weak. Use uppercase, numbers, and special characters.';
  }

  const passwordConfirmValidation = validatePasswordConfirm(
    data.passwordConfirm,
    data.password
  );
  if (!passwordConfirmValidation.valid) {
    errors.passwordConfirm = passwordConfirmValidation.error || '';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate login form
 */
export function validateLoginForm(data: any): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    errors.email = emailValidation.error || '';
  }

  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) {
    errors.password = passwordValidation.error || '';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate update profile form
 */
export function validateUpdateProfileForm(data: any): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // All fields are optional
  if (data.firstName !== undefined && data.firstName !== null && data.firstName !== '') {
    const validation = validateFirstName(data.firstName);
    if (!validation.valid) {
      errors.firstName = validation.error || '';
    }
  }

  if (data.lastName !== undefined && data.lastName !== null && data.lastName !== '') {
    const validation = validateLastName(data.lastName);
    if (!validation.valid) {
      errors.lastName = validation.error || '';
    }
  }

  if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
    const validation = validatePhone(data.phone);
    if (!validation.valid) {
      errors.phone = validation.error || '';
    }
  }

  if (data.bio !== undefined && data.bio !== null && data.bio !== '') {
    const validation = validateBio(data.bio);
    if (!validation.valid) {
      errors.bio = validation.error || '';
    }
  }

  if (
    data.profileImage !== undefined &&
    data.profileImage !== null &&
    data.profileImage !== ''
  ) {
    const validation = validateProfileImage(data.profileImage);
    if (!validation.valid) {
      errors.profileImage = validation.error || '';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================
// RESET PASSWORD VALIDATORS
// ============================================

/**
 * Validate reset password form
 */
export function validateResetPasswordForm(data: any): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!data.token) {
    errors.token = 'Reset token is required';
  }

  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) {
    errors.password = passwordValidation.error || '';
  }

  const passwordConfirmValidation = validatePasswordConfirm(
    data.passwordConfirm,
    data.password
  );
  if (!passwordConfirmValidation.valid) {
    errors.passwordConfirm = passwordConfirmValidation.error || '';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Sanitize email (lowercase and trim)
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Sanitize name (trim whitespace)
 */
export function sanitizeName(name: string): string {
  return name.trim();
}

/**
 * Sanitize phone (trim whitespace)
 */
export function sanitizePhone(phone: string): string {
  return phone.trim();
}

/**
 * Check if form has errors
 */
export function hasFormErrors(errors: Record<string, any>): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Get first error message
 */
export function getFirstError(errors: Record<string, string>): string | null {
  const keys = Object.keys(errors);
  return keys.length > 0 ? errors[keys[0]] : null;
}

/**
 * Clear field error
 */
export function clearFieldError(
  errors: Record<string, string>,
  fieldName: string
): Record<string, string> {
  const newErrors = { ...errors };
  delete newErrors[fieldName];
  return newErrors;
}

export default {
  validateFirstName,
  validateLastName,
  validateEmail,
  validatePhone,
  validatePassword,
  validatePasswordConfirm,
  validateBio,
  validateProfileImage,
  validateRole,
  validateAccountType,
  validateStatus,
  validateRegisterForm,
  validateLoginForm,
  validateUpdateProfileForm,
  validateResetPasswordForm,
  calculatePasswordStrength,
  isPasswordStrong,
  sanitizeEmail,
  sanitizeName,
  sanitizePhone,
};
