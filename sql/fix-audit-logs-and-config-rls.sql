-- ============================================================
-- PATCH RLS — audit_logs (frontend grava direto) + escrita de
-- integration_config por admin da própria clínica
-- Rodar no SQL Editor. Idempotente.
-- ============================================================

-- audit_logs: leitura e escrita por clínica + super_admin
drop policy if exists audit_logs_select_policy on public.audit_logs;
create policy audit_logs_select_policy on public.audit_logs
  for select
  using (
    public.app_is_super_admin()
    or clinic_id::text = public.app_get_user_clinic_id()
  );

drop policy if exists audit_logs_insert_policy on public.audit_logs;
create policy audit_logs_insert_policy on public.audit_logs
  for insert
  with check (
    public.app_is_super_admin()
    or clinic_id::text = public.app_get_user_clinic_id()
  );

drop policy if exists audit_logs_update_policy on public.audit_logs;
create policy audit_logs_update_policy on public.audit_logs
  for update
  using (public.app_is_super_admin());

drop policy if exists audit_logs_delete_policy on public.audit_logs;
create policy audit_logs_delete_policy on public.audit_logs
  for delete
  using (public.app_is_super_admin());

-- integration_config: admin da clínica pode gravar a PRÓPRIA linha
-- (super_admin grava qualquer linha, inclusive a global)
drop policy if exists integration_config_write_policy on public.integration_config;
create policy integration_config_write_policy on public.integration_config
  for all
  using (
    public.app_is_super_admin()
    or (
      public.app_is_clinic_admin()
      and clinic_id::text = public.app_get_user_clinic_id()
    )
  )
  with check (
    public.app_is_super_admin()
    or (
      public.app_is_clinic_admin()
      and clinic_id::text = public.app_get_user_clinic_id()
    )
  );
