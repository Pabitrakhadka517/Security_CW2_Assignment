import { parse as parseCsvSync } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { UnprocessableEntityError } from '../../utils/errors';

/**
 * File parsing for bulk uploads.
 *
 * Accepts CSV, XLSX or JSON and returns an array of plain row objects with
 * normalised (camelCase, trimmed) header keys. Every failure throws an
 * UnprocessableEntityError with a human-readable message — callers never see
 * a raw parser exception.
 */

export interface ParsedFile {
  rows: Record<string, string>[];
  headers: string[];
}

/** "Sale Price " / "sale_price" / "SALE-PRICE" → "salePrice" */
export const normalizeHeader = (h: string): string => {
  const cleaned = String(h ?? '').trim().replace(/^﻿/, ''); // strip BOM
  if (!cleaned) return '';
  const parts = cleaned.split(/[\s_\-]+/).filter(Boolean);
  return parts
    .map((p, i) => (i === 0 ? p.charAt(0).toLowerCase() + p.slice(1) : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))
    .join('')
    .replace(/[^a-zA-Z0-9]/g, '');
};

const normalizeRows = (raw: Record<string, unknown>[]): ParsedFile => {
  const rows = raw.map((r) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      const key = normalizeHeader(k);
      if (!key) continue;
      out[key] = v === null || v === undefined ? '' : String(v).trim();
    }
    return out;
  });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { rows, headers };
};

export const parseUploadedFile = (file: Express.Multer.File): ParsedFile => {
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw new UnprocessableEntityError('Uploaded file is empty');
  }

  const name = (file.originalname || '').toLowerCase();

  // ── JSON ──────────────────────────────────────────────────────────────────
  if (name.endsWith('.json') || file.mimetype === 'application/json') {
    let data: unknown;
    try {
      data = JSON.parse(file.buffer.toString('utf8'));
    } catch (e) {
      throw new UnprocessableEntityError(`Could not parse JSON file: ${(e as Error).message}`);
    }
    const arr = Array.isArray(data) ? data : (data as any)?.rows;
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new UnprocessableEntityError('JSON file must contain a non-empty array of rows (or { "rows": [...] })');
    }
    if (!arr.every((r) => r && typeof r === 'object' && !Array.isArray(r))) {
      throw new UnprocessableEntityError('Every JSON row must be an object');
    }
    return normalizeRows(arr as Record<string, unknown>[]);
  }

  // ── Excel ────────────────────────────────────────────────────────────────
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(file.buffer, { type: 'buffer', cellDates: false });
    } catch (e) {
      throw new UnprocessableEntityError(`Could not parse Excel file: ${(e as Error).message}`);
    }
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new UnprocessableEntityError('Excel file contains no sheets');
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: '', raw: false });
    if (!raw.length) throw new UnprocessableEntityError('Excel sheet has no data rows');
    return normalizeRows(raw);
  }

  // ── CSV (default) ────────────────────────────────────────────────────────
  if (!name.endsWith('.csv') && !['text/csv', 'application/vnd.ms-excel', 'text/plain'].includes(file.mimetype)) {
    throw new UnprocessableEntityError(
      `Unsupported file type "${file.originalname}". Upload a .csv, .xlsx or .json file.`
    );
  }
  let raw: Record<string, unknown>[];
  try {
    raw = parseCsvSync(file.buffer, {
      columns: true,
      bom: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch (e) {
    throw new UnprocessableEntityError(`Could not parse CSV file: ${(e as Error).message}`);
  }
  if (!raw.length) throw new UnprocessableEntityError('CSV file has no data rows');
  return normalizeRows(raw);
};

/** Throws 422 listing every missing required column. */
export const requireColumns = (parsed: ParsedFile, required: string[]): void => {
  const have = new Set(parsed.headers.map((h) => h.toLowerCase()));
  const missing = required.filter((c) => !have.has(c.toLowerCase()));
  if (missing.length) {
    throw new UnprocessableEntityError(
      `File is missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`
    );
  }
};
