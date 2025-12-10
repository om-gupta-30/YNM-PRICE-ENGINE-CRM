import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import * as path from 'path';

// Load environment variables from .env.local
const envPath = '.env.local';
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found');
  process.exit(1);
}

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
  account_name?: string | null;
  'state '?: string | null;
  state?: string | null;
  city?: string | null;
  sub_accounts?: string | null;
}

async function updateDelhiSubAccounts() {
  console.log('\n🔄 Updating sub_accounts with Delhi references...\n');
  console.log('='.repeat(60));

  // Get Delhi state ID
  const { data: delhiState } = await supabase
    .from('states')
    .select('id, state_name')
    .ilike('state_name', '%Delhi%')
    .maybeSingle();

  if (!delhiState) {
    console.error('❌ Delhi (National Capital Territory) not found in states table');
    process.exit(1);
  }

  const delhiStateId = delhiState.id;
  console.log(`✅ Found "${delhiState.state_name}" with ID: ${delhiStateId}\n`);

  // Read Excel files to get original state/city data
  const files = [
    'finalfristdatabase.xlsx',
    'finalseconddatabase.xlsx',
    'finalthirddatabase.xlsx',
  ];

  const accountStateCityMap = new Map<string, { state: string | null; city: string | null }>();

  for (const fileName of files) {
    const filePath = path.resolve(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) continue;

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    for (const row of rows) {
      const accountName = row.account_name?.toString().trim();
      const state = (row['state '] || row.state)?.toString().trim() || null;
      const city = row.city?.toString().trim() || null;

      if (accountName) {
        const key = accountName.toLowerCase();
        if (!accountStateCityMap.has(key) || (!accountStateCityMap.get(key)?.state && state)) {
          accountStateCityMap.set(key, { state, city });
        }
      }
    }
  }

  console.log(`📋 Loaded state/city data for ${accountStateCityMap.size} accounts from Excel files\n`);

  // Get all sub_accounts with null state_id
  const { data: subAccounts } = await supabase
    .from('sub_accounts')
    .select('id, sub_account_name, state_id, city_id, account_id, address')
    .is('state_id', null);

  if (!subAccounts || subAccounts.length === 0) {
    console.log('ℹ️  No sub_accounts found with null state_id');
    return;
  }

  console.log(`📋 Found ${subAccounts.length} sub_accounts with null state_id\n`);

  // Get account names for these sub_accounts
  const accountIds = [...new Set(subAccounts.map(sa => sa.account_id))];
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, account_name')
    .in('id', accountIds);

  const accountNameMap = new Map<number, string>();
  (accounts || []).forEach(acc => {
    accountNameMap.set(acc.id, acc.account_name);
  });

  let updated = 0;
  let citiesCreated = 0;
  const errors: string[] = [];

  for (const subAccount of subAccounts) {
    const accountName = accountNameMap.get(subAccount.account_id);
    if (!accountName) continue;

    const accountKey = accountName.toLowerCase();
    const stateCityData = accountStateCityMap.get(accountKey);

    if (!stateCityData) continue;

    const { state, city } = stateCityData;
    
    // Check if state is Delhi or New Delhi
    const isDelhi = state && (
      state.toLowerCase().includes('delhi') ||
      state.toLowerCase() === 'delhi' ||
      state.toLowerCase() === 'new delhi'
    );

    if (!isDelhi) continue;

    console.log(`   Processing: ${subAccount.sub_account_name}`);
    console.log(`      State: ${state}, City: ${city || 'N/A'}`);

    // Get or create city
    let cityId: number | null = null;
    if (city) {
      // Check if city exists for Delhi state
      const { data: existingCity } = await supabase
        .from('cities')
        .select('id')
        .eq('state_id', delhiStateId)
        .ilike('city_name', city.trim())
        .maybeSingle();

      if (existingCity) {
        cityId = existingCity.id;
        console.log(`      ✓ Found existing city: ${city}`);
      } else {
        // Create new city
        const { data: newCity, error: createError } = await supabase
          .from('cities')
          .insert({
            state_id: delhiStateId,
            city_name: city.trim(),
          })
          .select('id')
          .single();

        if (createError) {
          errors.push(`Failed to create city "${city}": ${createError.message}`);
          console.log(`      ❌ Error creating city: ${createError.message}`);
        } else if (newCity) {
          cityId = newCity.id;
          citiesCreated++;
          console.log(`      ✅ Created city: ${city} (ID: ${cityId})`);
        }
      }
    }

    // Update sub_account
    const { error: updateError } = await supabase
      .from('sub_accounts')
      .update({
        state_id: delhiStateId,
        city_id: cityId,
      })
      .eq('id', subAccount.id);

    if (updateError) {
      errors.push(`Failed to update sub_account ${subAccount.id}: ${updateError.message}`);
      console.log(`      ❌ Error updating: ${updateError.message}`);
    } else {
      updated++;
      console.log(`      ✅ Updated sub_account (ID: ${subAccount.id})\n`);
    }
  }

  console.log('='.repeat(60));
  console.log('📊 UPDATE SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Updated: ${updated} sub_accounts`);
  console.log(`✅ Cities created: ${citiesCreated}`);
  if (errors.length > 0) {
    console.log(`❌ Errors: ${errors.length}`);
    errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
  }
  console.log('='.repeat(60));
  console.log('\n✨ Complete! Delhi sub_accounts updated.\n');
}

// Run the script
updateDelhiSubAccounts().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

