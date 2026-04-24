-- ============================================
-- BLOCO 4: RLS e Políticas
-- Execute DEPOIS do Bloco 3
-- ============================================

-- Habilitar RLS
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurances ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Pacientes
CREATE POLICY "patients_select" ON patients FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "patients_insert" ON patients FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "patients_update" ON patients FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "patients_delete" ON patients FOR DELETE USING (is_super_admin() OR clinic_id = get_user_clinic_id());

-- Agendamentos
CREATE POLICY "appointments_select" ON appointments FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "appointments_insert" ON appointments FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "appointments_update" ON appointments FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "appointments_delete" ON appointments FOR DELETE USING (is_super_admin() OR clinic_id = get_user_clinic_id());

-- Transações
CREATE POLICY "transactions_select" ON transactions FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "transactions_update" ON transactions FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "transactions_delete" ON transactions FOR DELETE USING (is_super_admin() OR clinic_id = get_user_clinic_id());

-- Usuários
CREATE POLICY "users_select" ON users FOR SELECT USING (deleted_at IS NULL AND (id = auth.uid() OR is_super_admin() OR (clinic_id IS NOT NULL AND clinic_id = get_user_clinic_id())));
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (is_super_admin() OR id = auth.uid() OR (clinic_id IS NOT NULL AND clinic_id = get_user_clinic_id() AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'owner', 'super_admin')));
CREATE POLICY "users_update" ON users FOR UPDATE USING (deleted_at IS NULL AND (id = auth.uid() OR is_super_admin() OR (clinic_id IS NOT NULL AND clinic_id = get_user_clinic_id() AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'owner', 'super_admin'))));

-- Clínicas
CREATE POLICY "clinics_select" ON clinics FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR id = get_user_clinic_id()));
CREATE POLICY "clinics_update" ON clinics FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR id = get_user_clinic_id()));

-- Profissionais
CREATE POLICY "professionals_select" ON professionals FOR SELECT USING (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "professionals_insert" ON professionals FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "professionals_update" ON professionals FOR UPDATE USING (is_super_admin() OR clinic_id = get_user_clinic_id());

-- Serviços
CREATE POLICY "services_select" ON services FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "services_insert" ON services FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "services_update" ON services FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));

-- Prontuários
CREATE POLICY "medical_records_select" ON medical_records FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "medical_records_insert" ON medical_records FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "medical_records_update" ON medical_records FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));

-- Estoque
CREATE POLICY "stock_select" ON stock_items FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "stock_insert" ON stock_items FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "stock_update" ON stock_items FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));

-- Convênios
CREATE POLICY "insurances_select" ON insurances FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "insurances_insert" ON insurances FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "insurances_update" ON insurances FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));

-- Filiais
CREATE POLICY "branches_select" ON branches FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "branches_insert" ON branches FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "branches_update" ON branches FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));

-- Integrações
CREATE POLICY "integrations_select" ON clinic_integrations FOR SELECT USING (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "integrations_insert" ON clinic_integrations FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "integrations_update" ON clinic_integrations FOR UPDATE USING (is_super_admin() OR clinic_id = get_user_clinic_id());

-- Integrações globais
CREATE POLICY "system_integrations_admin" ON system_integrations FOR ALL USING (is_super_admin());

-- Códigos de senha
CREATE POLICY "password_codes_own" ON password_codes FOR ALL USING (user_id = auth.uid());
