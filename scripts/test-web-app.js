#!/usr/bin/env node

/**
 * Test Web App Deployment
 * 
 * This script tests if the web app is properly deployed and accessible
 */

const https = require('https');

// You'll need to replace this with your actual web app URL
const WEB_APP_URL = 'https://your-web-app-url.railway.app';
const API_URL = 'https://careermate-production.up.railway.app';

function testEndpoint(url, description) {
  return new Promise((resolve, reject) => {
    console.log(`🧪 Testing ${description}...`);
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ ${description}: OK (${res.statusCode})`);
          resolve({ status: res.statusCode, data: data.substring(0, 100) });
        } else {
          console.log(`⚠️  ${description}: ${res.statusCode}`);
          resolve({ status: res.statusCode, data: data.substring(0, 100) });
        }
      });
    }).on('error', (err) => {
      console.log(`❌ ${description}: ${err.message}`);
      reject(err);
    });
  });
}

async function testWebApp() {
  console.log('🌐 CareerMate Web App Test');
  console.log('=========================');
  console.log(`🔗 Web App URL: ${WEB_APP_URL}`);
  console.log(`🔗 API URL: ${API_URL}`);
  console.log('');

  try {
    // Test API (should be working)
    await testEndpoint(API_URL, 'API Service');
    await testEndpoint(`${API_URL}/healthz`, 'API Health Check');
    
    // Test Web App (replace URL with actual)
    if (WEB_APP_URL.includes('your-web-app-url')) {
      console.log('⚠️  Please update WEB_APP_URL in this script with your actual Railway web app URL');
      console.log('   You can find it in Railway Dashboard → Web Service → Settings → Networking');
    } else {
      await testEndpoint(WEB_APP_URL, 'Web App Root');
      await testEndpoint(`${WEB_APP_URL}/health`, 'Web App Health');
    }
    
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('1. Get your web app URL from Railway dashboard');
    console.log('2. Update WEB_APP_URL in this script');
    console.log('3. Test the web app in your browser');
    console.log('4. Verify Resume Optimizer and Prompt Maker features work');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWebApp();