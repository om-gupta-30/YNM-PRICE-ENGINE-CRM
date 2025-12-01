const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const workbook = XLSX.readFile('data/Sign Board Master - MS Part.xlsx');
const sheetName = 'Master Sign Structures (latest)';
const worksheet = workbook.Sheets[sheetName];

if (!worksheet) {
  console.error(`Sheet "${sheetName}" not found in Excel file`);
  process.exit(1);
}

// Convert to JSON
const rawData = XLSX.utils.sheet_to_json(worksheet);

// Parse and normalize the data
const parsedRows = [];

for (const row of rawData) {
  // Skip header rows or empty rows
  if (!row['Shape of Board'] || !row['Size\r\n(in mm)']) {
    continue;
  }

  const shapeRaw = String(row['Shape of Board']).trim();
  const sizeRaw = row['Size\r\n(in mm)'];
  const postLength = row['__EMPTY']; // Post Length (in Mtrs)
  const frameLength = row['__EMPTY_3']; // Frame Length
  const remarks = row['Remarks'] ? String(row['Remarks']).trim() : '';

  // Normalize shape (match the Shape type from areaCalculations.ts: 'Circular' | 'Rectangular' | 'Triangle' | 'Octagonal')
  let shape = '';
  if (shapeRaw.toLowerCase().includes('circular')) {
    shape = 'Circular';
  } else if (shapeRaw.toLowerCase().includes('triangular') || shapeRaw.toLowerCase().includes('triangle')) {
    shape = 'Triangle'; // Use 'Triangle' to match reflective part
  } else if (shapeRaw.toLowerCase().includes('octagonal') || shapeRaw.toLowerCase().includes('octogonal')) {
    shape = 'Octagonal';
  } else if (shapeRaw.toLowerCase().includes('rectangular')) {
    shape = 'Rectangular';
  } else {
    continue; // Skip unknown shapes
  }

  // Normalize size code
  let sizeCode = '';
  if (typeof sizeRaw === 'number') {
    sizeCode = String(sizeRaw);
  } else {
    // Handle "450 x 600" format
    const sizeStr = String(sizeRaw).trim();
    sizeCode = sizeStr.replace(/\s*x\s*/gi, 'x').toLowerCase();
  }

  // Parse lengths (handle both numbers and strings)
  const postLengthM = postLength ? parseFloat(postLength) : 0;
  const frameLengthM = frameLength ? parseFloat(frameLength) : 0;

  parsedRows.push({
    shape,
    sizeCode,
    postLengthM,
    frameLengthM,
    remarks,
  });
}

// Remove duplicates based on shape + sizeCode
const uniqueRows = [];
const seen = new Set();

for (const row of parsedRows) {
  const key = `${row.shape}|${row.sizeCode}`;
  if (!seen.has(key)) {
    seen.add(key);
    uniqueRows.push(row);
  }
}

// Generate TypeScript file
const tsContent = `// Auto-generated from Sign Board Master - MS Part.xlsx
// Run: node scripts/convert-ms-master-to-ts.cjs

export type SignMsMasterRow = {
  shape: 'Circular' | 'Triangular' | 'Octagonal' | 'Rectangular';
  sizeCode: string;
  postLengthM: number;
  frameLengthM: number;
  remarks: string;
};

export const signMsMaster: SignMsMasterRow[] = ${JSON.stringify(uniqueRows, null, 2)};

// Helper function to find MS lengths by shape and size code
export function findMsLengths(params: {
  shape: string;
  sizeCode: string;
}): SignMsMasterRow | null {
  const normalizedShape = params.shape.trim();
  const normalizedSizeCode = params.sizeCode.trim().toLowerCase().replace(/\\s*x\\s*/gi, 'x');
  
  return signMsMaster.find(row => {
    const rowShape = row.shape.toLowerCase();
    const rowSizeCode = row.sizeCode.toLowerCase().replace(/\\s*x\\s*/gi, 'x');
    
    return rowShape === normalizedShape.toLowerCase() && rowSizeCode === normalizedSizeCode;
  }) || null;
}
`;

// Write to data directory
const outputPath = path.join(__dirname, '..', 'data', 'signMsMaster.ts');
fs.writeFileSync(outputPath, tsContent, 'utf8');

console.log(`✅ Generated ${uniqueRows.length} unique rows`);
console.log(`✅ Written to ${outputPath}`);
console.log(`\nSample rows:`);
console.log(JSON.stringify(uniqueRows.slice(0, 5), null, 2));

