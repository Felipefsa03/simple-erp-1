-- ============================================================
-- RESTAURAÇÃO DE SEGURANÇA (RLS) — Simple ERP / Clinxia
-- Auditoria 14/09/2026 — v2 (nomes app_* para evitar conflito
-- com funções antigas já existentes no banco)
--
-- COMO RODAR: Supabase > SQL Editor > colar TUDO > Run.
-- É idempotente (pode rodar mais de uma vez sem quebrar).
-- Se algo parar de funcionar, rode a seção "ROLLBACK" no final.
-- ============================================================

-- ============================================================
-- 1. FUNÇÕES AUXILIARES NOVAS (app_*)
--    SECURITY DEFINER evita recursão de RLS.
--    Nomes app_* NÃO conflitam com funções antigas do banco.
-- ============================================================

create or replace function public.app_get_user_clinic_id()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select clinic_id::text
  from public.users
  where id = auth.uid()
    and deleted_at is null
  limit 1;
$$;

create or replace function public.app_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select role = 'super_admin'
    from public.users
    where id = auth.uid()
    limit 1
  ), false);
$$;

create or replace function public.app_is_clinic_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select role in ('admin', 'super_admin')
    from public.users
    where id = auth.uid()
    limit 1
  ), false);
$$;

-- Acesso à clínica: própria, filial (parent_id), matriz ou irmã.
create or replace function public.app_is_clinic_accessible(target_clinic_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    public.app_is_super_admin()
    or (
      target_clinic_id is not null
      and target_clinic_id = public.app_get_user_clinic_id()
    )
    or exists (
      select 1 from public.clinics c
      where c.id::text = target_clinic_id
        and c.parent_id::text = public.app_get_user_clinic_id()
    )
    or exists (
      select 1 from public.clinics c
      where c.id::text = public.app_get_user_clinic_id()
        and c.parent_id::text = target_clinic_id
    )
    or exists (
      select 1
      from public.clinics a
      join public.clinics b
        on a.parent_id is not null
       and a.parent_id::text = b.parent_id::text
      where a.id::text = target_clinic_id
        and b.id::text = public.app_get_user_clinic_id()
    );
$$;

-- Políticas chamam estas funções: quem consulta precisa de EXECUTE.
grant execute on function public.app_get_user_clinic_id() to anon, authenticated;
grant execute on function public.app_is_super_admin() to anon, authenticated;
grant execute on function public.app_is_clinic_admin() to anon, authenticated;
grant execute on function public.app_is_clinic_accessible(text) to anon, authenticated;

-- ============================================================
-- 2. LIMPAR SEGREDOS VAZADOS (auditoria)
--    O backend lê o Mercado Pago via env (MP_ACCESS_TOKEN) ou
--    coluna JSON "mercadopago". Estas colunas planas estavam
--    expostas e não são usadas pelo gateway.
-- ============================================================

update public.integration_config
set
  mp_access_token = null,
  mercado_pago_token = null,
  mp_webhook_secret = null
where
  mp_access_token is not null
  or mercado_pago_token is not null
  or mp_webhook_secret is not null;

-- ============================================================
-- 3. RESTAURAR GRANTS (caso tenham sido revogados antes)
-- ============================================================

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Booking público usa RPC SECURITY DEFINER com token anon:
-- garantir execute para anon/authenticated.
do $$
begin
  execute 'grant execute on function public.public_create_booking to anon, authenticated';
exception
  when undefined_function then null;
  when others then null;
end $$;

-- ============================================================
-- 3.5. LIMPAR POLÍTICAS ANTIGAS (evita políticas permissivas
--      antigas continuarem liberando dados)
-- ============================================================

do $$
declare
  t record;
  p record;
begin
  for t in
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
  loop
    for p in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = t.table_name
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t.table_name);
    end loop;
  end loop;
end $$;

-- ============================================================
-- 4. LIGAR RLS EM TODAS AS TABELAS
-- ============================================================

do $$
declare
  t record;
begin
  for t in
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
  loop
    execute format('alter table public.%I enable row level security', t.table_name);
  end loop;
end $$;

-- ============================================================
-- 5. TABELAS DE SEGREDOS/SISTEMA — SEM POLÍTICAS
--    (apenas service_role/backend enxerga; usuários comuns: nada)
--    whatsapp_credentials, system_secrets, user_2fa,
--    password_codes, phone_verification_sessions, auth_sessions,
--    system_integrations, banned_ips, audit_logs, security_logs
-- ============================================================

-- (RLS ligado acima já as protege: sem policy = nenhum acesso
--  para anon/authenticated. O backend usa service_role, que
--  ignora RLS.)

-- ============================================================
-- 6. USERS — políticas próprias
-- ============================================================

drop policy if exists users_select_policy on public.users;
create policy users_select_policy on public.users
  for select
  using (
    id = auth.uid()
    or clinic_id::text = public.app_get_user_clinic_id()
    or public.app_is_super_admin()
  );

drop policy if exists users_insert_policy on public.users;
create policy users_insert_policy on public.users
  for insert
  with check (
    id = auth.uid()
    or public.app_is_clinic_admin()
    or public.app_is_super_admin()
  );

drop policy if exists users_update_policy on public.users;
create policy users_update_policy on public.users
  for update
  using (
    id = auth.uid()
    or (
      public.app_is_clinic_admin()
      and clinic_id::text = public.app_get_user_clinic_id()
    )
    or public.app_is_super_admin()
  );

drop policy if exists users_delete_policy on public.users;
create policy users_delete_policy on public.users
  for delete
  using (public.app_is_super_admin());

-- ============================================================
-- 7. CLINICS — políticas próprias
-- ============================================================

drop policy if exists clinics_select_policy on public.clinics;
create policy clinics_select_policy on public.clinics
  for select
  using (public.app_is_clinic_accessible(id::text));

drop policy if exists clinics_insert_policy on public.clinics;
create policy clinics_insert_policy on public.clinics
  for insert
  with check (auth.role() = 'authenticated');

drop policy if exists clinics_update_policy on public.clinics;
create policy clinics_update_policy on public.clinics
  for update
  using (
    public.app_is_clinic_accessible(id::text)
    or public.app_is_super_admin()
  );

drop policy if exists clinics_delete_policy on public.clinics;
create policy clinics_delete_policy on public.clinics
  for delete
  using (public.app_is_super_admin());

-- ============================================================
-- 8. INTEGRATION_CONFIG — segredos zerados acima.
--    Leitura: qualquer usuário autenticado (preços/planos).
--    Escrita: super_admin (backend usa service_role).
-- ============================================================

drop policy if exists integration_config_select_policy on public.integration_config;
create policy integration_config_select_policy on public.integration_config
  for select
  using (auth.role() = 'authenticated');

drop policy if exists integration_config_write_policy on public.integration_config;
create policy integration_config_write_policy on public.integration_config
  for all
  using (public.app_is_super_admin())
  with check (public.app_is_super_admin());

-- ============================================================
-- 9. TABELAS OPERACIONAIS — por clínica (matriz/filial/irmã)
--    Tabelas SEM coluna clinic_id ficam restritas a super_admin
--    (backend usa service_role e não é afetado).
-- ============================================================

do $$
declare
  t record;
  has_cid boolean;
begin
  for t in
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and table_name not in (
        'users',
        'clinics',
        'integration_config',
        'whatsapp_credentials',
        'system_secrets',
        'user_2fa',
        'password_codes',
        'phone_verification_sessions',
        'auth_sessions',
        'system_integrations',
        'banned_ips',
        'audit_logs',
        'security_logs'
      )
  loop
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = t.table_name
        and column_name = 'clinic_id'
    ) into has_cid;

    if has_cid then
      execute format('drop policy if exists %I on public.%I', t.table_name || '_select_policy', t.table_name);
      execute format('create policy %I on public.%I for select using (public.app_is_clinic_accessible(clinic_id::text))', t.table_name || '_select_policy', t.table_name);

      execute format('drop policy if exists %I on public.%I', t.table_name || '_insert_policy', t.table_name);
      execute format('create policy %I on public.%I for insert with check (public.app_is_clinic_accessible(clinic_id::text))', t.table_name || '_insert_policy', t.table_name);

      execute format('drop policy if exists %I on public.%I', t.table_name || '_update_policy', t.table_name);
      execute format('create policy %I on public.%I for update using (public.app_is_clinic_accessible(clinic_id::text))', t.table_name || '_update_policy', t.table_name);

      execute format('drop policy if exists %I on public.%I', t.table_name || '_delete_policy', t.table_name);
      execute format('create policy %I on public.%I for delete using (public.app_is_clinic_accessible(clinic_id::text))', t.table_name || '_delete_policy', t.table_name);
    else
      execute format('drop policy if exists %I on public.%I', t.table_name || '_superadmin_policy', t.table_name);
      execute format('create policy %I on public.%I for all using (public.app_is_super_admin()) with check (public.app_is_super_admin())', t.table_name || '_superadmin_policy', t.table_name);
    end if;
  end loop;
end $$;

-- ============================================================
-- 10. VERIFICAÇÃO RÁPIDA (opcional)
-- ============================================================

-- As consultas abaixo DEVEM retornar "false" (nenhuma tabela sem RLS):
-- select exists (select 1 from pg_tables where schemaname='public' and rowsecurity = false) as alguma_tabela_sem_rls;

-- ============================================================
-- ROLLBACK (só se algo quebrar)
-- ============================================================
-- do $$
-- declare t record;
-- begin
--   for t in select table_name from information_schema.tables
--            where table_schema='public' and table_type='BASE TABLE'
--   loop
--     execute format('alter table public.%I disable row level security', t.table_name);
--   end loop;
-- end $$;
