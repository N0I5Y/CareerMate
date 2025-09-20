const { Queue } = require('bullmq');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const QUEUE_CONVERT = process.env.QUEUE_CONVERT || 'resume.convert';

function createConnection() {
  return { connection: { url: REDIS_URL } };
}

async function addNext(payload) {
  const queue = new Queue(QUEUE_CONVERT, createConnection());
  await queue.add(QUEUE_CONVERT, payload, {
    removeOnComplete: true,
    removeOnFail: 1000,
  });
}

module.exports = { createConnection, addNext };
