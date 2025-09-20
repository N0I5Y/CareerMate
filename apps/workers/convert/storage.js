// Use shared storage that supports both local and Redis storage
const { getObject, putObject, localPathFor } = require('../../shared/storage');

function resolveKey(key) {
  return localPathFor(key);
}

module.exports = { getObject, putObject, resolveKey };
