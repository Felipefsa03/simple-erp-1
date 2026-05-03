-- Script para aplicar ON DELETE CASCADE (Hard Delete) 
-- Garante que quando uma Clínica, Paciente ou Usuário for excluído, todos os registros vinculados sejam permanentemente removidos.

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- 1. Identificar e recriar constraints para PATIENT_ID
    FOR r IN (
        SELECT tc.table_name, tc.constraint_name, kcu.column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu 
          ON tc.constraint_name = kcu.constraint_name 
          AND tc.table_schema = kcu.table_schema 
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND kcu.column_name = 'patient_id'
          AND tc.table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        
        -- Limpa registros órfãos que possam impedir a criação da constraint
        EXECUTE 'DELETE FROM public.' || quote_ident(r.table_name) || ' WHERE ' || quote_ident(r.column_name) || ' IS NOT NULL AND ' || quote_ident(r.column_name) || ' NOT IN (SELECT id FROM public.patients)';
        
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' ADD CONSTRAINT ' || quote_ident(r.constraint_name) || ' FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE';
    END LOOP;

    -- 2. Identificar e recriar constraints para PROFESSIONAL_ID (USERS)
    FOR r IN (
        SELECT tc.table_name, tc.constraint_name, kcu.column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu 
          ON tc.constraint_name = kcu.constraint_name 
          AND tc.table_schema = kcu.table_schema 
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND kcu.column_name IN ('professional_id', 'user_id', 'owner_id')
          AND tc.table_schema = 'public'
          -- Evita alterar tabelas de auth do próprio Supabase
          AND tc.table_name NOT LIKE 'auth_%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        
        -- Limpa registros órfãos que possam impedir a criação da constraint
        EXECUTE 'DELETE FROM public.' || quote_ident(r.table_name) || ' WHERE ' || quote_ident(r.column_name) || ' IS NOT NULL AND ' || quote_ident(r.column_name) || ' NOT IN (SELECT id FROM public.users)';
        
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' ADD CONSTRAINT ' || quote_ident(r.constraint_name) || ' FOREIGN KEY (' || quote_ident(r.column_name) || ') REFERENCES public.users(id) ON DELETE CASCADE';
    END LOOP;

    -- 3. Identificar e recriar constraints para CLINIC_ID
    FOR r IN (
        SELECT tc.table_name, tc.constraint_name, kcu.column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu 
          ON tc.constraint_name = kcu.constraint_name 
          AND tc.table_schema = kcu.table_schema 
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND kcu.column_name = 'clinic_id'
          AND tc.table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        
        -- Limpa registros órfãos que possam impedir a criação da constraint
        EXECUTE 'DELETE FROM public.' || quote_ident(r.table_name) || ' WHERE ' || quote_ident(r.column_name) || ' IS NOT NULL AND ' || quote_ident(r.column_name) || ' NOT IN (SELECT id FROM public.clinics)';
        
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' ADD CONSTRAINT ' || quote_ident(r.constraint_name) || ' FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE';
    END LOOP;
    
END $$;
