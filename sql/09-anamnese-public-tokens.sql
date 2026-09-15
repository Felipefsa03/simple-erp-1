CREATE TABLE IF NOT EXISTS public.anamnese_public_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jti UUID NOT NULL UNIQUE,
  token_hash TEXT NOT NULL UNIQUE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_anamnese_public_tokens_expiry ON public.anamnese_public_tokens(expires_at);
ALTER TABLE public.anamnese_public_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anamnese_tokens_service_only" ON public.anamnese_public_tokens;
CREATE POLICY "anamnese_tokens_service_only" ON public.anamnese_public_tokens
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
