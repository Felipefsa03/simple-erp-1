-- ============================================
-- Solução definitiva - política RLS muito permissiva
-- ============================================

-- 1. Dropar todas as políticas existentes
DROP POLICY IF EXISTS "integration_config_select" ON integration_config;
DROP POLICY IF EXISTS "integration_config_all" ON integration_config;
DROP POLICY IF EXISTS "integration_config_super_admin" ON integration_config;
DROP POLICY IF EXISTS "integration_config_normal" ON integration_config;

-- 2. Criar política PERMISSIVA - permite qualquer usuário autenticado
CREATE POLICY "integration_config_any_auth" ON integration_config 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Testar acesso
SELECT * FROM integration_config WHERE clinic_id = '00000000-0000-0000-0000-000000000001';

-- 4. Testar update
UPDATE integration_config SET plan_price_basico = 25 WHERE clinic_id = '00000000-0000-0000-0000-000000000001' RETURNING *;

-- 5. Verificar políticas criadas
SELECT policyname, cmd, permissive FROM pg_policies WHERE tablename = 'integration_config';