-- ============================================
-- Verificar se o super_admin está com clinic_id correto
-- ============================================

-- 1. Verificar usuários com role super_admin
SELECT id, email, name, role, clinic_id FROM users WHERE role = 'super_admin';

-- 2. Verificar session atual (se houver)
-- NOTE: Isso precisa ser feito via API, não aqui

-- 3. Testar as funções diretamente
SELECT 
  auth.uid() as current_user_id,
  is_super_admin() as is_super_admin,
  get_user_clinic_id() as user_clinic_id;

-- 4. Se get_user_clinic_id() retorna NULL, precisamos setar clinic_id para o super_admin
-- Primeiro verificar qual é o clinic_id da clínica padrão
SELECT id, name FROM clinics WHERE id = '00000000-0000-0000-0000-000000000001';

-- 5. Atualizar o clinic_id do super_admin se necessário
-- Substitua 'seu-email@email.com' pelo email do super_admin
UPDATE users 
SET clinic_id = '00000000-0000-0000-0000-000000000001'
WHERE email = 'seu-email@email.com' AND role = 'super_admin';

-- 6. Verificar se a função funciona agora
SELECT 
  is_super_admin() as is_super_admin,
  get_user_clinic_id() as user_clinic_id;