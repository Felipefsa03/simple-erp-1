-- ============================================
-- CORREÇÃO DE PLANOS E CONSTRAINTS
-- ============================================

-- 1. Remover a constraint que está bloqueando a inserção
ALTER TABLE public.clinics DROP CONSTRAINT IF EXISTS clinics_plan_check;
ALTER TABLE public.clinics DROP CONSTRAINT IF EXISTS clinics_plan_valid;

-- 2. Atualizar a coluna plan para aceitar os valores do frontend
ALTER TABLE public.clinics 
  ALTER COLUMN plan SET DEFAULT 'basico',
  ADD CONSTRAINT clinics_plan_valid CHECK (plan IN ('basico', 'profissional', 'premium', 'basic', 'professional', 'enterprise'));

-- 3. Atualizar registros existentes se necessário (opcional)
UPDATE public.clinics SET plan = 'basico' WHERE plan = 'basic';
UPDATE public.clinics SET plan = 'profissional' WHERE plan = 'professional';
UPDATE public.clinics SET plan = 'premium' WHERE plan = 'enterprise';

SELECT 'Constraint de planos atualizada!' as status;
