/**
 * Check Missing Accounts Script
 */

import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read .env.local file
const envPath = path.resolve(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseServiceKey = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars: Record<string, string> = {};
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
  supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || '';
  supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || '';
} catch (err) {
  console.error('Could not read .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper to get value from row with flexible matching
function getValue(row: Record<string, any>, possibleNames: string[]): string | null {
  // First try exact match
  for (const name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return row[name].toString().trim();
    }
  }
  
  // Then try case-insensitive match with trimmed keys
  const rowKeys = Object.keys(row);
  for (const name of possibleNames) {
    const normalizedName = name.toLowerCase().trim();
    for (const key of rowKeys) {
      if (key.toLowerCase().trim() === normalizedName) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          return row[key].toString().trim();
        }
      }
    }
  }
  
  return null;
}

async function checkMissingAccounts() {
  // Get accounts from database
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('account_name')
    .order('account_name');

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  const dbNames = new Set(accounts.map((a: any) => a.account_name));
  console.log('Database accounts:', dbNames.size);

  // Get accounts from Excel
  const files = ['database1.xlsx', 'database2.xlsx', 'database3.xlsx', 'database4.xlsx'];
  let excelAccounts = new Map<string, string>();

  for (const file of files) {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      console.log('File not found:', file);
      continue;
    }
    
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);
    
    for (const row of rows) {
      const accountName = getValue(row, ['account_name', 'account name', 'Account Name', 'Account_Name']);
      
      if (accountName) {
        excelAccounts.set(accountName, file);
      }
    }
  }

  console.log('Excel accounts:', excelAccounts.size);

  // Find missing
  const missing: string[] = [];
  for (const [name, file] of excelAccounts) {
    if (!dbNames.has(name)) {
      missing.push(name + ' [from ' + file + ']');
    }
  }

  console.log('\nMissing from database:', missing.length);
  missing.forEach(m => console.log('  - ' + m));
  
  // Find extra in database (not in Excel)
  const extra: string[] = [];
  for (const name of dbNames) {
    if (!excelAccounts.has(name)) {
      extra.push(name);
    }
  }
  
  if (extra.length > 0) {
    console.log('\nExtra in database (not in Excel):', extra.length);
    extra.forEach(e => console.log('  - ' + e));
  }
}

checkMissingAccounts();
