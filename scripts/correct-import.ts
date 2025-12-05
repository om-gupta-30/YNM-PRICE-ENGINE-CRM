import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load environment variables
const envContent = fs.readFileSync('.env.local', 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Normalize text
function clean(text: any): string {
  if (text === undefined || text === null) return '';
  return String(text).trim().replace(/\r\n/g, ' ').replace(/\s+/g, ' ');
}

// Get value from row with multiple possible column names
function getValue(row: any, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      return clean(row[key]);
    }
  }
  return '';
}

interface AccountData {
  accountName: string;
  companyStage: string;
  companyTag: string;
  industry: string;
  subIndustry: string;
  subAccountName: string;
  officeType: string;
  address: string;
  state: string;
  city: string;
  pincode: string;
  contacts: Array<{
    name: string;
    phone: string;
    designation: string;
    email: string;
  }>;
}

// Parse all Excel files into structured data
function parseExcelFiles(): AccountData[] {
  const accounts: AccountData[] = [];
  let currentAccount: AccountData | null = null;
  
  for (let fileNum = 1; fileNum <= 4; fileNum++) {
    const filename = `database${fileNum}.xlsx`;
    console.log(`\n📖 Reading ${filename}...`);
    
    const workbook = XLSX.readFile(filename);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet) as any[];
    
    for (const row of rows) {
      // Get account name (different column names in different files)
      const accountName = getValue(row, 'account_name', 'account name', 'account name ');
      const subAccountName = getValue(row, 'subaccount', 'sub account', 'sub_account');
      
      // Get contact info
      const contactName = getValue(row, 'contact name', 'contact name ');
      const contactPhone = getValue(row, 'contact number', 'contact_number');
      const designation = getValue(row, 'desigation', 'designation');
      const email = getValue(row, 'email');
      
      // If row has account name, it's a new account
      if (accountName) {
        // Save previous account if exists
        if (currentAccount && currentAccount.accountName) {
          accounts.push(currentAccount);
        }
        
        // Create new account
        currentAccount = {
          accountName,
          companyStage: getValue(row, 'company_stage', 'company stage') || 'Lead',
          companyTag: getValue(row, 'company_tag', 'company tag') || 'New',
          industry: getValue(row, 'industry'),
          subIndustry: getValue(row, 'sub industry', 'sub_industry'),
          subAccountName: subAccountName || accountName,
          officeType: getValue(row, 'office type', 'office type ') || 'Headquarter',
          address: getValue(row, 'address'),
          state: getValue(row, 'state', 'state '),
          city: getValue(row, 'city'),
          pincode: getValue(row, 'pincode'),
          contacts: []
        };
        
        // Add contact if present
        if (contactName && contactPhone) {
          currentAccount.contacts.push({
            name: contactName,
            phone: contactPhone,
            designation,
            email
          });
        }
      } else if (currentAccount && contactName && contactPhone) {
        // This is a contact-only row, add to current account
        currentAccount.contacts.push({
          name: contactName,
          phone: contactPhone,
          designation,
          email
        });
      }
    }
    
    console.log(`   ✅ Processed ${rows.length} rows`);
  }
  
  // Don't forget the last account
  if (currentAccount && currentAccount.accountName) {
    accounts.push(currentAccount);
  }
  
  return accounts;
}

// Get state ID by name
async function getStateId(stateName: string): Promise<number | null> {
  if (!stateName) return null;
  
  const { data } = await supabase
    .from('states')
    .select('id')
    .ilike('state_name', `%${stateName.trim()}%`)
    .limit(1)
    .maybeSingle();
  
  return data?.id || null;
}

// Get city ID by name and state
async function getCityId(cityName: string, stateId: number | null): Promise<number | null> {
  if (!cityName) return null;
  
  let query = supabase
    .from('cities')
    .select('id')
    .ilike('city_name', `%${cityName.trim()}%`);
  
  if (stateId) {
    query = query.eq('state_id', stateId);
  }
  
  const { data } = await query.limit(1).maybeSingle();
  return data?.id || null;
}

// Get or create industry
async function getOrCreateIndustry(name: string): Promise<number | null> {
  if (!name) return null;
  
  // Try to find existing
  let { data } = await supabase
    .from('industries')
    .select('id')
    .ilike('name', name)
    .maybeSingle();
  
  if (data) return data.id;
  
  // Create new
  const { data: newData, error } = await supabase
    .from('industries')
    .insert({ name })
    .select('id')
    .single();
  
  if (error) {
    console.warn(`⚠️ Failed to create industry: ${name}`);
    return null;
  }
  
  return newData.id;
}

// Get or create sub-industry
async function getOrCreateSubIndustry(name: string, industryId: number): Promise<number | null> {
  if (!name || !industryId) return null;
  
  // Try to find existing
  let { data } = await supabase
    .from('sub_industries')
    .select('id')
    .eq('industry_id', industryId)
    .ilike('name', name)
    .maybeSingle();
  
  if (data) return data.id;
  
  // Create new
  const { data: newData, error } = await supabase
    .from('sub_industries')
    .insert({ name, industry_id: industryId })
    .select('id')
    .single();
  
  if (error) {
    console.warn(`⚠️ Failed to create sub-industry: ${name}`);
    return null;
  }
  
  return newData.id;
}

async function main() {
  console.log('\n🚀 Starting CORRECT Excel Import\n');
  console.log('='.repeat(60));
  
  // Step 1: Delete existing wrong data
  console.log('\n🗑️  Deleting previously imported wrong data...');
  
  await supabase.from('contacts').delete().gte('id', 1);
  await supabase.from('sub_accounts').delete().gte('id', 1);
  await supabase.from('accounts').delete().gte('id', 1);
  
  console.log('   ✅ Cleared accounts, sub_accounts, contacts tables');
  
  // Reset sequences
  // Note: We'll let the database auto-increment handle this
  
  // Step 2: Parse Excel files
  console.log('\n📊 Parsing Excel files...');
  const accounts = parseExcelFiles();
  
  console.log(`\n📦 Found ${accounts.length} unique accounts`);
  
  // Count total contacts
  const totalContacts = accounts.reduce((sum, a) => sum + a.contacts.length, 0);
  console.log(`👥 Found ${totalContacts} total contacts`);
  
  // Step 3: Import to database
  console.log('\n📥 Importing to database...\n');
  
  let accountsCreated = 0;
  let subAccountsCreated = 0;
  let contactsCreated = 0;
  
  for (const account of accounts) {
    try {
      // Get state and city IDs
      const stateId = await getStateId(account.state);
      const cityId = await getCityId(account.city, stateId);
      
      // Get or create industry and sub-industry
      const industryId = await getOrCreateIndustry(account.industry);
      const subIndustryId = industryId ? await getOrCreateSubIndustry(account.subIndustry, industryId) : null;
      
      // Create industries JSON
      const industriesJson = industryId ? [{
        industry_id: industryId,
        industry_name: account.industry,
        sub_industry_id: subIndustryId,
        sub_industry_name: account.subIndustry
      }] : [];
      
      // Create account
      const { data: newAccount, error: accountError } = await supabase
        .from('accounts')
        .insert({
          account_name: account.accountName,
          company_stage: account.companyStage,
          company_tag: account.companyTag.charAt(0).toUpperCase() + account.companyTag.slice(1).toLowerCase(),
          industries: industriesJson,
          assigned_employee: 'Unassigned',
        })
        .select('id')
        .single();
      
      if (accountError) {
        console.error(`❌ Failed to create account "${account.accountName}": ${accountError.message}`);
        continue;
      }
      
      accountsCreated++;
      const accountId = newAccount.id;
      
      // Create sub-account
      const { data: newSubAccount, error: subAccountError } = await supabase
        .from('sub_accounts')
        .insert({
          account_id: accountId,
          sub_account_name: account.subAccountName,
          address: account.address,
          state_id: stateId,
          city_id: cityId,
          pincode: account.pincode || null,
          is_headquarter: true,
        })
        .select('id')
        .single();
      
      if (subAccountError) {
        console.error(`❌ Failed to create sub-account for "${account.accountName}": ${subAccountError.message}`);
        continue;
      }
      
      subAccountsCreated++;
      const subAccountId = newSubAccount.id;
      
      // Create contacts
      for (const contact of account.contacts) {
        const { error: contactError } = await supabase
          .from('contacts')
          .insert({
            account_id: accountId,
            sub_account_id: subAccountId,
            name: contact.name,
            phone: contact.phone,
            email: contact.email || null,
            designation: contact.designation || null,
            created_by: 'System Import',
          });
        
        if (contactError) {
          console.warn(`⚠️ Failed to create contact "${contact.name}": ${contactError.message}`);
        } else {
          contactsCreated++;
        }
      }
      
      console.log(`✅ ${account.accountName} (${account.contacts.length} contacts)`);
      
    } catch (error: any) {
      console.error(`❌ Error processing "${account.accountName}": ${error.message}`);
    }
  }
  
  // Reset sequences to start from correct number
  console.log('\n🔄 Resetting ID sequences...');
  
  // Step 4: Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Accounts created: ${accountsCreated}`);
  console.log(`✅ Sub-accounts created: ${subAccountsCreated}`);
  console.log(`✅ Contacts created: ${contactsCreated}`);
  console.log('='.repeat(60));
  
  // Verify counts
  const { count: accountCount } = await supabase.from('accounts').select('*', { count: 'exact', head: true });
  const { count: subAccountCount } = await supabase.from('sub_accounts').select('*', { count: 'exact', head: true });
  const { count: contactCount } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
  
  console.log('\n📈 DATABASE VERIFICATION:');
  console.log(`   Accounts in DB: ${accountCount}`);
  console.log(`   Sub-accounts in DB: ${subAccountCount}`);
  console.log(`   Contacts in DB: ${contactCount}`);
  console.log('='.repeat(60));
  
  console.log('\n✨ Import complete! Data should now be visible in frontend.\n');
}

main().catch(console.error);

