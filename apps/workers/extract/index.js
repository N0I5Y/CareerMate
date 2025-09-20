// apps/workers/extract/index.js
require('dotenv').config();

const { Worker, QueueEvents } = require('bullmq');
const { URL } = require('url');
const logger = require('./logger');
const processor = require('./processor');

const QUEUE_EXTRACT = process.env.QUEUE_EXTRACT || 'resume.extract';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CONCURRENCY = parseInt(process.env.EXTRACT_CONCURRENCY || '5', 10);

const log = logger.child({
  service: 'extract-worker',
  queue: QUEUE_EXTRACT,
});

/**
 * Turn REDIS_URL into a BullMQ connection object.
 * Supports redis:// and rediss:// (TLS) URLs.
 */
function buildConnection(redisUrl) {
  const u = new URL(redisUrl);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    // In Redis URLs, username is rarely used; password lives after the colon.
    username: u.username || undefined,
    password: u.password || undefined,
    tls: u.protocol === 'rediss:' ? {} : undefined,
  };
}

const connection = buildConnection(REDIS_URL);

// Optional: listen to queue-level events for visibility
const events = new QueueEvents(QUEUE_EXTRACT, { connection });
events.on('completed', ({ jobId }) => log.info({ jobId }, 'job completed'));
events.on('failed', ({ jobId, failedReason }) =>
  log.error({ jobId, err: failedReason }, 'job failed')
);
events.on('waiting', ({ jobId }) => log.debug({ jobId }, 'job waiting'));
events.on('active', ({ jobId }) => log.debug({ jobId }, 'job active'));

// Create the worker (no QueueScheduler needed in BullMQ v5)
const worker = new Worker(QUEUE_EXTRACT, processor, {
  connection,
  concurrency: CONCURRENCY,
  // attempts/backoff are typically set when enqueuing; keep worker lean
});

worker.on('ready', () =>
  log.info({ redis: REDIS_URL, concurrency: CONCURRENCY }, 'worker ready')
);
worker.on('error', (err) => log.error({ err }, 'worker error'));
worker.on('closed', () => log.info('worker closed'));

// Robust shutdown
async function shutdown() {
  log.info('shutting down...');
  try {
    await Promise.allSettled([worker.close(), events.close()]);
  } catch (err) {
    log.error({ err }, 'error during shutdown');
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Catch unhandled errors so the process doesn’t die silently
process.on('unhandledRejection', (err) => log.error({ err }, 'unhandledRejection'));
process.on('uncaughtException', (err) => log.error({ err }, 'uncaughtException'));
