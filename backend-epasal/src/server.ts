// Load env at the very top, BEFORE any other import that reads it on init.
import 'dotenv/config';

import http from 'http';
import app from './app';
import connectDB, { disconnectDB } from './config/db';
import { connectCloudinary } from './config/cloudinary';
import { logger } from './utils/logger';

const PORT = Number(process.env.PORT) || 5000;

let server: http.Server | null = null;
let shuttingDown = false;

/**
 * Centralised, idempotent shutdown.
 *
 * - Stops accepting new connections.
 * - Lets in-flight requests finish (server.close).
 * - Closes Mongo last so any final write in a request handler can complete.
 * - Force-exits after a hard timeout so a stuck request can't pin the pod
 *   on the platform forever.
 *
 * `exitCode` lets callers distinguish clean shutdowns (signal) from
 * crash-on-purpose paths (uncaught exception, unhandled rejection).
 */
const shutdown = async (reason: string, exitCode: number = 0): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('Shutdown started', { reason, exitCode });

  // Force-exit after 15s to avoid hanging the platform if `server.close`
  // never resolves (e.g. an SSE stream nobody hangs up on).
  const forceTimer = setTimeout(() => {
    logger.error('Forced shutdown after timeout', { reason });
    process.exit(exitCode || 1);
  }, 15_000);
  // Don't let this timer itself keep the event loop alive.
  forceTimer.unref();

  try {
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => resolve());
      });
      logger.info('HTTP server closed');
    }
    await disconnectDB();
    logger.info('Shutdown complete', { reason });
    clearTimeout(forceTimer);
    process.exit(exitCode);
  } catch (err) {
    logger.error('Error during shutdown', {
      reason,
      message: (err as Error)?.message,
    });
    clearTimeout(forceTimer);
    process.exit(exitCode || 1);
  }
};

const startServer = async (): Promise<void> => {
  try {
    // Connect to Mongo first. Failure here throws — handled in the outer catch.
    await connectDB();

    // Best-effort: a missing Cloudinary config shouldn't kill the API, just
    // disable image uploads. If `connectCloudinary` throws, we log and keep
    // going; routes that need it will surface a clean error per-request.
    try {
      connectCloudinary();
    } catch (err) {
      logger.warn('Cloudinary init failed — uploads will be unavailable', {
        message: (err as Error)?.message,
      });
    }

    server = app.listen(PORT, () => {
      logger.info('Server started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        api: `http://localhost:${PORT}/api/v1`,
        docs: `http://localhost:${PORT}/api-docs`,
      });
    });

    // Prevent slow-loris-style "client connected but never sends a request"
    // from holding sockets open indefinitely.
    server.headersTimeout = 65_000;     // > keepAlive to avoid race
    server.requestTimeout = 60_000;     // hard cap per request lifecycle
    server.keepAliveTimeout = 61_000;
  } catch (err) {
    logger.error('Failed to start server', {
      message: (err as Error)?.message,
      stack: (err as Error)?.stack,
    });
    process.exit(1);
  }
};

// ---------------------------------------------------------------------------
// Signal handlers — clean shutdown (platform stop/restart).
// ---------------------------------------------------------------------------
process.on('SIGTERM', () => { void shutdown('SIGTERM', 0); });
process.on('SIGINT', () => { void shutdown('SIGINT', 0); });

// ---------------------------------------------------------------------------
// Crash-class handlers.
//
// The Node docs recommend logging and exiting on uncaughtException, because
// the process state is now unknown. But we go through `shutdown` so the
// load balancer sees us drain instead of disappearing mid-request.
// ---------------------------------------------------------------------------
process.on('unhandledRejection', (reason: unknown) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('Unhandled promise rejection', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });
  // Don't insta-exit — let in-flight requests drain.
  void shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });
  void shutdown('uncaughtException', 1);
});

// Surface warnings (deprecations, memory leaks) but never crash on them.
process.on('warning', (warning) => {
  logger.warn('Node process warning', {
    name: warning.name,
    message: warning.message,
  });
});

void startServer();
