import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const excelFilePath = path.join(process.cwd(), 'accounts_rows (2)(1).xlsx');

try {
  // Read the Excel file
  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
  
  console.log('Sheet Name:', sheetName);
  console.log('\nColumns:', Object.keys(data[0] || {}));
  console.log('\nTotal Rows:', data.length);
  console.log('\nFirst 5 rows:');
  console.log(JSON.stringify(data.slice(0, 5), null, 2));
  
  // Save to JSON file for inspection
  fs.writeFileSync(
    path.join(process.cwd(), 'excel-data-preview.json'),
    JSON.stringify(data, null, 2)
  );
  console.log('\n✅ Data preview saved to excel-data-preview.json');
} catch (error) {
  console.error('Error reading Excel file:', error);
  process.exit(1);
}
