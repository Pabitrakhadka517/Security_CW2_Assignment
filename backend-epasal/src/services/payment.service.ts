import crypto from 'crypto';
import { Order, IOrderDocument } from '../models/Order';
import { Product } from '../models/Product';
import { BadRequestError, NotFoundError } from '../utils/errors';
import * as esewaService from './esewa.service';
import * as auditService from './audit.service';
import { alertService } from './alert.service';

export interface EsewaInitiateResult {
  gatewayUrl: string;
  fields: esewaService.EsewaFormFields;
}

export interface EsewaCallbackResult {
  orderId: string | null;
  paymentStatus: 'paid' | 'failed';
}

/**
 * Requester context from the verified JWT (optionalAuth), or null for a
 * guest. Only used to prevent a logged-in user from initiating payment on
 * someone else's order — guest orders (user_id === null) have no owner to
 * check against, matching how guest checkout works everywhere else.
 */
export interface RequesterContext {
  id: string;
  role?: string;
}

async function assertCanPayFor(
  order: IOrderDocument,
  requester: RequesterContext | null,
  ipAddress: string
): Promise<void> {
  if (!order.user_id) return; // guest order — no owner to check
  if (requester?.role === 'admin') return;
  if (requester?.id === order.user_id) return;

  await auditService.log({
    userId: requester?.id ?? null,
    userRole: (requester?.role as any) ?? 'guest',
    action: 'IDOR_ATTEMPT',
    status: 'BLOCKED',
    ipAddress,
    riskLevel: 'HIGH',
    metadata: { type: 'esewa_initiate', orderId: order.id, orderOwnerId: order.user_id },
  });
  // 404, not 403 — order ids are sequential, so a permission error here would
  // let an attacker probe which order ids belong to someone else.
  throw new NotFoundError('Order not found');
}

/**
 * Builds a signed eSewa payment form for an order that's awaiting eSewa
 * payment. Safe to call again on the same order while it's still 'pending'
 * (e.g. the user closed the eSewa tab and wants to retry) — a fresh
 * transaction_uuid is minted each time since eSewa rejects a reused one.
 */
export async function initiateEsewaPayment(
  orderId: string,
  requester: RequesterContext | null,
  baseUrl: string,
  ipAddress: string
): Promise<EsewaInitiateResult> {
  const order = await Order.findOne({ id: orderId });
  if (!order) throw new NotFoundError('Order not found');

  await assertCanPayFor(order, requester, ipAddress);

  if (order.paymentMethod !== 'esewa') {
    throw new BadRequestError('This order is not set up for eSewa payment');
  }
  if (order.paymentStatus === 'paid') {
    throw new BadRequestError('This order has already been paid');
  }
  if (order.paymentStatus !== 'pending') {
    throw new BadRequestError('This order is no longer awaiting payment');
  }

  const transactionUuid = `${order.id}-${crypto.randomBytes(4).toString('hex')}`;
  order.paymentTransactionUuid = transactionUuid;
  await order.save({ validateModifiedOnly: true });

  const fields = esewaService.buildPaymentForm({
    amount: order.totalAmount,
    transactionUuid,
    successUrl: `${baseUrl}/api/v1/payments/esewa/callback`,
    failureUrl: `${baseUrl}/api/v1/payments/esewa/callback?transaction_uuid=${encodeURIComponent(transactionUuid)}`,
  });

  await auditService.log({
    userId: requester?.id ?? order.user_id ?? null,
    userRole: (requester?.role as any) ?? 'guest',
    action: 'ORDER_PAYMENT_INITIATED',
    status: 'SUCCESS',
    ipAddress,
    riskLevel: 'LOW',
    metadata: { orderId: order.id, transactionUuid, amount: order.totalAmount },
  });

  return { gatewayUrl: esewaService.getGatewayUrl(), fields };
}

/** Restores stock reserved at order creation when a payment doesn't go through. */
async function releaseStock(order: IOrderDocument): Promise<void> {
  for (const item of order.items || []) {
    if (item?.productId && Number(item.quantity) > 0) {
      await Product.updateOne({ id: item.productId }, { $inc: { stock: Number(item.quantity) } });
    }
  }
}

/**
 * Handles eSewa's redirect back to success_url/failure_url. Never trusts the
 * redirect alone: a decodable+correctly-signed `data` payload is only a
 * prerequisite to then ask eSewa directly (server-to-server) whether the
 * transaction actually completed. Idempotent — safe if eSewa (or a user
 * refreshing the landing page) redirects here more than once.
 */
export async function handleEsewaCallback(
  query: { data?: string; transaction_uuid?: string },
  ipAddress: string
): Promise<EsewaCallbackResult> {
  let transactionUuid = query.transaction_uuid || null;
  let verifiedComplete = false;
  let gatewayRef: string | null = null;
  let verifiedTotalAmount: number | null = null;

  if (query.data) {
    const payload = esewaService.decodeCallbackPayload(query.data);
    if (payload) {
      transactionUuid = payload.transaction_uuid;
      if (esewaService.verifyCallbackSignature(payload)) {
        const statusResult = await esewaService.checkTransactionStatus({
          totalAmount: payload.total_amount,
          transactionUuid: payload.transaction_uuid,
        });
        verifiedComplete = statusResult.status === 'COMPLETE';
        gatewayRef = statusResult.refId;
        verifiedTotalAmount = Number(payload.total_amount);
      } else {
        await auditService.log({
          userId: null,
          action: 'ORDER_PAYMENT_FAILED',
          status: 'BLOCKED',
          ipAddress,
          riskLevel: 'CRITICAL',
          metadata: { reason: 'esewa_signature_mismatch', transactionUuid: payload.transaction_uuid },
        });
      }
    }
  }

  if (!transactionUuid) return { orderId: null, paymentStatus: 'failed' };

  const order = await Order.findOne({ paymentTransactionUuid: transactionUuid });
  if (!order) return { orderId: null, paymentStatus: 'failed' };

  // Already processed (duplicate redirect / user refreshed the result page) — don't reprocess.
  if (order.paymentStatus === 'paid') return { orderId: order.id, paymentStatus: 'paid' };
  if (order.paymentStatus === 'failed') return { orderId: order.id, paymentStatus: 'failed' };

  // Defense in depth: the amount eSewa confirms must match what we asked for,
  // even though it's already covered by the signature. A mismatch here means
  // something is badly wrong (not just "user cancelled") — flag it loudly.
  if (verifiedComplete && verifiedTotalAmount !== null && verifiedTotalAmount !== order.totalAmount) {
    verifiedComplete = false;
    await alertService.triggerAlert({
      type: 'PAYMENT_AMOUNT_MISMATCH',
      riskLevel: 'CRITICAL',
      message: 'eSewa confirmed a different amount than the order total',
      ipAddress,
      userId: order.user_id || undefined,
      metadata: { orderId: order.id, expected: order.totalAmount, confirmed: verifiedTotalAmount },
      timestamp: new Date(),
    });
  }

  if (verifiedComplete) {
    order.paymentStatus = 'paid';
    order.paymentGatewayRef = gatewayRef;
    if (order.status === 'pending') order.status = 'confirmed';
    order.statusHistory = [
      ...(order.statusHistory || []),
      { status: order.status, note: 'Payment confirmed via eSewa', timestamp: new Date().toISOString() },
    ];
    await order.save({ validateModifiedOnly: true });

    await auditService.log({
      userId: order.user_id || null,
      action: 'ORDER_PAYMENT_SUCCESS',
      status: 'SUCCESS',
      ipAddress,
      riskLevel: 'LOW',
      metadata: { orderId: order.id, transactionUuid, gatewayRef },
    });

    return { orderId: order.id, paymentStatus: 'paid' };
  }

  // Failed / cancelled / not yet complete — release the stock reserved at
  // order creation and cancel the order so it doesn't sit as an un-payable
  // "pending" order forever. The user can place a new order to retry.
  order.paymentStatus = 'failed';
  order.status = 'cancelled';
  order.statusHistory = [
    ...(order.statusHistory || []),
    { status: 'cancelled', note: 'eSewa payment failed or was cancelled', timestamp: new Date().toISOString() },
  ];
  await order.save({ validateModifiedOnly: true });
  await releaseStock(order);

  await auditService.log({
    userId: order.user_id || null,
    action: 'ORDER_PAYMENT_FAILED',
    status: 'FAILURE',
    ipAddress,
    riskLevel: 'MEDIUM',
    metadata: { orderId: order.id, transactionUuid },
  });

  return { orderId: order.id, paymentStatus: 'failed' };
}
