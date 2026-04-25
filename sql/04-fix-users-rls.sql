-- ============================================
-- Correção definitiva da política de SELECT da tabela users (Evitar recursão infinita 500)
-- ============================================

-- 1. Redefinir as funções usando plpgsql em vez de sql.
-- Funções LANGUAGE sql podem ser "inlined" (embutidas) pelo otimizador do Postgres,
-- o que faz com que a query interna seja executada no contexto da query principal,
-- disparando o RLS novamente e causando recursão infinita (erro 500).
-- Usando plpgsql garantimos que a função seja executada de forma isolada com SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.get_user_clinic_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_id UUID;
BEGIN
  SELECT clinic_id INTO v_clinic_id FROM public.users WHERE id = auth.uid();
  RETURN v_clinic_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  ) INTO v_is_admin;
  RETURN COALESCE(v_is_admin, false);
END;
$$;

-- 2. Remover políticas antigas
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "anon_users_select" ON public.users;

-- 3. Recriar a política
CREATE POLICY "users_select" ON public.users FOR SELECT USING (
  deleted_at IS NULL AND (
    id = auth.uid() 
    OR is_super_admin() 
    OR (clinic_id IS NOT NULL AND clinic_id = get_user_clinic_id())
  )
);

-- 4. Garantir que RLS está ativo
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
