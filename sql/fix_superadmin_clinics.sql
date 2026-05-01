-- ============================================
-- Fix: Garantir colunas necessárias na tabela clinics
-- e configurar RLS para leitura do Super Admin
-- ============================================

-- 1. Adicionar coluna last_payment_at se não existir
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ;

-- 2. Garantir que expires_at existe
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 3. RLS: Permitir SELECT para usuários autenticados na tabela clinics
-- Isso permite que o super admin veja todas as clínicas
DO $$
BEGIN
  -- Habilitar RLS se não estiver
  ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
  
  -- Criar política de leitura para todos os autenticados (super admin precisa ver tudo)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'clinics' AND policyname = 'super_admin_read_all_clinics'
  ) THEN
    CREATE POLICY super_admin_read_all_clinics ON clinics
      FOR SELECT
      USING (true);
  END IF;

  -- Criar política de UPDATE para permitir confirmar pagamento
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'clinics' AND policyname = 'super_admin_update_clinics'
  ) THEN
    CREATE POLICY super_admin_update_clinics ON clinics
      FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 4. RLS: Permitir SELECT na tabela users para buscar admins de cada clínica
DO $$
BEGIN
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'authenticated_read_users'
  ) THEN
    CREATE POLICY authenticated_read_users ON users
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Verificar resultado
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clinics' ORDER BY ordinal_position;
