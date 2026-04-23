-- ============================================
-- MIGRAÇÃO: Adicionar coluna de permissões na tabela clinics
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- 1. Adicionar coluna permissions JSONB
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- 2. Atualizar existing clinics com permissões default
UPDATE clinics 
SET permissions = (
  SELECT jsonb_object_agg(key, value)
  FROM (
    VALUES
      ('create_appointment', '["super_admin", "admin", "dentist", "receptionist", "aesthetician"]'::jsonb),
      ('edit_record', '["super_admin", "admin", "dentist", "aesthetician"]'::jsonb),
      ('finalize_appointment', '["super_admin", "admin", "dentist", "aesthetician"]'::jsonb),
      ('view_financial', '["super_admin", "admin", "financial", "receptionist"]'::jsonb),
      ('manage_financial', '["super_admin", "admin", "financial"]'::jsonb),
      ('delete_patient', '["super_admin", "admin"]'::jsonb),
      ('manage_patients', '["super_admin", "admin", "receptionist"]'::jsonb),
      ('import_patients', '["super_admin", "admin", "receptionist"]'::jsonb),
      ('manage_settings', '["super_admin", "admin"]'::jsonb),
      ('manage_commissions', '["super_admin", "admin"]'::jsonb),
      ('manage_team', '["super_admin", "admin"]'::jsonb),
      ('access_all_clinics', '["super_admin"]'::jsonb),
      ('view_dashboard', '["super_admin", "admin", "dentist", "receptionist", "aesthetician", "financial"]'::jsonb),
      ('manage_stock', '["super_admin", "admin", "receptionist"]'::jsonb),
      ('view_patients', '["super_admin", "admin", "dentist", "receptionist", "aesthetician"]'::jsonb),
      ('manage_integrations', '["super_admin", "admin", "receptionist"]'::jsonb)
  ) AS t(key, value)
)
WHERE permissions IS NULL OR permissions = '{}'::jsonb;

-- 3. Verificar se a coluna foi adicionada
SELECT id, name, permissions FROM clinics LIMIT 5;