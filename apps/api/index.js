require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pino = require('pino');

const resumes = require('./routes/resumes');
const templates = require('./routes/templates');
const promptVersionsRouter = require('./routes/prompt-versions');

const PORT = process.env.PORT || 3000;
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Railway-specific environment detection
const isRailway = process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_NAME;
const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;

const logger = pino({ level: LOG_LEVEL });
const app = express();

// CORS + JSON
app.use(cors({ origin: ALLOW_ORIGIN }));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  res.on('finish', () => {
    logger.info({ method: req.method, url: req.originalUrl, status: res.statusCode });
  });
  next();
});

// Basic root route for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'CareerMate API is running!',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/resumes', resumes);
app.use('/api/templates', templates);

// IMPORTANT: mount without a write gate; the router enforces POST/PUT only
app.use('/api/prompt-versions', promptVersionsRouter);

app.get('/healthz', async (req, res) => {
  try {
    // Test Redis connection
    const { testRedisConnection } = require('./lib/queues');
    const redisOk = await testRedisConnection();
    
    const healthData = { 
      ok: true, 
      redis: redisOk ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    // Add Railway-specific info if available
    if (isRailway) {
      healthData.railway = {
        project: process.env.RAILWAY_PROJECT_NAME,
        environment: process.env.RAILWAY_ENVIRONMENT_NAME,
        serviceId: process.env.RAILWAY_SERVICE_ID
      };
    }
    
    res.json(healthData);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({ 
      ok: false, 
      error: error.message,
      redis: 'error',
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    });
  }
});

// Errors
app.use((err, req, res, next) => {
  const code = err.code || (err.status === 404 ? 'NotFound' : err.status === 400 ? 'BadRequest' : 'Internal');
  const status = err.status || (code === 'NotFound' ? 404 : code === 'BadRequest' ? 400 : 500);
  logger.error({ err, code, status }, 'API error');
  res.status(status).json({ error: { code, message: err.message || 'Internal error' } });
});

// Add startup logging
logger.info('Starting CareerMate API...');
logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info(`Port: ${PORT}`);
logger.info(`CORS Origin: ${ALLOW_ORIGIN}`);

// Railway-specific logging and validation
if (isRailway) {
  logger.info(`🚂 Running on Railway`);
  logger.info(`📡 Project: ${process.env.RAILWAY_PROJECT_NAME}`);
  logger.info(`🌍 Environment: ${process.env.RAILWAY_ENVIRONMENT_NAME}`);
  if (railwayDomain) {
    logger.info(`🔗 Public URL: https://${railwayDomain}`);
  }

  // Validate critical Railway environment variables
  const requiredVars = ['OPENAI_API_KEY', 'REDIS_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    logger.error('Please set these variables in Railway dashboard');
  } else {
    logger.info('✅ All required environment variables are set');
  }
}

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`✅ CareerMate API listening on port ${PORT}`);
  logger.info(`🌐 Health check available at: http://localhost:${PORT}/healthz`);
});

// Handle server errors
server.on('error', (error) => {
  logger.error('❌ Server error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('✅ Server closed');
    process.exit(0);
  });
});
