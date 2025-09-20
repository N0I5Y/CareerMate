const os = require('os');
const path = require('path');
const fs = require('fs');

// Generate a unique temporary file path with the given extension
function tmpPath(ext = '') {
  const unique = `resume-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
  return path.join(os.tmpdir(), unique);
}

// Safely delete a file if it exists
function safeUnlink(filePath) {
  if (!filePath) return;
  fs.unlink(filePath, err => {
    // Ignore errors (file may not exist)
  });
}

module.exports = { tmpPath, safeUnlink };
