const express = require('express');
const multer = require('multer');
const path = require('path');

const { putObject, exists, localPathFor } = require('../lib/storage');
const { enqueueConvertJob } = require('../lib/queues'); // <-- uses convert worker

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// POST /api/templates  (upload a .docx; optionally build preview PDF)
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) return next(Object.assign(new Error('Missing file'), { status: 400 }));

    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.docx') {
      return next(Object.assign(new Error('Only .docx templates are supported'), { status: 400 }));
    }

    const base = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const templateId = `${base}-${Date.now()}`;
    const templateKey = `templates/${templateId}.docx`;

    await putObject(
      templateKey,
      file.buffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    // Auto-generate preview unless explicitly disabled
    const doPreview = String(req.body.preview ?? 'true').toLowerCase() === 'true';
    let previewUrl = null;
    if (doPreview) {
      await enqueueConvertJob({
        jobId: `${templateId}.preview`,
        docxKey: templateKey,
        outKey: `previews/${templateId}.pdf`, // where the worker should write
      });
      previewUrl = `/api/templates/${templateId}/preview.pdf`;
    }

    res.json({ ok: true, templateId, templateKey, previewUrl });
  } catch (err) {
    next(err);
  }
});

// GET /api/templates/:templateId/preview.pdf
router.get('/:templateId/preview.pdf', async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const key = `previews/${templateId}.pdf`;
    if (!(await exists(key))) {
      return next(Object.assign(new Error('Preview not ready'), { status: 404 }));
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(localPathFor(key));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
