-- ============================================
-- Política RLS definitiva para integration_config
-- Permite INSERT/UPDATE/DELETE/SELECT para super_admin
-- ============================================

-- 1. Dropar políticas antigas
DROP POLICY IF EXISTS "integration_config_select" ON integration_config;
DROP POLICY IF EXISTS "integration_config_all" ON integration_config;

-- 2. Política definitiva para super_admin
CREATE POLICY "integration_config_super_admin" ON integration_config 
FOR ALL 
USING (
  is_super_admin() = true
)
WITH CHECK (
  is_super_admin() = true
);

-- 3. Também permitir que usuários normais vejam/editam suas próprias clínicas
CREATE POLICY "integration_config_normal" ON integration_config 
FOR ALL 
USING (
  clinic_id = get_user_clinic_id()
)
WITH CHECK (
  clinic_id = get_user_clinic_id()
);

-- 4. Testar as funções
SELECT 
  auth.uid() as current_user,
  is_super_admin() as is_super,
  get_user_clinic_id() as clinic_id;

-- 5. Verificar políticas
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'integration_config'
ORDER BY policyname;