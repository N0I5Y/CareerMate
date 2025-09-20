// Use shared storage that supports both local and Redis storage
const { getObject, putObject } = require('../../shared/storage');

module.exports = { getObject, putObject };
