const fs = require('fs/promises');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

async function generateDocx(data, templatePath, outPath) {
  // 1) Read templatePath in 'binary'
  const fileBuf = await fs.readFile(templatePath);
  const binary = fileBuf.toString('binary');

  // 2) Create zip
  const zip = new PizZip(binary);

  // 3) Create docxtemplater instance
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  // 4) Set data for template
  doc.setData({
    name: data.name || '',
    email: data.contact?.email || '',
    phone: data.contact?.phone || '',
    contact: [data.contact?.email, data.contact?.phone].filter(Boolean).join(' | '),
    summary: data.summary || '',
    experience: Array.isArray(data.experience) ? data.experience : [],
    education: Array.isArray(data.education) ? data.education : [],
    skills: Array.isArray(data.skills) ? data.skills.join(', ') : ''
  });

  // 5) Render document
  try {
    doc.render();
  } catch (err) {
    throw err;
  }

  // 6) Write output buffer
  const buf = doc.getZip().generate({ type: 'nodebuffer' });
  await fs.writeFile(outPath, buf);
}

module.exports = { generateDocx };
