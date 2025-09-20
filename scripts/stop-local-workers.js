#!/usr/bin/env node

/**
 * Stop Local Workers Script
 * 
 * This script stops the local Docker workers once Railway workers are running
 */

const { execSync } = require('child_process');

console.log('🛑 Stopping Local Workers');
console.log('========================');

const localWorkers = [
  'careermate-convert',
  'careermate-extract', 
  'careermate-optimize',
  'careermate-template'
];

console.log('🔍 Checking running Docker containers...');

try {
  const runningContainers = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf8' });
  const containerNames = runningContainers.split('\n').filter(name => name.trim());
  
  console.log(`📋 Found ${containerNames.length} running containers`);
  
  for (const workerName of localWorkers) {
    if (containerNames.includes(workerName)) {
      console.log(`🛑 Stopping ${workerName}...`);
      try {
        execSync(`docker stop ${workerName}`, { stdio: 'pipe' });
        console.log(`✅ ${workerName} stopped`);
      } catch (error) {
        console.error(`❌ Failed to stop ${workerName}:`, error.message);
      }
    } else {
      console.log(`ℹ️  ${workerName} is not running`);
    }
  }
  
  console.log('\n✅ Local workers stopped successfully!');
  console.log('🚂 Your Railway workers should now handle all job processing');
  console.log('\n🔍 Verify Railway workers are working:');
  console.log('   node scripts/verify-railway-workers.js');
  
} catch (error) {
  console.error('❌ Error checking Docker containers:', error.message);
  console.log('💡 Make sure Docker is running and accessible');
}