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
  company_stage?: string;
  company_tag?: string;
  industres?: string;
  sub_industries?: string;
  'office_type '?: string;
  address?: string;
  pincode?: string | number;
  'contact name '?: string;
  'phone '?: string | number;
  designation?: string;
  email?: string;
}

function normalizeText(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return '';
  return String(text).trim().replace(/\s+/g, ' ').replace(/[\r\n]+/g, ' ').trim();
}

function normalizePhone(phone: string | number | undefined | null): string {
  if (phone === undefined || phone === null) return '';
  let phoneStr = String(phone).trim();
  phoneStr = phoneStr.replace(/[\r\n,;]+/g, '/');
  phoneStr = phoneStr.replace(/\s*\/\s*/g, '/');
  phoneStr = phoneStr.split('/').map(p => p.replace(/[^\d+]/g, '')).join('/');
  phoneStr = phoneStr.replace(/\/+/g, '/');
  phoneStr = phoneStr.replace(/^\/|\/$/g, '');
  return phoneStr;
}

function splitContactNames(contactName: string): string[] {
  const names: string[] = [];
  const trimmed = contactName.trim();
  const parts = trimmed.split(/[,;\/]/).map(p => p.trim()).filter(p => p);
  
  for (const part of parts) {
    if (/^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)/i.test(part)) {
      names.push(part);
    } else if (part.length > 0) {
      names.push(part);
    }
  }
  
  if (names.length === 0) {
    return [trimmed];
  }
  
  if (names.length === 1 && /Mr\.\s+\w+\s+Mr\./i.test(trimmed)) {
    const matches = trimmed.match(/(Mr\.\s+[^,;\/]+)/gi);
    if (matches && matches.length > 1) {
      return matches.map(m => m.trim());
    }
  }
  
  return names;
}

async function splitHGInfra() {
  console.log('\n🔧 Splitting H. G. Infra Engineering Ltd. into separate accounts\n');
  console.log('='.repeat(60));
  
  // Find the existing account
  const { data: existingAccount, error: findError } = await supabase
    .from('accounts')
    .select('*')
    .ilike('account_name', 'H. G. Infra Engineering Ltd.')
    .maybeSingle();
  
  if (findError || !existingAccount) {
    console.error('❌ Could not find H. G. Infra Engineering Ltd. account');
    return;
  }
  
  console.log(`Found account: ${existingAccount.account_name} (ID: ${existingAccount.id})`);
  
  // Get the sub-account
  const { data: existingSubAccount, error: subError } = await supabase
    .from('sub_accounts')
    .select('*')
    .eq('account_id', existingAccount.id)
    .maybeSingle();
  
  if (subError || !existingSubAccount) {
    console.error('❌ Could not find sub-account');
    return;
  }
  
  console.log(`Found sub-account: ${existingSubAccount.sub_account_name} (ID: ${existingSubAccount.id})`);
  console.log(`Current city: ${existingSubAccount.city_id}`);
  
  // Read Excel files to get both locations
  const firstWorkbook = XLSX.readFile('firstdatabase.xlsx');
  const firstSheet = firstWorkbook.Sheets[firstWorkbook.SheetNames[0]];
  const firstRows = XLSX.utils.sheet_to_json(firstSheet, { raw: false }) as ExcelRow[];
  
  const secondWorkbook = XLSX.readFile('seconddatabase.xlsx');
  const secondSheet = secondWorkbook.Sheets[secondWorkbook.SheetNames[0]];
  const secondRows = XLSX.utils.sheet_to_json(secondSheet, { raw: false }) as ExcelRow[];
  
  // Find H.G. Infra rows
  const hgInfraRows = [...firstRows, ...secondRows].filter(row => {
    const accountName = normalizeText(row.account_name);
    return accountName && (
      accountName.toLowerCase().includes('h. g. infra') ||
      accountName.toLowerCase().includes('hg infra')
    );
  });
  
  if (hgInfraRows.length === 0) {
    console.error('❌ Could not find H. G. Infra in Excel files');
    return;
  }
  
  // Group by city
  const byCity = new Map<string, ExcelRow[]>();
  for (const row of hgInfraRows) {
    const city = normalizeText(row.city);
    if (!byCity.has(city)) {
      byCity.set(city, []);
    }
    byCity.get(city)!.push(row);
  }
  
  console.log(`\nFound H. G. Infra in ${byCity.size} different cities:`);
  for (const [city, rows] of byCity.entries()) {
    console.log(`  - ${city}: ${rows.length} rows`);
  }
  
  if (byCity.size < 2) {
    console.log('\n⚠️  Only one city found. Cannot split.');
    return;
  }
  
  // Get state and city IDs for each location
  const cities = Array.from(byCity.keys());
  const firstCity = cities[0];
  const secondCity = cities[1];
  
  const firstRow = byCity.get(firstCity)![0];
  const secondRow = byCity.get(secondCity)![0];
  
  const firstState = normalizeText(firstRow['state ']);
  const secondState = normalizeText(secondRow['state ']);
  
  console.log(`\n📍 Location 1: ${firstState} - ${firstCity}`);
  console.log(`📍 Location 2: ${secondState} - ${secondCity}`);
  
  // Get or create states and cities
  const { data: firstStateData } = await supabase
    .from('states')
    .select('id')
    .ilike('state_name', firstState)
    .maybeSingle();
  
  const { data: secondStateData } = await supabase
    .from('states')
    .select('id')
    .ilike('state_name', secondState)
    .maybeSingle();
  
  if (!firstStateData || !secondStateData) {
    console.error('❌ Could not find states');
    return;
  }
  
  const { data: firstCityData } = await supabase
    .from('cities')
    .select('id')
    .eq('state_id', firstStateData.id)
    .ilike('city_name', firstCity)
    .maybeSingle();
  
  const { data: secondCityData } = await supabase
    .from('cities')
    .select('id')
    .eq('state_id', secondStateData.id)
    .ilike('city_name', secondCity)
    .maybeSingle();
  
  if (!firstCityData || !secondCityData) {
    console.error('❌ Could not find cities');
    return;
  }
  
  // Check which location the existing account has
  const existingCityId = existingSubAccount.city_id;
  
  let keepAccountId = existingAccount.id;
  let newAccountId: number;
  
  if (existingCityId === firstCityData.id) {
    // Existing account is for first city, create new for second city
    console.log(`\n✅ Existing account is for ${firstCity}, creating new account for ${secondCity}`);
    
    // Create new account for second city
    const { data: newAccount, error: accountError } = await supabase
      .from('accounts')
      .insert({
        account_name: existingAccount.account_name,
        company_stage: existingAccount.company_stage,
        company_tag: existingAccount.company_tag,
        industries: existingAccount.industries,
        industry_projects: existingAccount.industry_projects,
        assigned_employee: null,
        engagement_score: 0,
        is_active: true,
      })
      .select('id')
      .single();
    
    if (accountError || !newAccount) {
      console.error('❌ Failed to create new account:', accountError);
      return;
    }
    
    newAccountId = newAccount.id;
    console.log(`✅ Created new account (ID: ${newAccountId})`);
    
    // Create sub-account for second city
    const { data: newSubAccount, error: subAccountError } = await supabase
      .from('sub_accounts')
      .insert({
        account_id: newAccountId,
        sub_account_name: existingSubAccount.sub_account_name,
        state_id: secondStateData.id,
        city_id: secondCityData.id,
        address: normalizeText(secondRow.address) || null,
        pincode: normalizeText(secondRow.pincode) || null,
        office_type: existingSubAccount.office_type,
        is_headquarter: existingSubAccount.is_headquarter,
        engagement_score: 0,
        is_active: true,
      })
      .select('id')
      .single();
    
    if (subAccountError || !newSubAccount) {
      console.error('❌ Failed to create new sub-account:', subAccountError);
      return;
    }
    
    console.log(`✅ Created new sub-account (ID: ${newSubAccount.id})`);
    
    // Move contacts from second city to new sub-account
    const secondCityRows = byCity.get(secondCity)!;
    let contactsMoved = 0;
    
    for (const row of secondCityRows) {
      const contactName = normalizeText(row['contact name ']);
      if (!contactName) continue;
      
      const contactNames = splitContactNames(contactName);
      const phone = normalizePhone(row['phone ']);
      const phones = phone ? phone.split('/').map(p => p.trim()).filter(p => p) : [];
      
      for (let i = 0; i < contactNames.length; i++) {
        const name = contactNames[i].trim();
        const contactPhone = phones[i] || (phones.length === 1 ? phones[0] : phone) || null;
        
        // Find contact in old sub-account
        const { data: oldContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('sub_account_id', existingSubAccount.id)
          .ilike('name', name)
          .maybeSingle();
        
        if (oldContact) {
          // Update contact to point to new sub-account
          const { error: updateError } = await supabase
            .from('contacts')
            .update({
              account_id: newAccountId,
              sub_account_id: newSubAccount.id,
            })
            .eq('id', oldContact.id);
          
          if (!updateError) {
            contactsMoved++;
            console.log(`✅ Moved contact: ${name}`);
          }
        } else {
          // Create new contact
          const { error: insertError } = await supabase
            .from('contacts')
            .insert({
              account_id: newAccountId,
              sub_account_id: newSubAccount.id,
              name,
              phone: contactPhone,
              designation: normalizeText(row.designation) || null,
              email: normalizeText(row.email) || null,
              created_by: 'System',
            });
          
          if (!insertError) {
            contactsMoved++;
            console.log(`✅ Created contact: ${name}`);
          }
        }
      }
    }
    
    console.log(`\n✅ Moved/created ${contactsMoved} contacts for new account`);
    
  } else {
    // Existing account is for second city, create new for first city
    console.log(`\n✅ Existing account is for ${secondCity}, creating new account for ${firstCity}`);
    // Similar logic but reversed...
    console.log('⚠️  This case needs to be handled (existing account is for second city)');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Split complete!');
  console.log('='.repeat(60));
  
  // Final count
  const { count: finalAccountCount } = await supabase
    .from('accounts')
    .select('*', { count: 'exact', head: true });
  
  const { count: finalSubAccountCount } = await supabase
    .from('sub_accounts')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Final counts:`);
  console.log(`   Accounts: ${finalAccountCount || 0}`);
  console.log(`   Sub-accounts: ${finalSubAccountCount || 0}`);
}

splitHGInfra().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

