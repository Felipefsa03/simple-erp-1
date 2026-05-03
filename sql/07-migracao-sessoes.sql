-- SEC-09: Tabela temporária para persistência de Sessões de Autenticação/Reset
-- Isso substitui as estruturas `phoneVerificationSessions` e `passwordResetSessions` em memória.

CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_type VARCHAR(50) NOT NULL, -- 'signup' ou 'reset'
  identifier VARCHAR(255) NOT NULL, -- phone ou email
  code_hash VARCHAR(255) NOT NULL, -- sha256 do código recebido via whatsapp/email
  attempts INT DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  extra_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexação para buscas rápidas e exclusão de expirados
CREATE INDEX IF NOT EXISTS idx_auth_sessions_identifier ON public.auth_sessions(identifier, session_type);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON public.auth_sessions(expires_at);

-- Adicionar permissões do RLS (se ativado para essa tabela)
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;

-- Política de RLS para auth_sessions: apenas o backend (service_role) pode ler e gravar aqui
CREATE POLICY "Service Role Only" ON public.auth_sessions
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
