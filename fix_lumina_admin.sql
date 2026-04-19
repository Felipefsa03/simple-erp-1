-- Atualiza admin@lumina.com para Premium
-- Executar no Supabase SQL Editor

-- 1. Atualiza clínica do admin para premium
UPDATE clinics 
SET subscription_plan = 'premium',
    subscription_status = 'active',
    subscription_expires_at = '2030-12-31 23:59:59.999+00'
WHERE name ILIKE '%lumina%' OR name ILIKE '%admin%';

-- 2. Verifica resultado
SELECT id, name, subscription_plan, subscription_status 
FROM clinics 
WHERE name ILIKE '%lumina%' OR name ILIKE '%admin%';

-- 3. Libera acesso total (remove bloqueios)
UPDATE clinics SET status = 'active' WHERE subscription_plan = 'premium';