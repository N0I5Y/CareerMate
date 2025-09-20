const { Queue } = require('bullmq');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const QUEUE_TEMPLATE = process.env.QUEUE_TEMPLATE || 'resume.template';

function createConnection() {
  return { connection: { url: REDIS_URL } };
}

async function addNext(payload) {
  const queue = new Queue(QUEUE_TEMPLATE, createConnection());
  await queue.add(QUEUE_TEMPLATE, payload, {
    removeOnComplete: true,
    removeOnFail: 1000,
  });
}

module.exports = { createConnection, addNext };
