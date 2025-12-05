import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load environment variables from .env.local
const envPath = '.env.local';
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    envVars[key] = value;
    process.env[key] = value;
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ExcelRow {
  id: number;
  account_name: string;
  company_stage: string;
  company_tag: string;
  industry: string;
  'sub industry': string;
  subaccount: string;
  'office type ': string;
  address: string;
  'state ': string;
  city: string;
  pincode: number;
  'contact name ': string;
  'contact number': number | string;
  desigation: string;
  email: string;
}

interface ProcessedAccount {
  accountName: string;
  companyStage: string;
  companyTag: string;
  industry: string;
  subIndustry: string;
  subAccountName: string;
  address: string;
  state: string;
  city: string;
  pincode: number;
  contacts: Array<{
    name: string;
    phone: string;
    designation: string;
    email: string;
  }>;
}

// Normalize text (trim, remove extra spaces/newlines)
function normalizeText(text: string | number | undefined): string {
  if (text === undefined || text === null) return '';
  return String(text).trim().replace(/\s+/g, ' ').replace(/\r\n/g, ' ');
}

// Read all Excel files
function readAllExcelFiles(): ExcelRow[] {
  const allData: ExcelRow[] = [];
  
  for (let i = 1; i <= 4; i++) {
    const filename = `database${i}.xlsx`;
    console.log(`📖 Reading ${filename}...`);
    
    try {
      const workbook = XLSX.readFile(filename);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet) as ExcelRow[];
      
      console.log(`   ✅ ${data.length} rows found`);
      allData.push(...data);
    } catch (error: any) {
      console.error(`   ❌ Error reading ${filename}:`, error.message);
    }
  }
  
  return allData;
}

// Group data by account and sub-account
function groupDataByAccount(rows: ExcelRow[]): Map<string, ProcessedAccount> {
  const accountMap = new Map<string, ProcessedAccount>();
  
  for (const row of rows) {
    const accountName = normalizeText(row.account_name);
    const subAccountName = normalizeText(row.subaccount);
    const key = `${accountName}|||${subAccountName}`;
    
    if (!accountMap.has(key)) {
      accountMap.set(key, {
        accountName,
        companyStage: normalizeText(row.company_stage),
        companyTag: normalizeText(row.company_tag),
        industry: normalizeText(row.industry),
        subIndustry: normalizeText(row['sub industry']),
        subAccountName,
        address: normalizeText(row.address),
        state: normalizeText(row['state ']),
        city: normalizeText(row.city),
        pincode: row.pincode || 0,
        contacts: [],
      });
    }
    
    // Add contact
    const account = accountMap.get(key)!;
    const contactName = normalizeText(row['contact name ']);
    const contactPhone = normalizeText(String(row['contact number']));
    const contactEmail = normalizeText(row.email);
    const designation = normalizeText(row.desigation);
    
    if (contactName && contactPhone) {
      account.contacts.push({
        name: contactName,
        phone: contactPhone,
        designation,
        email: contactEmail,
      });
    }
  }
  
  return accountMap;
}

// Get or create industry
async function getOrCreateIndustry(industryName: string, subIndustryName: string): Promise<{ industryId: number; subIndustryId: number }> {
  if (!industryName) {
    throw new Error('Industry name is required');
  }
  
  // Get or create industry
  let { data: industry, error: industryError } = await supabase
    .from('industries')
    .select('id')
    .ilike('name', industryName)
    .single();
  
  if (industryError || !industry) {
    const { data: newIndustry, error: createError } = await supabase
      .from('industries')
      .insert({ name: industryName })
      .select('id')
      .single();
    
    if (createError) throw new Error(`Failed to create industry: ${createError.message}`);
    industry = newIndustry;
  }
  
  // Get or create sub-industry
  let { data: subIndustry, error: subIndustryError } = await supabase
    .from('sub_industries')
    .select('id')
    .eq('industry_id', industry.id)
    .ilike('name', subIndustryName)
    .single();
  
  if (subIndustryError || !subIndustry) {
    const { data: newSubIndustry, error: createError} = await supabase
      .from('sub_industries')
      .insert({
        industry_id: industry.id,
        name: subIndustryName || 'General',
      })
      .select('id')
      .single();
    
    if (createError) throw new Error(`Failed to create sub-industry: ${createError.message}`);
    subIndustry = newSubIndustry;
  }
  
  return { industryId: industry.id, subIndustryId: subIndustry.id };
}

// Get state and city IDs
async function getStateAndCityIds(stateName: string, cityName: string): Promise<{ stateId: number | null; cityId: number | null }> {
  let stateId: number | null = null;
  let cityId: number | null = null;
  
  if (stateName) {
    const { data: state } = await supabase
      .from('states')
      .select('id')
      .ilike('state_name', stateName.trim())
      .maybeSingle();
    
    if (state) {
      stateId = state.id;
      
      if (cityName) {
        const { data: city } = await supabase
          .from('cities')
          .select('id')
          .eq('state_id', stateId)
          .ilike('city_name', cityName.trim())
          .maybeSingle();
        
        if (city) {
          cityId = city.id;
        }
      }
    }
  }
  
  return { stateId, cityId };
}

// Import data to database
async function importData() {
  console.log('\n🚀 Starting Excel data import...\n');
  
  // Step 1: Read all Excel files
  const allRows = readAllExcelFiles();
  console.log(`\n📊 Total rows read: ${allRows.length}\n`);
  
  // Step 2: Group by account and sub-account
  const accountMap = groupDataByAccount(allRows);
  console.log(`📦 Unique accounts/sub-accounts: ${accountMap.size}\n`);
  
  // Step 3: Import to database
  let accountsCreated = 0;
  let subAccountsCreated = 0;
  let contactsCreated = 0;
  let errors = 0;
  
  for (const [key, accountData] of accountMap.entries()) {
    try {
      console.log(`\n📝 Processing: ${accountData.accountName}`);
      
      // Get industry and sub-industry IDs
      const { industryId, subIndustryId } = await getOrCreateIndustry(
        accountData.industry,
        accountData.subIndustry
      );
      
      // Get state and city IDs
      const { stateId, cityId } = await getStateAndCityIds(
        accountData.state,
        accountData.city
      );
      
      // Create or get account
      let { data: existingAccount } = await supabase
        .from('accounts')
        .select('id')
        .ilike('account_name', accountData.accountName)
        .single();
      
      let accountId: number;
      
      if (existingAccount) {
        accountId = existingAccount.id;
        console.log(`   ℹ️  Account exists (ID: ${accountId})`);
      } else {
        const { data: newAccount, error: accountError } = await supabase
          .from('accounts')
          .insert({
            account_name: accountData.accountName,
            company_stage: accountData.companyStage || 'Lead',
            company_tag: accountData.companyTag || 'New',
            industries: [{
              industry_id: industryId,
              industry_name: accountData.industry,
              sub_industry_id: subIndustryId,
              sub_industry_name: accountData.subIndustry
            }],
            assigned_employee: 'Unassigned', // Will be visible to admin as unassigned
          })
          .select('id')
          .single();
        
        if (accountError) {
          throw new Error(`Failed to create account: ${accountError.message}`);
        }
        
        accountId = newAccount.id;
        accountsCreated++;
        console.log(`   ✅ Account created (ID: ${accountId})`);
      }
      
      // Create sub-account
      const { data: newSubAccount, error: subAccountError } = await supabase
        .from('sub_accounts')
        .insert({
          account_id: accountId,
          sub_account_name: accountData.subAccountName,
          address: accountData.address,
          state_id: stateId,
          city_id: cityId,
          pincode: accountData.pincode || null,
          is_headquarter: true, // All are headquarters as per requirement
        })
        .select('id')
        .single();
      
      if (subAccountError) {
        throw new Error(`Failed to create sub-account: ${subAccountError.message}`);
      }
      
      const subAccountId = newSubAccount.id;
      subAccountsCreated++;
      console.log(`   ✅ Sub-account created (ID: ${subAccountId})`);
      
      // Create contacts
      for (const contact of accountData.contacts) {
        const { error: contactError } = await supabase
          .from('contacts')
          .insert({
            account_id: accountId,
            sub_account_id: subAccountId,
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            designation: contact.designation,
          });
        
        if (contactError) {
          console.warn(`   ⚠️  Failed to create contact ${contact.name}: ${contactError.message}`);
        } else {
          contactsCreated++;
          console.log(`   ✅ Contact created: ${contact.name}`);
        }
      }
      
    } catch (error: any) {
      console.error(`   ❌ Error processing ${accountData.accountName}:`, error.message);
      errors++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Accounts created: ${accountsCreated}`);
  console.log(`✅ Sub-accounts created: ${subAccountsCreated}`);
  console.log(`✅ Contacts created: ${contactsCreated}`);
  if (errors > 0) {
    console.log(`❌ Errors: ${errors}`);
  }
  console.log('='.repeat(60));
  console.log('\n✨ Import complete! Data should now be visible in the frontend.\n');
}

// Run import
importData().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

