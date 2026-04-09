-- ============================================
-- SEGURANÇA COMPLETA - Versão Corrigida v3
-- ============================================

-- 1. Deletar funções existentes primeiro (para evitar erro 42P13)
DROP FUNCTION IF EXISTS get_user_clinic_id();
DROP FUNCTION IF EXISTS is_super_admin();

-- 2. Criar funções auxiliares (clinic_id é UUID)
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

-- 3. Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurances ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_2fa ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_credentials ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para Users
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_update" ON users;

CREATE POLICY "users_select" ON users FOR SELECT 
USING (
  id = auth.uid() 
  OR is_super_admin()
  OR (clinic_id IS NOT NULL AND clinic_id = get_user_clinic_id())
);

CREATE POLICY "users_update" ON users FOR UPDATE 
USING (id = auth.uid() OR is_super_admin());

-- 5. Políticas para Clinics
DROP POLICY IF EXISTS "clinics_select" ON clinics;
DROP POLICY IF EXISTS "clinics_update" ON clinics;

CREATE POLICY "clinics_select" ON clinics FOR SELECT 
USING (is_super_admin() OR id = get_user_clinic_id());

CREATE POLICY "clinics_update" ON clinics FOR UPDATE 
USING (is_super_admin() OR id = get_user_clinic_id());

-- 6. Políticas para Patients
DROP POLICY IF EXISTS "patients_select" ON patients;
DROP POLICY IF EXISTS "patients_insert" ON patients;
DROP POLICY IF EXISTS "patients_update" ON patients;
DROP POLICY IF EXISTS "patients_delete" ON patients;

CREATE POLICY "patients_select" ON patients FOR SELECT 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "patients_insert" ON patients FOR INSERT 
WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "patients_update" ON patients FOR UPDATE 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "patients_delete" ON patients FOR DELETE 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

-- 7. Políticas para Appointments
DROP POLICY IF EXISTS "appointments_select" ON appointments;
DROP POLICY IF EXISTS "appointments_insert" ON appointments;
DROP POLICY IF EXISTS "appointments_update" ON appointments;
DROP POLICY IF EXISTS "appointments_delete" ON appointments;

CREATE POLICY "appointments_select" ON appointments FOR SELECT 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "appointments_insert" ON appointments FOR INSERT 
WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "appointments_update" ON appointments FOR UPDATE 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "appointments_delete" ON appointments FOR DELETE 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

-- 8. Políticas para Medical Records
DROP POLICY IF EXISTS "medical_records_select" ON medical_records;
DROP POLICY IF EXISTS "medical_records_insert" ON medical_records;
DROP POLICY IF EXISTS "medical_records_update" ON medical_records;
DROP POLICY IF EXISTS "medical_records_delete" ON medical_records;

CREATE POLICY "medical_records_select" ON medical_records FOR SELECT 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "medical_records_insert" ON medical_records FOR INSERT 
WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "medical_records_update" ON medical_records FOR UPDATE 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "medical_records_delete" ON medical_records FOR DELETE 
USING (is_super_admin());

-- 9. Políticas para Transactions
DROP POLICY IF EXISTS "transactions_select" ON transactions;
DROP POLICY IF EXISTS "transactions_insert" ON transactions;
DROP POLICY IF EXISTS "transactions_update" ON transactions;
DROP POLICY IF EXISTS "transactions_delete" ON transactions;

CREATE POLICY "transactions_select" ON transactions FOR SELECT 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "transactions_insert" ON transactions FOR INSERT 
WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "transactions_update" ON transactions FOR UPDATE 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "transactions_delete" ON transactions FOR DELETE 
USING (is_super_admin());

-- 10. Políticas para Services
DROP POLICY IF EXISTS "services_select" ON services;
DROP POLICY IF EXISTS "services_insert" ON services;
DROP POLICY IF EXISTS "services_update" ON services;
DROP POLICY IF EXISTS "services_delete" ON services;

CREATE POLICY "services_select" ON services FOR SELECT 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "services_insert" ON services FOR INSERT 
WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "services_update" ON services FOR UPDATE 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "services_delete" ON services FOR DELETE 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

-- 11. Políticas para Professionals
DROP POLICY IF EXISTS "professionals_select" ON professionals;
DROP POLICY IF EXISTS "professionals_insert" ON professionals;
DROP POLICY IF EXISTS "professionals_update" ON professionals;
DROP POLICY IF EXISTS "professionals_delete" ON professionals;

CREATE POLICY "professionals_select" ON professionals FOR SELECT 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "professionals_insert" ON professionals FOR INSERT 
WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "professionals_update" ON professionals FOR UPDATE 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "professionals_delete" ON professionals FOR DELETE 
USING (is_super_admin());

-- 12. Políticas para Stock Items
DROP POLICY IF EXISTS "stock_select" ON stock_items;
DROP POLICY IF EXISTS "stock_insert" ON stock_items;
DROP POLICY IF EXISTS "stock_update" ON stock_items;
DROP POLICY IF EXISTS "stock_delete" ON stock_items;

CREATE POLICY "stock_select" ON stock_items FOR SELECT 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "stock_insert" ON stock_items FOR INSERT 
WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "stock_update" ON stock_items FOR UPDATE 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "stock_delete" ON stock_items FOR DELETE 
USING (is_super_admin());

-- 13. Políticas para Insurances
DROP POLICY IF EXISTS "insurances_select" ON insurances;
DROP POLICY IF EXISTS "insurances_insert" ON insurances;
DROP POLICY IF EXISTS "insurances_update" ON insurances;
DROP POLICY IF EXISTS "insurances_delete" ON insurances;

CREATE POLICY "insurances_select" ON insurances FOR SELECT 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "insurances_insert" ON insurances FOR INSERT 
WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "insurances_update" ON insurances FOR UPDATE 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "insurances_delete" ON insurances FOR DELETE 
USING (is_super_admin());

-- 14. Políticas para Branches
DROP POLICY IF EXISTS "branches_select" ON branches;
DROP POLICY IF EXISTS "branches_insert" ON branches;
DROP POLICY IF EXISTS "branches_update" ON branches;
DROP POLICY IF EXISTS "branches_delete" ON branches;

CREATE POLICY "branches_select" ON branches FOR SELECT 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "branches_insert" ON branches FOR INSERT 
WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "branches_update" ON branches FOR UPDATE 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "branches_delete" ON branches FOR DELETE 
USING (is_super_admin());

-- 15. Políticas para Clinic Integrations
DROP POLICY IF EXISTS "integrations_select" ON clinic_integrations;
DROP POLICY IF EXISTS "integrations_insert" ON clinic_integrations;
DROP POLICY IF EXISTS "integrations_update" ON clinic_integrations;
DROP POLICY IF EXISTS "integrations_delete" ON clinic_integrations;

CREATE POLICY "integrations_select" ON clinic_integrations FOR SELECT 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "integrations_insert" ON clinic_integrations FOR INSERT 
WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "integrations_update" ON clinic_integrations FOR UPDATE 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "integrations_delete" ON clinic_integrations FOR DELETE 
USING (is_super_admin());

-- 16. Políticas para System Integrations
DROP POLICY IF EXISTS "system_integrations_select" ON system_integrations;
DROP POLICY IF EXISTS "system_integrations_all" ON system_integrations;

CREATE POLICY "system_integrations_select" ON system_integrations FOR SELECT 
USING (is_super_admin());

CREATE POLICY "system_integrations_all" ON system_integrations FOR ALL 
USING (is_super_admin());

-- 17. Políticas para Password Codes
DROP POLICY IF EXISTS "password_codes_own" ON password_codes;

CREATE POLICY "password_codes_own" ON password_codes FOR ALL 
USING (user_id = auth.uid());

-- 18. Políticas para User 2FA
DROP POLICY IF EXISTS "user_2fa_own" ON user_2fa;

CREATE POLICY "user_2fa_own" ON user_2fa FOR ALL 
USING (user_id = auth.uid());

-- 19. Políticas para WhatsApp Credentials
DROP POLICY IF EXISTS "whatsapp_creds_select" ON whatsapp_credentials;
DROP POLICY IF EXISTS "whatsapp_creds_insert" ON whatsapp_credentials;
DROP POLICY IF EXISTS "whatsapp_creds_update" ON whatsapp_credentials;
DROP POLICY IF EXISTS "whatsapp_creds_delete" ON whatsapp_credentials;

CREATE POLICY "whatsapp_creds_select" ON whatsapp_credentials FOR SELECT 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "whatsapp_creds_insert" ON whatsapp_credentials FOR INSERT 
WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "whatsapp_creds_update" ON whatsapp_credentials FOR UPDATE 
USING (is_super_admin() OR clinic_id = get_user_clinic_id());

CREATE POLICY "whatsapp_creds_delete" ON whatsapp_credentials FOR DELETE 
USING (is_super_admin());

-- ============================================
-- VERIFICAR RESULTADO
-- ============================================
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND rowsecurity = true
ORDER BY tablename;