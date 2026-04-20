-- Script SQL para executar no Supabase SQL Editor
-- Atualiza admin@lumina.com para Premium

-- Primeiro, verificar a estrutura da tabela clinics
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clinics';

-- Verificar clínica do admin
SELECT u.id, u.email, u.name, u.clinic_id, c.name as clinic_name, c.plan, c.status
FROM users u
LEFT JOIN clinics c ON u.clinic_id = c.id
WHERE u.email ILIKE '%admin%lumina%';

-- Atualiza a clínica do admin para premium (enterprise = mais alto)
UPDATE clinics 
SET 
    plan = 'premium',
    status = 'active'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Verifica o resultado
SELECT id, name, plan, status
FROM clinics 
WHERE id = '00000000-0000-0000-0000-000000000001';