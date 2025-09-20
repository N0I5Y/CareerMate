// apps/workers/optimize/logger.js
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: undefined, // omit pid/hostname to keep logs clean
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;
