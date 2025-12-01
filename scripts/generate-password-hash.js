// Script to generate bcrypt hash for default password
// Run: node scripts/generate-password-hash.js

const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'Admin@123';
  const hash = await bcrypt.hash(password, 10);
  console.log('\n========================================');
  console.log('Password Hash Generator');
  console.log('========================================');
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
  console.log('\nCopy the hash above and use it in the SQL schema file.');
  console.log('Replace the placeholder hash in docs/supabase-users-schema.sql');
  console.log('========================================\n');
}

generateHash().catch(console.error);

