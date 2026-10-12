const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');

/**
 * Process CSV file and return rows as array of objects
 */
const processCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Normalize keys to lowercase with underscores
        const normalized = {};
        for (const [key, value] of Object.entries(row)) {
          const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
          normalized[normalizedKey] = value?.trim();
        }
        rows.push(normalized);
      })
      .on('end', () => resolve(rows))
      .on('error', (err) => reject(err));
  });
};

/**
 * Process Excel file and return rows as array of objects
 */
const processExcel = (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    // Normalize keys
    const rows = rawRows.map((row) => {
      const normalized = {};
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
        normalized[normalizedKey] = typeof value === 'string' ? value.trim() : value;
      }
      return normalized;
    });

    return rows;
  } catch (err) {
    throw new Error(`Excel processing failed: ${err.message}`);
  }
};

module.exports = { processCSV, processExcel };
