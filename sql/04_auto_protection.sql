-- Tabela para armazenar IPs banidos dinamicamente pelo backend
CREATE TABLE IF NOT EXISTS public.banned_ips (
    ip_address TEXT PRIMARY KEY,
    reason TEXT NOT NULL,
    banned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    banned_by_system BOOLEAN DEFAULT true
);

-- Tabela para armazenar logs de segurança e tentativas de ataque
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    event_type TEXT NOT NULL, -- Ex: 'RATE_LIMIT', 'BRUTE_FORCE', 'SUSPICIOUS_PAYLOAD', 'ACCOUNT_LOCKOUT'
    endpoint TEXT,
    payload JSONB,
    user_agent TEXT,
    severity TEXT DEFAULT 'medium', -- low, medium, high, critical
    action_taken TEXT, -- Ex: 'BLOCKED_REQUEST', 'BANNED_IP', 'LOCKED_ACCOUNT'
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para banned_ips
CREATE POLICY "Superadmin pode gerenciar IPs banidos"
    ON public.banned_ips FOR ALL
    TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Sistema pode ler e inserir IPs banidos"
    ON public.banned_ips FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- Políticas para security_logs
CREATE POLICY "Superadmin pode ver e gerenciar logs de segurança"
    ON public.security_logs FOR ALL
    TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Sistema pode inserir logs de segurança"
    ON public.security_logs FOR INSERT
    TO public
    WITH CHECK (true);
