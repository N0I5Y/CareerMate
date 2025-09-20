#!/usr/bin/env node

/**
 * Deploy Web App to Railway
 * 
 * This script helps deploy the CareerMate web UI to Railway
 */

const { execSync } = require('child_process');

console.log('🌐 CareerMate Web App Deployment');
console.log('===============================');

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

console.log('\n🚀 Deploying CareerMate Web App...');
console.log('📦 Using configuration: railway-web.json');
console.log('🐳 Dockerfile: apps/web/Dockerfile');
console.log('');

console.log('⚠️  MANUAL STEPS REQUIRED:');
console.log('1. Create a new service in Railway dashboard named "careermate-web"');
console.log('2. Set the railway.json config to: railway-web.json');
console.log('3. Add environment variable: VITE_API_BASE=https://careermate-production.up.railway.app');
console.log('4. Generate a public domain for the web service');
console.log('');

console.log('Or use Railway CLI:');
console.log('   railway service create careermate-web');
console.log('   railway link --service careermate-web');
console.log('   railway variables set VITE_API_BASE=https://careermate-production.up.railway.app');
console.log('   railway up --config railway-web.json');

console.log('\n📝 After deployment:');
console.log('1. Generate a public domain in Railway dashboard');
console.log('2. Test the web app at the generated URL');
console.log('3. Verify it can connect to the API');

console.log('\n🎯 Expected Result:');
console.log('- Web app accessible via Railway domain');
console.log('- Resume Optimizer functionality working');
console.log('- Prompt Maker UI accessible and functional');
console.log('- API calls routing to Railway API service');