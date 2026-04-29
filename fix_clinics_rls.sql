-- ============================================
-- FIX: Permissões para Fluxo de Signup/Trial
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Políticas para a tabela CLINICS
-- Permite que novos usuários criem o registro da clínica durante o signup
DROP POLICY IF EXISTS "Allow anon insert for signup" ON clinics;
CREATE POLICY "Allow anon insert for signup" ON clinics 
FOR INSERT TO anon 
WITH CHECK (true);

-- Permite que o sistema verifique se a clínica foi criada (usado no trial check)
DROP POLICY IF EXISTS "Allow anon select for signup" ON clinics;
CREATE POLICY "Allow anon select for signup" ON clinics 
FOR SELECT TO anon 
USING (true);

-- 2. Políticas para a tabela USERS
-- Permite que o novo administrador da clínica seja criado
DROP POLICY IF EXISTS "Allow anon insert for signup" ON users;
CREATE POLICY "Allow anon insert for signup" ON users 
FOR INSERT TO anon 
WITH CHECK (true);

-- 3. Garantir que o Super Admin continue tendo acesso total
DROP POLICY IF EXISTS "super_admin_all_clinics" ON clinics;
CREATE POLICY "super_admin_all_clinics" ON clinics 
FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'));

-- Notificação de segurança:
-- Estas políticas permitem inserções anônimas para viabilizar o fluxo de cadastro.
-- O ideal é utilizar a SUPABASE_SERVICE_ROLE_KEY no Render para maior segurança.
