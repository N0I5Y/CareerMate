# Railway Workers Deployment Guide

## Current Status
- ✅ API Service: Running on Railway
- ✅ Redis Service: Running on Railway  
- ⚠️ Workers: Running locally (need to deploy to Railway)

## Deploy Workers to Railway

### Method 1: Using Railway Dashboard (Recommended)

1. **Create Convert Worker Service:**
   ```bash
   railway service create convert-worker
   railway link --service convert-worker
   ```
   - In Railway dashboard, go to the convert-worker service
   - Set the railway.json config path to: `railway-convert.json`
   - Deploy the service

2. **Create Extract Worker Service:**
   ```bash
   railway service create extract-worker
   railway link --service extract-worker
   ```
   - In Railway dashboard, go to the extract-worker service
   - Set the railway.json config path to: `railway-extract.json`
   - Deploy the service

3. **Create Optimize Worker Service:**
   ```bash
   railway service create optimize-worker
   railway link --service optimize-worker
   ```
   - In Railway dashboard, go to the optimize-worker service
   - Set the railway.json config path to: `railway-optimize.json`
   - Deploy the service

### Method 2: Using Railway CLI

```bash
# Deploy convert worker
railway up --service convert-worker --config railway-convert.json

# Deploy extract worker  
railway up --service extract-worker --config railway-extract.json

# Deploy optimize worker
railway up --service optimize-worker --config railway-optimize.json
```

## Environment Variables

Each worker service needs the same environment variables as the API:
- `REDIS_URL` (automatically provided by Railway)
- `OPENAI_API_KEY`
- `LOG_LEVEL`
- `LOCAL_DATA_DIR=/usr/src/app/data`
- Queue-specific variables (QUEUE_EXTRACT, QUEUE_CONVERT, etc.)

## Verification

After deploying, run the test script to verify workers are connected:
```bash
node scripts/test-workers.js
```

You should see workers connected to each queue from Railway instead of local Docker.

## Stopping Local Workers

Once Railway workers are running, you can stop the local ones:
```bash
docker stop careermate-convert careermate-extract careermate-optimize careermate-template
```

## Monitoring

- Check Railway dashboard for worker service status
- Monitor logs for each worker service
- Use the health check script: `node scripts/health-check.js`