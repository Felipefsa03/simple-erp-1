-- ============================================
-- CORREÇÕES CRÍTICAS DE AUDITORIA
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Remover CHECK constraint antiga de transactions e adicionar nova com 'awaiting_payment'
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_status_check 
  CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded', 'awaiting_payment'));

-- 2. Adicionar colunas faltantes em transactions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'idempotency_key') THEN
    ALTER TABLE transactions ADD COLUMN idempotency_key TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'commission_amount') THEN
    ALTER TABLE transactions ADD COLUMN commission_amount NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'service_time_min') THEN
    ALTER TABLE transactions ADD COLUMN service_time_min INTEGER;
  END IF;
END $$;

-- 3. Adicionar colunas faltantes em appointments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'professional_user_id') THEN
    ALTER TABLE appointments ADD COLUMN professional_user_id UUID REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'finished_at') THEN
    ALTER TABLE appointments ADD COLUMN finished_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'service_time_min') THEN
    ALTER TABLE appointments ADD COLUMN service_time_min INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'started_at') THEN
    ALTER TABLE appointments ADD COLUMN started_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'base_value') THEN
    ALTER TABLE appointments ADD COLUMN base_value NUMERIC DEFAULT 0;
  END IF;
END $$;

-- 4. Adicionar colunas faltantes em medical_records
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_records' AND column_name = 'professional_user_id') THEN
    ALTER TABLE medical_records ADD COLUMN professional_user_id UUID REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_records' AND column_name = 'locked') THEN
    ALTER TABLE medical_records ADD COLUMN locked BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_records' AND column_name = 'locked_at') THEN
    ALTER TABLE medical_records ADD COLUMN locked_at TIMESTAMPTZ;
  END IF;
END $$;

-- 5. Adicionar coluna photos em patients (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'photos') THEN
    ALTER TABLE patients ADD COLUMN photos JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 6. Adicionar notification_settings em clinics (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'notification_settings') THEN
    ALTER TABLE clinics ADD COLUMN notification_settings JSONB DEFAULT '{}';
  END IF;
END $$;

-- 7. Verificar funções RLS existem
SELECT routine_name FROM information_schema.routines WHERE routine_name IN ('get_user_clinic_id', 'is_super_admin');

-- 8. Verificar se RLS está habilitado em todas as tabelas
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false ORDER BY tablename;

-- 9. Verificar colunas faltantes em transactions
SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' ORDER BY column_name;

-- 10. Verificar CHECK constraint atual de transactions
SELECT conname, pg_get_constraintdef(oid) as definition FROM pg_constraint WHERE conrelid = 'transactions'::regclass;
