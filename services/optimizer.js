// Use dynamic import for node-fetch ESM compatibility
let nodeFetch;
(async () => {
  nodeFetch = (await import('node-fetch')).default;
  if (typeof globalThis.Headers === 'undefined') {
    globalThis.Headers = (await import('node-fetch')).Headers;
  }
})();

const { OpenAI } = require('openai');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Polyfill Blob for OpenAI SDK in Node.js
if (typeof globalThis.Blob === 'undefined') {
  globalThis.Blob = require('buffer').Blob;
}

// Polyfill FormData for OpenAI SDK in Node.js
try {
  if (typeof globalThis.FormData === 'undefined') {
    globalThis.FormData = require('formdata-node').FormData;
  }
} catch (e) {
  console.error('Please install formdata-node: npm install formdata-node');
  process.exit(1);
}

async function optimizeResume(buffer, mimeType, role, company) {
  // Wait for nodeFetch to be loaded
  if (!nodeFetch) {
    nodeFetch = (await import('node-fetch')).default;
    if (typeof globalThis.Headers === 'undefined') {
      globalThis.Headers = (await import('node-fetch')).Headers;
    }
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, fetch: nodeFetch });

  let rawText;
  if (mimeType.includes('pdf')) {
    const { text } = await pdfParse(buffer);
    rawText = text;
  } else if (
    mimeType.includes('wordprocessingml') ||
    mimeType.includes('docx')
  ) {
    const { value } = await mammoth.extractRawText({ buffer });
    rawText = value;
  } else {
    throw new Error('Unsupported file type');
  }

  rawText = (rawText || '').slice(0, 15000);

  const messages = [
    {
      role: 'system',
      content:
        'You are a world-class resume coach. Return JSON only with fields: name, contact:{email,phone}, summary, experience:[{title,company,dates,bullets[]}], education:[{degree,school,dates}], skills[]. Make bullets <15 words, lead with action verbs, quantify, tailor to role/company.',
    },
    {
      role: 'user',
      content:
        `Role: ${role}\nCompany: ${company}\n---RESUME BELOW---\n${rawText}`,
    },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    temperature: 0.2,
    messages,
  });

  const content = response.choices[0].message.content;
  try {
    return JSON.parse(content);
  } catch (err) {
    throw new Error('Failed to parse JSON from OpenAI response. Raw content: ' + content);
  }
}

module.exports = { optimizeResume };
