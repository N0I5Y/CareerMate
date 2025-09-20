const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { extractFullText, replaceInDocxXml } = require('./docx-utils'); // helper below

// common token map (extend as needed)
const TOKEN_MAP = [
  // Scalars
  { re: /\[\s*NAME\s*\]/gi, repl: '[[name]]' },
  { re: /\[\s*SUMMARY\s*\]/gi, repl: '[[summary]]' },
  { re: /\[\s*EMAIL\s*\]/gi, repl: '[[contact.email]]' },
  { re: /\[\s*PHONE\s*\]/gi, repl: '[[contact.phone]]' },
  // Sections (users can add the block and we’ll wrap; see notes below)
  { re: /\[\s*EXPERIENCE\.START\s*\]/gi, repl: '[[#experience]]' },
  { re: /\[\s*EXPERIENCE\.END\s*\]/gi, repl: '[[/experience]]' },
  { re: /\[\s*EDUCATION\.START\s*\]/gi, repl: '[[#education]]' },
  { re: /\[\s*EDUCATION\.END\s*\]/gi, repl: '[[/education]]' },
  { re: /\[\s*SKILLS\.START\s*\]/gi, repl: '[[#skills]]' },
  { re: /\[\s*SKILLS\.END\s*\]/gi, repl: '[[/skills]]' },
  // Bullet placeholder inside loops
  { re: /\[\s*BULLET\s*\]/gi, repl: '[[.]]' },
];

async function importAndLintTemplate(inputBuf) {
  // 1) Replace tokens inside document.xml only (not styles, headers, etc. unless you want that too)
  let outBuf = await replaceInDocxXml(inputBuf, 'word/document.xml', (xml) => {
    let s = xml;
    TOKEN_MAP.forEach(({ re, repl }) => { s = s.replace(re, repl); });
    // Prevent accidental quadruple delimiters
    s = s.replace(/\[\[\s*\[\[/g, '[[').replace(/\]\]\s*\]\]/g, ']]');
    return s;
  });

  // 2) Quick compile smoke test with dummy data
  const zip = new PizZip(outBuf);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '[[', end: ']]' },
  });

  const dummy = {
    name: 'Jane Candidate',
    contact: { email: 'jane@example.com', phone: '555-555-5555' },
    summary: 'Senior Salesforce Admin with 5+ years across Sales/Service Cloud.',
    experience: [
      { title: 'Salesforce Admin', company: 'Acme', dates: '2021–2024',
        bullets: ['Owned Flows & PS Groups', 'Cut case backlog 38%'] },
    ],
    education: [{ degree: 'BBA', school: 'State University', dates: '2013–2017' }],
    skills: ['Sales Cloud', 'Service Cloud', 'Flows', 'CPQ'],
  };

  try {
    doc.setData(dummy);
    doc.render(); // throws if tags invalid
  } catch (e) {
    // Surface docxtemplater’s rich error info
    const explanation = e?.properties?.explanation || e.message;
    const xtag = e?.properties?.xtag;
    throw new Error(`Template failed compile: ${explanation}${xtag ? ` (tag="${xtag}")` : ''}`);
  }

  return outBuf;
}

module.exports = { importAndLintTemplate };
