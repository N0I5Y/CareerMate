const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

async function extractText(buffer) {
  try {
    const isPdf = buffer.toString('utf8', 0, 4) === '%PDF';
    if (isPdf) {
      const data = await pdfParse(buffer);
      return data.text;
    } else {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
  } catch (error) {
    console.error('Error extracting text:', error);
    throw new Error('Failed to extract text from file.');
  }
}

module.exports = { extractText };
