#!/usr/bin/env node

/**
 * Test Worker Activity
 * 
 * This script submits test jobs to verify workers are processing
 */

const { Queue } = require('bullmq');
const { URL } = require('url');

const REDIS_URL = process.env.REDIS_URL || 'redis://default:NTJVfhCigaisKlfQXKZbfqaffHTHCaaV@yamabiko.proxy.rlwy.net:20467';

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

async function testWorkerActivity() {
  console.log('🧪 Testing Worker Activity');
  console.log('==========================');
  
  const connection = buildConnection(REDIS_URL);
  
  try {
    // Test extract worker
    console.log('📤 Submitting test job to extract worker...');
    const extractQueue = new Queue('resume.extract', { connection });
    
    const testJob = await extractQueue.add('test-extract', {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Testing extract worker connectivity',
      source: 'worker-activity-test'
    }, {
      removeOnComplete: 5,
      removeOnFail: 5,
      attempts: 1
    });
    
    console.log(`✅ Test job submitted: ${testJob.id}`);
    
    // Wait and check status
    console.log('⏳ Waiting 10 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const jobState = await testJob.getState();
    console.log(`📋 Job status: ${jobState}`);
    
    if (jobState === 'completed') {
      console.log('🎉 Worker is processing jobs successfully!');
    } else if (jobState === 'failed') {
      const failedReason = testJob.failedReason;
      console.log(`❌ Job failed: ${failedReason}`);
    } else if (jobState === 'waiting') {
      console.log('⏳ Job is still waiting - worker may be busy or not connected');
    } else if (jobState === 'active') {
      console.log('🔄 Job is being processed - worker is active');
    }
    
    await extractQueue.close();
    
    console.log('\n📊 For detailed worker logs:');
    console.log('1. Railway Dashboard → Worker Service → Deployments → Logs');
    console.log('2. Look for job processing messages');
    console.log('3. Check for any error messages or connection issues');
    
  } catch (error) {
    console.error('❌ Error testing worker activity:', error.message);
  }
}

testWorkerActivity();