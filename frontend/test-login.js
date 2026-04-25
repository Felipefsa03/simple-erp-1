import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase URL or Key in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testLogin() {
  console.log('Testing login for admin@lumina.com...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@lumina.com',
    password: 'admin123'
  });

  if (error) {
    console.error('❌ Login failed:', error.message);
    return;
  }

  console.log('✅ Login successful! User ID:', data.user.id);
  
  // Now test querying the users table
  console.log('\nTesting querying users table (RLS check)...');
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*, clinic_id')
    .eq('email', 'admin@lumina.com')
    .single();

  if (userError) {
    console.error('❌ Querying users failed:', userError.message);
    return;
  }

  console.log('✅ User data retrieved successfully!');
  console.log('User role:', userData.role);
  console.log('Clinic ID:', userData.clinic_id);

  // Now test querying professionals (team members)
  console.log('\nTesting querying professionals for this clinic...');
  const { data: profData, error: profError } = await supabase
    .from('professionals')
    .select('*')
    .eq('clinic_id', userData.clinic_id);

  if (profError) {
    console.error('❌ Querying professionals failed:', profError.message);
    return;
  }

  console.log(`✅ Found ${profData.length} professionals for this clinic.`);
  
  // Test querying all users in this clinic (this was the issue with the team list)
  console.log('\nTesting querying all users in this clinic...');
  const { data: clinicUsers, error: clinicUsersError } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('clinic_id', userData.clinic_id);

  if (clinicUsersError) {
    console.error('❌ Querying clinic users failed:', clinicUsersError.message);
    return;
  }

  console.log(`✅ Found ${clinicUsers.length} users in the clinic.`);
  clinicUsers.forEach(u => console.log(`  - ${u.name} (${u.email}) [${u.role}]`));
}

testLogin();
