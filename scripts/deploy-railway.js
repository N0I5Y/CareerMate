#!/usr/bin/env node

/**
 * Railway Deployment Script for CareerMate
 * 
 * This script helps with Railway deployments by:
 * 1. Checking environment variables
 * 2. Running pre-deployment checks
 * 3. Triggering deployment
 */

const { execSync } = require('child_process');

console.log('🚂 CareerMate Railway Deployment Script');
console.log('=====================================');

// Check if Railway CLI is installed
try {
  execSync('railway --version', { stdio: 'pipe' });
  console.log('✅ Railway CLI is installed');
} catch (error) {
  console.error('❌ Railway CLI not found. Please install it first:');
  console.error('   npm install -g @railway/cli');
  process.exit(1);
}

// Check if we're linked to a Railway project
try {
  const status = execSync('railway status --json', { encoding: 'utf8' });
  const project = JSON.parse(status);
  console.log(`✅ Linked to Railway project: ${project.name}`);
} catch (error) {
  console.error('❌ Not linked to a Railway project. Run: railway login && railway link');
  process.exit(1);
}

// Check critical environment variables
console.log('\n🔍 Checking environment variables...');
try {
  const vars = execSync('railway variables --json', { encoding: 'utf8' });
  const envVars = JSON.parse(vars);
  
  const required = ['OPENAI_API_KEY', 'REDIS_URL'];
  const missing = required.filter(key => !envVars[key]);
  
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('   Set them in Railway dashboard or use: railway variables set KEY=value');
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are set');
} catch (error) {
  console.warn('⚠️  Could not check environment variables');
}

// Run deployment
console.log('\n🚀 Starting deployment...');
try {
  execSync('railway up', { stdio: 'inherit' });
  console.log('\n✅ Deployment completed successfully!');
  console.log('🌐 Your app should be available at: https://careermate-production.up.railway.app');
} catch (error) {
  console.error('\n❌ Deployment failed');
  process.exit(1);
}