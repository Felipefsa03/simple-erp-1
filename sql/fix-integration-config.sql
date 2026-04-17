-- ============================================
-- Corrigir integração_config - políticas RLS + valores
-- ============================================

-- 1. Verificar dados atuais
SELECT * FROM integration_config LIMIT 5;

-- 2. Criar dados de exemplo se não existir (para super_admin testar)
INSERT INTO integration_config (clinic_id, mp_access_token, mp_public_key, plan_price_basico, plan_price_profissional, plan_price_premium)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'APP_USR-test', 'APP_USR-test', 17, 197, 397),
  ('00000000-0000-0000-0000-000000000002', NULL, NULL, 17, 197, 397)
ON CONFLICT (clinic_id) DO NOTHING;

-- 3. Políticas RLS para integration_config (super_admin vê tudo, clínicas veem as suas)
DROP POLICY IF EXISTS "integration_config_select" ON integration_config;
DROP POLICY IF EXISTS "integration_config_all" ON integration_config;

CREATE POLICY "integration_config_select" ON integration_config FOR SELECT 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "integration_config_all" ON integration_config FOR ALL 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

-- 4. Atualizar valores dos planos conforme necessário
-- Verificar valores atuais
SELECT clinic_id, plan_price_basico, plan_price_profissional, plan_price_premium FROM integration_config;

-- Atualizar valores (ajuste conforme necessário)
UPDATE integration_config 
SET plan_price_basico = 17,
    plan_price_profissional = 197,
    plan_price_premium = 397
WHERE clinic_id = '00000000-0000-0000-0000-000000000001';

-- 5. Verificar resultado
SELECT * FROM integration_config;