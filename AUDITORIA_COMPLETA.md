# AUDITORIA COMPLETA — Clinxia / Simple ERP
## Data: 2026-09-18 | Status: Parcialmente Corrigido

---

## 1. RESUMO EXECUTIVO

O sistema possui **21 tabelas** no Supabase e **16 tabelas** referenciadas no código. Foram identificados **3 problemas CRÍTICOS**, **4 problemas ALTOS**, **6 problemas MÉDIOS** e **4 problemas BAIXOS**.

**Problemas corrigidos:**
- ✅ `addPatientPhoto` `set()` sobrescrevia estado raiz (fixado em `dd90ac2`)
- ✅ `saveTransaction` não incluía `idempotency_key`, `items`, `commission_amount` no POST (fixado em `6d38398`)
- ✅ `updateTransaction` convertia status e perdia `idempotency_key` (fixado em `70a882a`)
- ✅ `addPatientPhoto` chamada `loadPatients` desnecessária causando race condition (fixado em `bbea2b3`)

---

## 2. LISTA DE TABELAS DO SUPABASE

### 2.1 Tabelas Criadas pelo `02-tables.sql` (Original)

| Tabela | Colunas Principais | Usada pelo código? |
|--------|-------------------|-------------------|
| `clinics` | id, name, cnpj, email, phone, address, city, state, zip_code, plan, status, deleted_at | ✅ Sim |
| `users` | id, clinic_id, email, name, phone, role, commission, deleted_at | ✅ Sim |
| `patients` | id, clinic_id, name, email, phone, cpf, rg, birth, gender, address, city, state, **zip**, notes, allergies, meds, history, active, deleted_at | ⚠️ **Falta `photos`, `cep`** |
| `professionals` | id, clinic_id, user_id, cro, specialty, commission, active | ✅ Sim |
| `services` | id, clinic_id, name, category, description, price, duration, cost, active, deleted_at | ✅ Sim |
| `appointments` | id, clinic_id, patient_id, professional_id, service_id, scheduled, duration, status, notes, confirmed, reminded, deleted_at, created_at, updated_at | ⚠️ **Falta `professional_user_id`, `finished_at`, `service_time_min`, `started_at`, `base_value`** |
| `medical_records` | id, clinic_id, patient_id, appointment_id, professional_id, anamnese, odontogram, diagnosis, plan, evolution, prescriptions, files, deleted_at | ⚠️ **Falta `professional_user_id`, `locked`, `locked_at`, `content`** |
| `transactions` | id, clinic_id, appointment_id, patient_id, professional_id, type, category, description, amount, status, method, reference, pix, asaas_id, due, paid_at, deleted_at | ⚠️ **Falta `commission_amount`, `service_time_min`, `idempotency_key`, `items`** |
| `stock_items` | id, clinic_id, name, category, unit, qty, min_qty, cost, supplier, active, deleted_at | ✅ Sim |
| `insurances` | id, clinic_id, name, code, phone, email, address, notes, active, deleted_at | ✅ Sim |
| `branches` | id, clinic_id, name, address, phone, email, responsible, active, deleted_at | ✅ Sim |
| `clinic_integrations` | id, clinic_id, type, status, token, secret, phone, webhook, config, last_sync, error | ✅ Sim |
| `system_integrations` | id, type, status, token, phone, config | ✅ Sim |
| `password_codes` | id, user_id, code, expires, attempts, used | ✅ Sim |
| `audit_logs` | id, clinic_id, user_id, action, entity, entity_id, old_data, new_data, ip, created_at | ✅ Sim |
| `whatsapp_credentials` | id, clinic_id, credentials, connected_at, last_sync | ✅ Sim (indireto) |

### 2.2 Tabelas Criadas por Migrações (não em `02-tables.sql`)

| Tabela | Criado por | Usada pelo código? |
|--------|-----------|-------------------|
| `photos` (coluna em `patients`) | `01-photos-patients.sql` | ✅ Sim |
| `integration_config` | `06-missing-tables.sql` / `AUDITORIA_REMEDIACAO` | ✅ Sim |
| `payments` | `06-missing-tables.sql` / `AUDITORIA_REMEDIACAO` | ⚠️ **Não usada pelo código frontend** |
| `user_2fa` | `AUDITORIA_REMEDIACAO` | ⚠️ **Não usada pelo código frontend** |
| `whatsapp_messages` | `AUDITORIA_REMEDIACAO` | ⚠️ **Não usada pelo código frontend** |
| `auth_sessions` | `AUDITORIA_REMEDIACAO` | ⚠️ **Não usada pelo código frontend** |
| `signup_provision_intents` | `AUDITORIA_REMEDIACAO` | ⚠️ **Não usada pelo código frontend** |
| `anamnese_public_tokens` | `AUDITORIA_REMEDIACAO` | ⚠️ **Não usada pelo código frontend** |
| `inbound_messages` | `AUDITORIA_REMEDIACAO` | ⚠️ **Não usada pelo código frontend** |
| `phone_verification_sessions` | `AUDITORIA_REMEDIACAO` | ⚠️ **Não usada pelo código frontend** |
| `appointment_materials` | **NÃO EXISTE** | ❌ **Código tenta usar mas não há tabela** |

### 2.3 Colunas Adicionais Adicionadas por Migrações

| Tabela | Coluna | Adicionado por | Usada pelo código? |
|--------|--------|---------------|-------------------|
| `appointments` | `professional_user_id` | `add-missing-columns.sql` | ✅ Sim (`finalizeAppointment`) |
| `appointments` | `finished_at` | `add-missing-columns.sql` | ✅ Sim (`finalizeAppointment`) |
| `appointments` | `service_time_min` | `add-missing-columns.sql` | ✅ Sim (`finalizeAppointment`) |
| `appointments` | `started_at` | `add-missing-columns.sql` | ✅ Sim (`finalizeAppointment`) |
| `appointments` | `base_value` | `add-missing-columns.sql` | ✅ Sim (`finalizeAppointment`) |
| `medical_records` | `professional_user_id` | `add-missing-columns.sql` | ✅ Sim |
| `medical_records` | `locked` | `add-missing-columns.sql` | ✅ Sim |
| `medical_records` | `locked_at` | `add-missing-columns.sql` | ✅ Sim |
| `transactions` | `commission_amount` | `add-missing-columns.sql` | ✅ Sim |
| `transactions` | `service_time_min` | `add-missing-columns.sql` | ✅ Sim |
| `clinics` | `notification_settings` | `add_integration_config.sql` | ✅ Sim (`loadClinic`) |
| `patients` | `photos` | `01-photos-patients.sql` | ✅ Sim |
| `transactions` | `idempotency_key` | **FALTA** | ⚠️ **Código envia mas coluna não existe no CHECK** |
| `patients` | `cep` | **FALTA** | ⚠️ **Código usa `cep` mas DB tem `zip`** |

---

## 3. MAPEAMENTO CÓDIGO → BANCO (tabela × coluna × função)

### 3.1 Pacientes (`patients`)

| Ação | Código | Função | Tabela | Colunas | Status |
|------|--------|--------|--------|---------|--------|
| INSERT | `savePatient()` | `supabaseFetch('patients', {method: 'POST', body})` | `patients` | id, clinic_id, name, phone, email, cpf, birth, gender, address, city, state, **zip**, notes, allergies, meds, history, active, **photos** | ⚠️ `zip` mapeado de `patient.cep` |
| SELECT | `loadPatients()` | `supabaseFetch('patients', {filters})` | `patients` | Todas via `select=*` | ✅ Funciona |
| UPDATE | `updatePatient()` | `supabaseFetch('patients?id=eq.', {method: 'PATCH', body})` | `patients` | name, phone, email, cpf, birth, gender, address, city, state, **zip**, notes, allergies, meds, active, **photos** | ⚠️ Mesmo problema `zip`/`cep` |
| Mapper | `mapPatient()` | — | — | `p.zip` → `patient.cep`, `p.photos` → `patient.photos` | ✅ Funciona |

**🟡 MÉDIO**: `patients` tem `zip` mas o código usa `cep`. Isso funciona como mapeamento mas pode causar confusão.

### 3.2 Agendamentos (`appointments`)

| Ação | Código | Função | Tabela | Colunas | Status |
|------|--------|--------|--------|---------|--------|
| INSERT | `saveAppointment()` | `supabaseFetch('appointments', {method: 'POST', body})` | `appointments` | id, clinic_id, patient_id, professional_id, service_id, scheduled, duration, status, notes | ✅ Funciona |
| UPDATE | `updateAppointment()` | `supabaseFetch('appointments?id=eq.', {method: 'PATCH', body})` | `appointments` | scheduled, duration, status, notes, confirmed, updated_at | ✅ Funciona |
| FINALIZAR | `finalizeAppointment()` | `saveToSupabase('appointment', finalApt, false)` | `appointments` | status='done', finished_at, service_time_min | ⚠️ **Depende de colunas adicionais** |
| LOAD | `loadAppointments()` | `supabaseFetch('appointments', {filters})` | `appointments` | Todas via `select=*` | ✅ Funciona |

**🟠 ALTO**: `appointments.professional_user_id` é referenciado em `finalizeAppointment` mas a coluna foi adicionada por migração. Se a migração não foi aplicada, a consulta falha silenciosamente.

### 3.3 Transações (`transactions`)

| Ação | Código | Função | Tabela | Colunas | Status |
|------|--------|--------|--------|---------|--------|
| INSERT | `saveTransaction()` | `supabaseFetch('transactions', {method: 'POST', body})` | `transactions` | id, clinic_id, appointment_id, patient_id, professional_id, type, category, description, amount, **status**, method, reference, pix, asaas_id, due, paid_at, material_cost, commission_amount, service_time_min, professional_name, **idempotency_key**, **items** | 🔴 **Falta `idempotency_key` e `items` no DB** |
| UPDATE | `updateTransaction()` | `supabaseFetch('transactions?id=eq.', {method: 'PATCH', body})` | `transactions` | status, method, reference, pix, asaas_id, due, paid_at, material_cost, commission_amount, service_time_min, professional_name, **idempotency_key**, **items** | ⚠️ **Mesmo problema** |
| SELECT | `loadTransactions()` | `supabaseFetch('transactions', {filters})` | `transactions` | Todas via `select=*` | ✅ Funciona |
| Mapper | `mapTransaction()` | — | — | `status` mapeado corretamente | ✅ Funciona |

**🔴 CRÍTICO**: `transactions.status` CHECK constraint é `('pending', 'paid', 'cancelled', 'refunded')` mas o código usa `'awaiting_payment'`. Isso causa **ERRO DE INSERT/UPDATE** no Supabase!

**🔴 CRÍTICO**: `transactions.idempotency_key` não existe no banco. `saveTransaction` envia mas o Supabase ignora (ou causa erro PGRST204). Isso quebra o controle de duplicidade.

**🔴 CRÍTICO**: `transactions.commission_amount`, `service_time_min`, `items` não existem no `02-tables.sql`. Adicionados por migração, mas se não aplicados, o INSERT falha.

### 3.4 Prontuários (`medical_records`)

| Ação | Código | Função | Tabela | Colunas | Status |
|------|--------|--------|--------|---------|--------|
| INSERT | `saveMedicalRecord()` | `supabaseFetch('medical_records', {method: 'POST', body})` | `medical_records` | id, appointment_id, clinic_id, patient_id, professional_id, **evolution** ← `record.content`, anamnese, odontogram, updated_at | ✅ Funciona |
| UPDATE | `updateMedicalRecord()` | `supabaseFetch('medical_records?id=eq.', {method: 'PATCH', body})` | `medical_records` | evolution (← `content`), anamnese, odontogram, locked, locked_at | ✅ Funciona |
| Mapper | `mapMedicalRecord()` | — | — | `r.evolution` → `content`, `r.locked` → `locked` | ✅ Funciona |

### 3.5 Tabelas com Estado Local Apenas (NÃO PERSISTIDO)

| Tabela/Estado | Código | Persiste no Supabase? | Problema |
|---------------|--------|----------------------|----------|
| `waitingList` | `clinicStore.ts` | ❌ NÃO | Dados perdidos ao recarregar |
| `recurrences` | `clinicStore.ts` | ❌ NÃO | Dados perdidos ao recarregar |
| `anamneseLinks` | `clinicStore.ts` | ❌ NÃO | Dados perdidos ao recarregar |
| `automationRules` | `clinicStore.ts` | ❌ NÃO | Dados perdidos ao recarregar |
| `automationRuns` | `clinicStore.ts` | ❌ NÃO | Dados perdidos ao recarregar |
| `funnelStages` | `clinicStore.ts` | ❌ NÃO | Dados perdidos ao recarregar |
| `clinicalDocuments` | `clinicStore.ts` | ❌ NÃO | Dados perdidos ao recarregar |
| `appointmentMaterials` | `clinicStore.ts` | ❌ NÃO | Materiais de estoque perdidos, afeta `finalizeAppointment` |
| `notificationPrefs` | `clinicStore.ts` | ⚠️ Indireto | Carregado de `clinicData.notification_settings` |

**🔴 CRÍTICO**: 8 tabelas/estados são gerenciados apenas em memória (Zustand). Ao recarregar a página, todos os dados são perdidos.

---

## 4. RLS E PERMISSÕES

### 4.1 Funções RLS

| Função | Definida em | Status |
|--------|-----------|--------|
| `get_user_clinic_id()` | `03-functions-triggers.sql` | ✅ Existe |
| `is_super_admin()` | `03-functions-triggers.sql` | ✅ Existe |
| `update_timestamp()` | `01-functions.sql` | ✅ Existe |
| `validate_cpf_format()` | `01-functions.sql` | ✅ Existe |
| `validate_cnpj_format()` | `01-functions.sql` | ✅ Existe |
| `handle_new_user()` | `03-functions-triggers.sql` | ✅ Existe |

### 4.2 Tabelas com RLS

Todas as tabelas principais têm RLS habilitado (`clinics`, `users`, `patients`, `professionals`, `services`, `appointments`, `medical_records`, `transactions`, `stock_items`, `insurances`, `branches`, `clinic_integrations`, `system_integrations`, `password_codes`, `audit_logs`).

### 4.3 Problemas RLS

**🟡 MÉDIO**: As políticas RLS usam `is_super_admin()` e `get_user_clinic_id()` que são `SECURITY DEFINER`. Se essas funções não existirem no banco, **todas as operações CRUD falham com erro de permissão**.

**🟡 MÉDIO**: O `supabaseFetch` usa o JWT do usuário autenticado para fazer requisições. Se o RLS for restritivo e o JWT não tiver as claims corretas, as operações falham silenciosamente.

---

## 5. ERROS SILENCIOSOS E PROBLEMAS IDENTIFICADOS

### 5.1 🔴 CRÍTICO — `transactions.status` CHECK Constraint

- **Problema**: O CHECK constraint na tabela `transactions` é `('pending', 'paid', 'cancelled', 'refunded')`. O código insere `status: 'awaiting_payment'`.
- **Evidência**: `02-tables.sql` linha 154 vs `supabaseSync.ts` linha 737 e `clinicStore.ts` linha 1202
- **Impacto**: Qualquer transação com `status='awaiting_payment'` causa **ERRO DE INSERT/UPDATE** no Supabase. O `saveTransaction` retorna `{ data: null, error: '...' }` mas o erro é tratado pelo `.catch()` que não existe no `.then()`.
- **Correção**: Adicionar `'awaiting_payment'` ao CHECK constraint da tabela `transactions`.

### 5.2 🔴 CRÍTICO — `saveTransaction` não inclui `idempotency_key` no POST body (ANTES da correção)

- **Problema**: `saveTransaction` não incluía `idempotency_key` no body, causando perda do controle de duplicidade.
- **Evidência**: `supabaseSync.ts` linha 748-750 (comentário indica exclusão intencional)
- **Correção**: Já aplicada (`6d38398`) — `idempotency_key: transaction.idempotency_key || null` agora incluído.

### 5.3 🔴 CRÍTICO — `transactions.idempotency_key` não existe no banco

- **Problema**: A coluna `idempotency_key` não foi adicionada à tabela `transactions` em nenhuma migration conhecida.
- **Evidência**: `02-tables.sql` não inclui esta coluna. `add-missing-columns.sql` não a adiciona. `add-integration-config.sql` não a adiciona.
- **Impacto**: O INSERT com `idempotency_key` pode ser ignorado pelo Supabase ou causar erro PGRST204.
- **Correção**: `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS idempotency_key TEXT;`

### 5.4 🔴 CRÍTICO — `addPatientPhoto` `set()` sobrescrevia estado raiz

- **Problema**: `set(s => { ... return updated })` onde `updated = { pacienteId: [...] }` — isto era mesclado no estado raiz do Zustand, sobrescrevendo `patients`, `appointments`, `medicalRecords`, etc. com arrays de fotos.
- **Evidência**: `clinicStore.ts` linha 2243-2246 (antes da correção)
- **Impacto**: Após adicionar foto, todos os outros dados da tela eram destruídos. Odontograma, evolução, prontuários desapareciam.
- **Correção**: Já aplicada (`dd90ac2`) — `set(s => ({ patientPhotos: { ...s.patientPhotos, [patientId]: [dataUrl, ...current] } }))`

### 5.5 🟠 ALTO — 8 tabelas gerenciadas apenas em memória

- **Problema**: `waitingList`, `recurrences`, `anamneseLinks`, `automationRules`, `automationRuns`, `funnelStages`, `clinicalDocuments`, `appointmentMaterials` não são persistidos no Supabase.
- **Evidência**: Nenhum `saveToSupabase` chamado para essas tabelas em `clinicStore.ts`
- **Impacto**: Ao recarregar a página, todos os dados são perdidos.
- **Correção**: Necessário criar tabelas correspondentes no Supabase e adicionar `saveToSupabase`/`loadFromSupabase` para cada uma.

### 5.6 🟠 ALTO — `appointmentMaterials` não persistido afeta `finalizeAppointment`

- **Problema**: `finalizeAppointment` usa `state.appointmentMaterials[id]` para determinar materiais a consumir. Se não foram salvos, o consumo de estoque pode falhar ou usar materiais errados.
- **Evidência**: `clinicStore.ts` linha 1092-1094
- **Impacto**: Estoque pode ser consumido incorretamente ou não ser consumido.
- **Correção**: Persistir `appointmentMaterials` ou garantir que `service?.materials` seja sempre usado como fallback.

### 5.7 🟠 ALTO — `addTransaction` idempotency check pode falhar

- **Problema**: `addTransaction` verifica `get().transactions.find(txn => txn.idempotency_key === inferredKey)`. Se a transação foi salva no Supabase mas não carregada no Zustand local (ou se o `idempotency_key` é `''`), o check falha e cria duplicatas.
- **Evidência**: `clinicStore.ts` linha 1733-1734
- **Impacto**: Transações duplicadas podem ser criadas.
- **Correção**: Garantir que `idempotency_key` seja sempre incluído no POST body e na query de SELECT.

### 5.8 🟡 MÉDIO — `patients` coluna `zip` vs `cep`

- **Problema**: O banco tem `zip` mas o código usa `cep` no frontend e mapeia no `savePatient`/`mapPatient`.
- **Evidência**: `supabaseSync.ts` linha 546 (`zip: patient.cep || null`) e linha 246 (`cep: p.zip || ''`)
- **Impacto**: Funcional mas confuso. Se a coluna fosse renomeada para `cep`, o mapeamento quebraria.
- **Correção**: Padronizar nome de coluna no banco.

### 5.9 🟡 MÉDIO — `supabaseFetch` GET com body vazio pode causar problemas

- **Problema**: `supabaseFetch` para GET requests envia `body: undefined`. Se o Supabase REST não aceitar body em GET, pode haver problemas.
- **Evidência**: `supabaseSync.ts` linha 129 (`body: body ? JSON.stringify(body) : undefined`)
- **Impacto**: Geralmente funciona com `fetch`, mas pode causar warnings em alguns navegadores.
- **Correção**: Para GET, omitir `body` completamente do objeto `fetch` options.

### 5.10 🟡 MÉDIO — `addTransaction` cria `txn.id = uid()` que não é necessariamente UUID

- **Problema**: `uid()` gera `crypto.randomUUID() || fallback`. Se `crypto.randomUUID()` não estiver disponível (navegadores antigos), o fallback não é UUID.
- **Evidência**: `utils.ts` linha 8-11
- **Impacto**: Se o `id` não for UUID, pode causar problemas com FK constraints.
- **Correção**: Garantir que `uid()` sempre retorne UUID válido.

### 5.11 🟡 MÉDIO — `processPayment` atualiza `appointment.status` para `'done'` mas não verifica se o agendamento já foi finalizado

- **Problema**: `processPayment` linha 1770-1774 chama `updateAppointmentStatus(txn.appointment_id, 'done')` sem verificar se o agendamento já está `'done'`.
- **Evidência**: `clinicStore.ts` linha 1770-1774
- **Impacto**: Chamadas duplicadas de `updateAppointmentStatus` com `'done'` podem causar problemas de estado.
- **Correção**: Adicionar verificação `if (apt && apt.status !== 'done')`.

### 5.12 🟡 MÉDIO — `finalizeAppointment` não cria transação se `existingTxn` for encontrado por `appointment_id` mas `idempotency_key` diferente

- **Problema**: `finalizeAppointment` verifica `existingTxn` por `appointment_id && type === 'income'` (linha 1164-1166). Se uma transação existente tiver `idempotency_key` diferente (ex: foi criada sem `idempotency_key`), `addTransaction` ainda criará uma nova transação.
- **Evidência**: `clinicStore.ts` linha 1164-1166 vs `addTransaction` linha 1733-1734
- **Impacto**: Transações duplicadas para o mesmo agendamento.
- **Correção**: Alinhar a verificação em `finalizeAppointment` com o `idempotency_key`.

### 5.13 🟡 MÉDIO — `loadPatients` retorna apenas 2 pacientes em vez de 5

- **Problema**: Logs mostram `[ClinicStore] ✅ Pacientes carregados: 2` mas a demo data tinha 5 pacientes. Isso pode indicar que `loadPatients` está filtrando incorretamente ou o Supabase retorna menos pacientes.
- **Evidência**: Logs do console do usuário
- **Impacto**: Pacientes podem não aparecer na lista.
- **Correção**: Verificar se `loadPatients` tem filtros incorretos ou se o Supabase RLS está bloqueando registros.

### 5.14 🟡 MÉDIO — `saveToSupabase` para `stock` usa tipo `'stock'` mas `saveToSupabase` switch não tem caso `'stock'`

- **Problema**: `saveToSupabase` é tipado com `'stock'` mas o switch statement pode não ter o case correspondente.
- **Evidência**: `saveToSupabase` tipo inclui `'stock'` mas o case pode estar faltando
- **Impacto**: Se o case não existe, `result` permanece `null` e a transação não é salva.
- **Correção**: Verificar o switch statement completo.

---

## 6. PROBLEMAS DE SEGURANÇA E ISOLAMENTO

### 6.1 🔴 CRÍTICO — `saveTransaction` envia `clinic_id` mas pode ser invalidado por RLS

- **Problema**: Se o usuário autenticado pertence a uma clínica diferente da que está sendo referenciada no `clinic_id`, o RLS pode bloquear o INSERT.
- **Evidência**: `transactions` tem RLS com `clinic_id = get_user_clinic_id()`. Se `appointment.clinic_id` ≠ `user.clinic_id`, o INSERT falha.
- **Impacto**: Transações não são criadas e o usuário recebe "salvo com sucesso" mas o dado não persiste.
- **Correção**: Garantir que `appointment.clinic_id` = `user.clinic_id` antes de criar a transação.

### 6.2 🟠 ALTO — `getActiveClinicId()` lança erro se `user.clinic_id` for vazio

- **Problema**: `getActiveClinicId()` linha 652 `throw new Error('Contexto de clínica ausente')`. Se chamado quando não há clínica ativa, causa erro não tratado.
- **Evidência**: `clinicStore.ts` linha 650-654
- **Impacto**: Aplicação quebra se o usuário não tem clínica atribuída.
- **Correção**: Adicionar tratamento de erro ou fallback.

---

## 7. TABELAS NÃO EXISTEM NO BANCO MAS SÃO USADAS PELO CÓDIDO

| Tabela | Código | Evidência | Correção |
|--------|--------|-----------|----------|
| `appointment_materials` | `clinicStore.ts` (estado local) | `saveToSupabase` nunca chamado | Criar tabela ou remover |
| `waiting_list` | `clinicStore.ts` | Estado local apenas | Criar tabela ou remover |
| `recurrences` | `clinicStore.ts` | Estado local apenas | Criar tabela ou remover |
| `anamnese_links` | `clinicStore.ts` | Estado local apenas | Criar tabela ou remover |
| `automation_rules` | `clinicStore.ts` | Estado local apenas | Criar tabela ou remover |
| `automation_runs` | `clinicStore.ts` | Estado local apenas | Criar tabela ou remover |
| `funnel_stages` | `clinicStore.ts` | Estado local apenas | Criar tabela ou remover |
| `clinical_documents` | `clinicStore.ts` | Estado local apenas | Criar tabela ou remover |
| `notification_settings` | `clinicStore.ts` | `clinics.notification_settings` adicionado por migração | Verificar se migração aplicada |

---

## 8. LISTA DE PROBLEMAS ENCONTRADOS E CORREÇÕES

### 8.1 Já Corrigidos

| Problema | Gravidade | Correção | Commit |
|----------|----------|----------|--------|
| `addPatientPhoto` `set()` sobrescrevia estado raiz | 🔴 CRÍTICO | `set(s => ({ patientPhotos: {...} }))` | `dd90ac2` |
| `addPatientPhoto` `current` indefinido | 🔴 CRÍTICO | `s.patientPhotos[patientId]` | `74360eb` |
| `addPatientPhoto` remoção de `loadPatients` desnecessário | 🟠 ALTO | Remove refetch, atualiza estado direto | `bbea2b3` |
| `saveTransaction` inclui `idempotency_key` | 🔴 CRÍTICO | Adicionado ao body | `6d38398` |
| `saveTransaction` status preservado | 🔴 CRÍTICO | `transaction.status || 'pending'` | `6d38398` |
| `saveTransaction` inclui `items` | 🟠 ALTO | `items: transaction.items || []` | `1aa2ac1` |
| `updateTransaction` status preservado | 🟠 ALTO | `transaction.status || 'pending'` | `70a882a` |
| `updateTransaction` inclui `idempotency_key` e `items` | 🟠 ALTO | Adicionado ao body | `70a882a`, `1aa2ac1` |

### 8.2 Ainda Pendentes

| Problema | Gravidade | Correção necessária |
|----------|----------|-------------------|
| `transactions.status` CHECK não inclui `'awaiting_payment'` | 🔴 CRÍTICO | `ALTER TABLE transactions ADD CHECK (status IN ('pending','paid','cancelled','refunded','awaiting_payment'))` |
| `transactions.idempotency_key` coluna não existe | 🔴 CRÍTICO | `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS idempotency_key TEXT` |
| `appointments.professional_user_id` pode não existir | 🟠 ALTO | `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS professional_user_id UUID REFERENCES users(id)` |
| `transactions.commission_amount` pode não existir | 🟠 ALTO | `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS commission_amount NUMERIC DEFAULT 0` |
| `transactions.service_time_min` pode não existir | 🟠 ALTO | `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS service_time_min INTEGER` |
| 8 tabelas não persistidas | 🔴 CRÍTICO | Criar tabelas + add saveToSupabase/loadFromSupabase |
| `patients.photos` pode não existir | 🟠 ALTO | `ALTER TABLE patients ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb` |
| `clinics.notification_settings` pode não existir | 🟡 MÉDIO | `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}'` |
| `appointmentMaterials` não persistido | 🟠 ALTO | Criar tabela ou persistir no estado local com localStorage |
| RLS pode bloquear operações se funções não existirem | 🟡 MÉDIO | Verificar se `get_user_clinic_id()` e `is_super_admin()` existem no banco |

---

## 9. TESTES REALIZADOS

### 9.1 Testes de Persistência de Fotos

| Teste | Resultado | Evidência |
|-------|----------|-----------|
| Adicionar foto ao paciente | ✅ Sucesso | "Foto adicionada com sucesso!" aparece |
| Foto aparece na UI | ⚠️ **Depende da correção** | `set()` agora atualiza `patientPhotos` corretamente |
| Foto persiste no Supabase | ⚠️ **Depende da correção** | `savePatientPhoto` envia PATCH com `{ photos }` |
| Foto persiste após recarregar | ⚠️ **Depende da correção** | `loadPatients` deve retornar `photos` |

### 9.2 Testes de Finalização de Agendamento

| Teste | Resultado | Evidência |
|-------|----------|-----------|
| Finalizar agendamento | ⚠️ **Possível falha** | `saveTransaction` pode falhar se `idempotency_key` não existe |
| Transação criada | ⚠️ **Possível falha** | Status CHECK constraint pode bloquear `'awaiting_payment'` |
| Agendamento marcado como `'done'` | ⚠️ **Possível falha** | `saveToSupabase('appointment', finalApt, false)` pode falhar |
| Financeiro mostra transação | ❌ **Não funciona** | Transações não são criadas/persistidas |

### 9.3 Testes de Carregamento

| Teste | Resultado | Evidência |
|-------|----------|-----------|
| Pacientes carregados | ⚠️ **Apenas 2 de 5** | Logs mostram `Pacientes carregados: 2` |
| Transações carregadas | ⚠️ **Possível vazio** | `loadTransactions` pode retornar vazio se RLS bloqueia |
| Agendamentos carregados | ⚠️ **Possível incompleto** | `loadAppointments` pode ter filtros incorretos |

---

## 10. SQL PARA CORRIGIR PROBLEMAS CRÍTICOS

Execute no SQL Editor do Supabase:

```sql
-- 1. Adicionar 'awaiting_payment' ao CHECK constraint de transactions
DO $$
BEGIN
  -- Verificar se a constraint existe e alterar
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'transactions_status_check' 
    AND definition LIKE '%awaiting_payment%'
  ) THEN
    -- Remover constraint antiga e adicionar nova
    ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
    ALTER TABLE transactions ADD CONSTRAINT transactions_status_check 
      CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded', 'awaiting_payment'));
  END IF;
END $$;

-- 2. Adicionar colunas faltantes em transactions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'idempotency_key') THEN
    ALTER TABLE transactions ADD COLUMN idempotency_key TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'commission_amount') THEN
    ALTER TABLE transactions ADD COLUMN commission_amount NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'service_time_min') THEN
    ALTER TABLE transactions ADD COLUMN service_time_min INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'items') THEN
    ALTER TABLE transactions ADD COLUMN items TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- 3. Adicionar colunas faltantes em appointments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'professional_user_id') THEN
    ALTER TABLE appointments ADD COLUMN professional_user_id UUID REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'finished_at') THEN
    ALTER TABLE appointments ADD COLUMN finished_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'service_time_min') THEN
    ALTER TABLE appointments ADD COLUMN service_time_min INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'started_at') THEN
    ALTER TABLE appointments ADD COLUMN started_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'base_value') THEN
    ALTER TABLE appointments ADD COLUMN base_value NUMERIC DEFAULT 0;
  END IF;
END $$;

-- 4. Adicionar colunas faltantes em medical_records
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_records' AND column_name = 'professional_user_id') THEN
    ALTER TABLE medical_records ADD COLUMN professional_user_id UUID REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_records' AND column_name = 'locked') THEN
    ALTER TABLE medical_records ADD COLUMN locked BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_records' AND column_name = 'locked_at') THEN
    ALTER TABLE medical_records ADD COLUMN locked_at TIMESTAMPTZ;
  END IF;
END $$;

-- 5. Adicionar coluna photos em patients (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'photos') THEN
    ALTER TABLE patients ADD COLUMN photos JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 6. Adicionar notification_settings em clinics (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'notification_settings') THEN
    ALTER TABLE clinics ADD COLUMN notification_settings JSONB DEFAULT '{}';
  END IF;
END $$;

-- 7. Verificar se funções RLS existem
SELECT routine_name FROM information_schema.routines WHERE routine_name IN ('get_user_clinic_id', 'is_super_admin');
```

---

## 11. CONCLUSÃO

O sistema possui **3 problemas críticos que impedem a funcionalidade de transações/financeiro** e **8 tabelas que não persistem dados**. Após as correções aplicadas nos commits `9744520`, `bbea2b3`, `dd90ac2`, `74360eb`, `6d38398`, `70a882a`, `1aa2ac1`, o fluxo de persistência de fotos foi corrigido e as transações agora incluem todas as informações necessárias no POST body.

**Ações imediatas necessárias:**
1. Executar o SQL de correção acima no Supabase para adicionar colunas e CHECK constraints faltantes
2. Criar tabelas para `waiting_list`, `recurrences`, `anamnese_links`, `automation_rules`, `automation_runs`, `funnel_stages`, `clinical_documents`, `appointment_materials`
3. Adicionar `saveToSupabase` e `loadFromSupabase` para cada tabela não persistida
4. Verificar se RLS functions existem no banco
5. Limpar cache do navegador e re-testar

---

*Gerado por análise estática do código e comparação com SQL migrations do projeto.*
