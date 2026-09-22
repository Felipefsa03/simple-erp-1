-- ============================================================
-- Migração: colunas do gateway de pagamento (Stripe) 
-- Executar no SQL Editor do Supabase UMA vez.
-- ============================================================

-- 1. Colunas novas na integration_config
ALTER TABLE public.integration_config
  ADD COLUMN IF NOT EXISTS stripe JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.integration_config
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'mercadopago';

-- 2. Coluna paid_at em signup_provision_intents (pagamento Stripe no cadastro)
ALTER TABLE public.signup_provision_intents
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- 3. RPC exec_sql para o backend aplicar migrações de colunas
--    automaticamente no startup (apenas service_role pode chamar).
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE query;
END;
$$;

REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM anon;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

-- 4. Verificação
SELECT column_name FROM information_schema.columns
WHERE table_name = 'integration_config'
  AND column_name IN ('stripe', 'payment_gateway');
