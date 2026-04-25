import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testPermissions() {
  console.log('Logging in as admin@lumina.com...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@lumina.com',
    password: 'admin123'
  });

  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }

  const { data: user } = await supabase.from('users').select('clinic_id').eq('id', authData.user.id).single();
  const clinicId = user.clinic_id;
  console.log('Clinic ID:', clinicId);

  console.log('Checking clinics table for permissions column...');
  const { data: clinic, error: clinicError } = await supabase.from('clinics').select('permissions').eq('id', clinicId).single();
  
  if (clinicError) {
    console.error('Failed to get clinic:', clinicError.message);
  } else {
    console.log('Current permissions:', clinic.permissions);
  }

  console.log('Testing update on clinics.permissions...');
  const newPerms = clinic?.permissions || {};
  newPerms.test_perm = ['admin'];

  const { data: updateData, error: updateError } = await supabase
    .from('clinics')
    .update({ permissions: newPerms })
    .eq('id', clinicId)
    .select();

  if (updateError) {
    console.error('Update failed:', updateError.message);
    console.log('Generating SQL to fix RLS...');
    // We might need to generate an SQL for the user.
  } else {
    console.log('Update succeeded!', updateData[0].permissions);
  }
}

testPermissions();