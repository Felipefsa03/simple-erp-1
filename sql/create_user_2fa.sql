-- Criar tabela user_2fa se não existir
CREATE TABLE IF NOT EXISTS user_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  secret_encrypted TEXT,
  enabled BOOLEAN DEFAULT false,
  backup_codes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE user_2fa ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "user_2fa_select_own" ON user_2fa;
DROP POLICY IF EXISTS "user_2fa_insert_own" ON user_2fa;
DROP POLICY IF EXISTS "user_2fa_update_own" ON user_2fa;
DROP POLICY IF EXISTS "user_2fa_delete_own" ON user_2fa;

CREATE POLICY "user_2fa_select_own" ON user_2fa FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_2fa_insert_own" ON user_2fa FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_2fa_update_own" ON user_2fa FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_2fa_delete_own" ON user_2fa FOR DELETE USING (auth.uid() = user_id);

-- Permissão para service role
DROP POLICY IF EXISTS "user_2fa_service_role" ON user_2fa;
CREATE POLICY "user_2fa_service_role" ON user_2fa FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');