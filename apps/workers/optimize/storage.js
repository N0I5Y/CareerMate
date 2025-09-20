const fs = require('fs/promises');
const path = require('path');

// Redis storage for cross-service file sharing
const Redis = require('ioredis');
const { URL } = require('url');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DATA_DIR = path.resolve(process.env.LOCAL_DATA_DIR || './data');
const USE_REDIS_STORAGE = process.env.USE_REDIS_STORAGE === 'true' || process.env.RAILWAY_ENVIRONMENT_NAME;

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

async function putObject(key, buffer, contentType) {
  if (USE_REDIS_STORAGE) {
    console.log(`Using Redis storage for: ${key}`);
    return await putFileInRedis(key, buffer, contentType);
  } else {
    const abs = path.join(DATA_DIR, key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, buffer);
    return { key, bytes: buffer.length };
  }
}

async function getObject(key) {
  if (USE_REDIS_STORAGE) {
    console.log(`Getting from Redis storage: ${key}`);
    return await getFileFromRedis(key);
  } else {
    const abs = path.join(DATA_DIR, key);
    try {
      return await fs.readFile(abs);
    } catch (err) {
      const error = new Error('Not found');
      error.code = 'NotFound';
      throw error;
    }
  }
}

function resolveKey(key) {
  if (USE_REDIS_STORAGE) {
    console.warn(`resolveKey called with Redis storage: ${key}`);
    return null;
  }
  return path.join(DATA_DIR, key);
}

module.exports = { getObject, putObject, resolveKey };
