const { Queue } = require('bullmq');
const { URL } = require('url');

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const QUEUE_EXTRACT = process.env.QUEUE_EXTRACT || 'resume.extract';
const QUEUE_CONVERT = process.env.QUEUE_CONVERT || 'resume.convert';

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

const extractQ = new Queue(QUEUE_EXTRACT, { connection: buildConnection(REDIS_URL) });
const convertQ = new Queue(QUEUE_CONVERT, { connection: buildConnection(REDIS_URL) });

async function enqueueExtractJob(payload) {
  await extractQ.add(QUEUE_EXTRACT, payload, {
    jobId: payload.jobId || undefined,
    removeOnComplete: true,
    removeOnFail: 1000,
  });
}

async function enqueueConvertJob(payload) {
  await convertQ.add(QUEUE_CONVERT, payload, {
    jobId: payload.jobId || undefined,
    removeOnComplete: true,
    removeOnFail: 1000,
  });
}

module.exports = { enqueueExtractJob, enqueueConvertJob };
