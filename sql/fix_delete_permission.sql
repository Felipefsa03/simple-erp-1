-- Conceder permissão de DELETE para o role authenticated em todas as tabelas (incluindo patients)
GRANT DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Garantir que a policy de pacientes está correta (reforço)
DROP POLICY IF EXISTS "patients_delete" ON patients;
CREATE POLICY "patients_delete" ON patients FOR DELETE USING (is_super_admin() OR clinic_id = get_user_clinic_id());
