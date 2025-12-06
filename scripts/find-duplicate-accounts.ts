const XLSX = require('xlsx');

interface ExcelRow {
  account_name?: string;
  sub_accounts?: string;
  'state '?: string;
  city?: string;
}

function normalizeText(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return '';
  return String(text).trim().replace(/\s+/g, ' ').replace(/[\r\n]+/g, ' ').trim();
}

async function findDuplicates() {
  console.log('\n🔍 Finding Duplicate Accounts Between Files\n');
  console.log('='.repeat(60));
  
  // Read both Excel files
  const firstWorkbook = XLSX.readFile('firstdatabase.xlsx');
  const firstSheet = firstWorkbook.Sheets[firstWorkbook.SheetNames[0]];
  const firstRows = XLSX.utils.sheet_to_json(firstSheet, { raw: false }) as ExcelRow[];
  
  const secondWorkbook = XLSX.readFile('seconddatabase.xlsx');
  const secondSheet = secondWorkbook.Sheets[secondWorkbook.SheetNames[0]];
  const secondRows = XLSX.utils.sheet_to_json(secondSheet, { raw: false }) as ExcelRow[];
  
  // Build account maps
  const firstAccounts = new Map<string, { account: string; subAccount: string; state: string; city: string }>();
  const secondAccounts = new Map<string, { account: string; subAccount: string; state: string; city: string }>();
  
  for (const row of firstRows) {
    const accountName = normalizeText(row.account_name);
    if (accountName) {
      const key = accountName.toLowerCase();
      if (!firstAccounts.has(key)) {
        firstAccounts.set(key, {
          account: accountName,
          subAccount: normalizeText(row.sub_accounts) || accountName,
          state: normalizeText(row['state ']),
          city: normalizeText(row.city)
        });
      }
    }
  }
  
  for (const row of secondRows) {
    const accountName = normalizeText(row.account_name);
    if (accountName) {
      const key = accountName.toLowerCase();
      if (!secondAccounts.has(key)) {
        secondAccounts.set(key, {
          account: accountName,
          subAccount: normalizeText(row.sub_accounts) || accountName,
          state: normalizeText(row['state ']),
          city: normalizeText(row.city)
        });
      }
    }
  }
  
  // Find duplicates
  const duplicates: Array<{ account: string; first: any; second: any }> = [];
  
  for (const [key, firstData] of firstAccounts.entries()) {
    if (secondAccounts.has(key)) {
      const secondData = secondAccounts.get(key)!;
      duplicates.push({
        account: firstData.account,
        first: firstData,
        second: secondData
      });
    }
  }
  
  console.log(`\n📊 Found ${duplicates.length} duplicate account names:\n`);
  
  for (const dup of duplicates) {
    console.log(`Account: ${dup.account}`);
    console.log(`  In firstdatabase.xlsx:`);
    console.log(`    Sub-account: ${dup.first.subAccount}`);
    console.log(`    State: ${dup.first.state || '(empty)'}`);
    console.log(`    City: ${dup.first.city || '(empty)'}`);
    console.log(`  In seconddatabase.xlsx:`);
    console.log(`    Sub-account: ${dup.second.subAccount}`);
    console.log(`    State: ${dup.second.state || '(empty)'}`);
    console.log(`    City: ${dup.second.city || '(empty)'}`);
    
    // Check if they should be separate
    if (dup.first.subAccount !== dup.second.subAccount || 
        dup.first.state !== dup.second.state || 
        dup.first.city !== dup.second.city) {
      console.log(`  ⚠️  DIFFERENT DATA - Might need separate accounts!`);
    } else {
      console.log(`  ✅ Same data - correctly merged`);
    }
    console.log('');
  }
  
  console.log('='.repeat(60));
  console.log(`Total unique accounts in firstdatabase.xlsx: ${firstAccounts.size}`);
  console.log(`Total unique accounts in seconddatabase.xlsx: ${secondAccounts.size}`);
  console.log(`Duplicates: ${duplicates.length}`);
  console.log(`Expected unique accounts: ${firstAccounts.size + secondAccounts.size - duplicates.length}`);
  console.log('='.repeat(60));
}

findDuplicates().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

