-- ============================================
-- Missing Tables Migration
-- P0-05: Drift de banco - tabelas usadas no código mas não versionadas
-- ============================================

-- Tabela de configuração de integrações por clínica
CREATE TABLE IF NOT EXISTS integration_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    mp_access_token TEXT,
    mp_public_key TEXT,
    mp_client_id TEXT,
    mp_client_secret TEXT,
    memed_api_url TEXT,
    memed_api_token TEXT,
    tiss_provider_name TEXT,
    tiss_ans_code TEXT,
    rd_station_token TEXT,
    meta_pixel_id TEXT,
    google_ads_customer_id TEXT,
    google_calendar_email TEXT,
    google_calendar_creds JSONB,
    asaas_api_key TEXT,
    asaas_wallet_id TEXT,
    plan_price_basico NUMERIC(10,2) DEFAULT 97,
    plan_price_profissional NUMERIC(10,2) DEFAULT 197,
    plan_price_premium NUMERIC(10,2) DEFAULT 397,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id)
);

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    mp_payment_id TEXT,
    mp_preference_id TEXT,
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    status TEXT NOT NULL,
    status_detail TEXT,
    plan TEXT,
    payment_method TEXT,
    payment_type TEXT,
    payer_email TEXT,
    payer_name TEXT,
    payer_doc TEXT,
    qr_code TEXT,
    qr_code_base64 TEXT,
    boleta_url TEXT,
    transaction_id TEXT,
    external_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Tabela de 2FA
CREATE TABLE IF NOT EXISTS user_2fa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    secret_encrypted TEXT NOT NULL,
    enabled BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    backup_codes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Tabela de mensagens WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    message_text TEXT,
    message_id TEXT,
    status TEXT DEFAULT 'pending',
    direction TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de sessões de verificação de telefone
CREATE TABLE IF NOT EXISTS phone_verification_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signup_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    blocked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida de mensagens
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_clinic ON whatsapp_messages(clinic_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction ON whatsapp_messages(direction);

-- Índice para pagamentos
CREATE INDEX IF NOT EXISTS idx_payments_clinic ON payments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_mp_id ON payments(mp_payment_id);

-- Índice para 2FA
CREATE INDEX IF NOT EXISTS idx_user_2fa_user ON user_2fa(user_id);

-- Índice para phone verification
CREATE INDEX IF NOT EXISTS idx_phone_verification_signup ON phone_verification_sessions(signup_id);
CREATE INDEX IF NOT EXISTS idx_phone_verification_phone ON phone_verification_sessions(phone);
