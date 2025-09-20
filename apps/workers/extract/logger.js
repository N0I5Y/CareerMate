// apps/workers/extract/logger.js
const pino = require('pino');
module.exports = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});
