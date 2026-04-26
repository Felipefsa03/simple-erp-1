-- ============================================
-- CORREÇÃO DE COLUNAS DA TABELA CLINICS
-- ============================================

-- 1. Renomear is_active para active se existir
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clinics' AND column_name='is_active') THEN
        ALTER TABLE public.clinics RENAME COLUMN is_active TO active;
    END IF;
END $$;

-- 2. Garantir que a coluna active existe e é booleana
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clinics' AND column_name='active') THEN
        ALTER TABLE public.clinics ADD COLUMN active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 3. Garantir outras colunas necessárias para provisionamento e filiais
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS responsible_name TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'cpf';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS document_number TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS modality TEXT DEFAULT 'odonto';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS email TEXT;

-- 4. Forçar recarregamento do cache do PostgREST (Supabase)
NOTIFY pgrst, 'reload schema';

SELECT 'Colunas da tabela clinics ajustadas e schema recarregado!' as status;
