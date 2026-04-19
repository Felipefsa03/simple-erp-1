-- Verificar dados com clinic_id correto
SELECT id, name, clinic_id, deleted_at 
FROM patients 
WHERE clinic_id = '00000000-0000-0000-0000-000000000001'
LIMIT 5;

-- Verificar se há pacientes com deleted_at
SELECT id, name, clinic_id, deleted_at 
FROM patients 
WHERE clinic_id = '00000000-0000-0000-0000-000000000001' 
AND deleted_at IS NOT NULL;

-- Verificar TODOS os patients (sem filtro de clinic_id)
SELECT id, name, clinic_id 
FROM patients 
ORDER BY created_at DESC 
LIMIT 10;