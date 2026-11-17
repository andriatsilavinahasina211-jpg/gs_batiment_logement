const pdfMake = require('pdfmake');

const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};
pdfMake.setFonts(fonts);

const docDefinition = {
  content: [
    'First paragraph',
    'Another paragraph'
  ]
};

console.log("Creating PDF...");
const pdfDoc = pdfMake.createPdf(docDefinition);

console.log("Getting buffer...");
pdfDoc.getBuffer().then((buffer) => {
    console.log("Buffer received, length:", buffer.length);
}).catch(err => console.error(err));
