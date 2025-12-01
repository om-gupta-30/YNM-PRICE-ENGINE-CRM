const fs = require('fs');
const path = require('path');

// Read both PNG files
const page1Path = path.join(__dirname, 'public', 'YNMEST -1.png');
const page2Path = path.join(__dirname, 'public', 'YNMEST -2.png');

// Convert to base64
const page1Base64 = fs.readFileSync(page1Path, 'base64');
const page2Base64 = fs.readFileSync(page2Path, 'base64');

// Create data URLs
const page1DataUrl = `data:image/png;base64,${page1Base64}`;
const page2DataUrl = `data:image/png;base64,${page2Base64}`;

// Create output object
const templates = {
  page1: page1DataUrl,
  page2: page2DataUrl,
};

// Write to JSON file
fs.writeFileSync(
  path.join(__dirname, 'templates.json'),
  JSON.stringify(templates, null, 2)
);

console.log('✅ Templates converted to base64!');
console.log(`📄 Page 1 size: ${(page1Base64.length / 1024).toFixed(2)} KB`);
console.log(`📄 Page 2 size: ${(page2Base64.length / 1024).toFixed(2)} KB`);
console.log('📁 Output written to templates.json');

