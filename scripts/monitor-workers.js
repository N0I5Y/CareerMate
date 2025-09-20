#!/usr/bin/env node

/**
 * Monitor Workers Script
 * 
 * This script helps monitor worker activity and logs
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

async function monitorWorkers() {
  console.log('🔍 CareerMate Workers Monitor');
  console.log('============================');
  console.log('📡 Connecting to Railway Redis...\n');
  
  const connection = buildConnection(REDIS_URL);
  
  const workers = [
    { name: 'resume.extract', description: 'Extract Worker', service: 'extract-worker' },
    { name: 'resume.convert', description: 'Convert Worker', service: 'convert-worker' },
    { name: 'resume.optimize', description: 'Optimize Worker', service: 'optimize-worker' },
    { name: 'resume.template', description: 'Template Worker', service: 'template-worker' }
  ];
  
  console.log('📊 Current Worker Status:\n');
  
  for (const worker of workers) {
    try {
      const queue = new Queue(worker.name, { connection });
      
      // Get queue stats
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();
      const workers = await queue.getWorkers();
      
      console.log(`🔧 ${worker.description} (${worker.service}):`);
      console.log(`   📋 Queue: ${worker.name}`);
      console.log(`   👷 Workers Connected: ${workers.length}`);
      console.log(`   📊 Jobs - Waiting: ${waiting.length}, Active: ${active.length}, Completed: ${completed.length}, Failed: ${failed.length}`);
      
      // Show recent failed jobs
      if (failed.length > 0) {
        console.log(`   ❌ Recent Failures:`);
        const recentFailed = failed.slice(-3); // Last 3 failed jobs
        for (const job of recentFailed) {
          console.log(`      Job ${job.id}: ${job.failedReason || 'Unknown error'}`);
        }
      }
      
      // Show active jobs
      if (active.length > 0) {
        console.log(`   🔄 Active Jobs:`);
        for (const job of active) {
          console.log(`      Job ${job.id}: Processing...`);
        }
      }
      
      console.log('');
      await queue.close();
      
    } catch (error) {
      console.error(`❌ Error checking ${worker.name}:`, error.message);
    }
  }
  
  console.log('📝 To view detailed logs:');
  console.log('1. Go to Railway Dashboard → Your Project');
  console.log('2. Click on each worker service');
  console.log('3. Go to Deployments → Latest Deployment');
  console.log('4. View real-time logs');
  console.log('');
  console.log('🔄 Railway CLI commands:');
  console.log('   railway logs --service convert-worker');
  console.log('   railway logs --service extract-worker');
  console.log('   railway logs --service optimize-worker');
  console.log('   railway logs --service template-worker');
}

// Run monitoring
monitorWorkers().catch(console.error);