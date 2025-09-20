#!/usr/bin/env node

/**
 * Test Redis Connection
 * 
 * This script tests the Redis connection using the environment variables
 */

const { URL } = require('url');
const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

console.log('🔍 Testing Redis Connection');
console.log('==========================');
console.log(`📡 Redis URL: ${REDIS_URL.replace(/:[^:@]*@/, ':***@')}`); // Hide password

function buildConnection(redisUrl) {
  try {
    const u = new URL(redisUrl);
    const config = {
      host: u.hostname,
      port: Number(u.port || 6379),
      username: u.username || undefined,
      password: u.password || undefined,
      tls: u.protocol === 'rediss:' ? {} : undefined,
      connectTimeout: 10000,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
    };
    
    console.log('🔧 Connection Config:');
    console.log(`   Host: ${config.host}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   Username: ${config.username || 'none'}`);
    console.log(`   Password: ${config.password ? '***' : 'none'}`);
    console.log(`   TLS: ${config.tls ? 'enabled' : 'disabled'}`);
    console.log('');
    
    return config;
  } catch (error) {
    console.error('❌ Error parsing Redis URL:', error.message);
    throw error;
  }
}

async function testRedisConnection() {
  try {
    const config = buildConnection(REDIS_URL);
    const redis = new Redis(config);
    
    console.log('🔌 Connecting to Redis...');
    
    // Test connection
    await redis.ping();
    console.log('✅ Redis connection successful!');
    
    // Test basic operations
    console.log('🧪 Testing basic operations...');
    
    await redis.set('test-key', 'test-value');
    const value = await redis.get('test-key');
    
    if (value === 'test-value') {
      console.log('✅ Redis read/write operations working!');
    } else {
      console.log('❌ Redis read/write operations failed');
    }
    
    // Clean up
    await redis.del('test-key');
    
    // Test queue-related operations
    console.log('🔍 Testing queue operations...');
    
    const queueKey = 'bull:resume.extract:waiting';
    const queueLength = await redis.llen(queueKey);
    console.log(`📋 Queue length for resume.extract: ${queueLength}`);
    
    await redis.quit();
    console.log('✅ Redis connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('1. Check if REDIS_URL environment variable is set correctly');
    console.error('2. Verify Redis service is running in Railway');
    console.error('3. Ensure network connectivity to Redis host');
    console.error('4. Check if credentials are correct');
    
    process.exit(1);
  }
}

testRedisConnection();