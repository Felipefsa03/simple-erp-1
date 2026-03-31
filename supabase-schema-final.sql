-- ============================================
-- LuminaFlow ERP - Supabase Schema FINAL
-- Versão 3.0 - Ordem Corrigida
-- ============================================
-- Execute TODO este bloco de uma vez no SQL Editor do Supabase
-- ============================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. FUNÇÕES QUE NÃO DEPENDEM DE TABELAS
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_cpf_format()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cpf IS NOT NULL THEN
        NEW.cpf := REGEXP_REPLACE(NEW.cpf, '[^0-9]', '', 'g');
        IF LENGTH(NEW.cpf) != 11 THEN
            RAISE EXCEPTION 'CPF deve ter 11 dígitos';
        END IF;
    END IF;
    IF NEW.phone IS NOT NULL THEN
        NEW.phone := REGEXP_REPLACE(NEW.phone, '[^0-9]', '', 'g');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_cnpj_format()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cnpj IS NOT NULL THEN
        NEW.cnpj := REGEXP_REPLACE(NEW.cnpj, '[^0-9]', '', 'g');
        IF LENGTH(NEW.cnpj) != 14 THEN
            RAISE EXCEPTION 'CNPJ deve ter 14 dígitos';
        END IF;
    END IF;
    IF NEW.phone IS NOT NULL THEN
        NEW.phone := REGEXP_REPLACE(NEW.phone, '[^0-9]', '', 'g');
    END IF;
    IF NEW.zip_code IS NOT NULL THEN
        NEW.zip_code := REGEXP_REPLACE(NEW.zip_code, '[^0-9]', '', 'g');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. TABELAS (clinics primeiro, depois users, depois o resto)

-- Clínicas
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
    plan TEXT DEFAULT 'basic' CHECK (plan IN ('basic', 'professional', 'enterprise')),
    status TEXT DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'suspended', 'cancelled')),
    expires_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_clinics_validate BEFORE INSERT OR UPDATE ON clinics FOR EACH ROW EXECUTE FUNCTION validate_cnpj_format();
CREATE TRIGGER trg_clinics_updated BEFORE UPDATE ON clinics FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Usuários (referencia auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'receptionist' CHECK (role IN ('super_admin', 'admin', 'dentist', 'receptionist', 'aesthetician', 'financial')),
    commission NUMERIC DEFAULT 0,
    avatar TEXT,
    active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Pacientes
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    cpf TEXT,
    rg TEXT,
    birth DATE,
    gender TEXT CHECK (gender IN ('M', 'F', 'O')),
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    notes TEXT,
    allergies TEXT,
    meds TEXT,
    history JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_patients_validate BEFORE INSERT OR UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION validate_cpf_format();
CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE INDEX IF NOT EXISTS idx_patients_history_gin ON patients USING GIN (history);

-- Profissionais
CREATE TABLE IF NOT EXISTS professionals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL UNIQUE,
    cro TEXT,
    specialty TEXT,
    commission NUMERIC DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Serviços
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    price NUMERIC DEFAULT 0,
    duration INTEGER DEFAULT 60,
    cost NUMERIC DEFAULT 0,
    active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agendamentos
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    scheduled TIMESTAMPTZ NOT NULL,
    duration INTEGER DEFAULT 60,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'done', 'cancelled', 'no_show')),
    notes TEXT,
    confirmed BOOLEAN DEFAULT false,
    reminded BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Prontuários
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
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_medical_records_updated BEFORE UPDATE ON medical_records FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE INDEX IF NOT EXISTS idx_medical_anamnese_gin ON medical_records USING GIN (anamnese);
CREATE INDEX IF NOT EXISTS idx_medical_odontogram_gin ON medical_records USING GIN (odontogram);

-- Transações
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
    method TEXT,
    reference TEXT,
    pix TEXT,
    asaas_id TEXT,
    due DATE,
    paid_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estoque
CREATE TABLE IF NOT EXISTS stock_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT DEFAULT 'UN',
    qty NUMERIC DEFAULT 0,
    min_qty NUMERIC DEFAULT 0,
    cost NUMERIC DEFAULT 0,
    supplier TEXT,
    active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_stock_updated BEFORE UPDATE ON stock_items FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Convênios
CREATE TABLE IF NOT EXISTS insurances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Filiais
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    responsible TEXT,
    active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integrações por clínica
CREATE TABLE IF NOT EXISTS clinic_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('whatsapp', 'asaas', 'google_calendar', 'rd_station', 'meta_ads')),
    status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'pending', 'error')),
    token TEXT,
    secret TEXT,
    phone TEXT,
    webhook TEXT,
    config JSONB DEFAULT '{}',
    last_sync TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_integrations_updated BEFORE UPDATE ON clinic_integrations FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Integrações globais
CREATE TABLE IF NOT EXISTS system_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL UNIQUE CHECK (type IN ('whatsapp_system', 'nfe', 'payment_gateway')),
    status TEXT DEFAULT 'inactive',
    token TEXT,
    phone TEXT,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Códigos de senha
CREATE TABLE IF NOT EXISTS password_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    expires TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID,
    user_id UUID,
    action TEXT NOT NULL,
    entity TEXT,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FUNÇÕES QUE DEPENDEM DE TABELAS (criar DEPOIS das tabelas)
CREATE OR REPLACE FUNCTION get_user_clinic_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  );
$$;

-- Trigger para criar perfil quando usuário se cadastra no auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_clinic_id UUID;
    v_name TEXT;
    v_role TEXT;
BEGIN
    v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'receptionist');
    
    BEGIN
        v_clinic_id := (NEW.raw_user_meta_data->>'clinic_id')::UUID;
        IF v_clinic_id IS NOT NULL THEN
            IF NOT EXISTS (SELECT 1 FROM clinics WHERE id = v_clinic_id) THEN
                v_clinic_id := NULL;
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_clinic_id := NULL;
    END;
    
    INSERT INTO public.users (id, email, name, role, clinic_id)
    VALUES (NEW.id, NEW.email, v_name, v_role, v_clinic_id)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar perfil de usuário: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON appointments(clinic_id, scheduled) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_patients_clinic ON patients(clinic_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients USING gin(to_tsvector('portuguese', name)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_patients_cpf ON patients(cpf) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_clinic ON transactions(clinic_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_due ON transactions(due) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_clinic ON users(clinic_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_password_codes_user ON password_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_professionals_user ON professionals(user_id);

-- 6. ROW LEVEL SECURITY
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

-- 7. POLÍTICAS RLS (com deleted_at IS NULL)

-- Pacientes
CREATE POLICY "patients_select" ON patients FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "patients_insert" ON patients FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "patients_update" ON patients FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "patients_delete" ON patients FOR DELETE USING (is_super_admin() OR clinic_id = get_user_clinic_id());

-- Agendamentos
CREATE POLICY "appointments_select" ON appointments FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "appointments_insert" ON appointments FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "appointments_update" ON appointments FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "appointments_delete" ON appointments FOR DELETE USING (is_super_admin() OR clinic_id = get_user_clinic_id());

-- Transações
CREATE POLICY "transactions_select" ON transactions FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "transactions_update" ON transactions FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "transactions_delete" ON transactions FOR DELETE USING (is_super_admin() OR clinic_id = get_user_clinic_id());

-- Usuários (pode ver próprio perfil)
CREATE POLICY "users_select" ON users FOR SELECT USING (deleted_at IS NULL AND (id = auth.uid() OR is_super_admin() OR (clinic_id IS NOT NULL AND clinic_id = get_user_clinic_id())));
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (is_super_admin() OR id = auth.uid());
CREATE POLICY "users_update" ON users FOR UPDATE USING (deleted_at IS NULL AND (id = auth.uid() OR is_super_admin() OR (clinic_id IS NOT NULL AND clinic_id = get_user_clinic_id())));

-- Clínicas
CREATE POLICY "clinics_select" ON clinics FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR id = get_user_clinic_id()));
CREATE POLICY "clinics_update" ON clinics FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR id = get_user_clinic_id()));

-- Profissionais
CREATE POLICY "professionals_select" ON professionals FOR SELECT USING (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "professionals_insert" ON professionals FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "professionals_update" ON professionals FOR UPDATE USING (is_super_admin() OR clinic_id = get_user_clinic_id());

-- Serviços
CREATE POLICY "services_select" ON services FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "services_insert" ON services FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "services_update" ON services FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));

-- Prontuários
CREATE POLICY "medical_records_select" ON medical_records FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "medical_records_insert" ON medical_records FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "medical_records_update" ON medical_records FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));

-- Estoque
CREATE POLICY "stock_select" ON stock_items FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "stock_insert" ON stock_items FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "stock_update" ON stock_items FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));

-- Convênios
CREATE POLICY "insurances_select" ON insurances FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "insurances_insert" ON insurances FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "insurances_update" ON insurances FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));

-- Filiais
CREATE POLICY "branches_select" ON branches FOR SELECT USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));
CREATE POLICY "branches_insert" ON branches FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "branches_update" ON branches FOR UPDATE USING (deleted_at IS NULL AND (is_super_admin() OR clinic_id = get_user_clinic_id()));

-- Integrações
CREATE POLICY "integrations_select" ON clinic_integrations FOR SELECT USING (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "integrations_insert" ON clinic_integrations FOR INSERT WITH CHECK (is_super_admin() OR clinic_id = get_user_clinic_id());
CREATE POLICY "integrations_update" ON clinic_integrations FOR UPDATE USING (is_super_admin() OR clinic_id = get_user_clinic_id());

-- Integrações globais (apenas Super Admin)
CREATE POLICY "system_integrations_admin" ON system_integrations FOR ALL USING (is_super_admin());

-- Códigos de senha (próprio usuário)
CREATE POLICY "password_codes_own" ON password_codes FOR ALL USING (user_id = auth.uid());

-- 8. DADOS INICIAIS (DEMO)
INSERT INTO clinics (id, name, cnpj, email, phone, address, city, state, zip_code, plan, status)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Lumina Odontologia', '12345678000190', 'lumina@email.com', '1134567890', 'Av. Paulista, 1000', 'São Paulo', 'SP', '01310100', 'professional', 'active'),
    ('00000000-0000-0000-0000-000000000002', 'Sorriso Total', '98765432000110', 'sorriso@email.com', '2134567891', 'Rua do Catete, 500', 'Rio de Janeiro', 'RJ', '22220000', 'basic', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO services (clinic_id, name, category, price, duration)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Consulta', 'Consulta', 150, 30),
    ('00000000-0000-0000-0000-000000000001', 'Limpeza', 'Procedimento', 200, 60),
    ('00000000-0000-0000-0000-000000000001', 'Restauração', 'Procedimento', 350, 90),
    ('00000000-0000-0000-0000-000000000001', 'Canal', 'Procedimento', 800, 120),
    ('00000000-0000-0000-0000-000000000001', 'Clareamento', 'Estética', 1200, 90)
ON CONFLICT DO NOTHING;

-- 9. FUNÇÕES DE LIMPEZA
CREATE OR REPLACE FUNCTION cleanup_expired_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM password_codes WHERE expires < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 10. COMENTÁRIOS
COMMENT ON TABLE clinics IS 'Clínicas cadastradas (multi-tenant)';
COMMENT ON TABLE users IS 'Usuários do sistema (sincronizado com auth.users)';
COMMENT ON TABLE patients IS 'Pacientes das clínicas';
COMMENT ON TABLE professionals IS 'Perfis complementares de profissionais';
COMMENT ON TABLE services IS 'Serviços oferecidos';
COMMENT ON TABLE appointments IS 'Agendamentos';
COMMENT ON TABLE medical_records IS 'Prontuários médicos';
COMMENT ON TABLE transactions IS 'Transações financeiras';
COMMENT ON TABLE stock_items IS 'Itens de estoque';
COMMENT ON TABLE insurances IS 'Convênios aceitos';
COMMENT ON TABLE branches IS 'Filiais';
COMMENT ON TABLE clinic_integrations IS 'Integrações por clínica';
COMMENT ON TABLE system_integrations IS 'Integrações globais do sistema';
COMMENT ON TABLE password_codes IS 'Códigos de recuperação de senha';
COMMENT ON TABLE audit_logs IS 'Logs de auditoria';
