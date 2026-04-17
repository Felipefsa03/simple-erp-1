-- ============================================
-- Política RLS especial para integration_config 
-- Permite apenas para super_admin (sem依赖 clinic_id)
-- ============================================

-- 1. Dropar políticas antigas
DROP POLICY IF EXISTS "integration_config_select" ON integration_config;
DROP POLICY IF EXISTS "integration_config_all" ON integration_config;

-- 2. Nova política: super_admin acessa TUDO, outras clínicas só veem as suas
CREATE POLICY "integration_config_all" ON integration_config FOR ALL 
USING (
  is_super_admin() = true
  OR clinic_id = get_user_clinic_id()
)
WITH CHECK (
  is_super_admin() = true
  OR clinic_id = get_user_clinic_id()
);

-- 3. Verificar se funcionou - buscar como super_admin
SELECT * FROM integration_config WHERE clinic_id = '00000000-0000-0000-0000-000000000001';

-- 4. Testar update
UPDATE integration_config 
SET plan_price_basico = 17
WHERE clinic_id = '00000000-0000-0000-0000-000000000001';

-- 5. Verificar se atualizou
SELECT clinic_id, plan_price_basico FROM integration_config;