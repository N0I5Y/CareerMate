const fs = require('fs/promises');
const path = require('path');

const LOCAL_DATA_DIR = process.env.LOCAL_DATA_DIR || './data';

async function getObject(key) {
  const abs = path.resolve(LOCAL_DATA_DIR, key);
  return fs.readFile(abs);
}

async function putObject(key, buffer, contentType) {
  const abs = path.resolve(LOCAL_DATA_DIR, key);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buffer);
  return { key, bytes: buffer.length };
}

function resolveKey(key) {
  return path.resolve(LOCAL_DATA_DIR, key);
}

module.exports = { getObject, putObject, resolveKey };
