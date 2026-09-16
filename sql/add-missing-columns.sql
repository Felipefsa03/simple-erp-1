-- Adicionar colunas que o código frontend usa mas que não existem no banco
-- Execute este SQL no Supabase SQL Editor

-- 1. commission_amount na tabela transactions (comissão do profissional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'commission_amount'
  ) THEN
    ALTER TABLE transactions ADD COLUMN commission_amount numeric DEFAULT 0;
    COMMENT ON COLUMN transactions.commission_amount IS 'Valor da comissão do profissional calculado no finalizeAppointment';
  END IF;
END $$;

-- 2. service_time_min na tabela transactions (tempo do serviço em minutos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'service_time_min'
  ) THEN
    ALTER TABLE transactions ADD COLUMN service_time_min integer;
  END IF;
END $$;

-- 3. professional_user_id na tabela appointments (FK para users.id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'professional_user_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN professional_user_id uuid REFERENCES users(id);
  END IF;
END $$;

-- 4. professional_user_id na tabela medical_records (FK para users.id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medical_records' AND column_name = 'professional_user_id'
  ) THEN
    ALTER TABLE medical_records ADD COLUMN professional_user_id uuid REFERENCES users(id);
  END IF;
END $$;

-- 5. locked e locked_at na tabela medical_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medical_records' AND column_name = 'locked'
  ) THEN
    ALTER TABLE medical_records ADD COLUMN locked boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medical_records' AND column_name = 'locked_at'
  ) THEN
    ALTER TABLE medical_records ADD COLUMN locked_at timestamptz;
  END IF;
END $$;

-- 6. finished_at e service_time_min na tabela appointments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'finished_at'
  ) THEN
    ALTER TABLE appointments ADD COLUMN finished_at timestamptz;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'service_time_min'
  ) THEN
    ALTER TABLE appointments ADD COLUMN service_time_min integer;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE appointments ADD COLUMN started_at timestamptz;
  END IF;
END $$;

-- 7. base_value na tabela appointments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'base_value'
  ) THEN
    ALTER TABLE appointments ADD COLUMN base_value numeric DEFAULT 0;
  END IF;
END $$;
