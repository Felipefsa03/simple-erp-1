-- ============================================
-- GARANTIA DE COMPARTILHAMENTO DE PACIENTES
-- ============================================

-- 1. Remover políticas antigas de pacientes
DROP POLICY IF EXISTS "patients_select_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_update_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_delete_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_select_shared" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_shared" ON public.patients;
DROP POLICY IF EXISTS "patients_update_shared" ON public.patients;

-- 2. Nova política de SELEÇÃO ultra-flexível para a rede de clínicas
CREATE POLICY "patients_select_v4" ON public.patients FOR SELECT 
USING (
  deleted_at IS NULL AND (
    is_super_admin() OR 
    clinic_id = get_user_clinic_id() OR -- Sou da mesma clínica
    clinic_id IN (SELECT id FROM clinics WHERE parent_id = get_user_clinic_id()) OR -- É uma filial minha
    clinic_id = (SELECT parent_id FROM clinics WHERE id = get_user_clinic_id()) OR -- É minha matriz
    clinic_id IN (SELECT id FROM clinics WHERE parent_id = (SELECT parent_id FROM clinics WHERE id = get_user_clinic_id())) -- É uma clínica irmã
  )
);

-- 3. Nova política de INSERÇÃO (Salvar sempre na clínica atual ou matriz)
CREATE POLICY "patients_insert_v4" ON public.patients FOR INSERT 
WITH CHECK (
  is_super_admin() OR 
  clinic_id = get_user_clinic_id() OR
  clinic_id = (SELECT parent_id FROM clinics WHERE id = get_user_clinic_id())
);

-- 4. Nova política de ATUALIZAÇÃO
CREATE POLICY "patients_update_v4" ON public.patients FOR UPDATE 
USING (
  deleted_at IS NULL AND (
    is_super_admin() OR 
    clinic_id = get_user_clinic_id() OR
    clinic_id = (SELECT parent_id FROM clinics WHERE id = get_user_clinic_id())
  )
);

SELECT 'Políticas de Pacientes Compartilhados garantidas!' as status;
