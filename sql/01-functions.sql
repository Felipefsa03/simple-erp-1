-- ============================================
-- BLOCO 1: Execute primeiro
-- Extensões e funções básicas
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
