// apps/workers/extract/processor.js
// BullMQ v5 Processor: PDF/DOCX -> normalized text -> store -> enqueue next
const crypto = require('crypto');
const path = require('path');
const { extractLinks } = require('./links');

const logger = require('./logger');
const logBase = logger.child({ service: 'extract-processor' });

const storage = require('./storage');                 // getObject(key) / putObject(key, buf, ctype)
const { addNext } = require('./queue');               // addNext(payload) -> QUEUE_OPTIMIZE
const { extractText, detectMimeFromExt } = require('./extractors');

const MAX_BYTES = parseInt(process.env.EXTRACT_MAX_BYTES || `${10 * 1024 * 1024}`, 10); // 10MB
const CHAR_LIMIT = parseInt(process.env.EXTRACT_CHAR_LIMIT || '25000', 10);             // truncate to control LLM cost

function normalizeText(txt) {
  if (!txt) return '';
  let s = txt.replace(/\r\n/g, '\n');        // unify newlines
  s = s.replace(/\n{3,}/g, '\n\n');          // collapse >2 blank lines
  s = s.replace(/[ \t]{2,}/g, ' ');          // collapse multi-spaces
  return s.trim();
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function envYes(v, def = true) {
  const s = (v ?? (def ? '1' : '0')).toString().toLowerCase().trim();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

module.exports = async function processor(job) {
  const started = Date.now();
  const data = job.data || {};
  const jobId = data.jobId || job.id; // prefer upstream id, fallback to BullMQ job.id
  const log = logBase.child({ jobId });

  log.info({ stage: 'start', dataKeys: Object.keys(data) }, 'extract start');

  // 1) Validate input
  const inputKey = data.inputKey;
  if (!inputKey) throw new Error('Missing inputKey in job payload');

  // 2) Fetch source bytes
  let buf;
  try {
    buf = await storage.getObject(inputKey);
  } catch (err) {
    log.error({ err, inputKey }, 'failed to read input');
    throw err;
  }

  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    throw new Error('Input file is empty or unreadable');
  }
  if (buf.length > MAX_BYTES) {
    throw new Error(`Input exceeds max size: ${buf.length} > ${MAX_BYTES}`);
  }

  // 3) Determine mime
  let mimeType = data.mimeType || detectMimeFromExt(inputKey) || 'application/octet-stream';

  // 4) Extract raw text
  let rawText;
  try {
    rawText = await extractText(buf, mimeType);
  } catch (err) {
    // Common cause: encrypted/unreadable PDFs
    log.error({ err, mimeType }, 'text extraction failed');
    throw new Error(
      /Incorrect password|Encrypted/i.test(String(err))
        ? 'Encrypted or password-protected PDF cannot be parsed'
        : `Extraction error: ${err.message || err}`
    );
  }

  // 4a) Link detection (best-effort)
  let links = { urls: [], emails: [] };
  try {
    const out = await extractLinks({ buf, mimeType, rawText });
    links.urls = Array.isArray(out?.urls) ? out.urls : [];
    links.emails = Array.isArray(out?.emails) ? out.emails : [];
  } catch (e) {
    log.warn({ err: String(e) }, 'extractLinks failed (continuing without links)');
  }

  // 5) Normalize & truncate (with optional link append)
  const normalized = normalizeText(rawText);
  const truncated = normalized.length > CHAR_LIMIT;
  let finalText = truncated ? normalized.slice(0, CHAR_LIMIT) : normalized;

  const APPEND = envYes(process.env.EXTRACT_LINKS_APPEND, true);
  const MAX_LINKS = Number(process.env.EXTRACT_LINKS_MAX || 20);

  if (APPEND && (links.urls.length || links.emails.length)) {
    const urlList = links.urls.slice(0, MAX_LINKS).map(u => `- ${u}`).join('\n');
    const emailList = links.emails.slice(0, MAX_LINKS).map(e => `- ${e}`).join('\n');
    const tail = [
      '',
      '=== LINKS DETECTED ===',
      urlList && `URLs:\n${urlList}`,
      emailList && `Emails:\n${emailList}`,
      '',
    ].filter(Boolean).join('\n');

    finalText += `\n${tail}`; // append safely
    // keep under limit (the tail might push us over)
    if (finalText.length > CHAR_LIMIT) {
      finalText = finalText.slice(0, CHAR_LIMIT);
    }
  }

  // 6) Persist outputs
  const textKey = `text/${jobId}.txt`;
  const metaKey = `meta/${jobId}.extract.json`;
  const meta = {
    jobId,
    inputKey,
    mimeType,
    bytesIn: buf.length,
    charCount: finalText.length,
    truncated: truncated || finalText.length > CHAR_LIMIT,
    sha256: sha256(buf),
    createdAt: new Date().toISOString(),
    warnings: [],
    links: links.urls,
    emailsFound: links.emails,
  };

  try {
    await storage.putObject(textKey, Buffer.from(finalText, 'utf8'), 'text/plain; charset=utf-8');
    await storage.putObject(metaKey, Buffer.from(JSON.stringify(meta, null, 2), 'utf8'), 'application/json');
  } catch (err) {
    log.error({ err, textKey, metaKey }, 'failed to persist extracted outputs');
    throw err;
  }

  // 6a) Optional: JD raw file -> extract to text -> pass jdKey downstream
  let jdKey;
  if (data.jdInputKey) {
    try {
      const jdBuf = await storage.getObject(data.jdInputKey);
      const jdMime = detectMimeFromExt(data.jdInputKey) || 'application/octet-stream';
      const jdRaw = await extractText(jdBuf, jdMime);
      const jdTxt = normalizeText(jdRaw).slice(0, CHAR_LIMIT);
      jdKey = `jd/${jobId}.txt`;
      await storage.putObject(jdKey, Buffer.from(jdTxt, 'utf8'), 'text/plain; charset=utf-8');
      log.info({ jdInputKey: data.jdInputKey, jdKey }, 'JD extracted');
    } catch (e) {
      log.warn({ err: String(e) }, 'failed to extract JD file (continuing without jdKey)');
    }
  }

  // 7) Enqueue next stage (optimize)
  try {
    await addNext({
      jobId,
      textKey,
      role: data.role,
      company: data.company,
      wantPdf: !!data.wantPdf,
      prompt: data.prompt,
      templateKey: data.templateKey,
      links: links.urls,          // surface URL links to optimizer
      jdText: data.jdText,        // pass-through
      jdUrl: data.jdUrl,          // pass-through if you plan to fetch in optimize
      jdKey,                      // text extracted from jdInputKey (if any)
    });
  } catch (err) {
    log.error({ err }, 'failed to enqueue next stage');
    throw err;
  }

  const ms = Date.now() - started;
  log.info({ stage: 'done', textKey, metaKey, ms }, 'extract completed');
  return { textKey, metaKey, ms };
};
