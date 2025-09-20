// apps/api/lib/docx-utils.js
const PizZip = require('pizzip');

async function replaceInDocxXml(buf, partPath, transform) {
  const zip = new PizZip(buf);
  const xml = zip.file(partPath).asText();
  const newXml = transform(xml);
  zip.file(partPath, newXml);
  return zip.generate({ type: 'nodebuffer' });
}

module.exports = { replaceInDocxXml };
