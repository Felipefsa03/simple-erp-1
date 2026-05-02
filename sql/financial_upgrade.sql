-- ============================================
-- Clinxia ERP - Financial Module Upgrade
-- Novas tabelas para módulo financeiro completo
-- ============================================

-- 1. CONTAS A PAGAR / RECEBER
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('receivable', 'payable')),
    description TEXT NOT NULL,
    counterparty TEXT,
    category TEXT,
    value NUMERIC NOT NULL DEFAULT 0,
    paid NUMERIC DEFAULT 0,
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    recurrence TEXT DEFAULT 'none' CHECK (recurrence IN ('none', 'monthly', 'weekly', 'yearly')),
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_accounts_updated BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE INDEX IF NOT EXISTS idx_accounts_clinic ON accounts(clinic_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_due ON accounts(due_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts_select" ON accounts FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "accounts_insert" ON accounts FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "accounts_update" ON accounts FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "accounts_delete" ON accounts FOR DELETE USING (is_super_admin() OR clinic_id = get_user_clinic_id());

-- 2. NOTAS FISCAIS (persistência)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    number TEXT,
    serie TEXT DEFAULT '1',
    access_key TEXT,
    customer_name TEXT NOT NULL,
    customer_doc TEXT,
    value NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'cancelled', 'processing', 'rejected')),
    protocol TEXT,
    xml_url TEXT,
    pdf_url TEXT,
    reference TEXT,
    issue_date DATE,
    items JSONB DEFAULT '[]',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_clinic ON invoices(clinic_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "invoices_insert" ON invoices FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "invoices_update" ON invoices FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "invoices_delete" ON invoices FOR DELETE USING (is_super_admin() OR clinic_id = get_user_clinic_id());

-- 3. CATEGORIAS FINANCEIRAS
CREATE TABLE IF NOT EXISTS financial_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    parent_id UUID REFERENCES financial_categories(id) ON DELETE SET NULL,
    color TEXT,
    icon TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fin_categories_clinic ON financial_categories(clinic_id);

-- RLS
ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_categories_select" ON financial_categories FOR SELECT USING (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "fin_categories_insert" ON financial_categories FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "fin_categories_update" ON financial_categories FOR UPDATE USING (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "fin_categories_delete" ON financial_categories FOR DELETE USING (is_super_admin() OR clinic_id = get_user_clinic_id());

-- 4. EXPANDIR TABELA TRANSACTIONS (adicionar campos que faltam)
DO $$ BEGIN
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS patient_name TEXT;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS professional_name TEXT;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_url TEXT;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS asaas_status TEXT;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Algumas colunas já existem, ignorando...';
END $$;

-- 5. COMENTÁRIOS
COMMENT ON TABLE accounts IS 'Contas a pagar e receber das clínicas';
COMMENT ON TABLE invoices IS 'Notas fiscais eletrônicas emitidas';
COMMENT ON TABLE financial_categories IS 'Categorias financeiras configuráveis por clínica';
