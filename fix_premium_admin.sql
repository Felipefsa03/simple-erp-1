-- ============================================
-- CORRIGIR PLANO PARA PREMIUM
-- Executar no Supabase SQL Editor
-- ============================================

-- 1. Primeiro, ver a estrutura atual
SELECT id, name, plan, status, subscription_plan, subscription_status 
FROM clinics 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2. Atualizar para PREMIUM (todas as colunas possíveis)
UPDATE clinics 
SET 
    plan = 'premium',
    subscription_plan = 'premium',
    status = 'active',
    subscription_status = 'active'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 3. Verificar resultado
SELECT id, name, plan, status, subscription_plan, subscription_status 
FROM clinics 
WHERE id = '00000000-0000-0000-0000-000000000001';