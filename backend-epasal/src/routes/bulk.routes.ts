import { Router } from 'express';
import multer from 'multer';
import { requireAdmin } from '../middlewares/authMiddleware';
import {
  bulkCategoriesHandler, bulkProductsHandler, bulkBannersHandler,
  bulkSeasonalSalesHandler, downloadTemplate,
} from '../controllers/bulk.controller';
import { UnsupportedMediaTypeError } from '../utils/errors';

/**
 * Admin bulk-upload routes. Everything here is admin-only.
 *
 * Multipart fields:
 *   file   — .csv / .xlsx / .json data file (max 5MB)
 *   images — optional .zip of images referenced by imageFile columns (max 50MB;
 *            each image inside is enforced to ≤10MB and jpg/png/webp at use time)
 *
 * Multer errors (size/unexpected field) are converted to clean 413/400 JSON by
 * the global error handler — no crashes, no stack traces.
 */

const DATA_EXT = ['.csv', '.xlsx', '.xls', '.json'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // hard cap (zip); the data file is checked below
    files: 2,
  },
  fileFilter: (_req, file, cb) => {
    const name = (file.originalname || '').toLowerCase();
    if (file.fieldname === 'file') {
      if (DATA_EXT.some((e) => name.endsWith(e))) return cb(null, true);
      return cb(new UnsupportedMediaTypeError(`"${file.originalname}" is not a supported data file. Upload .csv, .xlsx or .json.`));
    }
    if (file.fieldname === 'images') {
      if (name.endsWith('.zip')) return cb(null, true);
      return cb(new UnsupportedMediaTypeError(`"${file.originalname}" is not a .zip archive.`));
    }
    return cb(new UnsupportedMediaTypeError(`Unexpected upload field "${file.fieldname}". Use "file" and optional "images".`));
  },
});

const uploadFields = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'images', maxCount: 1 },
]);

/** Data files get a tighter 5MB cap than the zip's 50MB. */
const enforceDataFileSize = (req: any, _res: any, next: any) => {
  const f = req.files?.file?.[0];
  if (f && f.size > 5 * 1024 * 1024) {
    const err: any = new Error('Data file exceeds the 5MB limit');
    err.statusCode = 413;
    return next(err);
  }
  next();
};

const router = Router();

// Every bulk route is admin-only.
router.use(requireAdmin);

router.get('/templates/:entity', downloadTemplate);

router.post('/categories', uploadFields, enforceDataFileSize, bulkCategoriesHandler);
router.post('/products', uploadFields, enforceDataFileSize, bulkProductsHandler);
router.post('/banners', uploadFields, enforceDataFileSize, bulkBannersHandler);
router.post('/seasonal-sales', uploadFields, enforceDataFileSize, bulkSeasonalSalesHandler);

export default router;
