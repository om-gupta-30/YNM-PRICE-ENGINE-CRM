const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables from .env.local
const envPath = '.env.local';
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach((line: string) => {
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
  account_name?: string;
  company_stage?: string;
  company_tag?: string;
  industres?: string;
  sub_industries?: string;
  sub_accounts?: string;
  'office_type '?: string;
  address?: string;
  'state '?: string;
  city?: string;
  pincode?: string | number;
  'contact name '?: string;
  'phone '?: string | number;
  designation?: string;
  email?: string;
}

interface ProcessedData {
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
    designation: string | null;
    email: string | null;
  }>;
}

// Normalize text (trim, remove extra spaces/newlines)
function normalizeText(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return '';
  return String(text).trim().replace(/\s+/g, ' ').replace(/[\r\n]+/g, ' ').trim();
}

// Normalize phone number - handle multiple numbers separated by various delimiters
function normalizePhone(phone: string | number | undefined | null): string {
  if (phone === undefined || phone === null) return '';
  let phoneStr = String(phone).trim();
  
  // Replace common delimiters with /
  phoneStr = phoneStr.replace(/[\r\n,;]+/g, '/');
  // Remove extra spaces around slashes
  phoneStr = phoneStr.replace(/\s*\/\s*/g, '/');
  // Remove any non-numeric characters except + and /
  phoneStr = phoneStr.split('/').map(p => p.replace(/[^\d+]/g, '')).join('/');
  // Remove duplicate slashes
  phoneStr = phoneStr.replace(/\/+/g, '/');
  // Remove leading/trailing slashes
  phoneStr = phoneStr.replace(/^\/|\/$/g, '');
  
  return phoneStr;
}

// Split contact names that contain multiple names
function splitContactNames(contactName: string): string[] {
  const names: string[] = [];
  const trimmed = contactName.trim();
  
  // Split by common delimiters
  const parts = trimmed.split(/[,;\/]/).map(p => p.trim()).filter(p => p);
  
  for (const part of parts) {
    // Check if part contains "Mr." or "Mrs." or "Ms." - likely a name
    if (/^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)/i.test(part)) {
      names.push(part);
    } else if (part.length > 0) {
      // If no title, might still be a name
      names.push(part);
    }
  }
  
  // If no splits found, return original
  if (names.length === 0) {
    return [trimmed];
  }
  
  // Also check for "Mr. Name1 Mr. Name2" pattern (no delimiter)
  if (names.length === 1 && /Mr\.\s+\w+\s+Mr\./i.test(trimmed)) {
    const matches = trimmed.match(/(Mr\.\s+[^,;\/]+)/gi);
    if (matches && matches.length > 1) {
      return matches.map(m => m.trim());
    }
  }
  
  return names;
}

// Map state name corrections (handle cases where city is in state field)
const stateCorrections: Record<string, { state: string; city: string }> = {
  'Chennai': { state: 'Tamil Nadu', city: 'Chennai' },
  'Bengaluru': { state: 'Karnataka', city: 'Bengaluru' },
  'Hyderabad': { state: 'Telangana', city: 'Hyderabad' },
  'Krishnagiri': { state: 'Tamil Nadu', city: 'Krishnagiri' },
};

// Get correct state and city from potentially mismatched data
function getStateAndCity(rawState: string, rawCity: string): { state: string; city: string } {
  const stateTrimmed = rawState.trim();
  const cityTrimmed = rawCity.trim();
  
  // Check if state field actually contains a city
  if (stateCorrections[stateTrimmed]) {
    return stateCorrections[stateTrimmed];
  }
  
  // If city looks like a pincode, try to infer from state or use 'Other'
  const isPincode = /^\d{6}$/.test(cityTrimmed);
  if (isPincode) {
    return { state: stateTrimmed, city: 'Other' };
  }
  
  return { state: stateTrimmed, city: cityTrimmed };
}

// Read Excel file
function readExcelFile(): ExcelRow[] {
  console.log('📖 Reading seconddatabase.xlsx...');
  const workbook = XLSX.readFile('seconddatabase.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { raw: false }) as ExcelRow[];
  console.log(`   ✅ ${data.length} rows found`);
  return data;
}

// Group data by account and sub-account
function groupDataByAccount(rows: ExcelRow[]): Map<string, ProcessedData> {
  const accountMap = new Map<string, ProcessedData>();
  
  let currentAccountData: ProcessedData | null = null;
  
  for (const row of rows) {
    // If this row has account_name, it's a new account/subaccount
    if (row.account_name) {
      const rawState = normalizeText(row['state ']);
      const rawCity = normalizeText(row.city);
      const { state, city } = getStateAndCity(rawState, rawCity);
      
      const accountName = normalizeText(row.account_name);
      const subAccountName = normalizeText(row.sub_accounts) || accountName;
      const key = `${accountName}|||${subAccountName}`;
      
      currentAccountData = {
        accountName,
        companyStage: normalizeText(row.company_stage) || 'Enterprise',
        companyTag: normalizeText(row.company_tag) || 'New',
        industry: normalizeText(row.industres) || 'Transport Infrastructure',
        subIndustry: normalizeText(row.sub_industries) || 'Road Infrastructure',
        subAccountName,
        officeType: normalizeText(row['office_type ']) || 'Headquarter',
        address: normalizeText(row.address),
        state,
        city,
        pincode: normalizeText(row.pincode),
        contacts: [],
      };
      
      accountMap.set(key, currentAccountData);
    }
    
    // Add contact if we have contact info
    const contactName = normalizeText(row['contact name ']);
    const phone = normalizePhone(row['phone ']);
    
    if (contactName && currentAccountData) {
      // Split contacts that have multiple names (e.g., "Mr. Name1, Mr. Name2")
      const contactNames = splitContactNames(contactName);
      const phones = phone ? phone.split('/').map(p => p.trim()).filter(p => p) : [];
      
      for (let i = 0; i < contactNames.length; i++) {
        const name = contactNames[i].trim();
        const contactPhone = phones[i] || (phones.length === 1 ? phones[0] : phone) || null;
        
        if (name) {
          currentAccountData.contacts.push({
            name,
            phone: contactPhone,
            designation: normalizeText(row.designation) || null,
            email: normalizeText(row.email) || null,
          });
        }
      }
    }
  }
  
  return accountMap;
}

// Cache for IDs
const stateCache = new Map<string, number>();
const cityCache = new Map<string, number>();
const industryCache = new Map<string, number>();
const subIndustryCache = new Map<string, number>();

// Get or create state
async function getOrCreateState(stateName: string): Promise<number> {
  if (!stateName) {
    throw new Error('State name is required');
  }
  
  // Check cache first
  if (stateCache.has(stateName)) {
    return stateCache.get(stateName)!;
  }
  
  // Try to find existing state
  let { data: state, error } = await supabase
    .from('states')
    .select('id')
    .ilike('state_name', stateName)
    .maybeSingle();
  
  if (state) {
    stateCache.set(stateName, state.id);
    return state.id;
  }
  
  // Create new state
  const { data: newState, error: createError } = await supabase
    .from('states')
    .insert({ state_name: stateName })
    .select('id')
    .single();
  
  if (createError) {
    throw new Error(`Failed to create state "${stateName}": ${createError.message}`);
  }
  
  console.log(`   🆕 Created new state: ${stateName}`);
  stateCache.set(stateName, newState.id);
  return newState.id;
}

// Get or create city
async function getOrCreateCity(cityName: string, stateId: number, stateName: string): Promise<number> {
  if (!cityName) {
    cityName = 'Other';
  }
  
  const cacheKey = `${stateId}-${cityName}`;
  if (cityCache.has(cacheKey)) {
    return cityCache.get(cacheKey)!;
  }
  
  // Try to find existing city
  let { data: city, error } = await supabase
    .from('cities')
    .select('id')
    .eq('state_id', stateId)
    .ilike('city_name', cityName)
    .maybeSingle();
  
  if (city) {
    cityCache.set(cacheKey, city.id);
    return city.id;
  }
  
  // Create new city
  const { data: newCity, error: createError } = await supabase
    .from('cities')
    .insert({ state_id: stateId, city_name: cityName })
    .select('id')
    .single();
  
  if (createError) {
    throw new Error(`Failed to create city "${cityName}" in ${stateName}: ${createError.message}`);
  }
  
  console.log(`   🆕 Created new city: ${cityName} (${stateName})`);
  cityCache.set(cacheKey, newCity.id);
  return newCity.id;
}

// Normalize industry/sub-industry name for consistency
function normalizeIndustryName(name: string): string {
  // Capitalize first letter of each word
  return name.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

// Get or create industry
async function getOrCreateIndustry(industryName: string): Promise<number> {
  const normalizedName = normalizeIndustryName(industryName);
  
  if (industryCache.has(normalizedName)) {
    return industryCache.get(normalizedName)!;
  }
  
  // Try to find existing industry (case-insensitive)
  let { data: industry, error } = await supabase
    .from('industries')
    .select('id, name')
    .ilike('name', normalizedName)
    .maybeSingle();
  
  if (industry) {
    industryCache.set(normalizedName, industry.id);
    return industry.id;
  }
  
  // Create new industry
  const { data: newIndustry, error: createError } = await supabase
    .from('industries')
    .insert({ name: normalizedName })
    .select('id')
    .single();
  
  if (createError) {
    throw new Error(`Failed to create industry "${normalizedName}": ${createError.message}`);
  }
  
  console.log(`   🆕 Created new industry: ${normalizedName}`);
  industryCache.set(normalizedName, newIndustry.id);
  return newIndustry.id;
}

// Get or create sub-industry
async function getOrCreateSubIndustry(subIndustryName: string, industryId: number, industryName: string): Promise<number> {
  const normalizedName = normalizeIndustryName(subIndustryName);
  const cacheKey = `${industryId}-${normalizedName}`;
  
  if (subIndustryCache.has(cacheKey)) {
    return subIndustryCache.get(cacheKey)!;
  }
  
  // Try to find existing sub-industry
  let { data: subIndustry, error } = await supabase
    .from('sub_industries')
    .select('id')
    .eq('industry_id', industryId)
    .ilike('name', normalizedName)
    .maybeSingle();
  
  if (subIndustry) {
    subIndustryCache.set(cacheKey, subIndustry.id);
    return subIndustry.id;
  }
  
  // Create new sub-industry
  const { data: newSubIndustry, error: createError } = await supabase
    .from('sub_industries')
    .insert({
      industry_id: industryId,
      name: normalizedName,
    })
    .select('id')
    .single();
  
  if (createError) {
    throw new Error(`Failed to create sub-industry "${normalizedName}": ${createError.message}`);
  }
  
  console.log(`   🆕 Created new sub-industry: ${normalizedName} (under ${industryName})`);
  subIndustryCache.set(cacheKey, newSubIndustry.id);
  return newSubIndustry.id;
}

// Map company stage to valid enum value
function mapCompanyStage(stage: string): string | null {
  const stageMap: Record<string, string> = {
    'Enterprise': 'Enterprise',
    'SMB': 'SMB',
    'Pan India': 'Pan India',
    'APAC': 'APAC',
    'Middle East & Africa': 'Middle East & Africa',
    'Europe': 'Europe',
    'North America': 'North America',
    'LATAM_SouthAmerica': 'LATAM_SouthAmerica',
  };
  return stageMap[stage] || null;
}

// Map company tag to valid enum value
function mapCompanyTag(tag: string): string | null {
  const tagMap: Record<string, string> = {
    'New': 'New',
    'Prospect': 'Prospect',
    'Customer': 'Customer',
    'Onboard': 'Onboard',
    'Lapsed': 'Lapsed',
    'Needs Attention': 'Needs Attention',
    'Retention': 'Retention',
    'Renewal': 'Renewal',
    'Upselling': 'Upselling',
  };
  return tagMap[tag] || null;
}

// Map office type to valid value
function mapOfficeType(officeType: string): string | null {
  const officeTypeMap: Record<string, string> = {
    'Headquarter': 'Headquarter',
    'Zonal Office': 'Zonal Office',
    'Regional Office': 'Regional Office',
    'Site Office': 'Site Office',
  };
  return officeTypeMap[officeType] || null;
}

// Main import function
async function importData() {
  console.log('\n🚀 Starting Excel data import from seconddatabase.xlsx...\n');
  console.log('='.repeat(60));
  
  // Step 1: Read Excel file
  const allRows = readExcelFile();
  
  // Step 2: Group data by account and sub-account
  const accountMap = groupDataByAccount(allRows);
  console.log(`\n📦 Found ${accountMap.size} unique account/sub-account pairs\n`);
  
  // Counters for summary
  let accountsCreated = 0;
  let subAccountsCreated = 0;
  let contactsCreated = 0;
  let errors = 0;
  
  // Track existing accounts to avoid duplicates
  const createdAccounts = new Map<string, number>();
  
  // Step 3: Import each account
  for (const [key, accountData] of accountMap.entries()) {
    try {
      console.log(`\n📝 Processing: ${accountData.accountName}`);
      
      // Get or create industry and sub-industry
      const industryId = await getOrCreateIndustry(accountData.industry);
      const subIndustryId = await getOrCreateSubIndustry(
        accountData.subIndustry,
        industryId,
        accountData.industry
      );
      
      // Get or create state and city
      const stateId = await getOrCreateState(accountData.state);
      const cityId = await getOrCreateCity(accountData.city, stateId, accountData.state);
      
      let accountId: number;
      
      // Check if we already created this account
      if (createdAccounts.has(accountData.accountName)) {
        accountId = createdAccounts.get(accountData.accountName)!;
        console.log(`   ℹ️  Using existing account (ID: ${accountId})`);
      } else {
        // Check if account exists in database
        const { data: existingAccount } = await supabase
          .from('accounts')
          .select('id')
          .ilike('account_name', accountData.accountName)
          .maybeSingle();
        
        if (existingAccount) {
          accountId = existingAccount.id;
          createdAccounts.set(accountData.accountName, accountId);
          console.log(`   ℹ️  Account exists in DB (ID: ${accountId})`);
        } else {
          // Create new account - UNASSIGNED
          const { data: newAccount, error: accountError } = await supabase
            .from('accounts')
            .insert({
              account_name: accountData.accountName,
              company_stage: mapCompanyStage(accountData.companyStage),
              company_tag: mapCompanyTag(accountData.companyTag),
              industries: [{
                industry_id: industryId,
                industry_name: normalizeIndustryName(accountData.industry),
                sub_industry_id: subIndustryId,
                sub_industry_name: normalizeIndustryName(accountData.subIndustry)
              }],
              industry_projects: {},
              assigned_employee: null, // UNASSIGNED - admin will assign later
              engagement_score: 0,
              is_active: true,
            })
            .select('id')
            .single();
          
          if (accountError) {
            throw new Error(`Failed to create account: ${accountError.message}`);
          }
          
          accountId = newAccount.id;
          createdAccounts.set(accountData.accountName, accountId);
          accountsCreated++;
          console.log(`   ✅ Account created (ID: ${accountId})`);
        }
      }
      
      // Check if sub-account already exists
      const { data: existingSubAccount } = await supabase
        .from('sub_accounts')
        .select('id')
        .eq('account_id', accountId)
        .ilike('sub_account_name', accountData.subAccountName)
        .maybeSingle();
      
      let subAccountId: number;
      
      if (existingSubAccount) {
        subAccountId = existingSubAccount.id;
        console.log(`   ℹ️  Sub-account exists (ID: ${subAccountId})`);
      } else {
        // Create sub-account
        const { data: newSubAccount, error: subAccountError } = await supabase
          .from('sub_accounts')
          .insert({
            account_id: accountId,
            sub_account_name: accountData.subAccountName,
            state_id: stateId,
            city_id: cityId,
            address: accountData.address || null,
            pincode: accountData.pincode || null,
            office_type: mapOfficeType(accountData.officeType),
            is_headquarter: accountData.officeType === 'Headquarter',
            engagement_score: 0,
            is_active: true,
          })
          .select('id')
          .single();
        
        if (subAccountError) {
          throw new Error(`Failed to create sub-account: ${subAccountError.message}`);
        }
        
        subAccountId = newSubAccount.id;
        subAccountsCreated++;
        console.log(`   ✅ Sub-account created (ID: ${subAccountId})`);
      }
      
      // Create contacts
      for (const contact of accountData.contacts) {
        if (!contact.name) continue;
        
        // Check if contact already exists
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('sub_account_id', subAccountId)
          .ilike('name', contact.name)
          .maybeSingle();
        
        if (existingContact) {
          console.log(`   ℹ️  Contact exists: ${contact.name}`);
          continue;
        }
        
        const { error: contactError } = await supabase
          .from('contacts')
          .insert({
            account_id: accountId,
            sub_account_id: subAccountId,
            name: contact.name,
            phone: contact.phone || null,
            designation: contact.designation || null,
            email: contact.email || null,
            created_by: 'System', // Data imported from Excel
          });
        
        if (contactError) {
          console.warn(`   ⚠️  Failed to create contact ${contact.name}: ${contactError.message}`);
        } else {
          contactsCreated++;
          console.log(`   ✅ Contact created: ${contact.name}${contact.phone ? ` (${contact.phone})` : ''}`);
        }
      }
      
    } catch (error: any) {
      console.error(`   ❌ Error processing ${accountData.accountName}:`, error.message);
      errors++;
    }
  }
  
  // Print summary
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
  console.log('\n✨ Import complete!');
  console.log('📱 Data should now be visible in the frontend.');
  console.log('👉 All accounts are UNASSIGNED - Admin can assign them to employees.\n');
}

// Run import
importData().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

