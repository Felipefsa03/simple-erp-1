-- ============================================
-- Verificar dados na tabela integration_config
-- ============================================

-- 1. Ver todos os registros
SELECT * FROM integration_config;

-- 2. Verificar clinic_id específico
SELECT * FROM integration_config 
WHERE clinic_id = '00000000-0000-0000-0000-000000000001';

-- 3. Contar total de registros
SELECT COUNT(*) as total FROM integration_config;