-- ==============================================================================
-- 01_optimize_rls_and_security.sql
-- ETAPA 1: OTIMIZAÇÃO DE PERFORMANCE (JWT) E SEGURANÇA NAS TABELAS FINANCEIRAS
-- ==============================================================================

-- 1. OTIMIZAÇÃO DAS FUNÇÕES GLOBAIS DE SEGURANÇA
-- Em vez de fazer um SELECT na tabela users para cada linha lida (o que causava gargalo),
-- agora lemos diretamente o token JWT da requisição (ultrarrápido).
-- Adicionamos um fallback seguro (o SELECT antigo) caso o JWT ainda não tenha os dados (zero downtime).

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' IS NOT NULL THEN
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role') = 'super_admin'
      ELSE
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() 
          AND role = 'super_admin'
        )
    END;
$$;

CREATE OR REPLACE FUNCTION get_user_clinic_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(
      NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'clinic_id', '')::UUID,
      (SELECT clinic_id FROM users WHERE id = auth.uid())
    );
$$;

-- 2. TRIGGER DE SINCRONIZAÇÃO
-- Sempre que o usuário for criado ou tiver seu "role" alterado, os dados vão para o app_metadata da conta de Autenticação.

CREATE OR REPLACE FUNCTION sync_user_role_to_app_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Requer SECURITY DEFINER para acessar auth.users
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role, 'clinic_id', NEW.clinic_id)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_user_role ON users;
CREATE TRIGGER trg_sync_user_role
AFTER INSERT OR UPDATE OF role, clinic_id ON users
FOR EACH ROW
EXECUTE FUNCTION sync_user_role_to_app_metadata();

-- 3. MIGRAÇÃO DE DADOS EXISTENTES
-- Roda uma vez para atualizar os tokens de todos os usuários que já existem no banco.

DO $$
DECLARE
  u record;
BEGIN
  FOR u IN SELECT id, role, clinic_id FROM public.users
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', u.role, 'clinic_id', u.clinic_id)
    WHERE id = u.id;
  END LOOP;
END;
$$;

-- 4. APLICAÇÃO DE RLS NAS NOVAS TABELAS FINANCEIRAS
-- (Garante que clínicas não enxerguem dados financeiros umas das outras)

ALTER TABLE IF EXISTS accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS financial_categories ENABLE ROW LEVEL SECURITY;

-- Limpar policies antigas (idempotência)
DROP POLICY IF EXISTS "accounts_select" ON accounts;
DROP POLICY IF EXISTS "accounts_insert" ON accounts;
DROP POLICY IF EXISTS "accounts_update" ON accounts;
DROP POLICY IF EXISTS "accounts_delete" ON accounts;

DROP POLICY IF EXISTS "invoices_select" ON invoices;
DROP POLICY IF EXISTS "invoices_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_update" ON invoices;
DROP POLICY IF EXISTS "invoices_delete" ON invoices;

DROP POLICY IF EXISTS "categories_select" ON financial_categories;
DROP POLICY IF EXISTS "categories_insert" ON financial_categories;
DROP POLICY IF EXISTS "categories_update" ON financial_categories;
DROP POLICY IF EXISTS "categories_delete" ON financial_categories;

-- Criar Novas Policies
CREATE POLICY "accounts_select" ON accounts FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "accounts_insert" ON accounts FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "accounts_update" ON accounts FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "accounts_delete" ON accounts FOR DELETE USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "invoices_insert" ON invoices FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "invoices_update" ON invoices FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "invoices_delete" ON invoices FOR DELETE USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "categories_select" ON financial_categories FOR SELECT USING (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "categories_insert" ON financial_categories FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "categories_update" ON financial_categories FOR UPDATE USING (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "categories_delete" ON financial_categories FOR DELETE USING (is_super_admin() OR clinic_id = get_user_clinic_id());

-- FIM DA ETAPA 1
