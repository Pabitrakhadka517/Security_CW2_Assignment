import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/responseHelper';
import { BadRequestError, NotFoundError, UnprocessableEntityError } from '../utils/errors';
import { parseUploadedFile, ParsedFile } from '../services/bulk/parse';
import { indexZip } from '../services/bulk/images';
import {
  bulkCategories, bulkProducts, bulkBanners, bulkSeasonalSales,
  BulkReport, summarize,
} from '../services/bulk/bulk.service';
import { BULK_TEMPLATES, templateAsCsv, templateAsJson } from '../services/bulk/templates';
import * as XLSX from 'xlsx';

type Processor = (parsed: ParsedFile, zip: Map<string, Buffer> | null) => Promise<BulkReport>;

const PROCESSORS: Record<string, Processor> = {
  categories: bulkCategories,
  products: bulkProducts,
  banners: bulkBanners,
  'seasonal-sales': bulkSeasonalSales,
};

/**
 * Shared handler: accepts either multipart (field `file` = csv/xlsx/json,
 * optional field `images` = zip) or a raw JSON body { rows: [...] }.
 */
const runBulk = (entity: string) =>
  asyncHandler(async (req: Request, res: Response) => {
    const files = (req.files || {}) as Record<string, Express.Multer.File[]>;
    const dataFile = files.file?.[0];
    const zipFile = files.images?.[0];

    let parsed: ParsedFile;
    if (dataFile) {
      parsed = parseUploadedFile(dataFile);
    } else if (Array.isArray((req.body as any)?.rows) && (req.body as any).rows.length) {
      const rows = (req.body as any).rows.map((r: Record<string, unknown>) => {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(r)) out[k] = v === null || v === undefined ? '' : String(v).trim();
        return out;
      });
      parsed = { rows, headers: Object.keys(rows[0] || {}) };
    } else {
      throw new BadRequestError('No data received. Upload a CSV/XLSX/JSON file in the "file" field, or send JSON { rows: [...] }.');
    }

    if (parsed.rows.length > 5000) {
      throw new UnprocessableEntityError(`Too many rows (${parsed.rows.length}). Maximum is 5,000 per upload — split the file.`);
    }

    let zipIndex: Map<string, Buffer> | null = null;
    if (zipFile) {
      try {
        zipIndex = indexZip(zipFile);
      } catch (e: any) {
        throw new UnprocessableEntityError(e?.message || 'Invalid images ZIP');
      }
    }

    const report = await PROCESSORS[entity](parsed, zipIndex);
    sendSuccess(res, 200, summarize(report), report);
  });

export const bulkCategoriesHandler = runBulk('categories');
export const bulkProductsHandler = runBulk('products');
export const bulkBannersHandler = runBulk('banners');
export const bulkSeasonalSalesHandler = runBulk('seasonal-sales');

/**
 * GET /admin/bulk/templates/:entity?format=csv|xlsx|json
 */
export const downloadTemplate = asyncHandler(async (req: Request, res: Response) => {
  const entity = String(req.params.entity || '').toLowerCase();
  const template = BULK_TEMPLATES[entity];
  if (!template) {
    throw new NotFoundError(`Unknown template "${entity}". Valid: ${Object.keys(BULK_TEMPLATES).join(', ')}`);
  }
  const format = String(req.query.format || 'csv').toLowerCase();

  if (format === 'json') {
    res.setHeader('Content-Disposition', `attachment; filename="${template.filename.replace('.csv', '.json')}"`);
    res.json(templateAsJson(template));
    return;
  }
  if (format === 'xlsx') {
    const ws = XLSX.utils.aoa_to_sheet([template.columns, ...template.sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, entity.slice(0, 31));
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${template.filename.replace('.csv', '.xlsx')}"`);
    res.send(buf);
    return;
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
  res.send(templateAsCsv(template));
});
