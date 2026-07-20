import crypto from 'crypto';
import { logger } from '../utils/logger';

/**
 * eSewa ePay v2 integration.
 *
 * Flow:
 *  1. buildPaymentForm() — server signs {total_amount, transaction_uuid,
 *     product_code} with the merchant secret key. The frontend renders these
 *     fields as a hidden HTML form and submits it (real browser POST, not
 *     XHR — eSewa's gateway serves an HTML payment page, not a JSON API).
 *  2. eSewa redirects the browser back to success_url/failure_url with a
 *     base64-encoded `data` query param describing the outcome.
 *  3. decodeCallbackPayload() + verifyCallbackSignature() catch a tampered or
 *     malformed redirect early.
 *  4. checkTransactionStatus() is the AUTHORITATIVE check: a direct
 *     server-to-server call to eSewa using the merchant secret, independent
 *     of anything the browser sent. An order is only ever marked "paid"
 *     after this returns COMPLETE — the redirect payload alone is never
 *     trusted enough to move money-equivalent state.
 */

const PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST';
const SECRET_KEY = process.env.ESEWA_SECRET_KEY || '';
const GATEWAY_URL =
  process.env.ESEWA_GATEWAY_URL || 'https://rc.esewa.com.np/api/epay/main/v2/form';
const STATUS_CHECK_URL =
  process.env.ESEWA_STATUS_CHECK_URL || 'https://rc.esewa.com.np/api/epay/transaction/status/';

const REQUEST_SIGNED_FIELDS = 'total_amount,transaction_uuid,product_code';

export type EsewaTransactionStatus =
  | 'COMPLETE'
  | 'PENDING'
  | 'FULL_REFUND'
  | 'PARTIAL_REFUND'
  | 'AMBIGUOUS'
  | 'NOT_FOUND'
  | 'CANCELED';

export interface EsewaFormFields {
  amount: string;
  tax_amount: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  product_service_charge: string;
  product_delivery_charge: string;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
}

export interface EsewaCallbackPayload {
  transaction_code: string;
  status: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  signed_field_names: string;
  signature: string;
  [key: string]: unknown;
}

/** Whole-rupee amounts only (see priceCalculator.ts) — no decimals to disagree on. */
export function formatAmount(amount: number): string {
  return String(Math.round(amount));
}

function hmacSha256Base64(message: string): string {
  return crypto.createHmac('sha256', SECRET_KEY).update(message).digest('base64');
}

/** Builds the signature message from an explicit field list, in that exact order. */
function buildSignedMessage(payload: Record<string, unknown>, fieldNames: string[]): string {
  return fieldNames.map((field) => `${field}=${payload[field] ?? ''}`).join(',');
}

/**
 * Builds the signed form fields for a fresh payment attempt.
 * `transactionUuid` must be unique per attempt — eSewa rejects a reused one,
 * so payment.service.ts mints a new one on every initiate/retry.
 */
export function buildPaymentForm(params: {
  amount: number;
  transactionUuid: string;
  successUrl: string;
  failureUrl: string;
}): EsewaFormFields {
  const totalAmount = formatAmount(params.amount);
  const signature = hmacSha256Base64(
    buildSignedMessage(
      { total_amount: totalAmount, transaction_uuid: params.transactionUuid, product_code: PRODUCT_CODE },
      REQUEST_SIGNED_FIELDS.split(',')
    )
  );

  return {
    amount: totalAmount,
    tax_amount: '0',
    total_amount: totalAmount,
    transaction_uuid: params.transactionUuid,
    product_code: PRODUCT_CODE,
    product_service_charge: '0',
    product_delivery_charge: '0',
    success_url: params.successUrl,
    failure_url: params.failureUrl,
    signed_field_names: REQUEST_SIGNED_FIELDS,
    signature,
  };
}

export function getGatewayUrl(): string {
  return GATEWAY_URL;
}

/**
 * Decodes the base64 `data` query param eSewa appends to success_url/
 * failure_url. Returns null on anything malformed — callers must treat a
 * null result as a failed/cancelled payment, never as success.
 */
export function decodeCallbackPayload(data: string): EsewaCallbackPayload | null {
  try {
    const json = Buffer.from(data, 'base64').toString('utf-8');
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.transaction_uuid || !parsed.signature || !parsed.signed_field_names) return null;
    return parsed as EsewaCallbackPayload;
  } catch (err) {
    logger.warn('[eSewa] Failed to decode callback payload', { error: err instanceof Error ? err.message : err });
    return null;
  }
}

/**
 * Verifies the signature on a decoded callback payload using ITS OWN
 * signed_field_names (eSewa's documented approach) rather than a hardcoded
 * field list, since the response signs a different field set than the
 * request did. A constant-time compare avoids a timing side-channel on the
 * signature check.
 */
export function verifyCallbackSignature(payload: EsewaCallbackPayload): boolean {
  const fields = String(payload.signed_field_names || '')
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);
  if (!fields.length) return false;

  const expected = hmacSha256Base64(buildSignedMessage(payload, fields));

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(String(payload.signature || ''));
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Authoritative status check — calls eSewa directly (server-to-server) so
 * the final "is this actually paid" answer never depends on anything a
 * client-controlled redirect could have tampered with.
 */
export async function checkTransactionStatus(params: {
  totalAmount: number | string;
  transactionUuid: string;
}): Promise<{ status: EsewaTransactionStatus; refId: string | null }> {
  const url = new URL(STATUS_CHECK_URL);
  url.searchParams.set('product_code', PRODUCT_CODE);
  url.searchParams.set('total_amount', formatAmount(Number(params.totalAmount)));
  url.searchParams.set('transaction_uuid', params.transactionUuid);

  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) {
    logger.error('[eSewa] Status check HTTP error', { status: res.status, transactionUuid: params.transactionUuid });
    return { status: 'NOT_FOUND', refId: null };
  }

  const body = (await res.json()) as { status?: string; ref_id?: string };
  const status = (body.status || 'NOT_FOUND') as EsewaTransactionStatus;
  return { status, refId: body.ref_id || null };
}
