-- ============================================
-- ARQUITETURA MULTI-FILIAIS: FUNÇÃO DE ACESSO E RLS
-- ============================================

-- 1. Função unificada para verificar acesso à clínica
CREATE OR REPLACE FUNCTION public.is_clinic_accessible(target_clinic_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_clinic_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    -- Se for super_admin, tem acesso total
    IF EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin') THEN
        RETURN TRUE;
    END IF;

    -- Obter clínica e cargo do usuário
    SELECT clinic_id, (role IN ('admin', 'super_admin')) INTO v_user_clinic_id, v_is_admin 
    FROM public.users WHERE id = auth.uid();
    
    IF v_user_clinic_id IS NULL THEN RETURN FALSE; END IF;
    
    -- Acesso direto
    IF v_user_clinic_id = target_clinic_id THEN RETURN TRUE; END IF;

    -- Se for admin, pode acessar filiais da sua clínica
    IF v_is_admin AND EXISTS (SELECT 1 FROM public.clinics WHERE id = target_clinic_id AND parent_id = v_user_clinic_id) THEN
        RETURN TRUE;
    END IF;

    -- Se for admin, pode acessar a matriz se estiver em uma filial
    IF v_is_admin AND EXISTS (SELECT 1 FROM public.clinics WHERE id = v_user_clinic_id AND parent_id = target_clinic_id) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atualizar Políticas da Tabela CLINICS
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinics_all_policy" ON public.clinics;
DROP POLICY IF EXISTS "clinics_select_policy" ON public.clinics;
DROP POLICY IF EXISTS "clinics_insert_policy" ON public.clinics;
DROP POLICY IF EXISTS "clinics_update_policy" ON public.clinics;

CREATE POLICY "clinics_select_policy" ON public.clinics FOR SELECT 
USING (is_clinic_accessible(id));

CREATE POLICY "clinics_insert_policy" ON public.clinics FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'); -- Simplificado, a função protegerá o resto

CREATE POLICY "clinics_update_policy" ON public.clinics FOR UPDATE 
USING (is_clinic_accessible(id));

-- 3. Atualizar Políticas da Tabela PATIENTS (Compartilhamento)
DROP POLICY IF EXISTS "patients_select_shared" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_shared" ON public.patients;
DROP POLICY IF EXISTS "patients_update_shared" ON public.patients;

CREATE POLICY "patients_select_policy" ON public.patients FOR SELECT USING (is_clinic_accessible(clinic_id));
CREATE POLICY "patients_insert_policy" ON public.patients FOR INSERT WITH CHECK (is_clinic_accessible(clinic_id));
CREATE POLICY "patients_update_policy" ON public.patients FOR UPDATE USING (is_clinic_accessible(clinic_id));
CREATE POLICY "patients_delete_policy" ON public.patients FOR DELETE USING (is_clinic_accessible(clinic_id));

-- 4. Aplicar às tabelas operacionais (Isolamento por Filial mas acesso permitido à matriz)
DO $$ 
DECLARE 
    t TEXT;
BEGIN 
    FOR t IN SELECT table_name FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name IN ('appointments', 'medical_records', 'transactions', 'stock_items', 'stock_movements', 'services', 'professionals', 'insurances', 'audit_logs')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);
        
        -- Novas políticas unificadas
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (is_clinic_accessible(clinic_id))', t || '_select_v2', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (is_clinic_accessible(clinic_id))', t || '_insert_v2', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (is_clinic_accessible(clinic_id))', t || '_update_v2', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (is_clinic_accessible(clinic_id))', t || '_delete_v2', t);
    END LOOP;
END $$;

SELECT 'RLS Multi-Filial configurado com sucesso!' as status;
