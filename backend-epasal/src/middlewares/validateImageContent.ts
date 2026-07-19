import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../utils/errors';
import { hasAllowedImageExtension, matchesDeclaredMimeType } from '../utils/fileSignature';

/**
 * Runs AFTER multer (memoryStorage) has populated req.file/req.files, so the
 * actual file bytes are available -- fileFilter in upload.ts only sees the
 * client-declared mimetype/filename, both trivially spoofable (e.g. a
 * .html/.svg payload uploaded with Content-Type: image/png). Checks the
 * extension AND the real magic-byte signature of the content.
 */
function assertValidImageFile(file: Express.Multer.File): void {
  if (!hasAllowedImageExtension(file.originalname)) {
    throw new BadRequestError('File extension not allowed (use jpg, jpeg, png, gif, or webp)');
  }
  if (!matchesDeclaredMimeType(file.buffer, file.mimetype)) {
    throw new BadRequestError('File content does not match a valid image of the declared type');
  }
}

export const validateImageContent = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    if (req.file) {
      assertValidImageFile(req.file);
    }

    if (Array.isArray(req.files)) {
      req.files.forEach(assertValidImageFile);
    } else if (req.files && typeof req.files === 'object') {
      Object.values(req.files).forEach((group) => group.forEach(assertValidImageFile));
    }

    next();
  } catch (err) {
    next(err);
  }
};
