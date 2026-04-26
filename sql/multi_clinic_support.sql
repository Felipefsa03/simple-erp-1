-- ============================================
-- SUPORTE A MULTI-FILIAIS (BRANCHES)
-- ============================================

-- 1. Atualizar tabela clinics
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES clinics(id) ON DELETE SET NULL;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS responsible_name TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_clinics_parent ON public.clinics(parent_id);

-- 3. Políticas RLS para suporte a filiais (Opcional se usar Service Role, mas recomendado)
-- Permite que usuários vejam clínicas onde são membros OU que são filiais da sua clínica matriz
-- Para simplificar neste estágio, vamos focar na persistência.

-- 4. Comentários para documentação
COMMENT ON COLUMN public.clinics.parent_id IS 'ID da clínica matriz. Se preenchido, esta clínica é uma filial.';
COMMENT ON COLUMN public.clinics.responsible_name IS 'Nome do responsável direto por esta unidade.';
COMMENT ON COLUMN public.clinics.address IS 'Endereço físico completo da unidade.';

SELECT 'Colunas de filiais adicionadas com sucesso!' as status;
