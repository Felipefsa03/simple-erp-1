-- ============================================
-- Verificar políticas RLS da integration_config
-- ============================================

-- 1. Ver políticas existentes
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'integration_config';

-- 2. Testar o que o usuário atual pode ver
SELECT * FROM integration_config 
WHERE clinic_id = '00000000-0000-0000-0000-000000000001';

-- 3. Testar se o usuário pode fazer UPDATE
UPDATE integration_config 
SET plan_price_basico = 17
WHERE clinic_id = '00000000-0000-0000-0000-000000000001'
RETURNING *;

-- 4. Testar a função is_super_admin()
SELECT is_super_admin();