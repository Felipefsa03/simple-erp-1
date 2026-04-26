-- ============================================
-- CORREÇÃO DEFINITIVA: COLUNAS DE FILIAIS EM CLINICS
-- ============================================

-- 1. Garantir que as colunas existam na tabela clinics
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS responsible_name TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Se a coluna address não existir (algumas versões já tem), adicionar
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clinics' AND column_name='address') THEN
        ALTER TABLE public.clinics ADD COLUMN address TEXT;
    END IF;
END $$;

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_clinics_parent ON public.clinics(parent_id);

-- 4. Ajustar RLS para permitir inserção de filiais por administradores
-- (Isso assume que o usuário tem permissão para inserir na tabela clinics)
-- Se houver erro de permissão, pode ser necessário ajustar as políticas.

SELECT 'Colunas is_active, parent_id e responsible_name adicionadas!' as status;
