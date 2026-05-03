-- Tabela para armazenar logs de segurança e tentativas de ataque
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    event_type TEXT NOT NULL, -- Ex: 'RATE_LIMIT', 'BRUTE_FORCE', 'SUSPICIOUS_PAYLOAD'
    endpoint TEXT,
    payload JSONB,
    user_agent TEXT,
    severity TEXT DEFAULT 'medium', -- low, medium, high, critical
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
-- 1. Apenas Superadmins podem ler os logs de segurança
CREATE POLICY "Superadmin pode ver logs de segurança"
    ON public.security_logs FOR SELECT
    TO authenticated
    USING (is_super_admin());

-- 2. O servidor (ou qualquer conexão de rede) pode inserir logs de ataque (anônimo ou autenticado)
CREATE POLICY "Sistema pode registrar logs de segurança"
    ON public.security_logs FOR INSERT
    TO public
    WITH CHECK (true);

-- 3. Apenas Superadmins podem deletar logs ou marcar como resolvido
CREATE POLICY "Superadmin pode gerenciar logs"
    ON public.security_logs FOR UPDATE
    TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Superadmin pode deletar logs"
    ON public.security_logs FOR DELETE
    TO authenticated
    USING (is_super_admin());
