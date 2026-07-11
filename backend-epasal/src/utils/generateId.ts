import { v4 as uuidv4 } from 'uuid';
import { nextSequence } from '../models/Counter';

/**
 * Generate a unique ID with a prefix
 * Format: prefix_timestamp_randomString
 * Example: prod_1732377600000_xyz123
 */
export const generateId = (prefix: string = 'id'): string => {
  const timestamp = Date.now();
  const randomString = uuidv4().split('-')[0];
  return `${prefix}_${timestamp}_${randomString}`;
};

/**
 * Generate multiple IDs at once
 */
export const generateIds = (prefix: string, count: number): string[] => {
  return Array.from({ length: count }, () => generateId(prefix));
};

/**
 * Generate a short, professional, sequential order ID.
 * Format: NP + 2-digit year + zero-padded sequence (min 3 digits).
 * Examples: NP26001, NP26002, NP26134, ... NP261000
 * Unique (per-year atomic counter), readable, searchable and scalable.
 */
export const generateOrderId = async (): Promise<string> => {
  const yy = String(new Date().getFullYear()).slice(-2);
  const seq = await nextSequence(`order-${yy}`);
  return `NP${yy}${String(seq).padStart(3, '0')}`;
};
