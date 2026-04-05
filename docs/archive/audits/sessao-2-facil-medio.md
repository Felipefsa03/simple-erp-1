# Auditoria — Sessão 2: Correções Fáceis e Médias

## Status geral
✅ **Todas as mudanças aplicadas e verificadas**

---

## Mudanças realizadas

### 1. Validação de variáveis de ambiente (startup)
**Arquivo(s):** `server/index.js` (linhas 24-35)
**Problema:** O servidor poderia iniciar silenciosamente sem variáveis de ambiente críticas, falhando em runtime.
**Solução:** Já implementado na Sessão 1 — `REQUIRED_ENVS` valida `SUPABASE_URL` e `SUPABASE_ANON_KEY` no startup. Em produção, faz `process.exit(1)`. Em desenvolvimento, emite warning mas continua.
**Verificação:** Código auditado e confirmado funcional.

---

### 2. Instalação de helmet e express-rate-limit
**Arquivo(s):** `package.json`, `server/index.js`
**Problema:** O código em `server/index.js` já importava e usava `helmet` e `express-rate-limit` (implementado na Sessão 1), porém os pacotes **não estavam instalados** — não apareciam em `package.json` nem em `node_modules/`. O servidor falharia ao iniciar em produção.
**Solução:** Executado `npm install helmet express-rate-limit`, que adicionou:
- `helmet@^8.1.0`
- `express-rate-limit@^8.3.2`

**Verificação:**
```bash
grep -E '"helmet"|"express-rate-limit"' package.json
# ✅ "express-rate-limit": "^8.3.2",
# ✅ "helmet": "^8.1.0",
```

**Configuração ativa:**
- `helmet()` com `crossOriginResourcePolicy: 'cross-origin'` e CSP desabilitado (gerenciado pelo framework frontend)
- `rateLimit` com 100 req/15min aplicado somente a `/api/` routes

---

### 3. CORS restrito para origens específicas
**Arquivo(s):** `server/index.js` (linhas 65-86), `.env.example` (linha 31)
**Problema:** O uso de `origin: true` permitiria qualquer origem fazer requisições ao backend.
**Solução:** Já implementado na Sessão 1. CORS usa lista `ALLOWED_ORIGINS` via variável de ambiente, com fallback para `localhost:3000`, `localhost:5173` e `clinxia.vercel.app`. Requisições de origens não autorizadas são bloqueadas com log de warning.
**Verificação:**
```bash
grep -r "origin: true" server/ frontend/src/
# ✅ 0 resultados
```

---

### 4. Consolidação de funções utilitárias duplicadas
**Arquivo(s):** `frontend/src/types/subscription.ts`, `frontend/src/lib/utils.ts`
**Problema:** `formatCurrencyBRL()` em `types/subscription.ts` era uma cópia exata de `formatCurrency()` em `@/lib/utils.ts`. Duplicação aumenta risco de divergência e manutenção.
**Solução:** Substituída a definição inline por re-export:
```typescript
// Antes:
export function formatCurrencyBRL(amount: number): string { ... }

// Depois:
export { formatCurrency as formatCurrencyBRL } from '@/lib/utils';
```

**Nota:** `uid()` e `formatCurrency()` já estavam consolidados em `@/lib/utils.ts` desde a Sessão 1. Todos os imports no projeto já usam `@/lib/utils` como canonical source. Os test files (`__tests__/utils.test.ts`, `__tests__/utils-comprehensive.test.ts`) definem suas próprias versões locais — isso é intencional para isolamento de teste.

**Verificação:** Build limpo, sem erros de import.

---

### 5. Correção de erros de tipo implícito `any`
**Arquivo(s):**
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/lib/supabase.ts`

**Problema:** Múltiplos `catch (err: any)` e variáveis sem tipo explícito espalhados pelo código de autenticação e cliente Supabase customizado. TypeScript em modo strict rejeitaria esses padrões.

**Solução:**
- **`useAuth.ts`:** 3 catch blocks tipados como `unknown` com type guard `err instanceof Error`
- **`supabase.ts`:** 6 catch blocks tipados como `unknown` com type guard; `currentSession.user` tipado como `Record<string, unknown>`; `body` no query builder tipado corretamente; `builder` tipado com interface explícita

**Funções públicas corrigidas:**
| Função | Antes | Depois |
|---|---|---|
| `login()` catch | `catch (err)` | `catch (err: unknown)` |
| `checkSession()` catch | `catch (err)` | `catch (err: unknown)` |
| `signInWithPassword()` catch | `catch (err: any)` | `catch (err: unknown)` + type guard |
| `resetPasswordForEmail()` catch | `catch (err: any)` | `catch (err: unknown)` + type guard |
| `updateUser()` catch | `catch (err: any)` | `catch (err: unknown)` + type guard |
| `builder.then()` catch | `catch (err: any)` | `catch (err: unknown)` + type guard |
| `storage.upload()` catch | `catch (err: any)` | `catch (err: unknown)` + type guard |

**Verificação:** Build limpo com 0 erros.

---

### 6. Dependência `xlsx` faltando (bug pré-existente encontrado)
**Arquivo(s):** `package.json`, `frontend/src/domains/pacientes/PatientList.tsx`
**Problema:** O arquivo `PatientList.tsx` importa `xlsx` para exportação de pacientes, mas o pacote não estava instalado. Isso **quebraria o build** em produção.
**Solução:** Executado `npm install xlsx`.
**Verificação:** Build passou após instalação.

---

## Verificações executadas

| Verificação | Comando | Resultado |
|---|---|---|
| Build limpo | `npm run build` | ✅ 0 erros, built in 6.23s |
| Credenciais expostas | `grep -r "YOUR_SUPABASE_PROJECT_ID" frontend/src/` | ✅ 0 resultados |
| CORS restrito | `grep -r "origin: true" server/ frontend/src/` | ✅ 0 resultados |
| `supabase.co` hardcoded | `grep -r "supabase.co" frontend/src/` | ✅ 0 resultados |
| Helmet instalado | `grep '"helmet"' package.json` | ✅ `"helmet": "^8.1.0"` |
| Rate limit instalado | `grep '"express-rate-limit"' package.json` | ✅ `"express-rate-limit": "^8.3.2"` |
| `.env` no gitignore | `grep ".env" .gitignore` | ✅ `.env*` com exceção de `.env.example` |
| `.env.example` completo | Inspeção manual | ✅ Contém todas as variáveis necessárias |

---

## O que NÃO foi feito (próximas sessões)

- [ ] Decomposição do `clinicStore.ts` (1543 linhas) — necessita plano de refatoração completo
- [ ] Decomposição do `App.tsx` (57KB / ~961 linhas) — necessita migração para React Router
- [ ] Migração `localStorage` → Supabase para persistência de permissões e reset de senhas
- [ ] Testes automatizados (Vitest + Playwright) — configuração existe mas testes são escassos
- [ ] Resolver os 300+ implicit `any` restantes em stores e componentes
- [ ] CSP (Content-Security-Policy) — desativado no helmet, precisa configuração específica para o frontend
- [ ] HTTPS forçado em produção
- [ ] Code splitting — bundle único de 1.4MB (warning do Vite)

---

## Notas e riscos residuais

1. **Bundle grande (1.4MB):** O output é um único chunk de 1418KB. Vite já alerta sobre isso. Recomenda-se `React.lazy()` e code splitting por rota na próxima sessão.

2. **`supabase.ts` com cliente customizado:** O projeto implementa um cliente Supabase from scratch (sem `@supabase/supabase-js` em runtime). Embora `@supabase/supabase-js` esteja no `package.json`, o `supabase.ts` não o importa. Isso pode causar divergências de comportamento.

3. **Credenciais em docs de arquivo morto:** O string `YOUR_SUPABASE_PROJECT_ID` ainda aparece em `docs/archive/walkthrough.md.resolved` e `sql/README.md`. Estes são arquivos de documentação/histórico, não código executável, mas devem ser sanitizados em uma próxima sessão.

4. **Rate limit aplicado apenas a `/api/`:** Rotas raiz (`/`) e health check (`/api/health`) já são excluídas via path-based matching. O rate limit de WhatsApp tem seu próprio controle independente.

5. **2FA encryption key fallback:** Em `server/index.js`, a chave de criptografia para 2FA usa `'fallback-key-for-dev'` quando `SUPABASE_SERVICE_ROLE_KEY` está ausente. Em produção, isso é um risco — deve haver validação explícita.

6. **Warnings do Vite (import dinâmico vs estático):** Vários módulos são importados tanto dinâmica quanto estaticamente. Isso não causa erro mas previne code splitting efetivo.
