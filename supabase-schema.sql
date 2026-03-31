-- ============================================
-- LuminaFlow ERP - Supabase Database Schema
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CLÍNICAS (Multi-tenant)
-- ============================================
CREATE TABLE IF NOT EXISTS clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    logo_url TEXT,
    subscription_plan TEXT DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'professional', 'enterprise')),
    subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'suspended', 'cancelled')),
    subscription_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. USUÁRIOS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'receptionist' CHECK (role IN ('super_admin', 'admin', 'dentist', 'receptionist', 'aesthetician', 'financial')),
    cro TEXT,
    commission_pct NUMERIC DEFAULT 0,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. PACIENTES
-- ============================================
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    cpf TEXT,
    rg TEXT,
    birth_date DATE,
    gender TEXT CHECK (gender IN ('M', 'F', 'OTHER')),
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    notes TEXT,
    allergies TEXT,
    medications TEXT,
    medical_history JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. PROFISSIONAIS
-- ============================================
CREATE TABLE IF NOT EXISTS professionals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    cro TEXT,
    specialty TEXT,
    commission_pct NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. SERVIÇOS
-- ============================================
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    base_price NUMERIC DEFAULT 0,
    avg_duration_min INTEGER DEFAULT 60,
    estimated_cost NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. AGENDAMENTOS
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_min INTEGER DEFAULT 60,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'done', 'cancelled', 'no_show')),
    notes TEXT,
    whatsapp_confirmed BOOLEAN DEFAULT false,
    whatsapp_reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. PRONTUÁRIOS
-- ============================================
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
    anamnese JSONB DEFAULT '{}',
    odontogram JSONB DEFAULT '{}',
    diagnosis TEXT,
    treatment_plan TEXT,
    evolution TEXT,
    prescriptions TEXT,
    attachments TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. TRANSAÇÕES FINANCEIRAS
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT,
    description TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
    payment_method TEXT,
    payment_reference TEXT,
    pix_code TEXT,
    asaas_payment_id TEXT,
    due_date DATE,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. ESTOQUE
-- ============================================
CREATE TABLE IF NOT EXISTS stock_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT DEFAULT 'UN',
    quantity NUMERIC DEFAULT 0,
    min_quantity NUMERIC DEFAULT 0,
    cost_price NUMERIC DEFAULT 0,
    supplier TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. CONVÊNIOS
-- ============================================
CREATE TABLE IF NOT EXISTS insurances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. FILIAIS
-- ============================================
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    responsible_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. INTEGRAÇÕES POR CLÍNICA
-- ============================================
CREATE TABLE IF NOT EXISTS clinic_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    integration_type TEXT NOT NULL CHECK (integration_type IN ('whatsapp', 'asaas', 'google_calendar', 'rd_station', 'meta_ads')),
    status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'pending', 'error')),
    api_token TEXT,
    api_secret TEXT,
    phone_number TEXT,
    webhook_url TEXT,
    extra_config JSONB DEFAULT '{}',
    last_sync_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 13. INTEGRAÇÃO GLOBAL (Sistema)
-- ============================================
CREATE TABLE IF NOT EXISTS system_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_type TEXT NOT NULL UNIQUE CHECK (integration_type IN ('whatsapp_system', 'nfe', 'payment_gateway')),
    status TEXT DEFAULT 'inactive',
    api_token TEXT,
    phone_number TEXT,
    extra_config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 14. CÓDIGOS DE RECUPERAÇÃO DE SENHA
-- ============================================
CREATE TABLE IF NOT EXISTS password_reset_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 15. LOGS DE AUDITORIA
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID,
    user_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índices para appointments
CREATE INDEX IF NOT EXISTS idx_appointments_clinic ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional ON appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Índices para patients
CREATE INDEX IF NOT EXISTS idx_patients_clinic ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_cpf ON patients(cpf);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);

-- Índices para transactions
CREATE INDEX IF NOT EXISTS idx_transactions_clinic ON transactions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_due_date ON transactions(due_date);

-- Índices para medical_records
CREATE INDEX IF NOT EXISTS idx_medical_records_clinic ON medical_records(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_clinic ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurances ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas dados da própria clínica
CREATE POLICY "Users can view own clinic data" ON patients
    FOR SELECT USING (
        clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert own clinic data" ON patients
    FOR INSERT WITH CHECK (
        clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can update own clinic data" ON patients
    FOR UPDATE USING (
        clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can delete own clinic data" ON patients
    FOR DELETE USING (
        clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
    );

-- Mesma política para appointments
CREATE POLICY "Users can view own clinic appointments" ON appointments
    FOR SELECT USING (
        clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert own clinic appointments" ON appointments
    FOR INSERT WITH CHECK (
        clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can update own clinic appointments" ON appointments
    FOR UPDATE USING (
        clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can delete own clinic appointments" ON appointments
    FOR DELETE USING (
        clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
    );

-- Mesma política para transactions
CREATE POLICY "Users can view own clinic transactions" ON transactions
    FOR SELECT USING (
        clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert own clinic transactions" ON transactions
    FOR INSERT WITH CHECK (
        clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can update own clinic transactions" ON transactions
    FOR UPDATE USING (
        clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can delete own clinic transactions" ON transactions
    FOR DELETE USING (
        clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
    );

-- Super Admin pode ver tudo
CREATE POLICY "Super admin can view all clinics" ON clinics
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
    );

-- ============================================
-- DADOS INICIAIS (DEMO)
-- ============================================

-- Inserir clínica demo
INSERT INTO clinics (id, name, cnpj, email, phone, address, city, state, zip_code, subscription_plan, subscription_status)
VALUES 
    ('clinic-1-0000-0000-0000-000000000001', 'Lumina Odontologia', '12.345.678/0001-90', 'contato@luminaodonto.com.br', '(11) 3456-7890', 'Av. Paulista, 1000', 'São Paulo', 'SP', '01310-100', 'professional', 'active'),
    ('clinic-2-0000-0000-0000-000000000002', 'Sorriso Total', '98.765.432/0001-10', 'contato@sorrisototal.com.br', '(21) 3456-7891', 'Rua do Catete, 500', 'Rio de Janeiro', 'RJ', '22220-000', 'basic', 'active'),
    ('clinic-3-0000-0000-0000-000000000003', 'Estética Bella', '11.222.333/0001-44', 'contato@esteticabella.com.br', '(31) 3456-7892', 'Av. Afonso Pena, 2000', 'Belo Horizonte', 'MG', '30130-000', 'basic', 'trial')
ON CONFLICT (id) DO NOTHING;

-- Inserir usuários demo (senhas serão gerenciadas pelo Supabase Auth)
INSERT INTO users (id, clinic_id, email, name, phone, role, commission_pct)
VALUES 
    ('user-1-0000-0000-0000-000000000001', NULL, 'admin@luminaflow.com.br', 'Super Admin', '(11) 3333-0000', 'super_admin', 0),
    ('user-2-0000-0000-0000-000000000002', 'clinic-1-0000-0000-0000-000000000001', 'clinica@luminaflow.com.br', 'Dr. Lucas Silva', '(11) 98765-4321', 'admin', 40),
    ('user-3-0000-0000-0000-000000000003', 'clinic-1-0000-0000-0000-000000000001', 'dentista@luminaflow.com.br', 'Dra. Julia Paiva', '(11) 99876-5432', 'dentist', 35),
    ('user-4-0000-0000-0000-000000000004', 'clinic-1-0000-0000-0000-000000000001', 'recepcao@luminaflow.com.br', 'Fernanda Lima', '(11) 98765-0001', 'receptionist', 0),
    ('user-5-0000-0000-0000-000000000005', 'clinic-1-0000-0000-0000-000000000001', 'lucas@lumina.com.br', 'Dr. Lucas Silva', '5575991517196', 'admin', 40)
ON CONFLICT (id) DO NOTHING;

-- Inserir serviços demo
INSERT INTO services (id, clinic_id, name, category, base_price, avg_duration_min)
VALUES 
    ('svc-1-0000-0000-0000-000000000001', 'clinic-1-0000-0000-0000-000000000001', 'Consulta Odontológica', 'Consulta', 150, 30),
    ('svc-2-0000-0000-0000-000000000002', 'clinic-1-0000-0000-0000-000000000001', 'Limpeza', 'Procedimento', 200, 60),
    ('svc-3-0000-0000-0000-000000000003', 'clinic-1-0000-0000-0000-000000000001', 'Restauração', 'Procedimento', 350, 90),
    ('svc-4-0000-0000-0000-000000000004', 'clinic-1-0000-0000-0000-000000000001', 'Canal', 'Procedimento', 800, 120),
    ('svc-5-0000-0000-0000-000000000005', 'clinic-1-0000-0000-0000-000000000001', 'Clareamento', 'Estética', 1200, 90)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FUNÇÕES ÚTEIS
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON clinics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON stock_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinic_integrations_updated_at BEFORE UPDATE ON clinic_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMENTÁRIOS NAS TABELAS
-- ============================================

COMMENT ON TABLE clinics IS 'Clínicas cadastradas no sistema (multi-tenant)';
COMMENT ON TABLE users IS 'Usuários do sistema (autenticados via Supabase Auth)';
COMMENT ON TABLE patients IS 'Pacientes das clínicas';
COMMENT ON TABLE professionals IS 'Profissionais de saúde das clínicas';
COMMENT ON TABLE services IS 'Serviços/procedimentos oferecidos';
COMMENT ON TABLE appointments IS 'Agendamentos de consultas';
COMMENT ON TABLE medical_records IS 'Prontuários médicos';
COMMENT ON TABLE transactions IS 'Transações financeiras';
COMMENT ON TABLE stock_items IS 'Itens de estoque';
COMMENT ON TABLE insurances IS 'Convênios aceitos';
COMMENT ON TABLE branches IS 'Filiais das clínicas';
COMMENT ON TABLE clinic_integrations IS 'Integrações por clínica (WhatsApp, Asaas, etc.)';
COMMENT ON TABLE system_integrations IS 'Integrações globais do sistema';
COMMENT ON TABLE password_reset_codes IS 'Códigos de recuperação de senha';
COMMENT ON TABLE audit_logs IS 'Logs de auditoria do sistema';
