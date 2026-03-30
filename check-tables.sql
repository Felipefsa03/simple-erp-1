-- Verificar estrutura completa das tabelas relevantes
SELECT 
  'patients' as table_name,
  column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'patients'
ORDER BY ordinal_position;

SELECT 
  'professionals' as table_name,
  column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'professionals'
ORDER BY ordinal_position;

SELECT 
  'users' as table_name,
  column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

SELECT 
  'appointments' as table_name,
  column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'appointments'
ORDER BY ordinal_position;

SELECT 
  'services' as table_name,
  column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'services'
ORDER BY ordinal_position;

SELECT 
  'stock_items' as table_name,
  column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'stock_items'
ORDER BY ordinal_position;

SELECT 
  'transactions' as table_name,
  column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
