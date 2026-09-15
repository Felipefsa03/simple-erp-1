-- Persistência das campanhas. O JSON mantém compatibilidade com campos
-- específicos de cada canal enquanto clinic_id/status suportam a fila.
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id text PRIMARY KEY,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_clinic_created
  ON public.marketing_campaigns(clinic_id, created_at DESC);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS marketing_campaigns_service_role_only ON public.marketing_campaigns;
CREATE POLICY marketing_campaigns_service_role_only
  ON public.marketing_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);
