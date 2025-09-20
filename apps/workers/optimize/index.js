// apps/workers/optimize/index.js
require('dotenv').config();

const { Worker, QueueEvents } = require('bullmq');
const { URL } = require('url');
const logger = require('./logger');     // must export a Pino instance
const processor = require('./processor');

const QUEUE_OPTIMIZE = process.env.QUEUE_OPTIMIZE || 'resume.optimize';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CONCURRENCY = parseInt(process.env.OPTIMIZE_CONCURRENCY || '3', 10);

const log = logger.child({ service: 'optimize-worker', queue: QUEUE_OPTIMIZE });

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
const events = new QueueEvents(QUEUE_OPTIMIZE, { connection });
events.on('completed', ({ jobId }) => log.info({ jobId }, 'job completed'));
events.on('failed', ({ jobId, failedReason }) =>
  log.error({ jobId, err: failedReason }, 'job failed')
);
events.on('active', ({ jobId }) => log.debug({ jobId }, 'job active'));
events.on('waiting', ({ jobId }) => log.debug({ jobId }, 'job waiting'));

// Create worker (no QueueScheduler needed in BullMQ v5)
const worker = new Worker(QUEUE_OPTIMIZE, processor, {
  connection,
  concurrency: CONCURRENCY,
});

worker.on('ready', () =>
  log.info({ redis: REDIS_URL, concurrency: CONCURRENCY }, 'worker ready')
);
worker.on('error', (err) => log.error({ err }, 'worker error'));
worker.on('closed', () => log.info('worker closed'));

async function shutdown() {
  log.info('shutting down...');
  try {
    await Promise.allSettled([worker.close(), events.close()]);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (err) => log.error({ err }, 'unhandledRejection'));
process.on('uncaughtException', (err) => log.error({ err }, 'uncaughtException'));
