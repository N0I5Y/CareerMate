const fs = require('fs/promises');
const path = require('path');
const mime = require('mime-types');

const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');

async function putObject(key, buffer, contentType) {
  const abs = path.join(DATA_DIR, key);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buffer);
  return { key, bytes: buffer.length };
}

async function getObject(key) {
  const abs = path.join(DATA_DIR, key);
  try {
    return await fs.readFile(abs);
  } catch (err) {
    const error = new Error('Not found');
    error.code = 'NotFound';
    throw error;
  }
}

async function exists(key) {
  try {
    await fs.access(path.join(DATA_DIR, key));
    return true;
  } catch {
    return false;
  }
}

function localPathFor(key) {
  return path.join(DATA_DIR, key);
}

function detectMimeFromExt(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.doc' || ext === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === '.txt') return 'text/plain';
  return mime.lookup(ext) || 'application/octet-stream';
}

module.exports = { putObject, getObject, exists, localPathFor, detectMimeFromExt, DATA_DIR };