# AUDITORIA COMPLETA — Simple ERP / Clinxia
## Foco: QR Code do WhatsApp do Sistema (Sistema Global) não é gerado

**Data:** 14/09/2026
**Escopo verificado ao vivo:** Render (clinxia-backend), Supabase (gzcimnredlffqyogxzqq), Vercel (clinxia.vercel.app), GitHub (Felipefsa03/simple-erp-1 @ 33eb3af), código local.

---

## 1. RESUMO EXECUTIVO

O QR Code NÃO é gerado por um único motivo comprovado em produção:

> **A página "WhatsApp do Sistema" (Sistema Global) do frontend NÃO envia o token de autenticação (`Authorization: Bearer <token>`) em NENHUMA chamada da API `/api/whatsapp/*`. O backend exige autenticação em todas essas rotas desde a auditoria de segurança anterior (SEC-03, que removeu `/whatsapp/` da lista de rotas públicas). Resultado: todas as chamadas retornam **HTTP 401** e o QR nunca chega à tela.**

**Prova ao vivo (14/09/2026):**

| Teste | Requisição | Resultado |
|---|---|---|
| Sem token (como o frontend faz) | `GET /api/whatsapp/status/system-global` | `401 {"ok":false,"error":"Token de autenticação ausente"}` |
| Com token válido (service role) | `POST /api/whatsapp/connect {clinicId:"system-global"}` | `200 {"success":true,"status":"connecting","message":"Aguardando QR Code..."}` |
| Com token válido, 18s depois | `GET /api/whatsapp/status/system-global` | `200 {"ok":true,"status":"qr","qr":"2@33ycjoGD...","qrBase64":"data:image/png;base64,..."}` |

**Ou seja: backend, Baileys, versão do WhatsApp Web, rede do Render e Supabase estão TODOS funcionando. O QR é gerado em ~10-18s quando autenticado. O defeito está exclusivamente no frontend.**

### Arquivo defeituoso (deploy Vercel)
`frontend/src/domains/configuracoes/SystemWhatsAppConfig.tsx`

Confirmado no bundle minificado em produção (`https://clinxia.vercel.app/assets/Configuracoes-Cp7E-LFC.js`):
```js
fetch(`${oe}/api/whatsapp/status/${ue}?t=${Date.now()}`, { cache:"no-store",
  headers: {"ngrok-skip-browser-warning":"true"} })   // ← SEM Authorization
fetch(`${oe}/api/whatsapp/connect`, { method:"POST",
  headers: {"Content-Type":"application/json"},        // ← SEM Authorization
  body: JSON.stringify({clinicId:ue}) })
fetch(`${oe}/api/whatsapp/disconnect`, { method:"POST",
  headers: {"Content-Type":"application/json","ngrok-skip-browser-warning":"true"}, // ← SEM Authorization
  body: JSON.stringify({clinicId:ue}) })
```

Comparação: a página de clínica `frontend/src/domains/integrations/WhatsAppConnection.tsx` FOI corrigida (envia `Authorization: Bearer ${token}` em todas as chamadas) — a página do Sistema Global foi esquecida na correção.

### Fluxo do bug (o que o usuário vê)
1. Superadmin clica em "Conectar WhatsApp do Sistema (QR Code)" → modal abre.
2. `initiate()` chama `GET /api/health` (rota pública) → 200 (se instância Render acordada).
3. `GET /api/whatsapp/status/system-global` → **401** (sem token).
4. O código lê `data.status` → `undefined` → entra no branch `disconnected/undefined/connecting`.
5. `POST /api/whatsapp/connect` → **401** → sem `qrCode`, sem `pairingCode`.
6. `startPolling()` → a cada 3s chama status → **401** → `res.ok === false` → retorna silencioso.
7. Modal fica em **"Conectando ao WhatsApp... Gerando QR Code de autenticação" para sempre**. QR nunca aparece.

### Falha secundária que mascara o sintoma
`SystemWhatsAppConfig.tsx` linha 126-128: `fetch(\`${API_BASE}/api/health\`, { signal: AbortSignal.timeout(5000) })`.
- O Render é plano **Free**: instância hiberna após ~15 min sem tráfego e o cold start leva 30-90s.
- Com instância dormindo, o health check de **5s** estoura → tela de "Servidor offline" — outro motivo pelo qual o usuário nunca vê QR (mesmo depois de corrigir o token).

---

## 2. DIAGNÓSTICO DETALHADO — POR QUE O QR NÃO APARECE (cada ponto)

### 2.1 Backend: autenticação obrigatória em /api/whatsapp (proposital)
`server/index.js` linhas 573-613:
```js
const publicPaths = [ "/health", ..., "/public/", "/mercado/", ... ];
// "/whatsapp/" foi REMOVIDO de publicPaths pela auditoria (SEC-03)
app.use("/api", (req, res, next) => {
  if (publicPaths.some((p) => pathWithoutApi.startsWith(p))) return next();
  return requireAuth(req, res, next);
});
```
`requireAuth` (`server/middleware/auth.js`) exige `Authorization: Bearer <JWT Supabase>` válido. O frontend global não envia. **A regra de segurança está correta; quem está errado é o frontend.**

### 2.2 Frontend SystemWhatsAppConfig — ausência total de token (CAUSA RAIZ)
- Nenhum dos 6 pontos de `fetch` (health, status inicial, connect, polling, disconnect, test-send, reset-session) envia `Authorization`.
- Não usa `credentials: 'include'` nem headers herdados.
- O token existe no cliente (session Supabase via `useAuth()`), só não é anexado.
- **Correção mínima:** replicar o padrão de `WhatsAppConnection.tsx`:
```tsx
const getAccessToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
};
// e em todos os fetch:
headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
```

### 2.3 Cold start do Render Free vs timeout de 5s (CAUSA SECUNDÁRIA)
- Render Free: 512MB RAM, hiberna após inatividade, cold start 30-90s, spin-down automático.
- Health check com `AbortSignal.timeout(5000)` reprova quando a instância está dormindo.
- Sugestão: timeout de 30s + 1 retry + mensagem "aguardando servidor iniciar (pode levar até 90s)".

### 2.4 Design do endpoint /connect apaga credenciais SEMPRE (agrava e força re-pareamento)
`server/routes/whatsappRoutes.js` linhas 194-215:
```js
// Limpar credenciais do Supabase para forçar QR limpo
await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_credentials?clinic_id=eq.${clinicId}`, { method: "DELETE", ... });
// Limpar auth local
```
- Toda vez que o modal abre e chama `connect`, as credenciais do `system-global` são apagadas do Supabase e do disco.
- Se a sessão estava conectada, ela é destruída e o admin precisa escanear de novo.
- Isso também explica por que `whatsapp_credentials` não tem linha para `system-global` (estado persistente nunca sobrevive).
- **Recomendação:** só limpar credenciais se o usuário pedir explicitamente ("reset-session"), nunca no connect automático.

### 2.5 Estado em memória + Render Free = perda de sessões
- `whatsappSockets`/`whatsappConnections` são objetos em memória (`server/index.js` 1013-1015).
- Em cada hibernação/restart do Render, tudo se perde; o boot (linhas 2637-2701) só reconecta sessões com credenciais válidas no Supabase.
- `system-global` nunca tem credenciais persistidas (ver 2.4) → nunca reconecta sozinho.
- **Recomendação:** persistir estado de conexão em tabela Supabase (`whatsapp_connections` não existe hoje) e persistir creds do system-global após conexão.

### 2.6 O que NÃO é o problema (verificado e descartado)
- Baileys/Biblioteca: OK — gerou QR em produção no teste ao vivo.
- `HTTPS_PROXY` do Render (ngrok morto): NÃO afeta o Baileys (o patch `server/patch-iq-proxy.cjs` só injeta proxy no `iq-option-client`, não no Baileys). Afeta o Módulo IQ Option (ver seção 5).
- Versão do WhatsApp Web: OK — fallback `[2,3000,1043857760]` + invalidação de cache em erro 405 funcionam.
- Supabase: OK — credenciais, mensagens e RLS de `whatsapp_credentials` funcionando (vazio para anon).
- Firewall/rate limit: OK — 1000 req/15min por IP; polling de 3s = 300/15min, sem banimento.
- CORS: OK — `https://clinxia.vercel.app` está em `ALLOWED_ORIGINS` (`server/config/env.js`).
- Bloqueio `jpb-wpp`: não afeta `system-global`.

---

## 3. SEGURANÇA — CRÍTICO (ação imediata)

### 3.1 RLS DESATIVADO em tabelas sensíveis (comprovado ao vivo com chave anon, sem login)
| Tabela | Acesso anon | Dados expostos |
|---|---|---|
| `users` | ✅ LEITURA LIVRE | e-mails, nomes, roles de TODOS os usuários |
| `patients` | ✅ LEITURA LIVRE | CPF, RG, endereço, telefone, histórico (LGPD — violação gravíssima) |
| `whatsapp_messages` | ✅ LEITURA LIVRE | conversas completas de pacientes com telefones |
| `medical_records` | ✅ LEITURA LIVRE | prontuários médicos (dados sensíveis de saúde) |
| `clinics` | ✅ LEITURA LIVRE | nomes, planos |
| `appointments` / `professionals` / `audit_logs` | ✅ LEITURA LIVRE | agenda, CRO, logs com user_id |
| `integration_config` | ✅ LEITURA LIVRE | **token real do Mercado Pago (`APP_USR-5530...`) e webhook secret (`aca86734...`)** |
| `whatsapp_credentials` | 🔒 vazio p/ anon | OK (RLS ativo) |
| `system_secrets`, `user_2fa`, `password_codes` | 🔒 vazio p/ anon | OK (RLS ativo) |

**Impacto:** qualquer pessoa com a publishable key (que é pública por natureza) lê dados de saúde (LGPD), conversas de WhatsApp, e com o token MP + webhook secret pode manipular pagamentos/refunds.

**Causa provável:** os arquivos `disable-rls-missing.sql`, `reativar-rls.sql` e a sequência de "fix RLS" indicam que o RLS foi desativado para destravar o app e nunca foi religado com políticas corretas.

**Ação imediata:**
1. Rotacionar o access token do Mercado Pago e o webhook secret AGORA (já vazaram).
2. Reativar RLS em todas as tabelas com políticas por `clinic_id` (os arquivos `supabase-schema-final.sql` / `definitive_rls_multi_clinic.sql` do repo já contêm as políticas).
3. Nunca expor `mp_access_token`/`mp_webhook_secret` em tabela legível por anon — usar `system_secrets` ou Vault.

### 3.2 Credenciais de sessão do WhatsApp commitadas no GitHub
`server/auth/final/creds.json`, `server/auth/vercel/creds.json`, `server/auth/test/creds.json`, `test123`, `test456`, `vercel-test` — contêm **chaves privadas Signal reais** (noiseKey, signedIdentityKey, signedPreKey…).
- Se qualquer uma dessas sessões ainda estiver registrada no WhatsApp, quem tiver o repo pode clonar a sessão.
- **Ação:** remover do histórico (git filter-repo / BFG) e invalidar as sessões no WhatsApp (logout).

### 3.3 Senhas hardcoded em scripts de teste no repo
`frontend/test-login.js`, `frontend/test-perms.js`: `admin@lumina.com` / `admin123` commitados.

### 3.4 Credenciais expostas em variáveis de ambiente (Render) — rotacionar
- `IQ_OPTION_EMAIL` + `IQ_OPTION_PASSWORD` (senha em texto puro, também colada no chat desta auditoria).
- `GOOGLE_CLIENT_SECRET`, `MP_ACCESS_TOKEN` (APP_USR-3416...), chaves Supabase antigas.
- A senha da IQ Option e o secret do Google devem ser rotacionados; a chave `APP_USR-3416024137794237-033113-902669e1ab76fdad5d9c555cc283bd3e-3305667784` do Render difere da vazada via `integration_config` (`APP_USR-5530...`) — ambas precisam de rotação.

### 3.5 JWT Keys do Supabase (preocupação do usuário — válida, mas ainda funcional)
- Chave atual: ECC (P-256) `a94c6396-8f0e-42e5-b76f-ee9453de0cde`.
- Chave anterior: Legacy HS256, rotacionada há ~6 meses, **ainda não revogada** (tokens antigos continuam válidos).
- O Render usa a **chave anon JWT legada** (`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`) e, em `server/config/env.js`, `SUPABASE_ANON_KEY` tem PRIORIDADE sobre `SUPABASE_PUBLISHABLE_KEY` — ou seja, a aplicação ainda depende da chave legada.
- **Ação:** (1) trocar a env do Render para usar `sb_publishable_...`/`sb_secret_...`; (2) testar; (3) só então revogar a HS256 legada no painel. Revogar antes = sistema cai.

### 3.6 Storage público `whatsapp-media`
Bucket `whatsapp-media` é **Public com 0 policies**. Qualquer mídia de WhatsApp enviada para lá é acessível publicamente. Verificar o que é gravado e restringir (bucket privado + signed URLs).

---

## 4. INFRAESTRUTURA E DEPLOY — VERIFICAÇÃO POR PLATAFORMA

### 4.1 Render (`clinxia-backend`, serviço `srv-d7493894tr6s73clf5cg`)
- Plano: **Free** (512MB RAM, hiberna, sem SLA). Deploy atual: commit `33eb3af` (08/2026) — Live.
- Build: `npm ci --no-audit --no-fund` com **299 tarballs vendored** (server/vendor) para rodar offline — funciona, mas: repo gigante, atualização de dependências manual e dolorosa.
- `startCommand: npm start` → `node server/index.js`.
- Env: duplicação/desordem (3 grupos: IQ Option, Mercado Pago, Login Google + vars soltas). `NODE_ENV` mascarado. `HTTPS_PROXY` aponta para ngrok MORTO (ver 4.3).
- Health check ao vivo: `GET /` → `{"status":"ok","message":"Clinxia Backend Running"}` (após ~90-120s de cold start).
- `app.listen(PORT)` com `PORT` default 8787 — Render injeta a própria PORT; ok.
- Auto-reconnect de sessões no boot: funciona só para sessões com creds válidas (`jpb-wpp-mt327gtp` com `me.id=5519989273130:5@s.whatsapp.net` reconecta; `jpb-wpp-mrw5k1z1` com creds vazias é ignorada pelo filtro — correto).

### 4.2 Vercel (`clinxia.vercel.app`)
- Deploy ativo e servindo. `vercel.json` na raiz: build `cd frontend && npm run build`, output `frontend/dist`, rewrite `/api/:path*` → `https://clinxia-backend.onrender.com/api/:path*`.
- O frontend do Sistema Global usa URL absoluta do backend (`VITE_API_BASE_URL` / fallback `https://clinxia-backend.onrender.com`) — CORS permitido.
- Service worker `sw.js` ativo (estratégia de cache a auditar — risco de cache de respostas 401).
- Confirmação do bug no bundle de produção: `Configuracoes-Cp7E-LFC.js` contém o componente sem Authorization (ver seção 1).

### 4.3 `HTTPS_PROXY` = `https://nanny-previous-unkind.ngrok-free.dev` (MORTO)
- Teste ao vivo: retorna **404** (túnel ngrok offline/expirado).
- O postinstall `patch-iq-proxy.cjs` injeta esse proxy em TODAS as chamadas REST e WebSocket do `iq-option-client` → **o módulo IQ Option/Mercado está quebrado em produção** por causa disso.
- Não afeta o Baileys/WhatsApp (descartado como causa do QR).
- **Ação:** remover a env ou subir um proxy real. Enquanto existir, o trading IQ Option não conecta.

### 4.4 Supabase
- Projeto Free `gzcimnredlffqyogxzqq`. API keys novas (publishable/secret) criadas, mas a aplicação ainda usa as legadas (ver 3.5).
- Função Edge `whatsapp-proxy` aponta para `https://clinxia-whatsapp.onrender.com/api` — serviço antigo/diferente do atual; função provavelmente obsoleta.
- Tabela `whatsapp_connections` NÃO existe (404 no REST) — não há persistência de estado de conexão.

### 4.5 GitHub
- Repo `Felipefsa03/simple-erp-1`, branch `main`, commit de produção `33eb3af` ("fix(deploy): vende todos os 299 tarballs…").
- Histórico recente: correções de erro 405/421 do WhatsApp, vendoring de pacotes, patch de proxy IQ Option.
- Problemas: creds de sessão WhatsApp no repo (3.2), senhas de teste (3.3), `.env` com segredos? (auditar), 60+ arquivos SQL de fix soltos na raiz e em `sql/` (migração desordenada, sem versionamento claro).

---

## 5. CORREÇÃO DO BUG DO QR — PASSO A PASSO

### 5.1 Correção imediata no frontend (arquivo único)
Editar `frontend/src/domains/configuracoes/SystemWhatsAppConfig.tsx` seguindo o padrão de `WhatsAppConnection.tsx`:

```tsx
import { createClient } from '@/lib/supabase';

const getAccessToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
};

// Exemplo no polling:
const token = await getAccessToken();
const res = await fetch(`${API_BASE}/api/whatsapp/status/${SYSTEM_CLINIC_ID}?t=${Date.now()}`, {
  cache: 'no-store',
  headers: {
    'Authorization': `Bearer ${token}`,
    'ngrok-skip-browser-warning': 'true'
  }
});

// No connect:
const token = await getAccessToken();
const connectRes = await fetch(`${API_BASE}/api/whatsapp/connect`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ clinicId: SYSTEM_CLINIC_ID })
});

// Repetir em: disconnect, test-send, reset-session.
```

### 5.2 Correção do timeout de saúde (cold start Render)
```tsx
const healthRes = await fetch(`${API_BASE}/api/health`, {
  signal: AbortSignal.timeout(30000)   // era 5000
});
```
+ retry com aviso "aguardando servidor iniciar (pode levar até 90s)".

### 5.3 Correção backend (recomendada): não apagar credenciais no connect
Em `server/routes/whatsappRoutes.js`, remover/condicionar o DELETE de credenciais do Supabase no endpoint `/connect` (linhas 194-206). Deixar a limpeza apenas em `/reset-session` e em logout confirmado (401).

### 5.4 Teste de validação (feito nesta auditoria)
- `POST /api/whatsapp/connect` com token → 200 connecting.
- `GET /api/whatsapp/status/system-global` com token → `status:"qr"` + `qrBase64` em ~18s.
- Após a correção do frontend, o fluxo deve exibir o QR na tela do superadmin.

---

## 6. MELHORIAS RECOMENDADAS (priorizadas)

| # | Prioridade | Ação |
|---|---|---|
| 1 | CRÍTICA | Corrigir Authorization no `SystemWhatsAppConfig.tsx` (bug do QR) |
| 2 | CRÍTICA | Reativar RLS em todas as tabelas (SQL do repo já tem as políticas) |
| 3 | CRÍTICA | Rotacionar token MP + webhook secret + remover `mp_access_token` de `integration_config` |
| 4 | CRÍTICA | Remover `creds.json` de sessões WhatsApp do GitHub (histórico) e invalidar sessões |
| 5 | ALTA | Remover `HTTPS_PROXY` morto do Render (ou subir proxy real) — IQ Option quebrado |
| 6 | ALTA | Migrar envs do Render para as novas chaves publishable/secret e revogar JWT HS256 legado |
| 7 | ALTA | Rotacionar senhas expostas (IQ Option, Google, admin123) |
| 8 | MÉDIA | Persistir estado de conexão WhatsApp em tabela Supabase (`whatsapp_connections`) |
| 9 | MÉDIA | Não apagar creds no connect; persistir creds do `system-global` após scan |
| 10 | MÉDIA | Aumentar timeout de health check no frontend (cold start) |
| 11 | MÉDIA | Migrar Render para plano pago (sem hibernação, RAM maior — risco de OOM com tfjs/sharp/baileys em 512MB) |
| 12 | MÉDIA | Limpar os 60+ arquivos SQL soltos; criar migrations versionadas (`supabase/migrations/`) |
| 13 | MÉDIA | Bucket `whatsapp-media` privado + signed URLs |
| 14 | BAIXA | Remover função edge `whatsapp-proxy` obsoleta (aponta p/ serviço inexistente) |
| 15 | BAIXA | Auditar cache do service worker p/ não cachear 401 |
| 16 | BAIXA | Tirar `server/auth/*` do repo (testes de sessão) |

---

## 7. EVIDÊNCIAS COLETADAS AO VIVO (14/09/2026)

1. `GET https://clinxia-backend.onrender.com/` → `200 {"status":"ok","message":"Clinxia Backend Running"}` (cold start ~90-120s).
2. `GET /api/whatsapp/status/system-global` sem token → `401 Token de autenticação ausente`.
3. `POST /api/whatsapp/connect {"clinicId":"system-global"}` com service role → `200 {"success":true,"status":"connecting"}`.
4. `GET /api/whatsapp/status/system-global` (18s depois, com token) → `200 status:"qr"` + `qrBase64` PNG válido.
5. Supabase REST com chave anon: `users`, `patients` (CPF), `whatsapp_messages`, `medical_records`, `integration_config` (token MP real) → todos retornaram dados (RLS off).
6. `whatsapp_credentials`: 2 linhas — `jpb-wpp-mrw5k1z1` (creds vazias) e `jpb-wpp-mt327gtp` (creds válidas, `me.id=5519989273130:5@s.whatsapp.net`, atualizada 15/09/2026 00:35 UTC).
7. `https://nanny-previous-unkind.ngrok-free.dev/` → `404` (proxy morto).
8. Bundle Vercel `Configuracoes-Cp7E-LFC.js`: fetches do WhatsApp sem header Authorization (bug confirmado em produção).
9. GitHub: `server/auth/*/creds.json` com chaves privadas Signal reais; `frontend/test-login.js` com `admin@lumina.com/admin123`.
10. JWT Supabase: chave atual ECC P-256; chave legada HS256 ainda em "Previous" (não revogada) — Render ainda usa anon JWT legada.

---

## 8. CONCLUSÃO

1. **O QR não é gerado por causa do frontend sem token (401 silencioso) — corrigir o `SystemWhatsAppConfig.tsx` resolve.**
2. O backend está saudável e gerou QR com sucesso durante esta auditoria.
3. Existem problemas CRÍTICOS de segurança independentes do bug (RLS desligado expondo dados médicos/LGPD e token de pagamento; credenciais WhatsApp no GitHub; segredos em env).
4. A rotação de JWT do Supabase apontada pelo usuário é válida, mas a ordem correta é: migrar envs → testar → revogar.
