const pino = require('pino');

const level = process.env.LOG_LEVEL || 'info';
const logger = pino({ level });

function childLogger(meta = {}) {
  return logger.child(meta);
}

module.exports = { logger, childLogger };
