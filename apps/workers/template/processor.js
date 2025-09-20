// apps/workers/template/processor.js
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const { getObject, putObject } = require('./storage');
const baseLogger = require('./logger');

// optional: next stage (PDF convert). Guarded in case this module doesn't exist.
let addNext = null;
try {
  ({ addNext } = require('./queue')); // will be undefined if not exported
} catch (_) {}

const logBase = (typeof baseLogger?.child === 'function')
  ? baseLogger.child({ service: 'template-processor' })
  : { info: console.log, error: console.error, warn: console.warn, debug: console.debug };

const TEMPLATE_PATH = process.env.TEMPLATE_PATH ||
  path.resolve(process.cwd(), 'data/templates/resume.docx');

// Alternative template paths to try
const TEMPLATE_PATHS = [
  TEMPLATE_PATH,
  '/usr/src/app/data/templates/resume.docx',
  path.resolve(__dirname, '../../../data/templates/resume.docx'),
  path.resolve(process.cwd(), 'data/templates/resume.docx'),
];

module.exports = async function processor(job) {
  const { jobId, jsonKey, role, company, wantPdf } = job.data;

  const logger = (typeof baseLogger?.child === 'function')
    ? baseLogger.child({ service: 'template-processor', jobId })
    : logBase;

  logger.info({ jobId, jsonKey, role, company, wantPdf }, 'Templater job started');

  // 1) Load the DOCX template from disk - try multiple paths
  let templateBuf;
  let foundPath = null;
  
  for (const templatePath of TEMPLATE_PATHS) {
    try {
      if (fs.existsSync(templatePath)) {
        templateBuf = fs.readFileSync(templatePath);
        foundPath = templatePath;
        logger.info({ templatePath }, 'Template file found');
        break;
      }
    } catch (err) {
      logger.debug({ err, templatePath }, 'Template path failed');
    }
  }
  
  if (!templateBuf) {
    logger.error({ TEMPLATE_PATHS }, 'Failed to read template file from any path');
    // List what files actually exist
    try {
      const dataDir = '/usr/src/app/data';
      if (fs.existsSync(dataDir)) {
        const files = fs.readdirSync(dataDir, { recursive: true });
        logger.error({ dataDir, files }, 'Available files in data directory');
      }
      
      // Also check the entire project for .docx files
      const projectFiles = fs.readdirSync('/usr/src/app', { recursive: true }).filter(f => f.endsWith('.docx'));
      logger.error({ projectFiles }, 'All .docx files in project');
      
    } catch (e) {
      logger.error({ err: e }, 'Could not list directories');
    }
    
    // For now, skip template processing if no template is found
    logger.warn('No template file found, skipping template processing');
    return { docxKey: null, skipped: true, reason: 'No template file available' };
  }

  // 2) Load resume JSON from storage
  let data;
  try {
    const buf = await getObject(jsonKey);
    data = JSON.parse(buf.toString('utf8'));
  } catch (err) {
    logger.error({ err, jsonKey }, 'Failed to load/parse JSON');
    throw new Error('Invalid or unreadable JSON input for template');
  }

  // 3) Init Docxtemplater with safer delimiters
  let doc;
  try {
    const zip = new PizZip(templateBuf);
    doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '[[', end: ']]' }, // avoid {{}} splitting in Word
      nullGetter: () => '', // missing keys -> empty
    });
  } catch (err) {
    logger.error({ err }, 'PizZip/Docxtemplater init failed');
    throw new Error('Template engine init failed');
  }

  // 4) Bind data and render
  try {
    doc.setData(data);
    doc.render();
  } catch (err) {
    // Docxtemplater enriches errors with `properties.errors`
    logger.error({ err, details: err?.properties }, 'Docxtemplater render failed');
    throw new Error('Template render failed');
  }

  // 5) Save DOCX to storage
  const outBuf = doc.getZip().generate({ type: 'nodebuffer' });
  const docxKey = `docx/${jobId}.docx`;

  try {
    await putObject(
      docxKey,
      outBuf,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  } catch (err) {
    logger.error({ err, docxKey }, 'Failed to persist DOCX');
    throw new Error('Failed to save generated DOCX');
  }

  // 6) Optionally enqueue PDF conversion
  if (wantPdf && typeof addNext === 'function') {
    try {
      await addNext({ jobId, docxKey });
    } catch (err) {
      logger.error({ err, docxKey }, 'Failed to enqueue convert step');
      // decide whether to fail the job or not; throwing keeps pipeline strict
      throw err;
    }
  }

  logger.info({ jobId, docxKey }, 'Templater job complete');
  return { docxKey };
};
