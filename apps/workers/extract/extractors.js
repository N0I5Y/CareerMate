// apps/workers/extract/extractors.js
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const mime = require('mime-types');

function detectMimeFromExt(filename) {
  return mime.lookup(filename) || null;
}

async function extractText(buffer, mimeType = '') {
  const mt = String(mimeType).toLowerCase();
  if (mt.includes('pdf')) {
    const { text } = await pdfParse(buffer);
    return text || '';
  }
  if (mt.includes('wordprocessingml') || mt.includes('officedocument') || mt.includes('docx')) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value || '';
  }
  throw new Error(`Unsupported file type: ${mimeType}`);
}

module.exports = { extractText, detectMimeFromExt };
