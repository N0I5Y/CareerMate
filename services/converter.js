const { exec } = require('child_process');
const path = require('path');

async function convertDocxToPdf(inputPath, outDir) {
  return new Promise((resolve, reject) => {
    const command = `libreoffice --headless --convert-to pdf --outdir ${outDir} ${inputPath}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error converting DOCX to PDF:', stderr);
        return reject(new Error('Failed to convert DOCX to PDF.'));
      }
      const outputPath = path.join(outDir, path.basename(inputPath, '.docx') + '.pdf');
      resolve(outputPath);
    });
  });
}

module.exports = { convertDocxToPdf };
