-- Modelo canônico de filiais: uma filial é uma clínica com parent_id.
-- A tabela branches é legada; os dados são copiados sem apagar a origem para
-- permitir conferência e rollback antes de uma remoção manual posterior.
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
