-- ============================================================================
-- Clinxia / Simple ERP — remediação consolidada da auditoria
-- Data: 2026-09-15
--
-- Execute este arquivo inteiro no SQL Editor do Supabase, de preferência após
-- backup/export da base. O script é idempotente na maior parte e não contém
-- chaves, tokens ou senhas.
--
-- O backend usa service_role para as tabelas operacionais abaixo. As políticas
-- service-only são intencionais: elas impedem acesso direto pelo navegador.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --------------------------------------------------------------------------
-- Estruturas já usadas pelo backend
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.integration_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  mp_access_token text,
  mp_public_key text,
  mp_client_id text,
  mp_client_secret text,
  memed_api_url text,
  memed_api_token text,
  tiss_provider_name text,
  tiss_ans_code text,
  rd_station_token text,
  meta_pixel_id text,
  google_ads_customer_id text,
  google_calendar_email text,
  google_calendar_creds jsonb,
  asaas_api_key text,
  asaas_wallet_id text,
  plan_price_basico numeric(10,2) DEFAULT 97,
  plan_price_profissional numeric(10,2) DEFAULT 197,
  plan_price_premium numeric(10,2) DEFAULT 397,
  nfe_config jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (clinic_id)
);

ALTER TABLE public.integration_config ADD COLUMN IF NOT EXISTS nfe_config jsonb;

CREATE TABLE IF NOT EXISTS public.payments (
  id text PRIMARY KEY,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  mp_payment_id text,
  mp_preference_id text,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'BRL',
  status text NOT NULL,
  status_detail text,
  plan text,
  payment_method text,
  payment_type text,
  payer_email text,
  payer_name text,
  payer_doc text,
  qr_code text,
  qr_code_base64 text,
  boleta_url text,
  transaction_id text,
  external_reference text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_2fa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  secret_encrypted text NOT NULL,
  enabled boolean DEFAULT false,
  verified_at timestamptz,
  backup_codes jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  from_number text NOT NULL,
  to_number text NOT NULL,
  message_text text,
  message_id text,
  status text DEFAULT 'pending',
  direction text NOT NULL,
  media_url text,
  media_type text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.phone_verification_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_id text NOT NULL,
  phone text NOT NULL,
  code_hash text NOT NULL,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  expires_at timestamptz NOT NULL,
  attempts integer DEFAULT 0,
  blocked_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_clinic ON public.whatsapp_messages(clinic_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON public.whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_payments_clinic ON public.payments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_mp_id ON public.payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_user ON public.user_2fa(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verification_signup ON public.phone_verification_sessions(signup_id);

-- --------------------------------------------------------------------------
-- Sessões de autenticação e recuperação: uma linha por identificador/tipo
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type varchar(50) NOT NULL,
  identifier varchar(255) NOT NULL,
  code_hash varchar(255) NOT NULL,
  attempts integer DEFAULT 0,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  extra_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

DELETE FROM public.auth_sessions older
USING public.auth_sessions newer
WHERE older.identifier = newer.identifier
  AND older.session_type = newer.session_type
  AND (older.created_at < newer.created_at OR (older.created_at = newer.created_at AND older.id < newer.id));

CREATE UNIQUE INDEX IF NOT EXISTS uq_auth_sessions_identifier_type
  ON public.auth_sessions(identifier, session_type);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON public.auth_sessions(expires_at);

ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service Role Only" ON public.auth_sessions;
CREATE POLICY "Service Role Only" ON public.auth_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- Reserva server-side de cadastro: impede que o navegador escolha tenant
-- existente e vincula pagamento/provisionamento à mesma sessão.
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.signup_provision_intents (
  signup_id text PRIMARY KEY,
  clinic_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_signup_intents_clinic ON public.signup_provision_intents(clinic_id);
CREATE INDEX IF NOT EXISTS idx_signup_intents_expiry ON public.signup_provision_intents(expires_at);
ALTER TABLE public.signup_provision_intents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS signup_intents_service_only ON public.signup_provision_intents;
CREATE POLICY signup_intents_service_only ON public.signup_provision_intents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- Anamnese pública e mensagens dos formulários públicos
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.anamnese_public_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jti uuid NOT NULL UNIQUE,
  token_hash text NOT NULL UNIQUE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_anamnese_public_tokens_expiry ON public.anamnese_public_tokens(expires_at);
ALTER TABLE public.anamnese_public_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anamnese_tokens_service_only ON public.anamnese_public_tokens;
CREATE POLICY anamnese_tokens_service_only ON public.anamnese_public_tokens
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.inbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('contact', 'career')),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text,
  linkedin text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'spam')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inbound_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inbound_messages_service_only ON public.inbound_messages;
CREATE POLICY inbound_messages_service_only ON public.inbound_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RPCs chamadas exclusivamente pelo backend. O navegador não acessa dados
-- clínicos diretamente para criar booking ou enviar anamnese.
CREATE OR REPLACE FUNCTION public.public_create_booking(
  p_clinic_id uuid, p_name text, p_phone text, p_email text,
  p_service_id uuid DEFAULT NULL, p_professional_id uuid DEFAULT NULL,
  p_date date DEFAULT NULL, p_time time DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_patient_id uuid;
  v_appointment_id uuid;
  v_scheduled timestamptz;
  v_duration integer := 60;
  v_end timestamptz;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) = 0 OR p_email IS NULL OR p_phone IS NULL OR p_date IS NULL OR p_time IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Dados obrigatórios ausentes.');
  END IF;
  IF p_date < current_date OR p_time < time '06:00' OR p_time > time '22:00' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Horário inválido para agendamento.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM clinics WHERE id = p_clinic_id AND deleted_at IS NULL AND status IN ('trial', 'active')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Clínica indisponível para agendamento.');
  END IF;
  IF p_service_id IS NOT NULL THEN
    SELECT coalesce(duration, 60) INTO v_duration FROM services
      WHERE id = p_service_id AND clinic_id = p_clinic_id AND deleted_at IS NULL AND active = true;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Serviço indisponível.'); END IF;
  END IF;
  IF p_professional_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM professionals WHERE id = p_professional_id AND clinic_id = p_clinic_id AND active = true
  ) THEN RETURN jsonb_build_object('ok', false, 'error', 'Profissional indisponível.'); END IF;
  v_scheduled := (p_date + p_time) AT TIME ZONE current_setting('TimeZone');
  v_end := v_scheduled + make_interval(mins => v_duration);
  IF p_professional_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM appointments WHERE clinic_id = p_clinic_id AND professional_id = p_professional_id
      AND status NOT IN ('cancelled', 'no_show') AND deleted_at IS NULL
      AND scheduled < v_end AND (scheduled + make_interval(mins => coalesce(duration, 60))) > v_scheduled
  ) THEN RETURN jsonb_build_object('ok', false, 'error', 'Horário não está mais disponível.'); END IF;
  SELECT id INTO v_patient_id FROM patients WHERE clinic_id = p_clinic_id AND deleted_at IS NULL
    AND (lower(email) = lower(trim(p_email)) OR phone = regexp_replace(p_phone, '\D', '', 'g'))
    ORDER BY updated_at DESC NULLS LAST LIMIT 1 FOR UPDATE;
  IF v_patient_id IS NULL THEN
    INSERT INTO patients (clinic_id, name, email, phone, active)
      VALUES (p_clinic_id, trim(p_name), lower(trim(p_email)), regexp_replace(p_phone, '\D', '', 'g'), true)
      RETURNING id INTO v_patient_id;
  ELSE
    UPDATE patients SET name = trim(p_name), email = lower(trim(p_email)), phone = regexp_replace(p_phone, '\D', '', 'g'), updated_at = now()
      WHERE id = v_patient_id;
  END IF;
  INSERT INTO appointments (clinic_id, patient_id, professional_id, service_id, scheduled, duration, status, notes)
    VALUES (p_clinic_id, v_patient_id, p_professional_id, p_service_id, v_scheduled, v_duration, 'scheduled', left(coalesce(p_notes, 'Agendamento Online'), 300))
    RETURNING id INTO v_appointment_id;
  RETURN jsonb_build_object('ok', true, 'appointment_id', v_appointment_id, 'patient_id', v_patient_id, 'scheduled', v_scheduled);
END;
$$;
REVOKE ALL ON FUNCTION public.public_create_booking(uuid, text, text, text, uuid, uuid, date, time, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_create_booking(uuid, text, text, text, uuid, uuid, date, time, text) TO service_role;

CREATE OR REPLACE FUNCTION public.submit_public_anamnese(
  p_token_hash text, p_jti uuid, p_anamnese jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_token anamnese_public_tokens%ROWTYPE;
  v_record_id uuid;
BEGIN
  SELECT * INTO v_token FROM anamnese_public_tokens
    WHERE token_hash = p_token_hash AND jti = p_jti AND used_at IS NULL AND expires_at > now() FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Link inválido, expirado ou já utilizado.'); END IF;
  SELECT id INTO v_record_id FROM medical_records
    WHERE clinic_id = v_token.clinic_id AND patient_id = v_token.patient_id AND deleted_at IS NULL
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF v_record_id IS NULL THEN
    INSERT INTO medical_records (clinic_id, patient_id, anamnese)
      VALUES (v_token.clinic_id, v_token.patient_id, p_anamnese || jsonb_build_object('submitted_at', now(), 'source', 'public_link'))
      RETURNING id INTO v_record_id;
  ELSE
    UPDATE medical_records SET anamnese = coalesce(anamnese, '{}'::jsonb) || p_anamnese || jsonb_build_object('submitted_at', now(), 'source', 'public_link'), updated_at = now()
      WHERE id = v_record_id;
  END IF;
  UPDATE anamnese_public_tokens SET used_at = now() WHERE id = v_token.id;
  RETURN jsonb_build_object('ok', true, 'record_id', v_record_id);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_public_anamnese(text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_anamnese(text, uuid, jsonb) TO service_role;

-- --------------------------------------------------------------------------
-- Campanhas: campanha e destinatários persistidos, permitindo retomada
-- idempotente após restart/redeploy.
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id text PRIMARY KEY,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_clinic_created ON public.marketing_campaigns(clinic_id, created_at DESC);
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS marketing_campaigns_service_role_only ON public.marketing_campaigns;
CREATE POLICY marketing_campaigns_service_role_only ON public.marketing_campaigns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.marketing_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  phone text NOT NULL,
  name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts integer NOT NULL DEFAULT 0,
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON public.marketing_campaign_recipients(campaign_id, status);
ALTER TABLE public.marketing_campaign_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campaign_recipients_service_role_only ON public.marketing_campaign_recipients;
CREATE POLICY campaign_recipients_service_role_only ON public.marketing_campaign_recipients
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  channel text NOT NULL,
  recipient text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  provider_message_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_clinic ON public.notification_deliveries(clinic_id, created_at DESC);
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_deliveries_service_only ON public.notification_deliveries;
CREATE POLICY notification_deliveries_service_only ON public.notification_deliveries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- Fiscal: retorno oficial do provedor, sem fabricar chave/protocolo.
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.nfe_emissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  reference text NOT NULL,
  provider text NOT NULL DEFAULT 'focus_nfe',
  environment text NOT NULL DEFAULT 'homologacao' CHECK (environment IN ('homologacao', 'producao')),
  request_payload jsonb,
  response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, reference)
);
CREATE INDEX IF NOT EXISTS idx_nfe_emissions_clinic_created ON public.nfe_emissions(clinic_id, created_at DESC);
ALTER TABLE public.nfe_emissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nfe_emissions_service_role_only ON public.nfe_emissions;
CREATE POLICY nfe_emissions_service_role_only ON public.nfe_emissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- Checkout/assinatura: registra a preferência real e seu estado pendente.
-- clinic_id fica sem FK porque o checkout do cadastro ocorre antes da criação
-- da clínica; o provisionamento vincula o tenant após o pagamento confirmado.
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.clinic_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  plan text NOT NULL,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'pending',
  gateway text NOT NULL,
  gateway_reference text NOT NULL UNIQUE,
  payment_reference text,
  checkout_url text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  next_billing_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_clinic ON public.clinic_subscriptions(clinic_id, created_at DESC);
ALTER TABLE public.clinic_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clinic_subscriptions_service_only ON public.clinic_subscriptions;
CREATE POLICY clinic_subscriptions_service_only ON public.clinic_subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- Filiais: modelo canônico clinics.parent_id. A tabela branches legada não é
-- apagada automaticamente; confira os dados antes de removê-la.
-- --------------------------------------------------------------------------

ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS responsible_name text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_clinics_parent_id ON public.clinics(parent_id);

DO $$
BEGIN
  IF to_regclass('public.branches') IS NULL THEN RETURN; END IF;
  INSERT INTO public.clinics (id, parent_id, name, address, phone, email, responsible_name, is_active, status)
  SELECT b.id, b.clinic_id, b.name, b.address, b.phone, b.email, b.responsible, coalesce(b.active, true),
         CASE WHEN coalesce(b.active, true) THEN 'active' ELSE 'suspended' END
  FROM public.branches b
  WHERE b.deleted_at IS NULL
  ON CONFLICT (id) DO NOTHING;
  COMMENT ON TABLE public.branches IS 'LEGACY: filiais foram consolidadas em public.clinics.parent_id; não usar em código novo.';
END $$;

-- Newsletter: o estado pending é deliberado até o double opt-in ser ligado a
-- um provedor. O front não informa assinatura como confirmada.
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'unsubscribed', 'spam')),
  source text NOT NULL DEFAULT 'blog',
  consented_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletter_subscribers_email_lower ON public.newsletter_subscribers(lower(email));
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS newsletter_subscribers_service_only ON public.newsletter_subscribers;
CREATE POLICY newsletter_subscribers_service_only ON public.newsletter_subscribers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;

-- Após executar, valide no SQL Editor:
-- SELECT to_regclass('public.signup_provision_intents'),
--        to_regclass('public.nfe_emissions'),
--        to_regclass('public.marketing_campaign_recipients'),
--        to_regclass('public.clinic_subscriptions');
