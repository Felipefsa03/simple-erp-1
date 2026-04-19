-- Script SQL para executar no Supabase SQL Editor
-- Atualiza admin@lumina.com para Premium

-- Primeiro, vamos verificar qual clínica está associada ao admin
SELECT u.id, u.email, u.name, u.clinic_id, c.name as clinic_name, c.subscription_plan
FROM users u
LEFT JOIN clinics c ON u.clinic_id = c.id
WHERE u.email ILIKE '%admin%lumina%';

-- Atualiza a clínica do admin para premium
UPDATE clinics 
SET 
    subscription_plan = 'enterprise',
    subscription_status = 'active',
    subscription_expires_at = '2030-12-31 23:59:59.999+00'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Verifica o resultado
SELECT id, name, subscription_plan, subscription_status, subscription_expires_at
FROM clinics 
WHERE id = '00000000-0000-0000-0000-000000000001';