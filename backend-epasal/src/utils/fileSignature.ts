export type DetectedImageType = 'jpeg' | 'png' | 'gif' | 'webp';

/**
 * Detects an image's real format from its leading bytes (magic numbers),
 * independent of whatever Content-Type/extension the client claims --
 * both are trivially spoofable, this isn't. Only covers the formats this
 * app actually accepts (see middlewares/upload.ts's fileFilter allowlist).
 */
export function detectImageType(buffer: Buffer): DetectedImageType | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return 'png';
  }

  if (
    buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61
  ) {
    return 'gif';
  }

  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
}

const MIME_TO_DETECTED_TYPE: Record<string, DetectedImageType> = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

/** True if the file's actual bytes match the format its declared MIME type claims. */
export function matchesDeclaredMimeType(buffer: Buffer, mimetype: string): boolean {
  const expected = MIME_TO_DETECTED_TYPE[mimetype];
  if (!expected) return false;
  return detectImageType(buffer) === expected;
}

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

export function hasAllowedImageExtension(filename: string): boolean {
  const match = /\.[^.]+$/.exec(filename);
  if (!match) return false;
  return ALLOWED_EXTENSIONS.has(match[0].toLowerCase());
}
