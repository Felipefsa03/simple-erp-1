-- ============================================
-- Script de migração completo para corrigir erros
-- Executar no Supabase SQL Editor
-- ============================================

-- 1. Adicionar coluna idempotency_key na transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS idempotency_key UUID DEFAULT gen_random_uuid();

-- 2. Adicionar coluna locked_at na medical_records (se ainda não existir)
ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;

-- 3. Criar tabela treatment_plans se não existir
CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  clinic_id UUID NOT NULL,
  title TEXT DEFAULT 'Plano de Tratamento',
  items JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active',
  total_estimated NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 4. Criar índices para treatment_plans
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON public.treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_clinic ON public.treatment_plans(clinic_id);

-- 5. Remover políticas antigas de treatment_plans (se existirem com erro)
DROP POLICY IF NOT EXISTS "Tratamento planos acesso por clínica" ON public.treatment_plans;
DROP POLICY IF NOT EXISTS "Tratamento planos super_admin" ON public.treatment_plans;

-- 6. Habilitar RLS para treatment_plans
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas RLS para treatment_plans (permissivas - permitem insert/update se clinic_id for válido)
CREATE POLICY "treatment_plans_all_clinic"
ON public.treatment_plans
FOR ALL
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "treatment_plans_super_admin"
ON public.treatment_plans
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- 8. Verificar resultado
SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'idempotency_key';
SELECT column_name FROM information_schema.columns WHERE table_name = 'medical_records' AND column_name IN ('locked', 'locked_at');
SELECT 'treatment_plans' as result WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'treatment_plans');