import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
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
  company_stage?: string | null;
  company_tag?: string | null;
  industres?: string | null;
  industry?: string | null;
  sub_industries?: string | null;
  'sub industry'?: string | null;
  sub_accounts?: string | null;
  subaccount?: string | null;
  'office_type '?: string | null;
  address?: string | null;
  'state '?: string | null;
  state?: string | null;
  city?: string | null;
  Pincode?: string | number | null;
  pincode?: string | number | null;
  'contact name '?: string | null;
  'contact number'?: string | number | null;
  'phone '?: string | number | null;
  desigation?: string | null;
  designation?: string | null;
  email?: string | null;
}

interface ProcessedContact {
  name: string;
  phones: string[]; // Multiple phone numbers per contact
  designation: string | null;
  email: string | null;
}

interface ProcessedSubAccount {
  sub_account_name: string;
  state: string | null;
  city: string | null;
  address: string | null;
  pincode: string | null;
  office_type: string;
}

interface IndustryData {
  industry_id: number;
  industry_name: string;
  sub_industry_id: number;
  sub_industry_name: string;
}

interface ProcessedAccount {
  account_name: string;
  industries: Map<string, IndustryData>; // Key: industry_name + sub_industry_name
  sub_accounts: Map<string, ProcessedSubAccount>; // Key: sub_account_name
  contacts: Map<string, ProcessedContact>; // Key: contact_name (lowercase)
}

// Helper function to calculate Levenshtein distance (for fuzzy matching)
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        );
      }
    }
  }

  return matrix[len1][len2];
}

// Find nearest match using Levenshtein distance
function findNearestMatch(
  searchTerm: string,
  options: Array<{ id: number; name: string }>,
  threshold: number = 0.6
): { id: number; name: string } | null {
  if (!searchTerm || !options || options.length === 0) return null;

  let normalizedSearch = searchTerm.toLowerCase().trim();
  
  // Handle common abbreviations and variations for union territories
  const stateVariations: Record<string, string> = {
    'delhi': 'delhi (national capital territory)',
    'new delhi': 'delhi (national capital territory)',
    'nct of delhi': 'delhi (national capital territory)',
    'nct delhi': 'delhi (national capital territory)',
    'jammu and kashmir': 'jammu & kashmir',
    'j&k': 'jammu & kashmir',
  };
  
  // Apply variations if exists
  if (stateVariations[normalizedSearch]) {
    normalizedSearch = stateVariations[normalizedSearch];
  }
  
  // First try exact match (case-insensitive)
  const exactMatch = options.find(
    opt => opt.name.toLowerCase().trim() === normalizedSearch
  );
  if (exactMatch) return exactMatch;

  // Then try contains match
  const containsMatch = options.find(
    opt => opt.name.toLowerCase().trim().includes(normalizedSearch) ||
           normalizedSearch.includes(opt.name.toLowerCase().trim())
  );
  if (containsMatch) return containsMatch;

  // Handle partial matches (e.g., "Pradesh" in state names)
  const partialMatch = options.find(opt => {
    const optName = opt.name.toLowerCase().trim();
    const searchWords = normalizedSearch.split(/\s+/);
    const optWords = optName.split(/\s+/);
    // Check if all search words appear in option
    return searchWords.every(word => 
      word.length > 2 && optWords.some(optWord => optWord.includes(word) || word.includes(optWord))
    );
  });
  if (partialMatch) return partialMatch;

  // Finally, use Levenshtein distance for fuzzy matching
  let bestMatch: { id: number; name: string; distance: number } | null = null;
  
  for (const option of options) {
    const distance = levenshteinDistance(
      normalizedSearch,
      option.name.toLowerCase().trim()
    );
    const maxLength = Math.max(normalizedSearch.length, option.name.toLowerCase().trim().length);
    const similarity = maxLength > 0 ? 1 - distance / maxLength : 0;

    if (similarity >= threshold) {
      if (!bestMatch || similarity > bestMatch.distance) {
        bestMatch = { id: option.id, name: option.name, distance: similarity };
      }
    }
  }

  return bestMatch ? { id: bestMatch.id, name: bestMatch.name } : null;
}

function cleanString(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

function normalizePhone(value: any): string[] {
  if (value === null || value === undefined || value === '') return [];
  const str = String(value).trim();
  if (!str) return [];
  // Split by common separators
  const phones = str
    .split(/[\r\n\/,;|]+/)
    .map(p => p.trim().replace(/\s+/g, ''))
    .filter(p => p.length > 0);
  return phones;
}

async function importFourthDatabase() {
  console.log('\n🚀 Starting import of finalfourthdatabase.xlsx...\n');
  console.log('='.repeat(60));

  const filePath = path.resolve(process.cwd(), 'finalfourthdatabase.xlsx');
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: finalfourthdatabase.xlsx`);
    process.exit(1);
  }

  console.log(`📖 Reading finalfourthdatabase.xlsx...`);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

  console.log(`   Found ${rows.length} rows`);

  // Process all rows and collect unique accounts
  const accountMap = new Map<string, ProcessedAccount>();
  let totalRowsProcessed = 0;

  for (const row of rows) {
    const accountName = cleanString(row.account_name);
    if (!accountName) continue;

    const subAccountName = cleanString(row.sub_accounts || row.subaccount) || accountName;
    const industry = cleanString(row.industres || row.industry);
    const subIndustry = cleanString(row.sub_industries || row['sub industry']);
    const contactName = cleanString(row['contact name ']);
    const phoneRaw = row['phone '] || row['contact number'];
    const email = cleanString(row.email);
    const designation = cleanString(row.designation || row.desigation);
    const state = cleanString(row['state '] || row.state);
    const city = cleanString(row.city);
    const address = cleanString(row.address);
    const pincode = row.Pincode || row.pincode ? String(row.Pincode || row.pincode).trim() : null;
    const officeType = cleanString(row['office_type ']) || 'Headquarter';

    // Get or create account
    let account = accountMap.get(accountName);
    if (!account) {
      account = {
        account_name: accountName,
        industries: new Map(),
        sub_accounts: new Map(),
        contacts: new Map(),
      };
      accountMap.set(accountName, account);
    }

    // Add industry/sub-industry if provided
    if (industry && subIndustry) {
      const industryKey = `${industry.toLowerCase().trim()}_${subIndustry.toLowerCase().trim()}`;
      if (!account.industries.has(industryKey)) {
        // We'll resolve the IDs later
        account.industries.set(industryKey, {
          industry_id: 0, // Will be resolved later
          industry_name: industry,
          sub_industry_id: 0, // Will be resolved later
          sub_industry_name: subIndustry,
        });
      }
    }

    // Add sub-account if provided
    if (subAccountName) {
      if (!account.sub_accounts.has(subAccountName)) {
        account.sub_accounts.set(subAccountName, {
          sub_account_name: subAccountName,
          state: state,
          city: city,
          address: address,
          pincode: pincode,
          office_type: officeType,
        });
      } else {
        // Update sub-account if we have more complete data
        const existingSubAccount = account.sub_accounts.get(subAccountName)!;
        if (!existingSubAccount.state && state) existingSubAccount.state = state;
        if (!existingSubAccount.city && city) existingSubAccount.city = city;
        if (!existingSubAccount.address && address) existingSubAccount.address = address;
        if (!existingSubAccount.pincode && pincode) existingSubAccount.pincode = pincode;
      }
    }

    // Add contact if provided
    if (contactName) {
      const contactKey = contactName.toLowerCase().trim();
      const phones = normalizePhone(phoneRaw);
      
      if (!account.contacts.has(contactKey)) {
        account.contacts.set(contactKey, {
          name: contactName,
          phones: phones,
          designation: designation,
          email: email,
        });
      } else {
        // Merge contact data
        const existingContact = account.contacts.get(contactKey)!;
        // Merge phone numbers
        phones.forEach(phone => {
          if (phone && !existingContact.phones.includes(phone)) {
            existingContact.phones.push(phone);
          }
        });
        // Update other fields if missing
        if (!existingContact.designation && designation) {
          existingContact.designation = designation;
        }
        if (!existingContact.email && email) {
          existingContact.email = email;
        }
      }
    }

    totalRowsProcessed++;
  }

  console.log(`📦 Total unique accounts: ${accountMap.size}`);
  let totalContacts = 0;
  let totalSubAccounts = 0;
  accountMap.forEach(account => {
    totalContacts += account.contacts.size;
    totalSubAccounts += account.sub_accounts.size;
  });
  console.log(`📦 Total sub-accounts: ${totalSubAccounts}`);
  console.log(`📦 Total contacts: ${totalContacts}\n`);

  // Get reference data
  console.log('📋 Fetching reference data from database...');
  const { data: industries } = await supabase.from('industries').select('id, name');
  const { data: subIndustries } = await supabase.from('sub_industries').select('id, name, industry_id');
  const { data: states } = await supabase.from('states').select('id, state_name');
  const { data: cities } = await supabase.from('cities').select('id, city_name, state_id');

  if (!industries || !subIndustries || !states || !cities) {
    console.error('❌ Failed to fetch reference data');
    process.exit(1);
  }

  console.log(`   Found ${industries.length} industries, ${subIndustries.length} sub-industries, ${states.length} states/UTs, ${cities.length} cities`);

  // Import to database
  let accountsCreated = 0;
  let accountsUpdated = 0;
  let subAccountsCreated = 0;
  let subAccountsUpdated = 0;
  let contactsCreated = 0;
  let contactsUpdated = 0;
  let citiesCreated = 0;
  const errors: string[] = [];

  console.log('\n💾 Starting database import...\n');

  for (const [accountName, accountData] of accountMap.entries()) {
    try {
      // Find or create account
      let { data: existingAccount } = await supabase
        .from('accounts')
        .select('id, industries')
        .eq('account_name', accountName)
        .maybeSingle();

      let accountId: number;

      if (existingAccount) {
        accountId = existingAccount.id;
        // Update account to ensure it has correct company_stage and company_tag
        await supabase
          .from('accounts')
          .update({
            company_stage: 'Enterprise',
            company_tag: 'New',
            assigned_employee: null, // Unassigned
          })
          .eq('id', accountId);
        accountsUpdated++;
      } else {
        const { data: newAccount, error: insertError } = await supabase
          .from('accounts')
          .insert({
            account_name: accountName,
            company_stage: 'Enterprise',
            company_tag: 'New',
            assigned_employee: null, // Unassigned - visible to admin only
            is_active: true,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        accountId = newAccount.id;
        accountsCreated++;
      }

      // Process industries - add all unique industry/sub-industry combinations
      const currentIndustriesArray: any[] = [];
      
      for (const industryData of accountData.industries.values()) {
        // Find nearest match for industry
        const matchedIndustry = findNearestMatch(
          industryData.industry_name,
          industries.map(i => ({ id: i.id, name: i.name }))
        );

        if (!matchedIndustry) {
          errors.push(`${accountName}: Industry "${industryData.industry_name}" not found and no match available`);
          continue;
        }

        // Find nearest match for sub-industry (filtered by industry_id)
        const industrySubIndustries = subIndustries.filter(
          si => si.industry_id === matchedIndustry.id
        );
        const matchedSubIndustry = findNearestMatch(
          industryData.sub_industry_name,
          industrySubIndustries.map(si => ({ id: si.id, name: si.name }))
        );

        if (!matchedSubIndustry) {
          errors.push(`${accountName}: Sub-industry "${industryData.sub_industry_name}" not found for industry "${matchedIndustry.name}"`);
          continue;
        }

        // Check if this industry/sub-industry combination already exists
        const exists = currentIndustriesArray.some(
          (ind: any) =>
            ind.industry_id === matchedIndustry.id && ind.sub_industry_id === matchedSubIndustry.id
        );

        if (!exists) {
          currentIndustriesArray.push({
            industry_id: matchedIndustry.id,
            industry_name: matchedIndustry.name,
            sub_industry_id: matchedSubIndustry.id,
            sub_industry_name: matchedSubIndustry.name,
          });
        }
      }

      // Update account with industries
      if (currentIndustriesArray.length > 0) {
        // Get existing industries and merge
        const { data: currentAccount } = await supabase
          .from('accounts')
          .select('industries')
          .eq('id', accountId)
          .single();

        const existingIndustries = (currentAccount?.industries as any[]) || [];
        
        // Merge without duplicates
        const mergedIndustries = [...existingIndustries];
        for (const newInd of currentIndustriesArray) {
          const exists = mergedIndustries.some(
            (ind: any) =>
              ind.industry_id === newInd.industry_id && ind.sub_industry_id === newInd.sub_industry_id
          );
          if (!exists) {
            mergedIndustries.push(newInd);
          }
        }

        await supabase
          .from('accounts')
          .update({ industries: mergedIndustries })
          .eq('id', accountId);
      }

      // Process sub-accounts
      for (const subAccountData of accountData.sub_accounts.values()) {
        // Find or create state
        let stateId: number | null = null;
        if (subAccountData.state) {
          const matchedState = findNearestMatch(
            subAccountData.state,
            states.map(s => ({ id: s.id, name: s.state_name }))
          );

          if (!matchedState) {
            // State not found - log warning but continue (state_id will be null)
            console.warn(`   ⚠️  State "${subAccountData.state}" not found for ${accountName}/${subAccountData.sub_account_name} - setting state_id to null`);
          } else {
            stateId = matchedState.id;
          }
        }

        // Find or create city
        let cityId: number | null = null;
        if (subAccountData.city && stateId) {
          const cityKey = `${subAccountData.city.toLowerCase().trim()}_${stateId}`;
          const existingCity = cities.find(
            c => c.city_name.toLowerCase().trim() === subAccountData.city!.toLowerCase().trim() &&
                 c.state_id === stateId
          );

          if (existingCity) {
            cityId = existingCity.id;
          } else {
            // Create new city
            const { data: newCity, error: createCityError } = await supabase
              .from('cities')
              .insert({
                state_id: stateId,
                city_name: subAccountData.city.trim(),
              })
              .select('id')
              .single();

            if (!createCityError && newCity) {
              cityId = newCity.id;
              cities.push({ id: cityId, city_name: subAccountData.city.trim(), state_id: stateId });
              citiesCreated++;
            } else {
              errors.push(`${accountName}/${subAccountData.sub_account_name}: Failed to create city "${subAccountData.city}"`);
            }
          }
        }

        // Find or create sub-account
        let { data: existingSubAccount } = await supabase
          .from('sub_accounts')
          .select('id')
          .eq('account_id', accountId)
          .eq('sub_account_name', subAccountData.sub_account_name)
          .maybeSingle();

        let subAccountId: number;

        if (existingSubAccount) {
          await supabase
            .from('sub_accounts')
            .update({
              state_id: stateId,
              city_id: cityId,
              address: subAccountData.address || null,
              pincode: subAccountData.pincode || null,
              is_headquarter: true,
              office_type: 'Headquarter',
              is_active: true,
            })
            .eq('id', existingSubAccount.id);

          subAccountId = existingSubAccount.id;
          subAccountsUpdated++;
        } else {
          const { data: newSubAccount, error: insertError } = await supabase
            .from('sub_accounts')
            .insert({
              account_id: accountId,
              sub_account_name: subAccountData.sub_account_name,
              state_id: stateId,
              city_id: cityId,
              address: subAccountData.address || null,
              pincode: subAccountData.pincode || null,
              is_headquarter: true,
              office_type: 'Headquarter',
              is_active: true,
            })
            .select('id')
            .single();

          if (insertError) throw insertError;
          subAccountId = newSubAccount.id;
          subAccountsCreated++;
        }

        // Process contacts for this sub-account
        for (const contactData of accountData.contacts.values()) {
          // Combine all phone numbers into one string (separated by /)
          const combinedPhone = contactData.phones.length > 0 
            ? contactData.phones.filter(p => p).join(' / ')
            : null;

          // Check if contact already exists (case-insensitive by name)
          const { data: existingContact } = await supabase
            .from('contacts')
            .select('id, phone')
            .eq('sub_account_id', subAccountId)
            .ilike('name', contactData.name.trim())
            .maybeSingle();

          if (!existingContact) {
            // Create new contact
            const { error: contactError } = await supabase
              .from('contacts')
              .insert({
                sub_account_id: subAccountId,
                account_id: accountId,
                name: contactData.name.trim(),
                phone: combinedPhone,
                email: contactData.email || null,
                designation: contactData.designation || null,
                created_by: 'system',
              });

            if (contactError) {
              errors.push(`Contact ${contactData.name}: ${contactError.message}`);
            } else {
              contactsCreated++;
            }
          } else {
            // Update existing contact - merge phone numbers
            let updatedPhone = combinedPhone;
            if (existingContact.phone && combinedPhone) {
              // Merge phones, avoiding duplicates
              const existingPhones = existingContact.phone.split(' / ').map(p => p.trim());
              const newPhones = combinedPhone.split(' / ').map(p => p.trim());
              const allPhones = [...new Set([...existingPhones, ...newPhones])];
              updatedPhone = allPhones.join(' / ');
            } else if (existingContact.phone && !combinedPhone) {
              updatedPhone = existingContact.phone;
            }

            // Update contact with merged phone and other fields if missing
            const { data: currentContact } = await supabase
              .from('contacts')
              .select('email, designation')
              .eq('id', existingContact.id)
              .single();

            const updateData: any = { phone: updatedPhone };
            if (contactData.email && !currentContact?.email) {
              updateData.email = contactData.email;
            }
            if (contactData.designation && !currentContact?.designation) {
              updateData.designation = contactData.designation;
            }

            await supabase
              .from('contacts')
              .update(updateData)
              .eq('id', existingContact.id);

            contactsUpdated++;
          }
        }
      }
    } catch (error: any) {
      console.error(`Error processing account ${accountName}:`, error);
      errors.push(`${accountName}: ${error.message}`);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Accounts: ${accountsCreated} created, ${accountsUpdated} updated (Total: ${accountMap.size})`);
  console.log(`✅ Sub-Accounts: ${subAccountsCreated} created, ${subAccountsUpdated} updated`);
  console.log(`✅ Contacts: ${contactsCreated} created, ${contactsUpdated} updated`);
  console.log(`✅ Cities: ${citiesCreated} created`);
  if (errors.length > 0) {
    console.log(`\n❌ Errors: ${errors.length}`);
    errors.slice(0, 20).forEach(err => console.log(`   - ${err}`));
    if (errors.length > 20) {
      console.log(`   ... and ${errors.length - 20} more errors`);
    }
  }
  console.log('='.repeat(60));
  console.log('\n✨ Import complete! Data is now visible in database and frontend.\n');
  console.log('📝 Note: All accounts are set as:');
  console.log('   - Company Stage: Enterprise');
  console.log('   - Company Tag: New');
  console.log('   - Assigned Employee: null (unassigned, visible to admin only)');
  console.log('   - All sub-accounts: is_headquarter = true, office_type = Headquarter\n');
}

// Run import
importFourthDatabase().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

