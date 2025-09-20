#!/usr/bin/env node

/**
 * Verify Railway Workers Deployment
 * 
 * This script checks if Railway workers are properly deployed and connected
 */

const { Queue } = require('bullmq');
const { URL } = require('url');

// Use Railway Redis URL
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

async function verifyRailwayWorkers() {
  console.log('🚂 Railway Workers Verification');
  console.log('==============================');
  console.log(`🔗 Connecting to Railway Redis...`);
  
  const connection = buildConnection(REDIS_URL);
  
  const queues = [
    { name: 'resume.extract', description: 'Extract Worker', expectedWorkers: 1 },
    { name: 'resume.convert', description: 'Convert Worker', expectedWorkers: 1 },
    { name: 'resume.optimize', description: 'Optimize Worker', expectedWorkers: 1 }
  ];
  
  console.log('\n📊 Checking Railway worker connections...\n');
  
  let allWorkersConnected = true;
  
  for (const queueInfo of queues) {
    try {
      const queue = new Queue(queueInfo.name, { connection });
      
      // Get queue stats
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();
      const workers = await queue.getWorkers();
      
      console.log(`🔧 ${queueInfo.description} (${queueInfo.name}):`);
      console.log(`   📋 Queue Stats:`);
      console.log(`      Waiting: ${waiting.length}`);
      console.log(`      Active: ${active.length}`);
      console.log(`      Completed: ${completed.length}`);
      console.log(`      Failed: ${failed.length}`);
      
      console.log(`   👷 Workers: ${workers.length} connected`);
      
      if (workers.length >= queueInfo.expectedWorkers) {
        console.log(`   ✅ Railway workers are connected and ready!`);
      } else {
        console.log(`   ❌ Expected ${queueInfo.expectedWorkers} workers, found ${workers.length}`);
        console.log(`   🔍 Check Railway dashboard for worker service status`);
        allWorkersConnected = false;
      }
      
      // Show worker details if available
      if (workers.length > 0) {
        workers.forEach((worker, index) => {
          console.log(`      Worker ${index + 1}: ${worker.name || 'unnamed'}`);
        });
      }
      
      console.log('');
      await queue.close();
      
    } catch (error) {
      console.error(`❌ Error checking ${queueInfo.name}:`, error.message);
      allWorkersConnected = false;
    }
  }
  
  if (allWorkersConnected) {
    console.log('🎉 All Railway workers are successfully deployed and connected!');
    console.log('✅ Your CareerMate application is fully operational on Railway');
    
    console.log('\n🧪 Testing job processing...');
    await testJobProcessing(connection);
  } else {
    console.log('⚠️  Some workers are not connected. Please check:');
    console.log('   1. Railway dashboard for service deployment status');
    console.log('   2. Worker service logs for any errors');
    console.log('   3. Environment variables are properly set');
  }
}

async function testJobProcessing(connection) {
  try {
    const testQueue = new Queue('resume.extract', { connection });
    
    console.log('📤 Submitting test job...');
    const job = await testQueue.add('railway-test', {
      test: true,
      source: 'railway-verification',
      timestamp: new Date().toISOString(),
      message: 'Testing Railway worker connectivity'
    }, {
      removeOnComplete: 5,
      removeOnFail: 5,
      attempts: 1,
      delay: 1000
    });
    
    console.log(`✅ Test job submitted: ${job.id}`);
    
    // Wait for processing
    console.log('⏳ Waiting for job processing...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    const jobState = await job.getState();
    console.log(`📋 Job status: ${jobState}`);
    
    if (jobState === 'completed') {
      console.log('🎉 Railway workers are processing jobs successfully!');
    } else if (jobState === 'waiting' || jobState === 'active') {
      console.log('⏳ Job is being processed - workers are responding');
    } else if (jobState === 'failed') {
      console.log('⚠️  Job failed - check worker logs for details');
    }
    
    await testQueue.close();
    
  } catch (error) {
    console.error('❌ Error testing job processing:', error.message);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Verification complete');
  process.exit(0);
});

verifyRailwayWorkers().catch(console.error);