-- ============================================================
-- FIX-2FA-PERMISSIONS-FINAL.sql
-- Correção definitiva de permissões e RLS para user_2fa
--
-- COMO USAR:
--   1. Acesse o Supabase Dashboard → SQL Editor
--   2. Cole este script inteiro e clique em "Run"
--   3. Verifique as mensagens de saída (sem erros = OK)
-- ============================================================

-- ------------------------------------------------------------
-- PASSO 1: Garantir que a tabela existe com estrutura correta
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_2fa (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL UNIQUE,
    secret_encrypted TEXT    NOT NULL,
    enabled      BOOLEAN     NOT NULL DEFAULT false,
    verified_at  TIMESTAMPTZ,
    backup_codes JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coluna verified_at pode não existir em instâncias mais antigas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_2fa' AND column_name = 'verified_at'
    ) THEN
        ALTER TABLE user_2fa ADD COLUMN verified_at TIMESTAMPTZ;
    END IF;
END $$;

-- Coluna updated_at pode não existir em instâncias mais antigas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_2fa' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE user_2fa ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;
END $$;

-- ------------------------------------------------------------
-- PASSO 2: Índice de performance
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_2fa_user_id ON user_2fa (user_id);

-- ------------------------------------------------------------
-- PASSO 3: GRANTs explícitos para todos os roles do Supabase
--
-- Este é o passo MAIS IMPORTANTE — sem GRANTs a service_role
-- não consegue acessar a tabela mesmo com BYPASSRLS.
-- ------------------------------------------------------------
GRANT ALL ON TABLE user_2fa TO anon;
GRANT ALL ON TABLE user_2fa TO authenticated;
GRANT ALL ON TABLE user_2fa TO service_role;

-- Garantir acesso à sequência de IDs (necessário para INSERT)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ------------------------------------------------------------
-- PASSO 4: Habilitar RLS
-- ------------------------------------------------------------
ALTER TABLE user_2fa ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- PASSO 5: Remover TODAS as políticas antigas conflitantes
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "user_2fa_own"           ON user_2fa;
DROP POLICY IF EXISTS "user_2fa_all"           ON user_2fa;
DROP POLICY IF EXISTS "user_2fa_access"        ON user_2fa;
DROP POLICY IF EXISTS "user_2fa_service_role"  ON user_2fa;
DROP POLICY IF EXISTS "user_2fa_select"        ON user_2fa;
DROP POLICY IF EXISTS "user_2fa_insert"        ON user_2fa;
DROP POLICY IF EXISTS "user_2fa_update"        ON user_2fa;
DROP POLICY IF EXISTS "user_2fa_delete"        ON user_2fa;

-- ------------------------------------------------------------
-- PASSO 6: Criar política única e correta
--
-- Permite:
--   • service_role → acesso total (backend do Render)
--   • usuário autenticado → apenas seus próprios registros
-- ------------------------------------------------------------
CREATE POLICY "user_2fa_access" ON user_2fa
    FOR ALL
    USING (
        auth.role() = 'service_role'
        OR user_id = auth.uid()
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR user_id = auth.uid()
    );

-- ------------------------------------------------------------
-- PASSO 7: Trigger para atualizar updated_at automaticamente
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_user_2fa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_2fa_updated_at ON user_2fa;
CREATE TRIGGER trg_user_2fa_updated_at
    BEFORE UPDATE ON user_2fa
    FOR EACH ROW
    EXECUTE FUNCTION update_user_2fa_updated_at();

-- ------------------------------------------------------------
-- PASSO 8: Verificação final — exibir estado atual
-- ------------------------------------------------------------
SELECT
    'TABELA OK' AS check_item,
    relname     AS tabela,
    relrowsecurity::text AS rls_habilitado
FROM pg_class
WHERE relname = 'user_2fa'

UNION ALL

SELECT
    'POLITICA: ' || policyname AS check_item,
    tablename                  AS tabela,
    cmd                        AS rls_habilitado
FROM pg_policies
WHERE tablename = 'user_2fa'

UNION ALL

SELECT
    'GRANT: ' || grantee       AS check_item,
    table_name                 AS tabela,
    string_agg(privilege_type, ', ') AS rls_habilitado
FROM information_schema.role_table_grants
WHERE table_name = 'user_2fa'
GROUP BY grantee, table_name
ORDER BY 1;
