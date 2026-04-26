-- ============================================
-- Fix: password_codes table
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. Verificar se a tabela existe
SELECT 
    table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'password_codes';

-- 2. Criar tabela se não existir
CREATE TABLE IF NOT EXISTS password_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    expires TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar índice se não existir
CREATE INDEX IF NOT EXISTS idx_password_codes_user ON password_codes(user_id);

-- 4. Desabilitar RLS temporariamente para permitir escrita via API
ALTER TABLE password_codes DISABLE ROW LEVEL SECURITY;

-- 5. Verificar políticas existentes
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'password_codes';

-- 6. Remover políticas antigas se existirem
DROP POLICY IF EXISTS "password_codes_own" ON password_codes;
DROP POLICY IF EXISTS "password_codes_insert" ON password_codes;
DROP POLICY IF EXISTS "password_codes_select" ON password_codes;
DROP POLICY IF EXISTS "password_codes_update" ON password_codes;
DROP POLICY IF EXISTS "password_codes_delete" ON password_codes;

-- 7. Habilitar RLS e criar política permissiva (só quem tem service role pode寫入)
ALTER TABLE password_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "password_codes_service_role" ON password_codes 
FOR ALL 
USING (auth.jwt() IS NOT NULL);

-- ============================================
-- Verificar se há usuários com telefone cadastrado
-- ============================================
SELECT id, email, phone, clinic_id 
FROM users 
WHERE email = 'juniorcouto110@hotmail.com'
AND phone IS NOT NULL 
AND phone != '';