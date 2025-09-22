const fs = require('fs/promises');
const path = require('path');
const mime = require('mime-types');

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

/**
 * Store file in Redis with optional expiration (1 hour default, null for no expiration)
 */
async function putFileInRedis(key, buffer, contentType, expirationSeconds = 3600) {
  const fileData = {
    buffer: buffer.toString('base64'),
    contentType,
    timestamp: Date.now(),
    size: buffer.length
  };
  
  const redisKey = `file:${key}`;
  
  if (expirationSeconds === null) {
    // No expiration - persistent storage
    await redis.set(redisKey, JSON.stringify(fileData));
    console.log(`Stored file in Redis (persistent): ${key} (${buffer.length} bytes)`);
  } else {
    // With expiration
    await redis.setex(redisKey, expirationSeconds, JSON.stringify(fileData));
    console.log(`Stored file in Redis (${expirationSeconds}s TTL): ${key} (${buffer.length} bytes)`);
  }
  
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

// Main storage interface
async function putObject(key, buffer, contentType, options = {}) {
  if (USE_REDIS_STORAGE) {
    console.log(`Using Redis storage for: ${key}`);
    
    // For templates, use longer expiration (30 days) or no expiration
    let expiration = 3600; // default 1 hour
    if (key.startsWith('templates/')) {
      expiration = options.persistent ? null : (30 * 24 * 3600); // 30 days for templates
    }
    
    return await putFileInRedis(key, buffer, contentType, expiration);
  } else {
    // Store locally (for development)
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
    // Get from local file system
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

async function exists(key) {
  if (USE_REDIS_STORAGE) {
    return await fileExistsInRedis(key);
  } else {
    try {
      await fs.access(path.join(DATA_DIR, key));
      return true;
    } catch {
      return false;
    }
  }
}

function localPathFor(key) {
  if (USE_REDIS_STORAGE) {
    console.warn(`localPathFor called with Redis storage: ${key}`);
    return null;
  }
  return path.join(DATA_DIR, key);
}

function detectMimeFromExt(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.doc' || ext === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === '.txt') return 'text/plain';
  return mime.lookup(ext) || 'application/octet-stream';
}

module.exports = { 
  putObject, 
  getObject, 
  exists, 
  localPathFor, 
  detectMimeFromExt, 
  DATA_DIR,
  USE_REDIS_STORAGE,
  redis
};