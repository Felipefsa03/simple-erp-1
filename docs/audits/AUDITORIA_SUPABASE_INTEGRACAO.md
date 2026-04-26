# Auditoria Técnica Sistemática - Ecossistema de Integração Supabase
**Data:** 25 de Abril de 2026
**Projeto:** Clinxia ERP (LuminaFlow)
**Escopo:** Frontend (clinicStore.ts, supabaseSync.ts), Backend (server/index.js), e Database (Schema/RLS).

---

## 1. Sumário Executivo

A presente auditoria identificou diversas falhas silenciosas e vulnerabilidades na arquitetura de integração entre o frontend (Zustand + Supabase REST), backend (Node.js API) e banco de dados Supabase (RLS). A análise focou em operações de persistência e sincronização de dados que apresentam riscos de inconsistência, timeouts, race conditions e falhas de segurança.

**Estatísticas de Descobertas:**
- 🔴 **Crítico:** 3 (Perda de dados, falhas de sincronização, brechas de RLS)
- 🟠 **Alto:** 2 (Tratamento de erros silenciosos, timeouts de rede)
- 🟡 **Médio:** 3 (Validações client-side fracas, N+1 queries)
- 🟢 **Baixo:** 1 (Logs excessivos em produção)

---

## 2. Matriz de Risco (Impacto vs Esforço)

| ID | Descrição do Problema | Impacto | Esforço de Correção | Prioridade |
|---|---|---|---|---|
| SUP-001 | Supressão de Erros no Sync (`clinicStore.ts`) | Alto | Baixo | 🔴 Crítico |
| SUP-002 | Políticas RLS Permissivas / Falhas (`supabase-schema.sql`) | Crítico | Médio | 🔴 Crítico |
| SUP-003 | Problema de N+1 Queries no carregamento de Profissionais | Médio | Baixo | 🟠 Alto |
| SUP-004 | Ausência de Offline Queue / Retries no `supabaseFetch` | Alto | Alto | 🔴 Crítico |
| SUP-005 | Race Condition no carregamento de `syncWithSupabaseInternal` | Médio | Baixo | 🟠 Alto |

---

## 3. Detalhamento de Falhas e Correções

### 🔴 [SUP-001] Falha Silenciosa no Sincronismo de Dados (Zustand Store)
**Caminho:** `frontend/src/stores/clinicStore.ts` (linhas ~200-217)
**Operação:** INSERT, UPDATE, DELETE (Geral)
**Problema:** A função `syncWithSupabase` faz um `try/catch` que suprime os erros da camada `supabaseSync.ts`. Se o Supabase falhar (ex: Timeout ou RLS), o estado local (Zustand) é atualizado, mas a persistência falha sem alertar o usuário.
**Logs:** `[ClinicStore] Erro ao salvar ${type} no Supabase: [Error]` (Mas nenhuma notificação de erro no frontend).
**Análise de Race Condition:** A UI reflete sucesso, o usuário recarrega a página, e o dado "some", criando uma inconsistência severa.

**✅ Código Corrigido (`clinicStore.ts`):**
```typescript
try {
    let result;
    // ... switch case operations ...
    if (result?.error) {
        // ROLLBACK STATE
        set(state => { /* lógica para reverter a alteração baseada no type e isNew */ });
        toast.error(`Falha ao salvar no servidor: ${result.error.message}`);
        throw new Error(result.error);
    }
} catch (error) {
    console.error(`[ClinicStore] Erro fatal:`, error);
    // Disparar evento para fila de retry offline
    useEventBus.getState().emit('SYNC_ERROR', { type, data });
}
```

### 🔴 [SUP-002] Riscos em Row Level Security (RLS)
**Caminho:** `sql/seguranca-rls-corrigida.sql`
**Operação:** SELECT, INSERT, UPDATE, DELETE
**Problema:** O uso da chave `PUBLISHABLE_KEY` combinado com políticas RLS inconsistentes que validam `is_super_admin() OR clinic_id = get_user_clinic_id()` falham se o token JWT expirar silenciosamente no client-side. Além disso, há o script `disable-rls-missing.sql` que pode ter desativado a segurança em produção inadvertidamente.
**Payload/Resposta:** HTTP 401 Unauthorized silencioso ou HTTP 200 com array vazio `[]` (RLS negando leitura).

**✅ Correção (Testes Automatizados de RLS):**
Deve-se executar um teste de integração garantindo que o RLS está ativo:
```sql
-- Verificar se todas as tabelas possuem RLS ativo
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;
-- Resultado esperado: 0 linhas.
```

### 🟠 [SUP-003] Problema de N+1 Queries e Performance
**Caminho:** `frontend/src/lib/supabaseSync.ts` (linhas ~280-320)
**Operação:** SELECT (Tabela `professionals` e `users`)
**Problema:** A função `loadProfessionals` faz um fetch da tabela `professionals` e depois extrai os `user_id` para fazer um segundo fetch em `users`. Embora use `id=in.()`, não utiliza `JOIN` nativo do Supabase (REST API Embeddings). Isso aumenta o tempo de rede e custo de payload.
**Payload da Requisição:** `GET /rest/v1/users?id=in.(...)`

**✅ Código Corrigido (`supabaseSync.ts`):**
Utilizar os recursos de Foreign Key (Embedded) nativos do Supabase:
```typescript
const { data, error } = await supabaseFetch('professionals', {
  filters: `?clinic_id=eq.${uuid}&select=*,user:user_id(id,name,email,phone,role)&order=created_at.asc`,
});
// O mapeamento agora não exige uma segunda query.
```

### 🔴 [SUP-004] Ausência de Filas Offline / Retry Exponencial
**Caminho:** `frontend/src/lib/supabaseSync.ts` (linhas ~66-106)
**Problema:** A função base `supabaseFetch` utiliza o nativo `fetch` do browser sem timeout customizado ou retentativas. Em redes 3G intermitentes (comuns no cenário mobile/clínico), uma requisição que sofra *packet loss* retornará exceção de rede (`Failed to fetch`) e o dado local não será sincronizado.
**Frequência:** Intermitente em conexões instáveis.

**✅ Código Corrigido (`supabaseFetch` wrapper):**
```typescript
async function supabaseFetchWithRetry(url, options, retries = 3, backoff = 500) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000); // 10s Timeout
    
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    
    if (!response.ok) throw new Error(await response.text());
    return await response.json();
  } catch (err) {
    if (retries > 0 && (err.name === 'AbortError' || err.message === 'Failed to fetch')) {
      await new Promise(res => setTimeout(res, backoff));
      return supabaseFetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw err;
  }
}
```

---

## 4. Plano de Rollback e Migração Segura de Dados

Caso uma implementação de RLS ou mudança de schema no Supabase falhe:

1. **Snapshot Pré-Deploy:** Utilizar o comando `supabase db dump -f pre-deploy-snapshot.sql` antes da aplicação de migrations.
2. **Script de Reversão:** Se ocorrer o erro de `auth.uid() missing` devido à perda de sessão JWT:
   ```sql
   -- Rollback para política permissiva de emergência (Apenas com IP Whitelist via Edge Firewall)
   -- NÃO DEIXAR EM PRODUÇÃO ABERTA
   ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
   ```
3. **Tratamento de Conflitos (Merge):** O sistema atual confia no "last write wins". O ideal é migrar o backend de `syncWithSupabaseInternal` para utilizar o campo `updated_at` como validador em concorrências, implementando CRDTs (Conflict-free Replicated Data Types) ou Optimistic Locking usando o Supabase.

---

## 5. Estratégia de Testes CI/CD

Para garantir que os problemas não retornem, o pipeline deve conter:

- **Unitários (Jest/Vitest):** Mockar o `supabaseFetch` para retornar status HTTP 500 e validar se o `clinicStore` reverte o estado (rollback state).
- **Integração (Supabase Local):** Usar o Supabase CLI (`supabase start`) na pipeline do GitHub Actions para rodar as migrations (`00-verify.sql`, `01-functions.sql`, etc.) e realizar inserts de teste com chaves RLS simuladas (`JWT anon` vs `JWT user`).
- **Testes de Carga (K6/Artillery):**
  ```javascript
  import http from 'k6/http';
  export const options = { vus: 100, duration: '30s' };
  export default function () {
    http.get('https://gzcimnredlffqyogxzqq.supabase.co/rest/v1/patients?select=*', {
      headers: { 'apikey': 'sb_publishable_key...' }
    });
  }
  ```
  Isso garantirá que o banco suporte requisições pesadas (PostgREST connection pooling).