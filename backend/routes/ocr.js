const express = require('express');
const { BillUpload, EmissionData, Company, CompanyMember } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const logAudit = require('../utils/auditLogger');
const upload = require('../middleware/upload');
const Tesseract = require('tesseract.js');
const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const router = express.Router();

router.use(authenticate, authorize('company_rep', 'admin'));

// ─── EMISSION FACTORS ─────────────────────────────────
const EMISSION_FACTORS = {
  electricity: { factor: 0.716, unit: 'kgCO2e/kWh', scope: 'scope_2' },
  natural_gas: { factor: 2.02, unit: 'kgCO2e/m³', scope: 'scope_1' },
  fuel: { factor: 2.31, unit: 'kgCO2e/litre', scope: 'scope_1' },
  water: { factor: 0.344, unit: 'kgCO2e/m³', scope: 'scope_3' },
  waste: { factor: 0.467, unit: 'kgCO2e/kg', scope: 'scope_3' },
  transport: { factor: 0.171, unit: 'kgCO2e/km', scope: 'scope_1' },
  refrigerants: { factor: 1810, unit: 'kgCO2e/kg', scope: 'scope_1' },
  other: { factor: 1.0, unit: 'kgCO2e/unit', scope: 'scope_3' },
};

/**
 * Extract structured data from OCR/PDF text
 */
function extractBillData(text) {
  const result = {
    category: null,
    quantity: null,
    unit: null,
    amount: null,
    date: null,
    provider: null,
    rawText: text,
  };

  // Detect category from keywords
  const categoryPatterns = [
    { pattern: /electric|electricity|power|kwh|watt/i, category: 'electricity', unit: 'kWh' },
    { pattern: /gas|natural gas|cubic meter|m³|mcf/i, category: 'natural_gas', unit: 'm³' },
    { pattern: /fuel|diesel|petrol|gasoline|litre|liter|gallon/i, category: 'fuel', unit: 'litres' },
    { pattern: /water|gallon|cubic/i, category: 'water', unit: 'm³' },
    { pattern: /waste|garbage|disposal|recycl/i, category: 'waste', unit: 'kg' },
  ];

  for (const { pattern, category, unit } of categoryPatterns) {
    if (pattern.test(text)) {
      result.category = category;
      result.unit = unit;
      break;
    }
  }

  // Extract numeric values (quantities)
  const quantityMatch = text.match(/(?:units?\s*(?:consumed|used)?|consumption|usage|quantity)\s*[:\-]?\s*([\d,]+\.?\d*)/i);
  if (quantityMatch) {
    result.quantity = parseFloat(quantityMatch[1].replace(/,/g, ''));
  }

  // Extract total amount
  const amountMatch = text.match(/(?:total|amount|bill\s*amount|due)\s*[:\-]?\s*(?:rs\.?|pkr|₹|\$)?\s*([\d,]+\.?\d*)/i);
  if (amountMatch) {
    result.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  // Extract date
  const dateMatch = text.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/);
  if (dateMatch) {
    result.date = dateMatch[1];
  }

  // If no quantity found but amount exists for electricity, estimate kWh
  if (!result.quantity && result.amount && result.category === 'electricity') {
    result.quantity = Math.round(result.amount / 25); // rough estimate
    result.estimated = true;
  }

  return result;
}

// ─── UPLOAD & OCR BILL (PDF or Image) ─────────────────
router.post('/process', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { companyId, departmentId } = req.body;
    if (!companyId) return res.status(400).json({ message: 'Company ID is required' });

    const company = await Company.findByPk(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const membership = await CompanyMember.findOne({ where: { companyId: parseInt(companyId), userId: req.user.id, status: 'active' } });
    const canManage = req.user.role === 'admin' || company.ownerId === req.user.id || (membership && membership.role === 'company_rep');
    if (!canManage) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    let extractedText = '';

    // Extract text based on file type
    if (ext === '.pdf') {
      const pdfBuffer = fs.readFileSync(req.file.path);
      const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
      const pdfData = await parser.getText();
      extractedText = pdfData.text;
      await parser.destroy();
    } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      const { data: { text } } = await Tesseract.recognize(req.file.path, 'eng');
      extractedText = text;
    } else {
      return res.status(400).json({ message: 'Unsupported file type for OCR. Use PDF, PNG, or JPG.' });
    }

    // Parse extracted text
    const billData = extractBillData(extractedText);

    // Save upload record
    const billUpload = await BillUpload.create({
      companyId: parseInt(companyId),
      departmentId: departmentId ? parseInt(departmentId) : null,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileType: ext === '.pdf' ? 'pdf' : 'pdf', // reusing pdf type for image bills
      filePath: req.file.path,
      fileSize: req.file.size,
      status: 'completed',
      extractedData: JSON.stringify(billData),
      ocrText: extractedText,
      uploadedById: req.user.id,
    });

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'OCR_BILL_PROCESS',
      resource: 'bill_uploads',
      resourceId: billUpload.id,
      details: { fileName: req.file.originalname, detected: billData.category },
      req,
    });

    res.json({
      message: 'Bill processed successfully',
      billUpload,
      extractedData: billData,
      ocrText: extractedText,
    });
  } catch (err) {
    console.error('OCR processing error:', err);
    res.status(500).json({ message: 'Bill processing failed', error: err.message });
  }
});

// ─── CONFIRM OCR DATA → Save as Emission Record ──────
router.post('/confirm', async (req, res) => {
  try {
    const { billUploadId, companyId, departmentId, category, quantity, unit, periodStart, periodEnd, notes } = req.body;

    if (!category || !quantity || !periodStart || !periodEnd) {
      return res.status(400).json({ message: 'Category, quantity, period start and end are required' });
    }

    const company = await Company.findByPk(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const membership = await CompanyMember.findOne({ where: { companyId: parseInt(companyId), userId: req.user.id, status: 'active' } });
    const canManage = req.user.role === 'admin' || company.ownerId === req.user.id || (membership && membership.role === 'company_rep');
    if (!canManage) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const defaultFactor = EMISSION_FACTORS[category];
    if (!defaultFactor) return res.status(400).json({ message: 'Invalid category' });

    const co2Equivalent = quantity * defaultFactor.factor;

    const record = await EmissionData.create({
      companyId: parseInt(companyId),
      departmentId: departmentId ? parseInt(departmentId) : null,
      category,
      scope: defaultFactor.scope,
      quantity: parseFloat(quantity),
      unit,
      emissionFactor: defaultFactor.factor,
      emissionFactorUnit: defaultFactor.unit,
      co2Equivalent,
      periodStart,
      periodEnd,
      source: 'ocr_extraction',
      billUploadId: billUploadId || null,
      notes,
      enteredById: req.user.id,
    });

    if (billUploadId) {
      await BillUpload.update(
        { recordsImported: 1 },
        { where: { id: billUploadId } }
      );
    }

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'CONFIRM_OCR_DATA',
      resource: 'emission_data',
      resourceId: record.id,
      details: { category, quantity, co2Equivalent },
      req,
    });

    res.status(201).json({ message: 'OCR data confirmed and saved', record });
  } catch (err) {
    console.error('Confirm OCR error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
