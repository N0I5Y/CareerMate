// apps/workers/convert/processor.js

const { resolveKey, putObject } = require('./storage');
const { childLogger } = require('./logger');
const path = require('path');
const fs = require('fs/promises');
const { exec } = require('child_process');

const SOFFICE_BIN = process.env.SOFFICE_BIN || '/usr/bin/soffice';
const DATA_DIR = process.env.LOCAL_DATA_DIR || './data';

async function run(cmd) {
  return await new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject({ err, stdout, stderr });
      resolve({ stdout, stderr });
    });
  });
}

module.exports = async function processor(job) {
  const { jobId, docxKey, outKey } = job.data || {};
  const logger = childLogger({ jobId });

  if (!docxKey) throw new Error('Missing docxKey');

  logger.info({ docxKey, outKey }, 'Converter job started');

  // Resolve DOCX absolute path (must exist on local FS)
  const absDocxPath = resolveKey(docxKey);
  const tmpOutDir = path.resolve(DATA_DIR, 'tmp', String(jobId || 'convert'));

  await fs.mkdir(tmpOutDir, { recursive: true });

  // Run LibreOffice conversion
  const cmd = `${SOFFICE_BIN} --headless --norestore --convert-to pdf --outdir "${tmpOutDir}" "${absDocxPath}"`;
  logger.info({ cmd }, 'Running LibreOffice for PDF conversion');

  try {
    const { stdout, stderr } = await run(cmd);
    if (stderr && /Error|warn/i.test(stderr)) {
      logger.warn({ stderr }, 'LibreOffice reported warnings');
    }
    if (stdout) logger.debug({ stdout }, 'LibreOffice stdout');
  } catch (e) {
    logger.error({ error: e.err?.message || e.err, stderr: e.stderr }, 'LibreOffice conversion failed');
    throw new Error('LibreOffice conversion failed');
  }

  // Determine produced PDF name robustly
  // Prefer "<input-name>.pdf"; if not found, scan the tmp directory for any .pdf
  const parsed = path.parse(absDocxPath); // case-safe for .docx/.DOCX
  const expectedPdf = path.join(tmpOutDir, `${parsed.name}.pdf`);

  let absPdfPath = expectedPdf;
  try {
    await fs.access(absPdfPath);
  } catch {
    // Fallback: scan the directory for a PDF
    const files = await fs.readdir(tmpOutDir);
    const found = files.find(f => f.toLowerCase().endsWith('.pdf'));
    if (!found) {
      logger.error({ tmpOutDir }, 'PDF file not found after conversion');
      throw new Error('PDF file not found after conversion');
    }
    absPdfPath = path.join(tmpOutDir, found);
  }

  // Read and store PDF
  const pdfBuffer = await fs.readFile(absPdfPath);
  const pdfKey = outKey || `pdf/${jobId}.pdf`; // support previews via outKey
  await putObject(pdfKey, pdfBuffer, 'application/pdf');

  // Cleanup (best-effort)
  try {
    await fs.rm(tmpOutDir, { recursive: true, force: true });
  } catch (err) {
    logger.warn({ tmpOutDir, err }, 'Failed to clean tmp dir');
  }

  logger.info({ pdfKey }, 'Converter job complete');
  return { pdfKey };
};
