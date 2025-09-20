// server.js
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { optimizeResume } = require('./services/optimizer');
const { generateDocx } = require('./services/templater');
const { convertDocxToPdf } = require('./services/converter');
const temp = require('./utils/temp'); // ensure it exports tmpPath(ext) & safeUnlink(...paths)

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// optional: health check
app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/api/resume/optimize', upload.single('resume'), async (req, res) => {
  try {
    const file = req.file;
    const { role, company, pdf } = req.body;

    if (!file || !role || !company) {
      return res.status(400).json({ error: 'Missing required fields: resume, role, company.' });
    }

    // 1) Optimize resume content -> JSON
    const data = await optimizeResume(file.buffer, file.mimetype, role, company);

    // 2) Generate DOCX from template
    const templatePath = path.resolve(__dirname, 'assets', 'template.docx');
    const tmpDocxPath = temp.tmpPath('docx'); // or temp.makeTmpPath('docx') if that's your helper name
    await generateDocx(data, templatePath, tmpDocxPath);

    // 3) Decide output: DOCX (default) or PDF
    let outPath = tmpDocxPath;
    let contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    let filename = 'optimized-resume.docx';

    if (String(pdf).toLowerCase() === 'true') {
      outPath = await convertDocxToPdf(tmpDocxPath, os.tmpdir());
      contentType = 'application/pdf';
      filename = 'optimized-resume.pdf';
    }

    // 4) Stream file back
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const readStream = fs.createReadStream(outPath);
    readStream.pipe(res);

    const cleanup = async () => {
      try {
        await temp.safeUnlink(tmpDocxPath);
        if (outPath !== tmpDocxPath) await temp.safeUnlink(outPath);
      } catch {}
    };
    res.on('finish', cleanup);
    res.on('close', cleanup);
  } catch (error) {
    console.error('Error in /api/resume/optimize:', error);
    res.status(500).json({ error: error.message || 'Internal server error.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Resume Optimizer API listening at http://localhost:${PORT}`);
});
