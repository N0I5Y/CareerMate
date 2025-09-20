// apps/api/routes/resumes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { putObject, getObject, exists, localPathFor, detectMimeFromExt } = require('../lib/storage');
const { enqueueExtractJob } = require('../lib/queues');
const { computeStatus } = require('../lib/status');

const router = express.Router();

// Allow main resume file AND optional JD file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

function error(code, message, status = 400) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

// Parse links from CSV / JSON / repeated fields
function parseLinks(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  const s = String(val).trim();
  if (!s) return [];
  try {
    const arr = JSON.parse(s);
    if (Array.isArray(arr)) return arr.filter(Boolean);
  } catch {}
  // fallback CSV/whitespace split
  return s.split(/[,\s]+/).filter(Boolean);
}

// POST /api/resumes
router.post(
  '/',
  upload.fields([
    { name: 'file', maxCount: 1 },   // required resume file
    { name: 'jdFile', maxCount: 1 }, // optional JD file
  ]),
  async (req, res, next) => {
    try {
      const resumeFile = req.files?.file?.[0];
      const jdFile = req.files?.jdFile?.[0];

      const {
        role,
        company,
        prompt,
        jdText,           // optional raw JD text
        jdUrl,            // optional JD url
        templateKey,      // optional template to render into
        wantPdf,          // default true
        links,            // CSV/JSON/array
      } = req.body;

      if (!resumeFile) throw error('BadRequest', 'Missing file', 400);

      // --- store raw resume ---
      const ext = path.extname(resumeFile.originalname).toLowerCase().replace('.', '');
      if (!['pdf', 'doc', 'docx', 'txt'].includes(ext)) throw error('BadRequest', 'Unsupported file type', 400);

      const jobId = path.basename(resumeFile.originalname, path.extname(resumeFile.originalname)) + '-' + Date.now();
      const rawKey = `raw/${jobId}.${ext}`;
      const mimeType = detectMimeFromExt(resumeFile.originalname);

      await putObject(rawKey, resumeFile.buffer, mimeType);

      // --- optional JD file (store raw; extraction happens downstream) ---
      let jdInputKey = undefined;
      if (jdFile) {
        const jdExt = path.extname(jdFile.originalname).toLowerCase().replace('.', '');
        if (!['pdf', 'doc', 'docx', 'txt'].includes(jdExt)) throw error('BadRequest', 'Unsupported jdFile type', 400);
        jdInputKey = `raw-jd/${jobId}.${jdExt}`;
        const jdMime = detectMimeFromExt(jdFile.originalname);
        await putObject(jdInputKey, jdFile.buffer, jdMime);
      }

      // normalize links
      const linkArr = parseLinks(links);

      // enqueue extract -> (optimize receives jdText/jdUrl/jdInputKey/prompt/templateKey/links)
      await enqueueExtractJob({
        jobId,
        inputKey: rawKey,
        mimeType,
        role,
        company,
        prompt,
        wantPdf: String(wantPdf ?? 'true').toLowerCase() === 'true',
        templateKey: templateKey || undefined,
        links: linkArr,
        // JD inputs (any one or combination)
        jdText: jdText && String(jdText).trim() ? String(jdText) : undefined,
        jdUrl: jdUrl && String(jdUrl).trim() ? String(jdUrl) : undefined,
        jdInputKey, // raw JD file stored above (extract worker should turn into jdKey text)
      });

      res.status(201).json({
        jobId,
        statusUrl: `/api/resumes/${jobId}`,
        download: {
          pdf: `/api/resumes/${jobId}/pdf`,
          docx: `/api/resumes/${jobId}/docx`,
          json: `/api/resumes/${jobId}/json`,     // add ?prompt=vX to fetch a specific version
          text: `/api/resumes/${jobId}/text`,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/resumes/:jobId
router.get('/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const status = await computeStatus(jobId, { exists }, baseUrl);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

// Download endpoints (support versioned JSON via ?prompt=vX)
const artifactMap = {
  raw: async (jobId) => {
    const exts = ['pdf', 'doc', 'docx', 'txt'];
    for (const ext of exts) {
      const key = `raw/${jobId}.${ext}`;
      if (await exists(key)) return { key, mime: detectMimeFromExt(key) };
    }
    return null;
  },
  text: async (jobId) => {
    const key = `text/${jobId}.txt`;
    if (await exists(key)) return { key, mime: 'text/plain' };
    return null;
  },
  json: async (jobId, req) => {
    // try exact prompt version if provided
    const prompt = req.query?.prompt && String(req.query.prompt);
    if (prompt) {
      const keyed = `json/${jobId}.${prompt}.json`;
      if (await exists(keyed)) return { key: keyed, mime: 'application/json' };
    }
    // fallback to non-versioned (legacy)
    const legacy = `json/${jobId}.json`;
    if (await exists(legacy)) return { key: legacy, mime: 'application/json' };

    // optional: try common prompt names without requiring listObjects
    const guesses = ['v1', 'v2', 'v3', 'v4', 'vjd1', 'vjd2']
      .map(v => `json/${jobId}.${v}.json`);
    for (const key of guesses) {
      if (await exists(key)) return { key, mime: 'application/json' };
    }
    return null;
  },
  docx: async (jobId) => {
    const key = `docx/${jobId}.docx`;
    if (await exists(key)) return { key, mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    return null;
  },
  pdf: async (jobId) => {
    const key = `pdf/${jobId}.pdf`;
    if (await exists(key)) return { key, mime: 'application/pdf' };
    return null;
  },
};

for (const kind of Object.keys(artifactMap)) {
  router.get('/:jobId/' + kind, async (req, res, next) => {
    try {
      const { jobId } = req.params;
      const found = await artifactMap[kind](jobId, req);
      if (!found) throw error('NotFound', `Artifact not found`, 404);
      
      // Handle both Redis storage and local file storage
      const abs = localPathFor(found.key);
      
      res.setHeader('Content-Type', found.mime);
      
      if (abs && abs !== null) {
        // Local file storage - use sendFile
        res.setHeader('Content-Disposition', `attachment; filename="${jobId}-${kind}${path.extname(abs)}"`);
        res.sendFile(abs);
      } else {
        // Redis storage - get file buffer and send directly
        const fileExtension = path.extname(found.key) || `.${kind}`;
        res.setHeader('Content-Disposition', `attachment; filename="${jobId}-${kind}${fileExtension}"`);
        
        const fileBuffer = await getObject(found.key);
        res.send(fileBuffer);
      }
    } catch (err) {
      next(err);
    }
  });
}

module.exports = router;
