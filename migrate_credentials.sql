-- ============================================
-- MIGRAÇÃO: Credenciais Seguras para Systema
-- Executar no Supabase SQL Editor
-- ============================================

-- 1. Criar tabela para segredos (só super_admin acessa)
CREATE TABLE IF NOT EXISTS public.system_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.system_secrets ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas
DROP POLICY IF EXISTS "system_secrets_all" ON public.system_secrets;
DROP POLICY IF EXISTS "system_secrets_select" ON public.system_secrets;
DROP POLICY IF EXISTS "system_secrets_insert" ON public.system_secrets;
DROP POLICY IF EXISTS "system_secrets_update" ON public.system_secrets;
DROP POLICY IF EXISTS "system_secrets_delete" ON public.system_secrets;

-- 4. Política: só super_admin pode acessar
CREATE POLICY "system_secrets_super_admin"
ON public.system_secrets
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_system_secrets_key ON public.system_secrets(key);

-- 6. Migrar dados existentes do integration_config
-- (só insere se ainda não existir)
INSERT INTO public.system_secrets (key, value, description)
SELECT 'mp_access_token', mp_access_token, 'Access Token Mercado Pago'
FROM public.integration_config
WHERE clinic_id = '00000000-0000-0000-0000-000000000001'
  AND mp_access_token IS NOT NULL
  AND mp_access_token != ''
  AND NOT EXISTS (SELECT 1 FROM public.system_secrets WHERE key = 'mp_access_token')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_secrets (key, value, description)
SELECT 'mp_webhook_secret', mp_webhook_secret, 'Webhook Secret Mercado Pago'
FROM public.integration_config
WHERE clinic_id = '00000000-0000-0000-0000-000000000001'
  AND mp_webhook_secret IS NOT NULL
  AND mp_webhook_secret != ''
  AND NOT EXISTS (SELECT 1 FROM public.system_secrets WHERE key = 'mp_webhook_secret')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_secrets (key, value, description)
SELECT 'asaas_api_key', asaas_api_key, 'API Key Asaas'
FROM public.integration_config
WHERE clinic_id = '00000000-0000-0000-0000-000000000001'
  AND asaas_api_key IS NOT NULL
  AND asaas_api_key != ''
  AND NOT EXISTS (SELECT 1 FROM public.system_secrets WHERE key = 'asaas_api_key')
ON CONFLICT (key) DO NOTHING;

-- 7. Atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_system_secrets_updated_at ON public.system_secrets;
CREATE TRIGGER update_system_secrets_updated_at
  BEFORE UPDATE ON public.system_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Verificar migração
SELECT key, left(value, 10) as value_preview FROM public.system_secrets ORDER BY key;

-- 9. Reload PostgREST
NOTIFY pgrst, 'reload schema';

SELECT 'Migração concluída! system_secrets criada e dados migrados.' as status;