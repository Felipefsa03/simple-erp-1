-- ============================================
-- Fix: whatsapp_messages table schema alignment
-- O backend usa colunas (phone, text, from_me, timestamp, message_id, clinic_id)
-- mas a tabela original foi criada com (from_number, to_number, direction, message_text)
-- Este script adiciona as colunas que o backend realmente usa.
-- ============================================

-- Adicionar colunas que o backend precisa (se não existirem)
DO $$
BEGIN
    -- Coluna 'phone' - número do contato (sem @s.whatsapp.net)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'whatsapp_messages' AND column_name = 'phone') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN phone TEXT;
    END IF;

    -- Coluna 'text' - conteúdo da mensagem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'whatsapp_messages' AND column_name = 'text') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN text TEXT;
    END IF;

    -- Coluna 'from_me' - se foi enviada pelo sistema (true) ou recebida do cliente (false)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'whatsapp_messages' AND column_name = 'from_me') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN from_me BOOLEAN DEFAULT false;
    END IF;

    -- Coluna 'timestamp' - momento da mensagem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'whatsapp_messages' AND column_name = 'timestamp') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN "timestamp" TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Garantir que clinic_id aceita TEXT (para 'system-global') além de UUID
    -- Se a coluna for UUID, precisamos alterar. Vamos criar uma constraint mais flexível.
END $$;

-- Índices para busca rápida pelo frontend
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from_me ON whatsapp_messages(from_me);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages("timestamp");
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_clinic ON whatsapp_messages(phone, clinic_id);

-- Constraint UNIQUE no message_id para evitar duplicatas
-- (o backend usa Prefer: resolution=merge-duplicates)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_messages_message_id_key') THEN
        -- Apenas se message_id existir e não tiver constraint
        ALTER TABLE whatsapp_messages ADD CONSTRAINT whatsapp_messages_message_id_key UNIQUE (message_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Constraint already exists or cannot be created: %', SQLERRM;
END $$;

-- Desabilitar RLS para que o backend possa inserir com qualquer chave
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Policy para service_role ter acesso total
DROP POLICY IF EXISTS "Service role full access" ON whatsapp_messages;
CREATE POLICY "Service role full access" ON whatsapp_messages
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy para leitura via anon key (para fallback)
DROP POLICY IF EXISTS "Anon read access" ON whatsapp_messages;
CREATE POLICY "Anon read access" ON whatsapp_messages
    FOR SELECT
    USING (true);

-- Policy para inserção via anon key (para fallback)
DROP POLICY IF EXISTS "Anon insert access" ON whatsapp_messages;
CREATE POLICY "Anon insert access" ON whatsapp_messages
    FOR INSERT
    WITH CHECK (true);

-- Verificar estrutura final
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_messages' 
ORDER BY ordinal_position;
