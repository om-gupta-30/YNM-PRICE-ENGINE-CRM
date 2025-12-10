import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load environment variables
const envPath = '.env.local';
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
const supabase = createClient(supabaseUrl, supabaseKey);

async function mergeDuplicateContacts() {
  console.log('\n🔧 Merging duplicate contacts...\n');
  console.log('='.repeat(60));

  // Get all contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, name, phone, sub_account_id, account_id, email, designation')
    .order('id', { ascending: true });

  if (!contacts) {
    console.error('❌ Failed to fetch contacts');
    return;
  }

  // Group by sub_account_id + name (case-insensitive)
  const contactGroups = new Map<string, Array<typeof contacts[0]>>();

  for (const contact of contacts) {
    const key = `${contact.sub_account_id}|||${contact.name.toLowerCase().trim()}`;
    if (!contactGroups.has(key)) {
      contactGroups.set(key, []);
    }
    contactGroups.get(key)!.push(contact);
  }

  // Find duplicates (same name in same sub-account)
  const duplicates: Array<{ key: string; contacts: typeof contacts }> = [];
  contactGroups.forEach((group, key) => {
    if (group.length > 1) {
      duplicates.push({ key, contacts: group });
    }
  });

  console.log(`Found ${duplicates.length} groups with duplicate contacts\n`);

  let merged = 0;
  let deleted = 0;

  // Merge each duplicate group
  for (const dup of duplicates) {
    // Keep the first contact (lowest ID), merge others into it
    const keepContact = dup.contacts[0];
    const mergeContacts = dup.contacts.slice(1);

    // Collect all phone numbers
    const allPhones = new Set<string>();
    if (keepContact.phone) {
      keepContact.phone.split(' / ').forEach(p => {
        const trimmed = p.trim();
        if (trimmed) allPhones.add(trimmed);
      });
    }

    // Merge data from other contacts
    let finalEmail = keepContact.email;
    let finalDesignation = keepContact.designation;

    for (const mergeContact of mergeContacts) {
      // Merge phones
      if (mergeContact.phone) {
        mergeContact.phone.split(' / ').forEach(p => {
          const trimmed = p.trim();
          if (trimmed) allPhones.add(trimmed);
        });
      }

      // Use email/designation from merge contact if keep contact doesn't have it
      if (!finalEmail && mergeContact.email) {
        finalEmail = mergeContact.email;
      }
      if (!finalDesignation && mergeContact.designation) {
        finalDesignation = mergeContact.designation;
      }
    }

    // Update keep contact with merged data
    const combinedPhone = allPhones.size > 0 ? Array.from(allPhones).join(' / ') : null;

    await supabase
      .from('contacts')
      .update({
        phone: combinedPhone,
        email: finalEmail || null,
        designation: finalDesignation || null,
      })
      .eq('id', keepContact.id);

    // Delete duplicate contacts
    for (const mergeContact of mergeContacts) {
      await supabase.from('contacts').delete().eq('id', mergeContact.id);
      deleted++;
    }

    merged++;
    console.log(`✅ Merged ${mergeContacts.length} duplicates of "${keepContact.name}" in sub-account ${keepContact.sub_account_id}`);
  }

  // Verify final count
  const { data: finalContacts, count } = await supabase
    .from('contacts')
    .select('id', { count: 'exact' });

  console.log(`\n✅ Merged ${merged} groups, deleted ${deleted} duplicate contacts`);
  console.log(`✅ Final contact count: ${count} (target: 368)`);
  console.log('='.repeat(60));
  console.log('\n✨ Duplicate merge complete!\n');
}

mergeDuplicateContacts().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

