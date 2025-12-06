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
  sub_accounts?: string;
  'state '?: string;
  city?: string;
  pincode?: string | number;
}

// Normalize text
function normalizeText(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return '';
  return String(text).trim().replace(/\s+/g, ' ').replace(/[\r\n]+/g, ' ').trim();
}

// Map state name corrections
const stateCorrections: Record<string, { state: string; city: string }> = {
  'Chennai': { state: 'Tamil Nadu', city: 'Chennai' },
  'Bengaluru': { state: 'Karnataka', city: 'Bengaluru' },
  'Hyderabad': { state: 'Telangana', city: 'Hyderabad' },
  'Krishnagiri': { state: 'Tamil Nadu', city: 'Krishnagiri' },
};

// Get correct state and city - use actual values from Excel, don't default to "Other"
function getStateAndCity(rawState: string, rawCity: string): { state: string; city: string } {
  const stateTrimmed = rawState.trim();
  const cityTrimmed = rawCity.trim();
  
  // If state is empty but city is provided (and not a pincode)
  if (!stateTrimmed) {
    if (cityTrimmed && !/^\d{6}$/.test(cityTrimmed)) {
      // Check if city name is actually a state name
      const possibleStates = ['Delhi', 'Mumbai', 'Gurgaon', 'Karnataka', 'Tamil Nadu', 'Maharashtra', 'Gujarat', 'Uttar Pradesh', 'Haryana', 'Punjab', 'Rajasthan', 'West Bengal', 'Telangana', 'Andhra Pradesh', 'Kerala', 'Odisha', 'Madhya Pradesh', 'Bihar', 'Jharkhand', 'Uttarakhand', 'Himachal Pradesh', 'Assam', 'Chhattisgarh', 'New Delhi', 'Mumbai Suburban'];
      if (possibleStates.includes(cityTrimmed)) {
        return { state: cityTrimmed, city: cityTrimmed };
      }
      // Return city as-is, state will be empty (we'll skip state update)
      return { state: '', city: cityTrimmed };
    }
    return { state: '', city: '' };
  }
  
  // Check state corrections
  if (stateCorrections[stateTrimmed]) {
    return stateCorrections[stateTrimmed];
  }
  
  // If city looks like a pincode, use state and empty city
  const isPincode = /^\d{6}$/.test(cityTrimmed);
  if (isPincode) {
    return { state: stateTrimmed, city: '' };
  }
  
  // Return actual values from Excel
  return { 
    state: stateTrimmed, 
    city: cityTrimmed || ''
  };
}

// Cache for IDs
const stateCache = new Map<string, number>();
const cityCache = new Map<string, number>();

// Get or create state - always create if it doesn't exist, never default to "Other"
async function getOrCreateState(stateName: string): Promise<number> {
  // If state name is empty, we can't proceed - throw error
  if (!stateName || stateName.trim() === '') {
    throw new Error('State name is required and cannot be empty');
  }
  
  const normalizedStateName = stateName.trim();
  
  // Check cache first
  if (stateCache.has(normalizedStateName)) {
    return stateCache.get(normalizedStateName)!;
  }
  
  // Try to find existing state (case-insensitive)
  let { data: state, error } = await supabase
    .from('states')
    .select('id')
    .ilike('state_name', normalizedStateName)
    .maybeSingle();
  
  if (state) {
    stateCache.set(normalizedStateName, state.id);
    return state.id;
  }
  
  // State doesn't exist - create it (don't default to "Other")
  const { data: newState, error: createError } = await supabase
    .from('states')
    .insert({ state_name: normalizedStateName })
    .select('id')
    .single();
  
  if (createError) {
    throw new Error(`Failed to create state "${normalizedStateName}": ${createError.message}`);
  }
  
  console.log(`   🆕 Created new state: ${normalizedStateName}`);
  stateCache.set(normalizedStateName, newState.id);
  return newState.id;
}

// Get or create city - always create if it doesn't exist, never default to "Other"
async function getOrCreateCity(cityName: string, stateId: number, stateName: string): Promise<number | null> {
  // If city name is empty, return null (don't default to "Other")
  if (!cityName || cityName.trim() === '') {
    return null;
  }
  
  const normalizedCityName = cityName.trim();
  const cacheKey = `${stateId}-${normalizedCityName}`;
  
  // Check cache first
  if (cityCache.has(cacheKey)) {
    return cityCache.get(cacheKey)!;
  }
  
  // Try to find existing city (case-insensitive)
  let { data: city, error } = await supabase
    .from('cities')
    .select('id')
    .eq('state_id', stateId)
    .ilike('city_name', normalizedCityName)
    .maybeSingle();
  
  if (city) {
    cityCache.set(cacheKey, city.id);
    return city.id;
  }
  
  // City doesn't exist - CREATE IT with the exact name from Excel (never default to "Other")
  const { data: newCity, error: createError } = await supabase
    .from('cities')
    .insert({ state_id: stateId, city_name: normalizedCityName })
    .select('id')
    .single();
  
  if (createError) {
    throw new Error(`Failed to create city "${normalizedCityName}" in ${stateName}: ${createError.message}`);
  }
  
  console.log(`   🆕 Created new city: ${normalizedCityName} (${stateName})`);
  cityCache.set(cacheKey, newCity.id);
  return newCity.id;
}

async function updateSubAccounts() {
  console.log('\n🔧 Updating Sub-Accounts Location Data\n');
  console.log('='.repeat(60));
  
  // Read both Excel files
  console.log('\n📖 Reading finalfristdatabase.xlsx...');
  const firstWorkbook = XLSX.readFile('finalfristdatabase.xlsx');
  const firstSheet = firstWorkbook.Sheets[firstWorkbook.SheetNames[0]];
  const firstRows = XLSX.utils.sheet_to_json(firstSheet, { raw: false }) as ExcelRow[];
  console.log(`   ✅ ${firstRows.length} rows found`);
  
  console.log('\n📖 Reading finalseconddatabase.xlsx...');
  const secondWorkbook = XLSX.readFile('finalseconddatabase.xlsx');
  const secondSheet = secondWorkbook.Sheets[secondWorkbook.SheetNames[0]];
  const secondRows = XLSX.utils.sheet_to_json(secondSheet, { raw: false }) as ExcelRow[];
  console.log(`   ✅ ${secondRows.length} rows found`);
  
  // Combine rows
  const allRows = [...firstRows, ...secondRows];
  
  // Group by account and sub-account
  const accountSubAccountMap = new Map<string, { accountName: string; subAccountName: string; state: string; city: string; pincode: string }>();
  
  for (const row of allRows) {
    const accountName = normalizeText(row.account_name);
    const subAccountName = normalizeText(row.sub_accounts) || accountName;
    
    if (accountName) {
      const key = `${accountName}|||${subAccountName}`;
      
      const rawState = normalizeText(row['state ']);
      const rawCity = normalizeText(row.city);
      const { state, city } = getStateAndCity(rawState, rawCity);
      const pincode = normalizeText(row.pincode);
      
      // Only update if we have location data
      if (state || city || pincode) {
        accountSubAccountMap.set(key, {
          accountName,
          subAccountName,
          state,
          city,
          pincode,
        });
      }
    }
  }
  
  console.log(`\n📦 Found ${accountSubAccountMap.size} account/sub-account pairs with location data\n`);
  
  let updated = 0;
  let errors = 0;
  let skipped = 0;
  
  // Update each sub-account
  for (const [key, data] of accountSubAccountMap.entries()) {
    try {
      // Find the account
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('id')
        .ilike('account_name', data.accountName)
        .maybeSingle();
      
      if (accountError || !account) {
        console.log(`⚠️  Account not found: ${data.accountName}`);
        skipped++;
        continue;
      }
      
      // Find the sub-account
      const { data: subAccount, error: subAccountError } = await supabase
        .from('sub_accounts')
        .select('id, state_id, city_id, pincode')
        .eq('account_id', account.id)
        .ilike('sub_account_name', data.subAccountName)
        .maybeSingle();
      
      if (subAccountError || !subAccount) {
        console.log(`⚠️  Sub-account not found: ${data.subAccountName} for ${data.accountName}`);
        skipped++;
        continue;
      }
      
      // Get or create state and city - ALWAYS CREATE if they don't exist (never default to "Other")
      let stateId: number | null = null;
      let cityId: number | null = null;
      
      try {
        // Always try to get/create state if we have state data from Excel
        // This will CREATE the state if it doesn't exist (never defaults to "Other")
        if (data.state && data.state.trim()) {
          stateId = await getOrCreateState(data.state);
        }
        
        // Get/create city if we have city data from Excel
        // This will CREATE the city if it doesn't exist (never defaults to "Other")
        if (data.city && data.city.trim()) {
          if (!stateId) {
            // If we have city but no state, we need a state to create the city
            // This shouldn't happen if Excel data is correct, but log a warning
            console.log(`   ⚠️  City "${data.city}" provided but no state for ${data.accountName}, cannot create city without state`);
          } else {
            // Create city with exact name from Excel (never defaults to "Other")
            cityId = await getOrCreateCity(data.city, stateId, data.state);
          }
        }
      } catch (error: any) {
        console.error(`   ⚠️  Error getting state/city for ${data.accountName}: ${error.message}`);
        // Continue with what we have - don't fail the entire update
      }
      
      // Log what we're processing
      console.log(`\n📝 Processing: ${data.accountName} - ${data.subAccountName}`);
      console.log(`   Excel data: state="${data.state}", city="${data.city}", pincode="${data.pincode}"`);
      console.log(`   Resolved: state_id=${stateId}, city_id=${cityId}`);
      console.log(`   Current DB: state_id=${subAccount.state_id}, city_id=${subAccount.city_id}, pincode="${subAccount.pincode}"`);
      
      // Check if update is needed
      const needsStateUpdate = stateId !== null && subAccount.state_id !== stateId;
      const needsCityUpdate = cityId !== null && subAccount.city_id !== cityId;
      const needsPincodeUpdate = data.pincode && subAccount.pincode !== data.pincode;
      const needsUpdate = needsStateUpdate || needsCityUpdate || needsPincodeUpdate;
      
      console.log(`   Needs update: state=${needsStateUpdate}, city=${needsCityUpdate}, pincode=${needsPincodeUpdate}`);
      
      if (!needsUpdate) {
        console.log(`   ✅ No changes needed`);
        continue; // No changes needed
      }
      
      // Update sub-account (only update fields that have values)
      const updateData: any = {};
      if (needsStateUpdate) {
        updateData.state_id = stateId;
      }
      if (needsCityUpdate) {
        updateData.city_id = cityId;
      }
      if (needsPincodeUpdate) {
        updateData.pincode = data.pincode || null;
      }
      
      const { error: updateError } = await supabase
        .from('sub_accounts')
        .update(updateData)
        .eq('id', subAccount.id);
      
      if (updateError) {
        console.error(`   ❌ Error updating ${data.accountName} - ${data.subAccountName}: ${updateError.message}`);
        errors++;
      } else {
        updated++;
        const changes = [];
        if (needsStateUpdate) changes.push(`state: ${data.state}`);
        if (needsCityUpdate) changes.push(`city: ${data.city}`);
        if (needsPincodeUpdate) changes.push(`pincode: ${data.pincode || 'null'}`);
        console.log(`   ✅ Updated ${data.accountName} - ${data.subAccountName}: ${changes.join(', ')}`);
      }
      
    } catch (error: any) {
      console.error(`   ❌ Error processing ${data.accountName}:`, error.message);
      errors++;
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 UPDATE SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Sub-accounts updated: ${updated}`);
  console.log(`ℹ️  Sub-accounts skipped: ${skipped}`);
  if (errors > 0) {
    console.log(`❌ Errors: ${errors}`);
  }
  console.log('='.repeat(60));
  console.log('\n✨ Update complete!\n');
}

// Run update
updateSubAccounts().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

