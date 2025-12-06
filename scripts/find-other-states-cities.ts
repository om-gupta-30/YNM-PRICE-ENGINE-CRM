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

async function findOtherStatesCities() {
  console.log('\n🔍 Finding Sub-Accounts with "Other" State or City\n');
  console.log('='.repeat(60));
  
  // Get all sub-accounts with their state and city names
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
  
  const withOther = subAccounts?.filter(sa => {
    const stateName = (sa.states as any)?.state_name || '';
    const cityName = (sa.cities as any)?.city_name || '';
    return stateName.toLowerCase() === 'other' || cityName.toLowerCase() === 'other';
  }) || [];
  
  console.log(`\n📊 Found ${withOther.length} sub-accounts with "Other" state or city:\n`);
  
  for (const sa of withOther) {
    const accountName = (sa.accounts as any)?.account_name;
    const stateName = (sa.states as any)?.state_name || 'N/A';
    const cityName = (sa.cities as any)?.city_name || 'N/A';
    
    console.log(`   ${accountName} - ${sa.sub_account_name}`);
    console.log(`     State: ${stateName} (ID: ${sa.state_id})`);
    console.log(`     City: ${cityName} (ID: ${sa.city_id})`);
    console.log(`     Pincode: ${sa.pincode || 'N/A'}`);
    console.log('');
  }
  
  console.log('='.repeat(60));
}

findOtherStatesCities().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

