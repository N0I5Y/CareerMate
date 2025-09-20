// apps/workers/extract/storage.js (local-mode excerpt)
const fs = require('fs/promises');
const fssync = require('fs');
const path = require('path');

const BASE = process.env.LOCAL_DATA_DIR
  ? path.resolve(process.cwd(), process.env.LOCAL_DATA_DIR)
  : path.resolve(process.cwd(), 'data');

async function getObject(key) {
  const p = path.isAbsolute(key) ? key : path.join(BASE, key);
  return fs.readFile(p);
}

async function putObject(key, buffer /*, contentType */) {
  const p = path.isAbsolute(key) ? key : path.join(BASE, key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, buffer);
  return { key, bytes: buffer.length };
}

module.exports = { getObject, putObject };
