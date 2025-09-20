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
    
    res.json({ 
      ok: true, 
      redis: redisOk ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({ 
      ok: false, 
      error: error.message,
      redis: 'error',
      timestamp: new Date().toISOString()
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

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Careermate API listening on port ${PORT}`);
});
