// apps/workers/extract/dev-enqueue.js
require('dotenv').config();
const { Queue } = require('bullmq');
const { URL } = require('url');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { detectMimeFromExt } = require('./extractors');

const QUEUE_EXTRACT = process.env.QUEUE_EXTRACT || 'resume.extract';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const LOCAL_DATA_DIR = process.env.LOCAL_DATA_DIR || './data';

/** Build BullMQ connection from REDIS_URL */
function buildConnection(redisUrl) {
  const u = new URL(redisUrl);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username || undefined,
    password: u.password || undefined,
    tls: u.protocol === 'rediss:' ? {} : undefined,
  };
}

/** Ensure dir exists */
async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function main() {
  const srcArg = process.argv[2];
  const role = process.argv[3] || 'Test Role';
  const company = process.argv[4] || 'Test Company';
  const wantPdf = (process.argv[5] || 'false').toLowerCase() === 'true';

  if (!srcArg) {
    console.error('Usage: node apps/workers/extract/dev-enqueue.js <source-file.pdf|.docx> [role] [company] [wantPdf=true|false]');
    process.exit(1);
  }

  const srcAbs = path.isAbsolute(srcArg) ? srcArg : path.resolve(process.cwd(), srcArg);
  if (!fs.existsSync(srcAbs)) {
    console.error(`Source file not found: ${srcAbs}`);
    process.exit(1);
  }

  const ext = path.extname(srcAbs).toLowerCase();
  const base = path.basename(srcAbs, ext);

  // Destination inside LOCAL_DATA_DIR under raw/
  const localBase = path.resolve(process.cwd(), LOCAL_DATA_DIR);
  const destDir = path.join(localBase, 'raw');
  const destAbs = path.join(destDir, `${base}${ext}`);
  const inputKey = `raw/${base}${ext}`; // logical key for storage adapter

  await ensureDir(destDir);

  // If the src is already the same file, skip copy; else copy into data/raw
  if (path.resolve(srcAbs) !== path.resolve(destAbs)) {
    await fsp.copyFile(srcAbs, destAbs);
  }

  // Detect mime (fallbacks)
  const mimeType =
    detectMimeFromExt(destAbs) ||
    (ext === '.pdf'
      ? 'application/pdf'
      : ext === '.docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/octet-stream');

  const jobId = `${base}-${Date.now()}`;

  const queue = new Queue(QUEUE_EXTRACT, { connection: buildConnection(REDIS_URL) });
  await queue.add(
    QUEUE_EXTRACT,
    { jobId, inputKey, mimeType, role, company, wantPdf },
    { jobId, removeOnComplete: true, removeOnFail: 1000 }
  );

  console.log('✅ Enqueued job:');
  console.log(`  jobId:    ${jobId}`);
  console.log(`  inputKey: ${inputKey}`);
  console.log(`  local:    ${destAbs}`);
  console.log(`  role:     ${role}`);
  console.log(`  company:  ${company}`);
  console.log(`  wantPdf:  ${wantPdf}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('enqueue error:', e);
  process.exit(1);
});
