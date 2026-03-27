-- ============================================
-- LuminaFlow ERP - Supabase Schema OTIMIZADO
-- Plano Gratuito: 500MB banco, 1GB storage
-- ============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CLÍNICAS (Multi-tenant)
-- Otimizado: usar TEXT menor onde possível
-- ============================================
CREATE TABLE IF NOT EXISTS clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    email VARCHAR(100),
    phone VARCHAR(20),
    address VARCHAR(200),
    city VARCHAR(50),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    logo_url TEXT,
    plan VARCHAR(20) DEFAULT 'basic' CHECK (plan IN ('basic', 'professional', 'enterprise')),
    status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'suspended', 'cancelled')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. USUÁRIOS
-- Otimizado: VARCHAR em vez de TEXT
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'receptionist' CHECK (role IN ('super_admin', 'admin', 'dentist', 'receptionist', 'aesthetician', 'financial')),
    cro VARCHAR(20),
    commission NUMERIC DEFAULT 0,
    avatar TEXT,
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. PACIENTES
-- Otimizado: medical_history como JSONB compacto
-- ============================================
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    cpf VARCHAR(14),
    rg VARCHAR(20),
    birth DATE,
    gender CHAR(1) CHECK (gender IN ('M', 'F', 'O')),
    address VARCHAR(200),
    city VARCHAR(50),
    state VARCHAR(2),
    zip VARCHAR(10),
    notes TEXT,
    allergies TEXT,
    meds TEXT,
    history JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
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
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    cro VARCHAR(20),
    specialty VARCHAR(50),
    commission NUMERIC DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. SERVIÇOS
-- ============================================
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    price NUMERIC DEFAULT 0,
    duration INTEGER DEFAULT 60,
    cost NUMERIC DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. AGENDAMENTOS
-- Otimizado: status como VARCHAR menor
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    scheduled TIMESTAMPTZ NOT NULL,
    duration INTEGER DEFAULT 60,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'done', 'cancelled', 'no_show')),
    notes TEXT,
    confirmed BOOLEAN DEFAULT false,
    reminded BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. PRONTUÁRIOS
-- Otimizado: JSONB compacto para odontograma
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
    plan TEXT,
    evolution TEXT,
    prescriptions TEXT,
    files TEXT[] DEFAULT '{}',
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
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    category VARCHAR(50),
    description VARCHAR(200),
    amount NUMERIC NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
    method VARCHAR(20),
    reference VARCHAR(100),
    pix VARCHAR(200),
    asaas_id VARCHAR(100),
    due DATE,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. ESTOQUE
-- ============================================
CREATE TABLE IF NOT EXISTS stock_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    unit VARCHAR(10) DEFAULT 'UN',
    qty NUMERIC DEFAULT 0,
    min_qty NUMERIC DEFAULT 0,
    cost NUMERIC DEFAULT 0,
    supplier VARCHAR(100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. CONVÊNIOS
-- ============================================
CREATE TABLE IF NOT EXISTS insurances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(100),
    address VARCHAR(200),
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. FILIAIS
-- ============================================
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(100),
    responsible VARCHAR(100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. INTEGRAÇÕES POR CLÍNICA
-- ============================================
CREATE TABLE IF NOT EXISTS clinic_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('whatsapp', 'asaas', 'google_calendar', 'rd_station', 'meta_ads')),
    status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'pending', 'error')),
    token TEXT,
    secret TEXT,
    phone VARCHAR(20),
    webhook VARCHAR(200),
    config JSONB DEFAULT '{}',
    last_sync TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 13. INTEGRAÇÃO GLOBAL (Sistema)
-- ============================================
CREATE TABLE IF NOT EXISTS system_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL UNIQUE CHECK (type IN ('whatsapp_system', 'nfe', 'payment_gateway')),
    status VARCHAR(20) DEFAULT 'inactive',
    token TEXT,
    phone VARCHAR(20),
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 14. CÓDIGOS DE RECUPERAÇÃO DE SENHA
-- Otimizado: expira em 30 segundos
-- ============================================
CREATE TABLE IF NOT EXISTS password_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    expires TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 15. LOGS DE AUDITORIA (compacto)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID,
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(50),
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES OTIMIZADOS (apenas os essenciais)
-- ============================================

-- Índices para consultas mais frequentes
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON appointments(clinic_id, scheduled);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_patients_clinic ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_transactions_clinic ON transactions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_due ON transactions(due);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_clinic ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_password_codes_user ON password_codes(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS
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
ALTER TABLE password_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cada tabela
-- Pacientes
CREATE POLICY "clinic_patients_select" ON patients FOR SELECT USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));
CREATE POLICY "clinic_patients_insert" ON patients FOR INSERT WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));
CREATE POLICY "clinic_patients_update" ON patients FOR UPDATE USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));
CREATE POLICY "clinic_patients_delete" ON patients FOR DELETE USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Agendamentos
CREATE POLICY "clinic_appointments_select" ON appointments FOR SELECT USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));
CREATE POLICY "clinic_appointments_insert" ON appointments FOR INSERT WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));
CREATE POLICY "clinic_appointments_update" ON appointments FOR UPDATE USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));
CREATE POLICY "clinic_appointments_delete" ON appointments FOR DELETE USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Transações
CREATE POLICY "clinic_transactions_select" ON transactions FOR SELECT USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));
CREATE POLICY "clinic_transactions_insert" ON transactions FOR INSERT WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));
CREATE POLICY "clinic_transactions_update" ON transactions FOR UPDATE USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));
CREATE POLICY "clinic_transactions_delete" ON transactions FOR DELETE USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Super Admin vê tudo
CREATE POLICY "admin_all_clinics" ON clinics FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'));

-- ============================================
-- FUNÇÕES ÚTEIS
-- ============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trg_clinics_updated BEFORE UPDATE ON clinics FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_medical_records_updated BEFORE UPDATE ON medical_records FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_stock_items_updated BEFORE UPDATE ON stock_items FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================
-- DADOS INICIAIS (DEMO)
-- ============================================

-- Clínicas
INSERT INTO clinics (id, name, cnpj, email, phone, address, city, state, zip_code, plan, status)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Lumina Odontologia', '12.345.678/0001-90', 'lumina@email.com', '(11) 3456-7890', 'Av. Paulista, 1000', 'São Paulo', 'SP', '01310-100', 'professional', 'active'),
    ('00000000-0000-0000-0000-000000000002', 'Sorriso Total', '98.765.432/0001-10', 'sorriso@email.com', '(21) 3456-7891', 'Rua do Catete, 500', 'Rio de Janeiro', 'RJ', '22220-000', 'basic', 'active')
ON CONFLICT (id) DO NOTHING;

-- Serviços
INSERT INTO services (clinic_id, name, category, price, duration)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Consulta', 'Consulta', 150, 30),
    ('00000000-0000-0000-0000-000000000001', 'Limpeza', 'Procedimento', 200, 60),
    ('00000000-0000-0000-0000-000000000001', 'Restauração', 'Procedimento', 350, 90),
    ('00000000-0000-0000-0000-000000000001', 'Canal', 'Procedimento', 800, 120),
    ('00000000-0000-0000-0000-000000000001', 'Clareamento', 'Estética', 1200, 90)
ON CONFLICT DO NOTHING;

-- ============================================
-- CONFIGURAÇÕES DE LIMPEZA AUTOMÁTICA
-- ============================================

-- Função para limpar códigos expirados
CREATE OR REPLACE FUNCTION cleanup_expired_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM password_codes WHERE expires < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Função para limpar logs antigos (manter apenas 30 dias)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON TABLE clinics IS 'Clínicas (multi-tenant)';
COMMENT ON TABLE users IS 'Usuários do sistema';
COMMENT ON TABLE patients IS 'Pacientes';
COMMENT ON TABLE appointments IS 'Agendamentos';
COMMENT ON TABLE transactions IS 'Transações financeiras';
