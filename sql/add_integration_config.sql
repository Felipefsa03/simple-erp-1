-- Adicionar coluna de configuração de integração
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS integration_config JSONB DEFAULT '{}'::jsonb;

-- Garantir que as colunas anteriores também existem (caso não tenha rodado o outro script)
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"can_manage_finance": true, "can_manage_stock": true, "can_manage_marketing": true, "can_manage_team": true}'::jsonb;

-- Comentário para facilitar identificação
COMMENT ON COLUMN clinics.integration_config IS 'Configurações de integração (Asaas, etc)';
