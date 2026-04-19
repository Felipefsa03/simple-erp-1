-- ============================================
-- VERIFICAR DADOS NO BANCO
-- Executar no Supabase SQL Editor
-- ============================================

-- Ver profissionais
SELECT id, name, clinic_id, user_id, active 
FROM professionals 
WHERE clinic_id = '00000000-0000-0000-0000-000000000001' 
OR clinic_id IS NULL
LIMIT 10;

-- Ver pacientes  
SELECT id, name, clinic_id 
FROM patients 
WHERE clinic_id = '00000000-0000-0000-0000-000000000001'
LIMIT 10;

-- Ver agendamentos
SELECT id, patient_id, professional_id, clinic_id, status 
FROM appointments 
WHERE clinic_id = '00000000-0000-0000-0000-000000000001'
LIMIT 10;

-- Ver serviços
SELECT id, name, clinic_id, active 
FROM services 
WHERE clinic_id = '00000000-0000-0000-0000-000000000001'
LIMIT 10;