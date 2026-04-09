-- ============================================
-- Script de segurança RLS - Executar no Supabase SQL Editor
-- Este script verifica quais tabelas existem e adiciona RLS apenas nelas
-- ============================================

-- Tentar habilitar RLS em cada tabela (ignore erros se tabela não existir)
DO $$
DECLARE
    table_name TEXT;
BEGIN
    -- Loop através de todas as tabelas conhecidas
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT IN ('pg_stat_statements', 'pg_buffercache')
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
            RAISE NOTICE 'RLS habilitado em: %', table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro em %: %', table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================
-- Criar políticas RLS apenas para tabelas que existem
-- ============================================

-- Funções auxiliares (criar se não existirem)
CREATE OR REPLACE FUNCTION get_user_clinic_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin');
$$;

-- Políticas para clinics
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'clinics') THEN
        CREATE POLICY "clinics_select" ON clinics FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR id = get_user_clinic_id()));
        CREATE POLICY "clinics_update" ON clinics FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR id = get_user_clinic_id()));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para users
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users') THEN
        CREATE POLICY "users_select" ON users FOR SELECT USING (deleted_at IS NULL AND (id = auth.uid() OR is_super_admin() OR (clinic_id IS NOT NULL AND clinic_id = get_user_clinic_id())));
        CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (is_super_admin() OR id = auth.uid());
        CREATE POLICY "users_update" ON users FOR UPDATE USING (deleted_at IS NULL AND (id = auth.uid() OR is_super_admin() OR (clinic_id IS NOT NULL AND clinic_id = get_user_clinic_id())));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para patients
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'patients') THEN
        CREATE POLICY "patients_select" ON patients FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
        CREATE POLICY "patients_insert" ON patients FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
        CREATE POLICY "patients_update" ON patients FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para appointments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'appointments') THEN
        CREATE POLICY "appointments_select" ON appointments FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
        CREATE POLICY "appointments_insert" ON appointments FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
        CREATE POLICY "appointments_update" ON appointments FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para medical_records
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'medical_records') THEN
        CREATE POLICY "medical_records_select" ON medical_records FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
        CREATE POLICY "medical_records_insert" ON medical_records FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
        CREATE POLICY "medical_records_update" ON medical_records FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para transactions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'transactions') THEN
        CREATE POLICY "transactions_select" ON transactions FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
        CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
        CREATE POLICY "transactions_update" ON transactions FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para payments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'payments') THEN
        CREATE POLICY "payments_select" ON payments FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
        CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
        CREATE POLICY "payments_update" ON payments FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para professionals
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'professionals') THEN
        CREATE POLICY "professionals_select" ON professionals FOR SELECT USING (is_super_admin() OR clinic_id = get_user_clinic_id());
        CREATE POLICY "professionals_insert" ON professionals FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
        CREATE POLICY "professionals_update" ON professionals FOR UPDATE USING (is_super_admin() OR clinic_id = get_user_clinic_id());
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para services
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'services') THEN
        CREATE POLICY "services_select" ON services FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
        CREATE POLICY "services_insert" ON services FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
        CREATE POLICY "services_update" ON services FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para stock_items
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stock_items') THEN
        CREATE POLICY "stock_select" ON stock_items FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
        CREATE POLICY "stock_insert" ON stock_items FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
        CREATE POLICY "stock_update" ON stock_items FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para insurances
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'insurances') THEN
        CREATE POLICY "insurances_select" ON insurances FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
        CREATE POLICY "insurances_insert" ON insurances FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
        CREATE POLICY "insurances_update" ON insurances FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para branches
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'branches') THEN
        CREATE POLICY "branches_select" ON branches FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
        CREATE POLICY "branches_insert" ON branches FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
        CREATE POLICY "branches_update" ON branches FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para clinic_integrations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'clinic_integrations') THEN
        CREATE POLICY "integrations_select" ON clinic_integrations FOR SELECT USING (is_super_admin() OR clinic_id = get_user_clinic_id());
        CREATE POLICY "integrations_insert" ON clinic_integrations FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
        CREATE POLICY "integrations_update" ON clinic_integrations FOR UPDATE USING (is_super_admin() OR clinic_id = get_user_clinic_id());
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para password_codes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'password_codes') THEN
        CREATE POLICY "password_codes_own" ON password_codes FOR ALL USING (user_id = auth.uid());
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para user_2fa
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_2fa') THEN
        CREATE POLICY "user_2fa_own" ON user_2fa FOR ALL USING (user_id = auth.uid());
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- Verificar resultado
-- ============================================
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND rowsecurity = true
ORDER BY tablename;