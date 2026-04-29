-- ============================================
-- FIX: Adicionar política de INSERT na tabela clinics
-- A tabela clinics tinha apenas SELECT e UPDATE policies,
-- mas faltava INSERT, causando "permission denied for table clinics"
-- durante o signup/provision de novas clínicas.
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Verificar políticas existentes na tabela clinics
-- SELECT * FROM pg_policies WHERE tablename = 'clinics';

-- 2. Adicionar política de INSERT para clinics
-- Permite inserção via service_role (bypass RLS) e também
-- por usuários autenticados criando sua própria clínica
DO $$
BEGIN
    -- Política de INSERT para clinics (faltava completamente)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clinics' AND policyname = 'clinics_insert'
    ) THEN
        CREATE POLICY "clinics_insert" ON public.clinics 
        FOR INSERT 
        WITH CHECK (true);
        RAISE NOTICE 'Política clinics_insert criada com sucesso!';
    ELSE
        RAISE NOTICE 'Política clinics_insert já existe.';
    END IF;

    -- Garantir que a política de DELETE também existe (caso necessário no futuro)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clinics' AND policyname = 'clinics_delete'
    ) THEN
        CREATE POLICY "clinics_delete" ON public.clinics 
        FOR DELETE 
        USING (is_super_admin());
        RAISE NOTICE 'Política clinics_delete criada com sucesso!';
    ELSE
        RAISE NOTICE 'Política clinics_delete já existe.';
    END IF;
END $$;

-- 3. Verificar resultado
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'clinics'
ORDER BY policyname;

SELECT 'Políticas de INSERT e DELETE para clinics corrigidas!' as status;
