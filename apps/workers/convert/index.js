// apps/workers/convert/index.js
require('dotenv').config();

const { Worker, QueueEvents } = require('bullmq');
const { URL } = require('url');
const baseLogger = require('./logger');
const processor = require('./processor');

const QUEUE_CONVERT = process.env.QUEUE_CONVERT || 'resume.convert';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CONCURRENCY = parseInt(process.env.CONVERT_CONCURRENCY || '2', 10);

const logger =
  typeof baseLogger?.child === 'function'
    ? baseLogger.child({ service: 'convert-worker', queue: QUEUE_CONVERT })
    : { info: console.log, error: console.error, debug: console.debug };

function buildConnection(redisUrl) {
  const u = new URL(redisUrl);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username || undefined,
    password: u.password || undefined,
    tls: u.protocol === 'rediss:' ? {} : undefined,
  };
}

const connection = buildConnection(REDIS_URL);

// Optional queue-level events for visibility
const events = new QueueEvents(QUEUE_CONVERT, { connection });
events.on('completed', ({ jobId }) => logger.info({ jobId }, 'job completed'));
events.on('failed', ({ jobId, failedReason }) =>
  logger.error({ jobId, err: failedReason }, 'job failed')
);
events.on('active', ({ jobId }) => logger.debug({ jobId }, 'job active'));
events.on('waiting', ({ jobId }) => logger.debug({ jobId }, 'job waiting'));

// Create worker (BullMQ v5: no QueueScheduler)
const worker = new Worker(QUEUE_CONVERT, processor, {
  connection,
  concurrency: CONCURRENCY,
});

worker.on('ready', () =>
  logger.info({ redis: REDIS_URL, concurrency: CONCURRENCY }, 'worker ready')
);
worker.on('error', (err) => logger.error({ err }, 'worker error'));
worker.on('closed', () => logger.info('worker closed'));

async function shutdown() {
  logger.info('shutting down...');
  try {
    await Promise.allSettled([worker.close(), events.close()]);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandledRejection'));
process.on('uncaughtException', (err) => logger.error({ err }, 'uncaughtException'));
