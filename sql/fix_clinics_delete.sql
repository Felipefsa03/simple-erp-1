-- ============================================
-- Correção de Exclusão de Filiais e RLS
-- ============================================

-- 1. Garante que a coluna deleted_at existe para exclusão lógica (opcional)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM medical_records.columns WHERE table_name = 'clinics' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "clinics_delete_policy" ON public.clinics;
DROP POLICY IF EXISTS "clinics_select_policy" ON public.clinics;
DROP POLICY IF EXISTS "clinics_select_safe" ON public.clinics;
DROP POLICY IF EXISTS "clinics_delete_safe" ON public.clinics;

-- 3. Nova política de SELECT estável (SEM RECURSÃO)
-- Permite que o usuário veja sua própria clínica e suas filiais
CREATE POLICY "clinics_select_safe" ON public.clinics FOR SELECT 
USING (
  auth.role() = 'authenticated' AND (
    is_super_admin() OR 
    id = get_user_clinic_id() OR 
    parent_id = get_user_clinic_id()
  )
);

-- 4. Nova política de DELETE estável
-- Permite que o proprietário (Matriz) exclua suas filiais
CREATE POLICY "clinics_delete_safe" ON public.clinics FOR DELETE 
USING (
  auth.role() = 'authenticated' AND (
    is_super_admin() OR 
    parent_id = get_user_clinic_id()
  )
);

-- 5. Nova política de UPDATE segura
DROP POLICY IF EXISTS "clinics_update_policy" ON public.clinics;
CREATE POLICY "clinics_update_safe" ON public.clinics FOR UPDATE 
USING (
  auth.role() = 'authenticated' AND (
    id = get_user_clinic_id() OR 
    parent_id = get_user_clinic_id() OR
    is_super_admin()
  )
);

SELECT 'Políticas de clínicas atualizadas com sucesso!' as status;
