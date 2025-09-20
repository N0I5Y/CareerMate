const Redis = require('ioredis');
const { URL } = require('url');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function buildConnection(redisUrl) {
  try {
    const u = new URL(redisUrl);
    return {
      host: u.hostname,
      port: Number(u.port || 6379),
      username: u.username || undefined,
      password: u.password || undefined,
      tls: u.protocol === 'rediss:' ? {} : undefined,
      connectTimeout: 10000,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    };
  } catch (error) {
    console.error('Error parsing Redis URL:', error);
    throw error;
  }
}

const redis = new Redis(buildConnection(REDIS_URL));

/**
 * Store file in Redis with expiration
 */
async function putFileInRedis(key, buffer, contentType, expirationSeconds = 3600) {
  const fileData = {
    buffer: buffer.toString('base64'),
    contentType,
    timestamp: Date.now(),
    size: buffer.length
  };
  
  await redis.setex(`file:${key}`, expirationSeconds, JSON.stringify(fileData));
  console.log(`Stored file in Redis: ${key} (${buffer.length} bytes)`);
  return { key, bytes: buffer.length };
}

/**
 * Retrieve file from Redis
 */
async function getFileFromRedis(key) {
  const data = await redis.get(`file:${key}`);
  if (!data) {
    const error = new Error('File not found in Redis');
    error.code = 'NotFound';
    throw error;
  }
  
  const fileData = JSON.parse(data);
  const buffer = Buffer.from(fileData.buffer, 'base64');
  console.log(`Retrieved file from Redis: ${key} (${buffer.length} bytes)`);
  return buffer;
}

/**
 * Check if file exists in Redis
 */
async function fileExistsInRedis(key) {
  const exists = await redis.exists(`file:${key}`);
  return exists === 1;
}

/**
 * Delete file from Redis
 */
async function deleteFileFromRedis(key) {
  await redis.del(`file:${key}`);
  console.log(`Deleted file from Redis: ${key}`);
}

module.exports = {
  putFileInRedis,
  getFileFromRedis,
  fileExistsInRedis,
  deleteFileFromRedis,
  redis
};