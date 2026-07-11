import mongoose from 'mongoose';
import { logger } from '../utils/logger';

/**
 * MongoDB connection layer.
 *
 * Design goals:
 *  - Retry the initial connect with exponential backoff so the pod doesn't
 *    crash-loop just because the database is briefly slow.
 *  - Never call `process.exit` from inside a connection event handler — the
 *    driver auto-reconnects, and the dbReady middleware short-circuits
 *    incoming requests with a 503 while it does.
 *  - Surface clear log lines for connected / disconnected / reconnected
 *    transitions so we can diagnose flap behaviour in production.
 *  - Graceful shutdown is owned by server.ts; this module exposes
 *    `disconnectDB` and does NOT register its own SIGINT handler (avoids
 *    handler duplication and racing exits).
 */

let listenersRegistered = false;

const registerConnectionListeners = () => {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected', {
      host: mongoose.connection.host,
      database: mongoose.connection.name,
    });
  });

  mongoose.connection.on('error', (err) => {
    // Never throw or exit here — the driver will keep trying. Just log so
    // the operator can see flap patterns.
    logger.error('MongoDB connection error', {
      name: err?.name,
      message: err?.message,
    });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected — driver will attempt to reconnect');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Connect to MongoDB with bounded exponential backoff.
 * Throws after `maxAttempts` so the caller (server.ts) can decide whether to
 * crash the process or boot in a degraded mode.
 */
const connectDB = async (
  opts: { maxAttempts?: number; baseDelayMs?: number } = {}
): Promise<void> => {
  const maxAttempts = opts.maxAttempts ?? 5;
  const baseDelayMs = opts.baseDelayMs ?? 1_000;

  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  registerConnectionListeners();

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    try {
      await mongoose.connect(mongoURI, {
        // Pool sizing — keep modest defaults; Atlas free tier caps total connections.
        maxPoolSize: 10,
        minPoolSize: 2,
        // If the cluster takes longer than 8s to pick a primary, fail fast so
        // dbReady can start returning 503 instead of holding the request open.
        serverSelectionTimeoutMS: 8_000,
        // Long-lived socket inactivity timeout. Mongoose will fail an operation
        // rather than wait forever on a stuck socket.
        socketTimeoutMS: 45_000,
        // Don't queue operations forever when disconnected — fail loudly.
        bufferCommands: false,
        heartbeatFrequencyMS: 10_000,
      });
      return; // success
    } catch (err) {
      const e = err as Error;
      logger.error('MongoDB connect attempt failed', {
        attempt,
        maxAttempts,
        name: e?.name,
        message: e?.message,
      });

      if (attempt >= maxAttempts) {
        throw err;
      }

      // Exponential backoff with a 30s cap. Jitter avoids thundering-herd
      // reconnects when many pods boot together.
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), 30_000) + Math.floor(Math.random() * 500);
      logger.warn('Retrying MongoDB connect', { delayMs: delay, nextAttempt: attempt + 1 });
      await sleep(delay);
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 0) return;
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (err) {
    logger.error('Error closing MongoDB connection', {
      message: (err as Error)?.message,
    });
  }
};

export default connectDB;
