#!/usr/bin/env node

/**
 * Test Workers Script
 * 
 * This script helps test if workers are running and processing jobs
 */

const { Queue, QueueEvents } = require('bullmq');
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

async function testWorkers() {
  console.log('🔧 CareerMate Workers Test');
  console.log('=========================');
  
  const connection = buildConnection(REDIS_URL);
  
  const queues = [
    { name: 'resume.extract', description: 'Extract worker' },
    { name: 'resume.convert', description: 'Convert worker' },
    { name: 'resume.optimize', description: 'Optimize worker' },
    { name: 'resume.template', description: 'Template worker' }
  ];
  
  console.log('🔍 Checking queue status...\n');
  
  for (const queueInfo of queues) {
    try {
      const queue = new Queue(queueInfo.name, { connection });
      
      // Get queue stats
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();
      
      console.log(`📊 ${queueInfo.description} (${queueInfo.name}):`);
      console.log(`   Waiting: ${waiting.length}`);
      console.log(`   Active: ${active.length}`);
      console.log(`   Completed: ${completed.length}`);
      console.log(`   Failed: ${failed.length}`);
      
      // Check if there are any workers connected
      const workers = await queue.getWorkers();
      console.log(`   Workers: ${workers.length} connected`);
      
      if (workers.length === 0) {
        console.log(`   ⚠️  No workers connected to ${queueInfo.name}`);
      } else {
        console.log(`   ✅ Workers are connected`);
      }
      
      console.log('');
      
      await queue.close();
      
    } catch (error) {
      console.error(`❌ Error checking ${queueInfo.name}:`, error.message);
    }
  }
  
  console.log('🧪 Testing job submission...');
  
  try {
    const testQueue = new Queue('resume.extract', { connection });
    
    // Add a test job
    const job = await testQueue.add('test-job', {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'This is a test job to verify worker connectivity'
    }, {
      removeOnComplete: 5,
      removeOnFail: 5,
      attempts: 1
    });
    
    console.log(`✅ Test job added: ${job.id}`);
    
    // Wait a bit and check if it was processed
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const jobStatus = await job.getState();
    console.log(`📋 Test job status: ${jobStatus}`);
    
    if (jobStatus === 'completed') {
      console.log('🎉 Workers are processing jobs successfully!');
    } else if (jobStatus === 'waiting') {
      console.log('⏳ Job is waiting - workers may not be running');
    } else if (jobStatus === 'failed') {
      const failedReason = job.failedReason;
      console.log(`❌ Job failed: ${failedReason}`);
    }
    
    await testQueue.close();
    
  } catch (error) {
    console.error('❌ Error testing job submission:', error.message);
  }
  
  console.log('\n📝 Summary:');
  console.log('- If workers show 0 connected, they need to be deployed');
  console.log('- If jobs remain in "waiting" status, workers are not running');
  console.log('- Check Railway dashboard for worker service status');
  console.log('- Ensure workers have the same REDIS_URL as the API');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

testWorkers().catch(console.error);