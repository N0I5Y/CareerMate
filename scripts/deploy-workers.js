#!/usr/bin/env node

/**
 * Deploy Workers to Railway
 * 
 * This script helps deploy all CareerMate workers to Railway as separate services
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 CareerMate Workers Deployment Script');
console.log('======================================');

const workers = [
  { name: 'convert', config: 'railway-convert.json', description: 'PDF conversion worker' },
  { name: 'extract', config: 'railway-extract.json', description: 'Text extraction worker' },
  { name: 'optimize', config: 'railway-optimize.json', description: 'Resume optimization worker' },
  { name: 'template', config: 'railway-template.json', description: 'Template processing worker' }
];

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

console.log('\n📋 Workers to deploy:');
workers.forEach((worker, index) => {
  console.log(`${index + 1}. ${worker.name} - ${worker.description}`);
});

console.log('\n🚀 Starting worker deployments...');
console.log('Note: You\'ll need to create separate services for each worker in Railway dashboard');
console.log('');

workers.forEach((worker) => {
  console.log(`\n📦 Deploying ${worker.name} worker...`);
  console.log('─'.repeat(50));
  
  // Check if config file exists
  if (!fs.existsSync(worker.config)) {
    console.error(`❌ Config file ${worker.config} not found`);
    return;
  }
  
  console.log(`📄 Using config: ${worker.config}`);
  console.log(`🐳 Dockerfile: apps/workers/${worker.name}/Dockerfile`);
  
  console.log('\n⚠️  MANUAL STEPS REQUIRED:');
  console.log(`1. Create a new service in Railway dashboard named "${worker.name}-worker"`);
  console.log(`2. Link this service to your repository`);
  console.log(`3. Set the railway.json config to: ${worker.config}`);
  console.log(`4. Deploy the service`);
  console.log('');
  console.log('Or use Railway CLI:');
  console.log(`   railway service create ${worker.name}-worker`);
  console.log(`   railway link --service ${worker.name}-worker`);
  console.log(`   railway up --config ${worker.config}`);
});

console.log('\n✅ Worker deployment configurations are ready!');
console.log('\n📝 Next steps:');
console.log('1. Create worker services in Railway dashboard');
console.log('2. Ensure all workers share the same environment variables as the API');
console.log('3. Monitor worker logs to ensure they connect to Redis successfully');
console.log('4. Test the complete pipeline by uploading a resume through the API');

console.log('\n🔍 To verify workers are running:');
console.log('- Check Railway dashboard for service status');
console.log('- Monitor Redis queue activity');
console.log('- Test API endpoints that trigger worker jobs');