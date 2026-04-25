import { supabase, isSupabaseConfigured } from './src/lib/supabase.js';

async function testUpdate() {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured');
    return;
  }
  
  console.log('Logging in...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@lumina.com',
    password: 'admin123'
  });
  
  if (error) {
    console.error('Login error:', error);
    return;
  }
  
  const clinicId = data.user.user_metadata?.clinic_id || '00000000-0000-0000-0000-000000000001';
  
  console.log('Updating clinic permissions...', clinicId);
  const perms = { test: ['admin', 'dentist'] };
  
  const result = await supabase.from('clinics')
    .update({ permissions: perms })
    .eq('id', clinicId)
    .then((res) => {
      console.log('Update result:', res);
    });
    
  const getResult = await supabase.from('clinics').select('permissions').eq('id', clinicId).single().then(res => {
    console.log('Get result:', res);
  });
}

testUpdate();