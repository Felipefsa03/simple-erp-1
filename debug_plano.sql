-- Script SQL para verificar e corrigir o plano no banco
-- Execute no Supabase SQL Editor

-- 1. Verificar clínicas e seus planos atuais
SELECT 
  id, 
  name, 
  plan, 
  status, 
  subscription_plan, 
  subscription_status
FROM clinics 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2. Se não existir coluna 'plan', verificar a estrutura da tabela
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'clinics';

-- 3. Atualizar plano se necessário (ajuste os nomes das colunas conforme a estrutura real)
-- UPDATE clinics SET plan = 'premium', status = 'active' WHERE id = '00000000-0000-0000-0000-000000000001';

-- 4. Verificar se users têm clinic_id correto
SELECT id, email, role, clinic_id FROM users WHERE role = 'admin' OR role = 'super_admin' LIMIT 5;