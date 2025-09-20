const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

// helpers
const H1 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_1 });
const H2 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_2 });
const P  = (text) => new Paragraph({ children: [ new TextRun(text) ] });

(async () => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        H1('[[name]]'),
        P('[[contact.email]] • [[contact.phone]]'),
        P(''),

        H2('Summary'),
        P('[[summary]]'),
        P(''),

        H2('Experience'),
        P('[[#experience]]'),
        P('[[title]] — [[company]] ([[dates]])'),
        P('[[#bullets]]• [[.]] [[/bullets]]'),
        P(''),
        P('[[/experience]]'),

        H2('Education'),
        P('[[#education]]'),
        P('[[degree]], [[school]] ([[dates]])'),
        P('[[/education]]'),
        P(''),

        H2('Skills'),
        P('[[#skills]]• [[.]] [[/skills]]'),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const out = path.resolve('data/templates/resume.docx');
  fs.writeFileSync(out, buffer);
  const { size } = fs.statSync(out);
  console.log('Wrote', out, size, 'bytes');
})();
