import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Read the Excel file from data/master directory
const excelPath = path.join(__dirname, '../../data/master/Sign Board Master - MS Part.xlsx');
const workbook = XLSX.readFile(excelPath);
const sheetName = 'Master Sign Structures (latest)';
const worksheet = workbook.Sheets[sheetName];

if (!worksheet) {
  console.error(`Sheet "${sheetName}" not found in Excel file`);
  process.exit(1);
}

// Convert to JSON
const rawData = XLSX.utils.sheet_to_json(worksheet);

// Interface for the row data
interface SignMsMasterRow {
  shape: string;
  sizeCode: string;
  postLengthM: number;
  frameLengthM: number;
  remarks: string;
}

// Parse and normalize the data
const parsedRows: SignMsMasterRow[] = [];

for (const row of rawData as any[]) {
  // Skip header rows or empty rows
  if (!row['Shape of Board'] || !row['Size\r\n(in mm)']) {
    continue;
  }

  const shapeRaw = String(row['Shape of Board']).trim();
  const sizeRaw = row['Size\r\n(in mm)'];
  const postLength = row['__EMPTY']; // Post Length (in Mtrs)
  const frameLength = row['__EMPTY_3']; // Frame Length
  const remarks = row['Remarks'] ? String(row['Remarks']).trim() : '';

  // Normalize shape
  let shape = '';
  if (shapeRaw.toLowerCase().includes('circular')) {
    shape = 'Circular';
  } else if (shapeRaw.toLowerCase().includes('triangular') || shapeRaw.toLowerCase().includes('triangle')) {
    shape = 'Triangle';
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
    // Handle "450 x 600" format - normalize to "450x600"
    const sizeStr = String(sizeRaw).trim();
    sizeCode = sizeStr.replace(/\s*x\s*/gi, 'x').toLowerCase();
  }

  // Parse lengths (handle both numbers and strings)
  const postLengthM = postLength ? parseFloat(String(postLength)) : 0;
  const frameLengthM = frameLength ? parseFloat(String(frameLength)) : 0;

  parsedRows.push({
    shape,
    sizeCode,
    postLengthM,
    frameLengthM,
    remarks,
  });
}

// Remove duplicates based on shape + sizeCode
const uniqueRows: SignMsMasterRow[] = [];
const seen = new Set<string>();

for (const row of parsedRows) {
  const key = `${row.shape}|${row.sizeCode}`;
  if (!seen.has(key)) {
    seen.add(key);
    uniqueRows.push(row);
  }
}

// Sort by shape, then by sizeCode for better readability
uniqueRows.sort((a, b) => {
  if (a.shape !== b.shape) {
    return a.shape.localeCompare(b.shape);
  }
  return a.sizeCode.localeCompare(b.sizeCode);
});

// Write JSON file
const jsonOutputPath = path.join(__dirname, '../../data/master/signMsMaster.json');
const jsonContent = JSON.stringify(uniqueRows, null, 2);
fs.writeFileSync(jsonOutputPath, jsonContent, 'utf8');

console.log(`✅ Generated ${uniqueRows.length} unique rows`);
console.log(`✅ Written JSON to ${jsonOutputPath}`);
console.log(`\nSample rows (first 5):`);
console.log(JSON.stringify(uniqueRows.slice(0, 5), null, 2));
console.log(`\n✅ Conversion complete!`);
console.log(`\n📝 Usage: Import the JSON file in your code:`);
console.log(`   import signMsMaster from '@/data/master/signMsMaster.json';`);

