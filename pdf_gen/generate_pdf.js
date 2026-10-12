const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

async function main() {
  const repoRoot = path.join(__dirname, '..');
  const docxPath = path.join(repoRoot, 'CFIS_Complete_Report.docx');
  if (!fs.existsSync(docxPath)) {
    console.error('Docx not found:', docxPath);
    process.exit(1);
  }

  const extractDir = path.join(__dirname, 'extracted');
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
  fs.mkdirSync(extractDir);

  // If the extraction directory does not exist, try to extract temp.zip (created externally)
  const docXmlPath = path.join(extractDir, 'word', 'document.xml');
  if (!fs.existsSync(docXmlPath)) {
    // Try extracting temp.zip in the same folder
    const tempZip = path.join(__dirname, 'temp.zip');
    if (fs.existsSync(tempZip)) {
      const { execSync } = require('child_process');
      execSync(`powershell -Command "Expand-Archive -Path '${tempZip}' -DestinationPath '${extractDir}' -Force"`, { stdio: 'inherit' });
    } else {
      console.error('document.xml not found and temp.zip missing. Please ensure CFIS_Complete_Report.docx has been copied to temp.zip and extracted.');
      process.exit(1);
    }
  }
  
  // Now docXmlPath should exist

  if (!fs.existsSync(docXmlPath)) {
    console.error('document.xml missing at', docXmlPath);
    process.exit(1);
  }

  let xml = fs.readFileSync(docXmlPath, 'utf8');
  // Extract text nodes
  xml = xml.replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g, '$1');
  xml = xml.replace(/<w:p[^>]*>/g, '');
  xml = xml.replace(/<[^>]+>/g, '');
  xml = xml.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

  const lines = xml.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  // Wrap long lines to ~100 characters
  function wrapLine(s, w=100) {
    const out = [];
    while (s.length > w) {
      let pos = s.lastIndexOf(' ', w);
      if (pos === -1) pos = w;
      out.push(s.slice(0,pos).trim());
      s = s.slice(pos).trim();
    }
    if (s.length) out.push(s);
    return out;
  }

  let wrapped = [];
  for (const l of lines) {
    wrapped = wrapped.concat(wrapLine(l, 110));
  }

  const outPdf = path.join(repoRoot, 'CFIS_Complete_Report.pdf');
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const writeStream = fs.createWriteStream(outPdf);
  doc.pipe(writeStream);

  doc.font('Helvetica').fontSize(12);
  for (let i = 0; i < wrapped.length; i++) {
    doc.text(wrapped[i], { continued: false });
    // Add manual page break if near bottom
    if (doc.y > doc.page.height - 100 && i < wrapped.length - 1) {
      doc.addPage();
      doc.font('Helvetica').fontSize(12);
    }
  }

  doc.end();

  await new Promise((resolve) => writeStream.on('finish', resolve));
  console.log('PDF_CREATED:' + outPdf);
}

main().catch(err => { console.error(err); process.exit(1); });
