-- ============================================
-- SCRIPT DE CORREÇÃO DEFINITIVA (MIGRATION COMPLETA)
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Tabela clinics (Colunas de Configuração)
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
    "agendaConfirmation": true,
    "patientReminder": true,
    "stockAlert": true,
    "paymentReceived": true,
    "newPatient": true,
    "noShow": false,
    "dailySummary": true
}';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS subscription_status TEXT;

-- 2. Tabela transactions (Idempotência e Financeiro)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS idempotency_key UUID DEFAULT gen_random_uuid();
ALTER TABLE public.transactions ALTER COLUMN amount SET DEFAULT 0;

-- 3. Tabela medical_records (Bloqueio de prontuário)
ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;
ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- 4. Tabela stock_items (Ajuste de tipos se necessário)
-- Já existem no base, mas garantindo consistência
ALTER TABLE public.stock_items ALTER COLUMN qty SET DEFAULT 0;
ALTER TABLE public.stock_items ALTER COLUMN min_qty SET DEFAULT 0;
ALTER TABLE public.stock_items ALTER COLUMN cost SET DEFAULT 0;

-- 5. Criar tabela stock_movements se não existir
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    stock_item_id UUID REFERENCES stock_items(id) ON DELETE CASCADE,
    qty NUMERIC NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Criar tabela treatment_plans se não existir
CREATE TABLE IF NOT EXISTS public.treatment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Plano de Tratamento',
    items JSONB DEFAULT '[]',
    status TEXT DEFAULT 'active',
    total_estimated NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 7. Criar tabela audit_logs se não existir (já deve existir no base, mas garantindo)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    user_id UUID,
    action TEXT NOT NULL,
    entity TEXT,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Habilitar RLS em todas as novas tabelas
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 9. Políticas RLS Básicas (Permissivas por Clínica para simplificar)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'stock_movements_clinic_access') THEN
        CREATE POLICY stock_movements_clinic_access ON public.stock_movements FOR ALL USING (clinic_id IS NOT NULL);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'treatment_plans_clinic_access') THEN
        CREATE POLICY treatment_plans_clinic_access ON public.treatment_plans FOR ALL USING (clinic_id IS NOT NULL);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_logs_clinic_access') THEN
        CREATE POLICY audit_logs_clinic_access ON public.audit_logs FOR ALL USING (clinic_id IS NOT NULL);
    END IF;
END $$;

-- 10. Índices para performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_clinic ON public.stock_movements(clinic_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_clinic ON public.treatment_plans(clinic_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic ON public.audit_logs(clinic_id);

SELECT 'Migration concluída com sucesso!' as status;
