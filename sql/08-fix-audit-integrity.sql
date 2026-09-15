-- Correções de integridade para instalações existentes.
-- Execute após remover duplicatas de auth_sessions, se a consulta retornar linhas.
DO $$
BEGIN
  IF to_regclass('public.uq_auth_sessions_identifier_type') IS NOT NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT identifier, session_type
    FROM public.auth_sessions
    GROUP BY identifier, session_type
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'auth_sessions possui duplicidades; remova-as antes de criar a unicidade';
  END IF;

  CREATE UNIQUE INDEX uq_auth_sessions_identifier_type
    ON public.auth_sessions(identifier, session_type);
END $$;
