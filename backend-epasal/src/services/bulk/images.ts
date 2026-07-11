import axios from 'axios';
import AdmZip from 'adm-zip';
import { uploadImage } from '../../middlewares/upload';
import { cloudinary } from '../../config/cloudinary';

/**
 * Image resolution for bulk uploads. Per-row failures throw a plain Error
 * whose message lands in that row's error report — they never crash the
 * request.
 *
 * Limits (Global Rule 3): 10MB per image; jpg/jpeg/png/webp only.
 */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp'];
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const extOf = (nameOrUrl: string): string => {
  const clean = nameOrUrl.split('?')[0].split('#')[0];
  const dot = clean.lastIndexOf('.');
  return dot === -1 ? '' : clean.slice(dot + 1).toLowerCase();
};

/** Magic-byte sniff so a renamed .exe can't sneak through a zip. */
const sniffImage = (buf: Buffer): string | null => {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
};

const cloudinaryConfigured = (): boolean => {
  if (process.env.DISABLE_CLOUDINARY === 'true') return true; // stubbed in tests/seeds
  try {
    const cfg = cloudinary.config();
    return Boolean(cfg.cloud_name && cfg.api_key && cfg.api_secret);
  } catch {
    return false;
  }
};

const uploadBuffer = async (buffer: Buffer, filename: string, mimetype: string, folder: string): Promise<string> => {
  const fakeFile = { buffer, originalname: filename, mimetype } as Express.Multer.File;
  return uploadImage(fakeFile, folder);
};

/**
 * Build an index of the uploaded ZIP: lowercase basename → entry buffer.
 * Validates the zip itself; per-entry validation happens on access.
 */
export const indexZip = (zipFile?: Express.Multer.File): Map<string, Buffer> | null => {
  if (!zipFile || !zipFile.buffer) return null;
  let zip: AdmZip;
  try {
    zip = new AdmZip(zipFile.buffer);
  } catch {
    throw new Error('The uploaded images ZIP is not a valid zip archive');
  }
  const map = new Map<string, Buffer>();
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const base = entry.entryName.split('/').pop()!.toLowerCase();
    if (!base || base.startsWith('.')) continue;
    map.set(base, entry.getData());
  }
  return map;
};

/**
 * Resolve a row's image to a stored URL.
 *  - `imageFile` → must exist in the ZIP; validated (type+size) and uploaded.
 *  - `imageUrl`  → validated; downloaded (≤10MB) and re-uploaded to Cloudinary.
 *                  If Cloudinary isn't configured, the URL is stored as-is
 *                  after format validation (keeps local/dev seeding working).
 * Returns null when the row has no image columns.
 */
export const resolveRowImage = async (
  opts: {
    imageUrl?: string;
    imageFile?: string;
    zipIndex: Map<string, Buffer> | null;
    folder: string;
  }
): Promise<string | null> => {
  const { imageUrl, imageFile, zipIndex, folder } = opts;

  // ── Option B: filename inside the uploaded ZIP ────────────────────────────
  if (imageFile && imageFile.trim()) {
    const key = imageFile.trim().toLowerCase();
    if (!zipIndex) {
      throw new Error(`imageFile "${imageFile}" given but no images ZIP was uploaded`);
    }
    const buf = zipIndex.get(key);
    if (!buf) throw new Error(`Image "${imageFile}" not found in the uploaded ZIP`);
    if (buf.length > MAX_IMAGE_BYTES) {
      throw new Error(`Image "${imageFile}" exceeds the 10MB limit (${(buf.length / 1024 / 1024).toFixed(1)}MB)`);
    }
    const ext = extOf(key);
    const sniffed = sniffImage(buf);
    if (!ALLOWED_EXT.includes(ext) || !sniffed) {
      throw new Error(`Image "${imageFile}" must be a real jpg, jpeg, png or webp file`);
    }
    return uploadBuffer(buf, imageFile, sniffed, folder);
  }

  // ── Option A: external URL ────────────────────────────────────────────────
  if (imageUrl && imageUrl.trim()) {
    const url = imageUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      throw new Error(`imageUrl must start with http:// or https:// (got "${url.slice(0, 40)}")`);
    }
    const ext = extOf(url);
    if (ext && !ALLOWED_EXT.includes(ext)) {
      throw new Error(`imageUrl must point to a jpg, jpeg, png or webp image (got ".${ext}")`);
    }

    if (process.env.DISABLE_CLOUDINARY === 'true' || !cloudinaryConfigured()) {
      // Dev/seed mode: keep the validated URL as-is rather than failing rows.
      return url;
    }

    let resp;
    try {
      resp = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: 15_000,
        maxContentLength: MAX_IMAGE_BYTES,
        maxBodyLength: MAX_IMAGE_BYTES,
      });
    } catch (e: any) {
      if (String(e?.message || '').includes('maxContentLength')) {
        throw new Error(`Image at ${url} exceeds the 10MB limit`);
      }
      throw new Error(`Could not download image from ${url}: ${e?.response?.status ? `HTTP ${e.response.status}` : e?.message || 'network error'}`);
    }
    const buf = Buffer.from(resp.data);
    if (buf.length > MAX_IMAGE_BYTES) throw new Error(`Image at ${url} exceeds the 10MB limit`);
    const contentType = String(resp.headers['content-type'] || '').split(';')[0];
    const sniffed = sniffImage(buf);
    if (!sniffed && !ALLOWED_MIME.includes(contentType)) {
      throw new Error(`URL ${url} did not return a jpg/png/webp image (got "${contentType || 'unknown'}")`);
    }
    return uploadBuffer(buf, url.split('/').pop() || 'image', sniffed || contentType, folder);
  }

  return null;
};
