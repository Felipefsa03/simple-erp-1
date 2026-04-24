-- ============================================
-- Correção da política de UPDATE para a tabela clinics
-- Permite que usuários atualizem as configurações (como permissões) de sua própria clínica
-- ============================================

-- Garante que a coluna permissions exista
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- Remove a política caso ela já exista para recriar
DROP POLICY IF EXISTS "users_update_own_clinic" ON clinics;

-- Cria a política que permite o UPDATE
CREATE POLICY "users_update_own_clinic" ON clinics
  FOR UPDATE USING (
    id = get_user_clinic_id()
  );

-- Garante que o RLS está ativado
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
