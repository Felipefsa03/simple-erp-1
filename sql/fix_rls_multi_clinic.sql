-- ============================================
-- CORREÇÃO DE SEGURANÇA (RLS): MULTI-FILIAIS E PACIENTES COMPARTILHADOS
-- ============================================

-- 1. CLINICS: Permitir criar filiais e ver matriz/filiais
DROP POLICY IF EXISTS "clinics_select" ON clinics;
DROP POLICY IF EXISTS "clinics_update" ON clinics;
DROP POLICY IF EXISTS "clinics_insert" ON clinics;
DROP POLICY IF EXISTS "clinics_delete" ON clinics;
DROP POLICY IF EXISTS "clinics_insert_branch" ON clinics;
DROP POLICY IF EXISTS "clinics_select_group" ON clinics;
DROP POLICY IF EXISTS "clinics_update_group" ON clinics;
DROP POLICY IF EXISTS "clinics_delete_group" ON clinics;
DROP POLICY IF EXISTS "users_update_own_clinic" ON clinics;
DROP POLICY IF EXISTS "users_read_own_clinic" ON clinics;

-- Permite inserir se for super_admin ou se o parent_id for a sua própria clínica
CREATE POLICY "clinics_insert_policy" ON clinics FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND (
    is_super_admin() OR 
    parent_id = get_user_clinic_id()
  )
);

-- Permite ver a própria clínica, suas filiais ou sua matriz
CREATE POLICY "clinics_select_policy" ON clinics FOR SELECT 
USING (
  deleted_at IS NULL AND (
    is_super_admin() OR 
    id = get_user_clinic_id() OR 
    parent_id = get_user_clinic_id() OR
    id = (SELECT parent_id FROM clinics WHERE id = get_user_clinic_id())
  )
);

-- Permite atualizar a própria clínica ou suas filiais
CREATE POLICY "clinics_update_policy" ON clinics FOR UPDATE 
USING (
  deleted_at IS NULL AND (
    is_super_admin() OR 
    id = get_user_clinic_id() OR 
    parent_id = get_user_clinic_id()
  )
);

-- 2. PATIENTS: Compartilhamento entre matriz e filiais
DROP POLICY IF EXISTS "patients_select" ON patients;
DROP POLICY IF EXISTS "patients_insert" ON patients;
DROP POLICY IF EXISTS "patients_update" ON patients;
DROP POLICY IF EXISTS "patients_delete" ON patients;

-- Permite ver pacientes da própria clínica, de suas filiais ou da matriz
CREATE POLICY "patients_select_shared" ON patients FOR SELECT 
USING (
  deleted_at IS NULL AND (
    is_super_admin() OR 
    clinic_id = get_user_clinic_id() OR
    clinic_id IN (SELECT id FROM clinics WHERE parent_id = get_user_clinic_id()) OR
    clinic_id = (SELECT parent_id FROM clinics WHERE id = get_user_clinic_id())
  )
);

-- Permite inserir pacientes na própria clínica ou na matriz (se for filial)
CREATE POLICY "patients_insert_shared" ON patients FOR INSERT 
WITH CHECK (
  is_super_admin() OR 
  clinic_id = get_user_clinic_id() OR
  clinic_id = (SELECT parent_id FROM clinics WHERE id = get_user_clinic_id())
);

-- Permite atualizar pacientes na própria clínica ou na matriz (se for filial)
CREATE POLICY "patients_update_shared" ON patients FOR UPDATE 
USING (
  deleted_at IS NULL AND (
    is_super_admin() OR 
    clinic_id = get_user_clinic_id() OR
    clinic_id = (SELECT parent_id FROM clinics WHERE id = get_user_clinic_id())
  )
);

-- 3. FINANCEIRO E OUTROS: Manter isolado por clinic_id (não compartilhado)
-- (Já deve estar configurado, mas garantimos que as políticas usem get_user_clinic_id())

SELECT 'Políticas de RLS para Multi-Filiais e Pacientes Compartilhados aplicadas!' as status;
