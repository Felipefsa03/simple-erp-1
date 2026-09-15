CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'unsubscribed', 'spam')),
  source text NOT NULL DEFAULT 'blog',
  consented_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletter_subscribers_email_lower
  ON public.newsletter_subscribers (lower(email));
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS newsletter_subscribers_service_only ON public.newsletter_subscribers;
CREATE POLICY newsletter_subscribers_service_only ON public.newsletter_subscribers
  FOR ALL TO service_role USING (true) WITH CHECK (true);
