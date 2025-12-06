const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
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

const supabase = createClient(supabaseUrl, supabaseKey);

interface ExcelRow {
  account_name?: string;
  sub_accounts?: string;
  'state '?: string;
  city?: string;
  pincode?: string | number;
}

function normalizeText(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return '';
  return String(text).trim().replace(/\s+/g, ' ').replace(/[\r\n]+/g, ' ').trim();
}

async function verifyAndFix() {
  console.log('\n🔍 Verifying and Fixing Location Data\n');
  console.log('='.repeat(60));
  
  // Read Excel files
  const firstWorkbook = XLSX.readFile('finalfristdatabase.xlsx');
  const firstSheet = firstWorkbook.Sheets[firstWorkbook.SheetNames[0]];
  const firstRows = XLSX.utils.sheet_to_json(firstSheet, { raw: false }) as ExcelRow[];
  
  const secondWorkbook = XLSX.readFile('finalseconddatabase.xlsx');
  const secondSheet = secondWorkbook.Sheets[secondWorkbook.SheetNames[0]];
  const secondRows = XLSX.utils.sheet_to_json(secondSheet, { raw: false }) as ExcelRow[];
  
  const allRows = [...firstRows, ...secondRows];
  
  // Build map from Excel
  const excelMap = new Map<string, { state: string; city: string; pincode: string }>();
  for (const row of allRows) {
    const accountName = normalizeText(row.account_name);
    const subAccountName = normalizeText(row.sub_accounts) || accountName;
    const key = `${accountName}|||${subAccountName}`;
    
    const state = normalizeText(row['state ']);
    const city = normalizeText(row.city);
    const pincode = normalizeText(row.pincode);
    
    if (accountName && (state || city || pincode)) {
      excelMap.set(key, { state, city, pincode });
    }
  }
  
  console.log(`📊 Loaded ${excelMap.size} entries from Excel\n`);
  
  // Get all sub-accounts from database
  const { data: subAccounts, error } = await supabase
    .from('sub_accounts')
    .select(`
      id,
      sub_account_name,
      state_id,
      city_id,
      pincode,
      accounts!inner(account_name),
      states(state_name),
      cities(city_name)
    `);
  
  if (error) {
    console.error('❌ Error fetching sub-accounts:', error);
    return;
  }
  
  console.log(`📊 Found ${subAccounts?.length || 0} sub-accounts in database\n`);
  
  // Cache
  const stateCache = new Map<string, number>();
  const cityCache = new Map<string, number>();
  
  async function getOrCreateState(stateName: string): Promise<number> {
    if (!stateName || stateName.trim() === '') {
      throw new Error('State name required');
    }
    const normalized = stateName.trim();
    if (stateCache.has(normalized)) {
      return stateCache.get(normalized)!;
    }
    let { data: state } = await supabase
      .from('states')
      .select('id')
      .ilike('state_name', normalized)
      .maybeSingle();
    if (state) {
      stateCache.set(normalized, state.id);
      return state.id;
    }
    const { data: newState, error } = await supabase
      .from('states')
      .insert({ state_name: normalized })
      .select('id')
      .single();
    if (error || !newState) {
      throw new Error(`Failed to create state "${normalized}"`);
    }
    console.log(`   🆕 Created state: ${normalized}`);
    stateCache.set(normalized, newState.id);
    return newState.id;
  }
  
  async function getOrCreateCity(cityName: string, stateId: number, stateName: string): Promise<number | null> {
    if (!cityName || cityName.trim() === '') return null;
    const normalized = cityName.trim();
    const cacheKey = `${stateId}-${normalized}`;
    if (cityCache.has(cacheKey)) {
      return cityCache.get(cacheKey)!;
    }
    let { data: city } = await supabase
      .from('cities')
      .select('id')
      .eq('state_id', stateId)
      .ilike('city_name', normalized)
      .maybeSingle();
    if (city) {
      cityCache.set(cacheKey, city.id);
      return city.id;
    }
    const { data: newCity, error } = await supabase
      .from('cities')
      .insert({ state_id: stateId, city_name: normalized })
      .select('id')
      .single();
    if (error || !newCity) {
      throw new Error(`Failed to create city "${normalized}"`);
    }
    console.log(`   🆕 Created city: ${normalized} (${stateName})`);
    cityCache.set(cacheKey, newCity.id);
    return newCity.id;
  }
  
  let fixed = 0;
  let matches = 0;
  let notFound = 0;
  let errors = 0;
  
  for (const subAccount of subAccounts || []) {
    const accountName = (subAccount.accounts as any)?.account_name;
    const subAccountName = subAccount.sub_account_name;
    const key = `${accountName}|||${subAccountName}`;
    
    const excelData = excelMap.get(key);
    if (!excelData) {
      notFound++;
      continue;
    }
    
    const dbState = (subAccount.states as any)?.state_name || '';
    const dbCity = (subAccount.cities as any)?.city_name || '';
    const dbPincode = subAccount.pincode || '';
    
    const excelState = excelData.state || '';
    const excelCity = excelData.city || '';
    const excelPincode = excelData.pincode || '';
    
    // Check if they match
    const stateMatch = !excelState || dbState.toLowerCase() === excelState.toLowerCase();
    const cityMatch = !excelCity || dbCity.toLowerCase() === excelCity.toLowerCase();
    const pincodeMatch = !excelPincode || dbPincode === excelPincode;
    
    if (stateMatch && cityMatch && pincodeMatch) {
      matches++;
      continue;
    }
    
    // Need to fix
    console.log(`\n📝 Fixing: ${accountName} - ${subAccountName}`);
    console.log(`   DB:     state="${dbState}", city="${dbCity}", pincode="${dbPincode}"`);
    console.log(`   Excel:  state="${excelState}", city="${excelCity}", pincode="${excelPincode}"`);
    
    try {
      let stateId: number | null = null;
      let cityId: number | null = null;
      
      if (excelState && excelState.trim()) {
        stateId = await getOrCreateState(excelState);
      }
      
      if (excelCity && excelCity.trim() && stateId) {
        cityId = await getOrCreateCity(excelCity, stateId, excelState);
      }
      
      const updateData: any = {};
      if (stateId && subAccount.state_id !== stateId) {
        updateData.state_id = stateId;
      }
      if (cityId && subAccount.city_id !== cityId) {
        updateData.city_id = cityId;
      }
      if (excelPincode && subAccount.pincode !== excelPincode) {
        updateData.pincode = excelPincode;
      }
      
      if (Object.keys(updateData).length === 0) {
        matches++;
        continue;
      }
      
      const { error: updateError } = await supabase
        .from('sub_accounts')
        .update(updateData)
        .eq('id', subAccount.id);
      
      if (updateError) {
        console.error(`   ❌ Error: ${updateError.message}`);
        errors++;
      } else {
        const changes = [];
        if (updateData.state_id) changes.push(`state: ${excelState}`);
        if (updateData.city_id) changes.push(`city: ${excelCity}`);
        if (updateData.pincode) changes.push(`pincode: ${excelPincode}`);
        console.log(`   ✅ Fixed: ${changes.join(', ')}`);
        fixed++;
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      errors++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Fixed: ${fixed}`);
  console.log(`✅ Already correct: ${matches}`);
  console.log(`⚠️  Not in Excel: ${notFound}`);
  if (errors > 0) {
    console.log(`❌ Errors: ${errors}`);
  }
  console.log('='.repeat(60));
  console.log('\n✨ Complete!\n');
}

verifyAndFix().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

