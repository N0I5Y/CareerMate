const { Queue } = require('bullmq');
const { URL } = require('url');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const QUEUE_EXTRACT = process.env.QUEUE_EXTRACT || 'resume.extract';
const QUEUE_CONVERT = process.env.QUEUE_CONVERT || 'resume.convert';

console.log('Redis URL:', REDIS_URL ? 'Set (hidden for security)' : 'Not set');
console.log('Queue Extract:', QUEUE_EXTRACT);
console.log('Queue Convert:', QUEUE_CONVERT);

function buildConnection(redisUrl) {
  try {
    const u = new URL(redisUrl);
    const connection = {
      host: u.hostname,
      port: Number(u.port || 6379),
      username: u.username || undefined,
      password: u.password || undefined,
      tls: u.protocol === 'rediss:' ? {} : undefined,
      // Add connection timeout and retry settings
      connectTimeout: 10000,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    };
    
    console.log('Redis connection config:', {
      host: connection.host,
      port: connection.port,
      hasUsername: !!connection.username,
      hasPassword: !!connection.password,
      hasTLS: !!connection.tls,
      protocol: u.protocol
    });
    
    return connection;
  } catch (error) {
    console.error('Error parsing Redis URL:', error);
    throw error;
  }
}

let extractQ, convertQ;

try {
  const redisConnection = buildConnection(REDIS_URL);
  extractQ = new Queue(QUEUE_EXTRACT, { connection: redisConnection });
  convertQ = new Queue(QUEUE_CONVERT, { connection: redisConnection });
  console.log('Redis queues initialized successfully');
} catch (error) {
  console.error('Failed to initialize Redis queues:', error);
  throw error;
}

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

async function testRedisConnection() {
  try {
    if (!extractQ) {
      throw new Error('Redis queues not initialized');
    }
    
    // Try to get queue info (this tests the connection)
    await extractQ.getWaiting();
    return true;
  } catch (error) {
    console.error('Redis connection test failed:', error);
    return false;
  }
}

module.exports = { enqueueExtractJob, enqueueConvertJob, testRedisConnection };
