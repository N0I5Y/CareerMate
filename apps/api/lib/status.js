const path = require('path');

async function computeStatus(jobId, storage, baseUrl) {
  // Check for artifacts in priority order
  const pdfKey = `pdf/${jobId}.pdf`;
  const docxKey = `docx/${jobId}.docx`;
  const jsonKey = `json/${jobId}.json`;
  const textKey = `text/${jobId}.txt`;

  const hasPdf = await storage.exists(pdfKey);
  const hasDocx = await storage.exists(docxKey);
  const hasJson = await storage.exists(jsonKey);
  const hasText = await storage.exists(textKey);

  // Raw file detection: try all allowed extensions
  let rawUrl = null;
  for (const ext of ['pdf', 'doc', 'docx', 'txt']) {
    const rawKey = `raw/${jobId}.${ext}`;
    if (await storage.exists(rawKey)) {
      rawUrl = `${baseUrl}/api/resumes/${jobId}/raw`;
      break;
    }
  }

  let stage = 'queued';
  if (hasPdf) stage = 'done';
  else if (hasDocx) stage = 'templated';
  else if (hasJson) stage = 'optimized';
  else if (hasText) stage = 'extracted';

  const artifacts = {};
  if (rawUrl) artifacts.raw = rawUrl;
  if (hasText) artifacts.text = `${baseUrl}/api/resumes/${jobId}/text`;
  if (hasJson) artifacts.json = `${baseUrl}/api/resumes/${jobId}/json`;
  if (hasDocx) artifacts.docx = `${baseUrl}/api/resumes/${jobId}/docx`;
  if (hasPdf) artifacts.pdf = `${baseUrl}/api/resumes/${jobId}/pdf`;

  return { jobId, stage, artifacts };
}

module.exports = { computeStatus };