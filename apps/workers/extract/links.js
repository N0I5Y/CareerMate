// Extract URLs/emails from PDF, DOCX, or plain text

const PizZip = require('pizzip');
const { XMLParser } = require('fast-xml-parser');

// ——— TXT/Generic regex fallback ———
function linksFromText(text = '') {
  const urls = new Set();
  const emails = new Set();

  // URLs (http/https/www)
  const urlRx = /\b((?:https?:\/\/|www\.)[^\s<>{}\[\]|\\^`"']+)/gi;
  let m;
  while ((m = urlRx.exec(text))) {
    urls.add(m[1].replace(/[),.;]+$/, '')); // trim common trailing punct
  }

  // Emails
  const emailRx = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  while ((m = emailRx.exec(text))) emails.add(m[0]);

  return { urls: [...urls], emails: [...emails] };
}

// ——— DOCX ———
// Parse /word/_rels/document.xml.rels for external hyperlinks
function linksFromDocxBuffer(buf) {
  try {
    const zip = new PizZip(buf);
    const relsXml = zip.file('word/_rels/document.xml.rels')?.asText();
    if (!relsXml) return { urls: [], emails: [] };

    const parser = new XMLParser({ ignoreAttributes: false });
    const rels = parser.parse(relsXml)?.Relationships?.Relationship || [];
    const arr = Array.isArray(rels) ? rels : [rels];
    const urls = arr
      .filter(r => String(r['@_Type']).endsWith('/hyperlink'))
      .map(r => r['@_Target'])
      .filter(Boolean);

    return { ...linksFromText(urls.join(' ')) }; // also extracts emails inside mailto:
  } catch {
    return { urls: [], emails: [] };
  }
}

// ——— PDF ———
// Use pdfjs-dist to read annotation links (Subtype=Link with URI)
async function linksFromPdfBuffer(buf) {
  try {
    // Lazy import to keep cold start fast if PDFs aren’t common
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    const loadingTask = pdfjsLib.getDocument({ data: buf, useSystemFonts: true });
    const doc = await loadingTask.promise;
    const urls = new Set();

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const annots = await page.getAnnotations({ intent: 'display' });
      annots.forEach(a => { if (a?.url) urls.add(a.url); });
      page.cleanup();
    }

    await doc.cleanup();
    return { ...linksFromText([...urls].join(' ')) };
  } catch {
    return { urls: [], emails: [] };
  }
}

async function extractLinks({ buf, mimeType, rawText }) {
  if (/\/pdf$/i.test(mimeType)) {
    return await linksFromPdfBuffer(buf);
  }
  if (/officedocument\.wordprocessingml\.document|\/msword$/i.test(mimeType)) {
    return linksFromDocxBuffer(buf);
  }
  // Fallback: sniff from extracted text
  return linksFromText(rawText);
}

module.exports = { extractLinks };
