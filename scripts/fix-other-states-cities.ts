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

async function fixOtherStatesCities() {
  console.log('\n🔧 Fixing "Other" States and Cities\n');
  console.log('='.repeat(60));
  
  // First, find all sub-accounts with "Other" state or city
  const { data: otherStates, error: statesError } = await supabase
    .from('states')
    .select('id, state_name')
    .ilike('state_name', 'Other');
  
  const { data: otherCities, error: citiesError } = await supabase
    .from('cities')
    .select('id, city_name, state_id')
    .ilike('city_name', 'Other');
  
  if (statesError || citiesError) {
    console.error('❌ Error fetching Other states/cities:', statesError || citiesError);
    return;
  }
  
  const otherStateIds = otherStates?.map(s => s.id) || [];
  const otherCityIds = otherCities?.map(c => c.id) || [];
  
  console.log(`\n📊 Found ${otherStateIds.length} "Other" states and ${otherCityIds.length} "Other" cities`);
  
  if (otherStateIds.length === 0 && otherCityIds.length === 0) {
    console.log('✅ No "Other" states or cities found!');
    return;
  }
  
  // Find sub-accounts with "Other" state or city
  let query = supabase
    .from('sub_accounts')
    .select(`
      id,
      sub_account_name,
      state_id,
      city_id,
      pincode,
      accounts!inner(account_name)
    `);
  
  if (otherStateIds.length > 0 || otherCityIds.length > 0) {
    const conditions: any[] = [];
    if (otherStateIds.length > 0) {
      conditions.push(`state_id.in.(${otherStateIds.join(',')})`);
    }
    if (otherCityIds.length > 0) {
      conditions.push(`city_id.in.(${otherCityIds.join(',')})`);
    }
    query = query.or(conditions.join(','));
  }
  
  const { data: subAccountsWithOther, error: subAccountsError } = await query;
  
  if (subAccountsError) {
    console.error('❌ Error fetching sub-accounts:', subAccountsError);
    return;
  }
  
  console.log(`\n📦 Found ${subAccountsWithOther?.length || 0} sub-accounts with "Other" state or city\n`);
  
  if (!subAccountsWithOther || subAccountsWithOther.length === 0) {
    console.log('✅ No sub-accounts need fixing!');
    return;
  }
  
  // Read Excel files to get correct data
  console.log('📖 Reading Excel files for correct data...');
  const firstWorkbook = XLSX.readFile('finalfristdatabase.xlsx');
  const firstSheet = firstWorkbook.Sheets[firstWorkbook.SheetNames[0]];
  const firstRows = XLSX.utils.sheet_to_json(firstSheet, { raw: false }) as ExcelRow[];
  
  const secondWorkbook = XLSX.readFile('finalseconddatabase.xlsx');
  const secondSheet = secondWorkbook.Sheets[secondWorkbook.SheetNames[0]];
  const secondRows = XLSX.utils.sheet_to_json(secondSheet, { raw: false }) as ExcelRow[];
  
  const allRows = [...firstRows, ...secondRows];
  
  // Build map of account+sub-account to location data
  const locationMap = new Map<string, { state: string; city: string; pincode: string }>();
  
  for (const row of allRows) {
    const accountName = normalizeText(row.account_name);
    const subAccountName = normalizeText(row.sub_accounts) || accountName;
    const key = `${accountName}|||${subAccountName}`;
    
    const state = normalizeText(row['state ']);
    const city = normalizeText(row.city);
    const pincode = normalizeText(row.pincode);
    
    if (accountName && (state || city || pincode)) {
      locationMap.set(key, { state, city, pincode });
    }
  }
  
  console.log(`   ✅ Loaded ${locationMap.size} location entries from Excel\n`);
  
  // Cache for IDs
  const stateCache = new Map<string, number>();
  const cityCache = new Map<string, number>();
  
  // Get or create state
  async function getOrCreateState(stateName: string): Promise<number> {
    if (!stateName || stateName.trim() === '') {
      throw new Error('State name is required');
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
    
    // CREATE the state (never use "Other")
    const { data: newState, error } = await supabase
      .from('states')
      .insert({ state_name: normalized })
      .select('id')
      .single();
    
    if (error || !newState) {
      throw new Error(`Failed to create state "${normalized}": ${error?.message}`);
    }
    
    console.log(`   🆕 Created new state: ${normalized}`);
    stateCache.set(normalized, newState.id);
    return newState.id;
  }
  
  // Get or create city
  async function getOrCreateCity(cityName: string, stateId: number, stateName: string): Promise<number | null> {
    if (!cityName || cityName.trim() === '') {
      return null;
    }
    
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
    
    // CREATE the city (never use "Other")
    const { data: newCity, error } = await supabase
      .from('cities')
      .insert({ state_id: stateId, city_name: normalized })
      .select('id')
      .single();
    
    if (error || !newCity) {
      throw new Error(`Failed to create city "${normalized}": ${error?.message}`);
    }
    
    console.log(`   🆕 Created new city: ${normalized} (${stateName})`);
    cityCache.set(cacheKey, newCity.id);
    return newCity.id;
  }
  
  let fixed = 0;
  let notFound = 0;
  let errors = 0;
  
  // Fix each sub-account
  for (const subAccount of subAccountsWithOther) {
    const accountName = (subAccount.accounts as any)?.account_name;
    const subAccountName = subAccount.sub_account_name;
    const key = `${accountName}|||${subAccountName}`;
    
    const locationData = locationMap.get(key);
    
    if (!locationData) {
      console.log(`⚠️  No Excel data found for: ${accountName} - ${subAccountName}`);
      notFound++;
      continue;
    }
    
    try {
      console.log(`\n📝 Fixing: ${accountName} - ${subAccountName}`);
      console.log(`   Excel: state="${locationData.state}", city="${locationData.city}", pincode="${locationData.pincode}"`);
      
      let stateId: number | null = null;
      let cityId: number | null = null;
      
      // Get or create state (CREATE if doesn't exist)
      if (locationData.state && locationData.state.trim()) {
        stateId = await getOrCreateState(locationData.state);
      }
      
      // Get or create city (CREATE if doesn't exist)
      if (locationData.city && locationData.city.trim() && stateId) {
        cityId = await getOrCreateCity(locationData.city, stateId, locationData.state);
      }
      
      // Update sub-account
      const updateData: any = {};
      if (stateId && subAccount.state_id !== stateId) {
        updateData.state_id = stateId;
      }
      if (cityId && subAccount.city_id !== cityId) {
        updateData.city_id = cityId;
      }
      if (locationData.pincode && subAccount.pincode !== locationData.pincode) {
        updateData.pincode = locationData.pincode;
      }
      
      if (Object.keys(updateData).length === 0) {
        console.log(`   ✅ Already correct`);
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
        if (updateData.state_id) changes.push(`state: ${locationData.state}`);
        if (updateData.city_id) changes.push(`city: ${locationData.city}`);
        if (updateData.pincode) changes.push(`pincode: ${locationData.pincode}`);
        console.log(`   ✅ Fixed: ${changes.join(', ')}`);
        fixed++;
      }
      
    } catch (error: any) {
      console.error(`   ❌ Error processing ${accountName}: ${error.message}`);
      errors++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 FIX SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Fixed: ${fixed}`);
  console.log(`⚠️  Not found in Excel: ${notFound}`);
  if (errors > 0) {
    console.log(`❌ Errors: ${errors}`);
  }
  console.log('='.repeat(60));
  console.log('\n✨ Fix complete!\n');
}

fixOtherStatesCities().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

