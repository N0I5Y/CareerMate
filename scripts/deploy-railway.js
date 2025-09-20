#!/usr/bin/env node

/**
 * Railway deployment helper script
 * This script helps with Railway deployment tasks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚂 CareerMate Railway Deployment Helper');
console.log('=====================================');

// Check if railway CLI is installed
try {
  execSync('railway --version', { stdio: 'pipe' });
  console.log('✅ Railway CLI is installed');
} catch (error) {
  console.error('❌ Railway CLI not found. Please install it first:');
  console.error('npm install -g @railway/cli');
  process.exit(1);
}

// Check if we're in a Railway project
try {
  const status = execSync('railway status', { encoding: 'utf8' });
  console.log('✅ Connected to Railway project');
  console.log(status);
} catch (error) {
  console.error('❌ Not connected to a Railway project');
  console.error('Run: railway login && railway link');
  process.exit(1);
}

// Check environment variables
console.log('\n🔍 Checking environment variables...');
try {
  const vars = execSync('railway variables', { encoding: 'utf8' });
  
  const requiredVars = [
    'OPENAI_API_KEY',
    'REDIS_URL',
    'ALLOW_ORIGIN',
    'LOG_LEVEL'
  ];
  
  let allSet = true;
  requiredVars.forEach(varName => {
    if (vars.includes(varName)) {
      console.log(`✅ ${varName} is set`);
    } else {
      console.log(`❌ ${varName} is missing`);
      allSet = false;
    }
  });
  
  if (!allSet) {
    console.log('\n⚠️  Some required variables are missing.');
    console.log('Set them using: railway variables set VARIABLE_NAME=value');
  } else {
    console.log('\n✅ All required variables are set');
  }
} catch (error) {
  console.error('❌ Could not check environment variables');
}

// Deploy
console.log('\n🚀 Starting deployment...');
try {
  execSync('railway up', { stdio: 'inherit' });
  console.log('\n✅ Deployment completed successfully!');
  
  // Get the public URL
  try {
    const vars = execSync('railway variables', { encoding: 'utf8' });
    const urlMatch = vars.match(/RAILWAY_PUBLIC_DOMAIN\s+│\s+([^\s]+)/);
    if (urlMatch) {
      console.log(`\n🌐 Your app is available at: https://${urlMatch[1]}`);
      console.log(`🏥 Health check: https://${urlMatch[1]}/healthz`);
    }
  } catch (error) {
    console.log('Could not retrieve public URL');
  }
} catch (error) {
  console.error('❌ Deployment failed');
  process.exit(1);
}