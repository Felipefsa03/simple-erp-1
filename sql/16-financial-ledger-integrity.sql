-- ============================================================================
-- Financeiro: persistência de comissão e integridade do livro-caixa
-- Execute no SQL Editor do Supabase antes do deploy desta alteração.
-- ============================================================================

BEGIN;

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS patient_name text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS professional_name text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS material_cost numeric(12,2);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS commission_amount numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS service_time_min integer;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE INDEX IF NOT EXISTS idx_transactions_clinic_paid_at
  ON public.transactions(clinic_id, paid_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_commission_transaction
  ON public.accounts(transaction_id)
  WHERE deleted_at IS NULL AND category = 'Comissão Profissional';

-- Recupera a comissão de atendimentos históricos que já possuem profissional,
-- mas foram gravados antes de commission_amount existir no banco.
UPDATE public.transactions t
SET commission_amount = round(t.amount * coalesce(p.commission, 0) / 100.0, 2)
FROM public.professionals p
WHERE t.professional_id = p.id
  AND t.type = 'income'
  AND coalesce(t.commission_amount, 0) = 0
  AND coalesce(p.commission, 0) > 0;

-- Cria uma única conta a pagar para cada comissão de receita já recebida.
-- A comissão continua pendente até que a clínica registre o pagamento ao profissional.
INSERT INTO public.accounts (
  id, clinic_id, type, description, counterparty, category, value, paid,
  due_date, status, transaction_id, recurrence, notes, created_at, updated_at
)
SELECT
  gen_random_uuid(), t.clinic_id, 'payable',
  'Comissão - ' || coalesce(t.description, 'Atendimento'),
  coalesce(t.professional_name, 'Profissional'),
  'Comissão Profissional', t.commission_amount, 0,
  coalesce(t.paid_at::date, current_date), 'pending', t.id, 'none',
  'Comissão recuperada do atendimento financeiro.', now(), now()
FROM public.transactions t
WHERE t.type = 'income'
  AND t.status = 'paid'
  AND coalesce(t.commission_amount, 0) > 0
  AND t.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.transaction_id = t.id
      AND a.category = 'Comissão Profissional'
      AND a.deleted_at IS NULL
  );

COMMIT;
