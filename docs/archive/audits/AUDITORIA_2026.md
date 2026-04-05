# RELATORIO COMPLETO DE AUDITORIA - LUMINAFLOW ERP
## Data: 27/03/2026

---

## RESUMO EXECUTIVO

| Categoria | Status |
|-----------|--------|
| **Componentes sem Supabase** | 27/27 (100%) |
| **Bugs Criticos** | 1 (CORRIGIDO) |
| **Bugs Altos** | 7 |
| **Bugs Medios** | 3 |
| **Codigo morto** | 3 arquivos + 7 funcoes |
| **Funcoes duplicadas** | 6x formatPhoneForWhatsApp |

---

## 1. BUGS CRITICOS

### BUG #1: deleteFromTable - CORRIGIDO ✓
- **Arquivo:** `lib/supabase.ts:325`
- **Problema:** `.eq('id')` sem valor deletava tudo ou nada
- **Correcao:** Alterado para `.eq('id', id)`

---

## 2. BUGS ALTOS (Necessitam Correcao)

| # | Componente | Problema |
|---|------------|----------|
| 1 | `AccountsPayableReceivable.tsx` | Dados 100% hardcoded - perdidos ao recarregar |
| 2 | `DREReport.tsx` | CPV calculado como 18% fixo (incorreto) |
| 3 | `Prontuario.tsx` | Comissao profissional hardcoded 35% |
| 4 | `Configuracoes.tsx` | Alterar senha eh fake (so setTimeout) |
| 5 | `Configuracoes.tsx` | Toggle 2FA eh fake |
| 6 | `SuperAdminDashboard.tsx` | Todos dados hardcoded |
| 7 | `financeiro/Financeiro.tsx` | Telefone hardcoded '00' no Asaas |

---

## 3. COMPONENTES NAO INTEGRADOS COM SUPABASE

| Componente | Tabela Supabase Necessaria |
|------------|---------------------------|
| Agenda.tsx | `appointments`, `patients`, `services` |
| PatientList.tsx | `patients` |
| Prontuario.tsx | `medical_records` |
| Financeiro.tsx | `transactions` |
| DREReport.tsx | `transactions` |
| AccountsPayableReceivable.tsx | `transactions` |
| Estoque.tsx | `stock_items` |
| Marketing.tsx | `leads`, `campaigns` |
| InsurancePanel.tsx | `insurances` |
| BranchPanel.tsx | `branches` |
| Configuracoes.tsx | `clinics`, `users`, `services` |
| SuperAdminDashboard.tsx | `clinics`, `users` |
| NFeSettings.tsx | `nfe_configs` |
| NFePanel.tsx | `nfes` |

---

## 4. CODIGO MORTO (Para Remover)

| Arquivo | Tamanho | Motivo |
|---------|---------|--------|
| `hooks/useAuthSupabase.ts` | 161 linhas | Nunca importado |
| `lib/supabase-optimized.ts` | 230 linhas | Nunca importado |
| `lib/compression.ts` | 5 funcoes | compactCEP, estimateSize, checkStorageLimit, compressOdontogram, compressAnamnese nunca usados |
| `components/auth/PasswordResetFlow.tsx` | 2 funcoes | setUpdatedPassword e getUpdatedPassword nunca importadas |

---

## 5. FUNCOES DUPLICADAS

### formatPhoneForWhatsApp (6 versoes)
1. `stores/clinicStore.ts`
2. `domains/pacientes/PatientList.tsx` (como formatPhoneBrazilian)
3. `components/MiniWhatsAppChat.tsx`
4. `components/WhatsAppEmbedded.tsx`
5. `components/auth/PasswordResetFlow.tsx`
6. `domains/marketing/CampaignManager.tsx` (como toWhatsappDigits)

**Solucao:** Centralizar em `lib/utils.ts` e importar de la.

---

## 6. PROBLEMAS DE ARQUITETURA

### 6.1 LocalStorage como Banco de Dados
- Todo o projeto usa localStorage (limite 5MB)
- Dados perdidos ao limpar cache
- Nao funciona em multiplos dispositivos

### 6.2 Clinic ID Hardcoded
- `'clinic-1'` usado como fallback em todo codigo
- Quando usuario real se cadastrar, dados serao misturados

### 6.3 Dois Clientes Supabase
- `lib/supabase.ts` (customizado, sem pacote)
- `lib/supabase-optimized.ts` (com pacote, nunca usado)

---

## 7. CHECKLIST DE MIGRACAO PARA SUPABASE

### Fase 1: Dados Criticos
- [ ] Pacientes (PatientList)
- [ ] Agendamentos (Agenda)
- [ ] Prontuarios (Prontuario)

### Fase 2: Dados Financeiros
- [ ] Transacoes (Financeiro)
- [ ] DRE (DREReport)
- [ ] Contas (AccountsPayableReceivable)

### Fase 3: Configuracoes
- [ ] Clinicas (Configuracoes)
- [ ] Usuarios (Equipe)
- [ ] Servicos (Servicos)

### Fase 4: Modulos Secundarios
- [ ] Estoque
- [ ] Convênios
- [ ] Filiais
- [ ] Marketing
- [ ] NFe

---

## 8. PRIORIDADE DE CORRECOES

| Prioridade | Acao |
|------------|------|
| **URGENTE** | Bug deleteFromTable ✓ CORRIGIDO |
| **URGENTE** | Migrar Pacientes para Supabase |
| **URGENTE** | Migrar Agendamentos para Supabase |
| **ALTA** | Migrar Financeiro para Supabase |
| **ALTA** | Corrigir funcoes fake (senha, 2FA) |
| **MEDIA** | Consolidar funcoes duplicadas |
| **MEDIA** | Remover codigo morto |
| **BAIXA** | Migrar modulos secundarios |
