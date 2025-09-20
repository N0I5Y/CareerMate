// Use shared storage that supports both local and Redis storage
const { getObject, putObject, exists, localPathFor, detectMimeFromExt, DATA_DIR } = require('../../shared/storage');

module.exports = { putObject, getObject, exists, localPathFor, detectMimeFromExt, DATA_DIR };