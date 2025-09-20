// apps/workers/extract/queue.js
const { Queue } = require('bullmq');
const { URL } = require('url');

const QUEUE_OPTIMIZE = process.env.QUEUE_OPTIMIZE || 'resume.optimize';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

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

const queue = new Queue(QUEUE_OPTIMIZE, { connection: buildConnection(REDIS_URL) });

async function addNext(payload) {
  const jobId = payload.jobId || undefined;
  await queue.add(QUEUE_OPTIMIZE, payload, {
    jobId,
    removeOnComplete: true,
    removeOnFail: 1000,
  });
}

module.exports = { addNext };
