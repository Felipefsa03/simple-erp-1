-- ============================================
-- VERIFICAÇÃO: Execute para confirmar que tudo foi criado
-- ============================================

-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Verificar políticas RLS
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Verificar funções criadas
SELECT proname 
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- Verificar dados demo
SELECT 'clinics' as tabela, count(*) as registros FROM clinics
UNION ALL
SELECT 'services', count(*) FROM services
UNION ALL
SELECT 'patients', count(*) FROM patients;
