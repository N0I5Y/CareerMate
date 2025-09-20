#!/usr/bin/env node

/**
 * Health Check Script for CareerMate on Railway
 * 
 * This script monitors the health of your Railway deployment
 */

const https = require('https');

const RAILWAY_URL = 'https://careermate-production.up.railway.app';

function checkEndpoint(path) {
  return new Promise((resolve, reject) => {
    const url = `${RAILWAY_URL}${path}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', reject);
  });
}

async function runHealthCheck() {
  console.log('🏥 CareerMate Health Check');
  console.log('========================');
  console.log(`🌐 Checking: ${RAILWAY_URL}`);
  console.log('');

  try {
    // Check main endpoint
    const main = await checkEndpoint('/');
    console.log(`✅ Main API: ${main.status === 200 ? 'OK' : 'FAILED'} (${main.status})`);
    if (main.data.message) {
      console.log(`   Message: ${main.data.message}`);
      console.log(`   Version: ${main.data.version}`);
    }

    // Check health endpoint
    const health = await checkEndpoint('/healthz');
    console.log(`✅ Health Check: ${health.status === 200 ? 'OK' : 'FAILED'} (${health.status})`);
    if (health.data.redis) {
      console.log(`   Redis: ${health.data.redis}`);
      console.log(`   Environment: ${health.data.environment || 'unknown'}`);
    }

    // Check API endpoints
    const prompts = await checkEndpoint('/api/prompt-versions');
    console.log(`✅ Prompt API: ${prompts.status === 200 ? 'OK' : 'FAILED'} (${prompts.status})`);
    if (prompts.data.items) {
      console.log(`   Available prompts: ${prompts.data.items.length}`);
    }

    console.log('');
    console.log('🎉 All systems operational!');
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }
}

runHealthCheck();