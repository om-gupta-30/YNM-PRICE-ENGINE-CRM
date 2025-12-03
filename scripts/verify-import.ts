import { createSupabaseServerClient } from '../lib/utils/supabaseClient';

async function verifyImport() {
  const supabase = createSupabaseServerClient();

  console.log('🔍 Verifying imported data...\n');

  // Check a few accounts
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, account_name, industries')
    .in('account_name', [
      'Ram Kumar Contractor Pvt. Ltd.',
      'Megha Engineering & Infrastructures Pvt. Ltd.',
    ])
    .limit(5);

  if (accountsError) {
    console.error('Error fetching accounts:', accountsError);
    return;
  }

  console.log('📊 Accounts with industries:');
  accounts?.forEach((acc: any) => {
    console.log(`  - ${acc.account_name}`);
    console.log(`    Industries: ${JSON.stringify(acc.industries)}`);
  });

  // Check sub-accounts
  if (accounts && accounts.length > 0) {
    const accountIds = accounts.map((a: any) => a.id);
    const { data: subAccounts, error: subAccountsError } = await supabase
      .from('sub_accounts')
      .select('id, account_id, sub_account_name, address, state_id, city_id, pincode')
      .in('account_id', accountIds)
      .limit(5);

    if (!subAccountsError && subAccounts) {
      console.log('\n📋 Sub-accounts:');
      for (const sub of subAccounts) {
        console.log(`  - ${sub.sub_account_name}`);
        console.log(`    Address: ${sub.address || 'N/A'}`);
        console.log(`    Pincode: ${sub.pincode || 'N/A'}`);
        console.log(`    State ID: ${sub.state_id || 'N/A'}`);
        console.log(`    City ID: ${sub.city_id || 'N/A'}`);

        // Get contacts for this sub-account
        const { data: contacts } = await supabase
          .from('contacts')
          .select('name, designation, phone, email')
          .eq('sub_account_id', sub.id)
          .limit(5);

        if (contacts && contacts.length > 0) {
          console.log(`    Contacts (${contacts.length}):`);
          contacts.forEach((c: any) => {
            console.log(`      - ${c.name} (${c.designation || 'N/A'})`);
            console.log(`        Phone: ${c.phone || 'N/A'}, Email: ${c.email || 'N/A'}`);
          });
        }
        console.log('');
      }
    }
  }

  // Count totals
  const { count: accountsCount } = await supabase
    .from('accounts')
    .select('*', { count: 'exact', head: true });

  const { count: subAccountsCount } = await supabase
    .from('sub_accounts')
    .select('*', { count: 'exact', head: true });

  const { count: contactsCount } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true });

  console.log('\n📈 Summary:');
  console.log(`  Total Accounts: ${accountsCount}`);
  console.log(`  Total Sub-Accounts: ${subAccountsCount}`);
  console.log(`  Total Contacts: ${contactsCount}`);
}

verifyImport().catch(console.error);
