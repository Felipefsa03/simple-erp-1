-- ============================================
-- BLOCO 3: Funções, Triggers e Índices
-- Execute DEPOIS do Bloco 2
-- ============================================

-- Funções que dependem da tabela users
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

-- Trigger para criar perfil ao cadastrar
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
    RAISE WARNING 'Erro ao criar perfil: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers de validação
CREATE TRIGGER trg_clinics_validate BEFORE INSERT OR UPDATE ON clinics FOR EACH ROW EXECUTE FUNCTION validate_cnpj_format();
CREATE TRIGGER trg_patients_validate BEFORE INSERT OR UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION validate_cpf_format();

-- Triggers de updated_at
CREATE TRIGGER trg_clinics_updated BEFORE UPDATE ON clinics FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_medical_records_updated BEFORE UPDATE ON medical_records FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_stock_updated BEFORE UPDATE ON stock_items FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_integrations_updated BEFORE UPDATE ON clinic_integrations FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Índices
CREATE INDEX IF NOT EXISTS idx_patients_history_gin ON patients USING GIN (history);
CREATE INDEX IF NOT EXISTS idx_medical_anamnese_gin ON medical_records USING GIN (anamnese);
CREATE INDEX IF NOT EXISTS idx_medical_odontogram_gin ON medical_records USING GIN (odontogram);
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
