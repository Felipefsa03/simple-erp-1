# Auditoria Completa do Sistema

Data: 2026-04-06  
Escopo: frontend, backend, integração Supabase, Mercado Pago, WhatsApp, testes e configuração de deploy (Vercel/Render)  
Ambiente auditado: repositório local em `c:\Users\junio\Desktop\Asaas Oportunity`

## Resumo executivo

Foram identificados riscos críticos que explicam comportamento inconsistente entre ambientes (ex.: um domínio Vercel mostra credenciais e outro não), falhas de persistência e pontos de segurança que hoje impedem considerar o fluxo 100% confiável em produção.

Principais causas-raiz:

1. Falta de proteção/autorização consistente em endpoints sensíveis.
2. Drift de schema entre código e SQL versionado (backend usa tabelas não criadas nos scripts).
3. Mistura de fluxo real com fluxos simulados/localStorage em áreas críticas.
4. Dependência de estado em memória no backend para validação e operação concorrente.
5. Duplicidade de rotas e lógica (Mercado Pago), elevando risco de comportamento divergente.

## Evidências de validação executadas

- `npx vitest run`  
  Resultado: falha em 2 suites (`tests/security.test.js`, `tests/tiss.test.js`) + 8 erros não tratados (`ERR_REQUIRE_ASYNC_MODULE`).
- `npx vitest run tests/api.test.js tests/modules.test.js`  
  Resultado: passou.
- `npm run typecheck`  
  Resultado: passou.
- `npm run build`  
  Resultado: passou (com warning de import dinâmico/estático misto).
- `npm audit --json`  
  Resultado: 8 vulnerabilidades (7 moderadas, 1 alta), incluindo `xlsx` (Prototype Pollution e ReDoS).

## Achados críticos (P0)

### P0-01: Endpoints sensíveis sem proteção de autenticação/autorização central

Evidências:

- `server/index.js:577` define `requireAuth`, mas não há `app.use(requireAuth)`.
- Endpoints sensíveis expostos:
  - `server/index.js:1184` `/api/whatsapp/connect`
  - `server/index.js:1381` `/api/whatsapp/send`
  - `server/index.js:1310` e `1316` `/api/whatsapp/disconnect`
  - `server/index.js:1531` `/api/system/signup-config`
  - `server/index.js:1854` `/api/signup/provision`

Impacto:

- Acesso indevido a operações de integração, envio de mensagens e provisioning.
- Risco de fraude, abuso e alteração de dados por chamadas não autenticadas.

Correção recomendada:

- Aplicar middleware de autenticação por padrão e whitelist explícita apenas para rotas públicas.
- Implementar autorização por papel/escopo (super_admin/admin/etc.) por endpoint.
- Registrar auditoria de acesso (user_id, clinic_id, IP, rota).

---

### P0-02: 2FA com risco de sequestro e exfiltração de segredo

Evidências:

- Endpoints 2FA sem vínculo de sessão do usuário autenticado:
  - `server/index.js:2218` `/api/2fa/setup`
  - `server/index.js:2275` `/api/2fa/verify`
  - `server/index.js:2363` `/api/2fa/disable`
  - `server/index.js:2379` `/api/2fa/status`
- `setup` retorna `secret` e `otpauthUri` no response (`server/index.js:2269`) com `userId` vindo do request.

Impacto:

- Um cliente pode tentar operar 2FA de outro usuário se souber/descobrir `userId`.
- Exposição de segredo TOTP em fluxo sem proteção forte.

Correção recomendada:

- Exigir token autenticado e validar `auth.uid() === userId` (ou privilégio super_admin explícito).
- Não aceitar `userRole` vindo do cliente para decisões de segurança.
- Revisar resposta de setup para não vazar material sensível sem controles adicionais.

---

### P0-03: Segredos sensíveis persistidos no frontend/localStorage

Evidências:

- `frontend/src/domains/configuracoes/Configuracoes.tsx:1598` e `1624` coloca `mp_access_token` no estado global.
- `frontend/src/stores/clinicStore.ts:1511-1542` persiste `integrationConfig` no localStorage (`persist`), incluindo credenciais.
- `frontend/src/domains/configuracoes/Configuracoes.tsx:484-487` salva senhas alteradas em `localStorage` (`luminaflow-reset-passwords`).
- `frontend/src/components/auth/PasswordResetFlow.tsx:333` comentário explícito de fluxo local e não produção.

Impacto:

- Exposição de tokens de pagamento no navegador.
- Risco severo de comprometimento de conta/integração via XSS, sessão compartilhada ou dispositivo comprometido.

Correção recomendada:

- Nunca enviar/armazenar `mp_access_token` no cliente.
- Mover leitura/gravação de credenciais para backend seguro com service role.
- Remover imediatamente persistência de senha/reset em localStorage.

---

### P0-04: Duplicidade de rotas Mercado Pago + lógica concorrente

Evidências:

- Rotas duplicadas:
  - `/api/mercadopago/create-preference` em `server/index.js:1709` e `1985`
  - `/api/webhooks/mercadopago` em `server/index.js:1956` e `2095`
- Código morto em envio WhatsApp após `return`:
  - `server/index.js:1408` retorna resposta e mantém bloco inacessível até `1458`.

Impacto:

- Comportamento não determinístico e difícil de operar/debugar.
- Alto risco de regressão em cada ajuste.

Correção recomendada:

- Manter uma única implementação por rota e remover blocos legados.
- Extrair casos de uso para módulos (`payments`, `webhooks`, `whatsapp`) com testes.

---

### P0-05: Drift de banco (código usa tabelas não versionadas nos SQL oficiais)

Evidências:

- Backend usa:
  - `rest/v1/integration_config`
  - `rest/v1/payments`
  - `rest/v1/user_2fa`
  - `rest/v1/whatsapp_messages`
  - (`server/index.js`, múltiplos pontos)
- Scripts versionados não criam essas tabelas:
  - `sql/02-tables.sql` possui `whatsapp_credentials`, `clinics`, `users`, etc., mas não inclui `integration_config`, `payments`, `user_2fa`, `whatsapp_messages`.

Impacto:

- Novos ambientes podem subir “sem salvar dados” mesmo com código correto.
- Falhas intermitentes por depender de estrutura manual não rastreada.

Correção recomendada:

- Criar migrações oficiais para todas as tabelas usadas no runtime.
- Versionar índices, constraints, RLS e policies dessas tabelas.
- Bloquear deploy se drift for detectado (check de schema no CI).

---

### P0-06: Webhook Mercado Pago sem validação de assinatura

Evidências:

- Handlers em `server/index.js:1956` e `2095` processam evento sem validar assinatura/secret do webhook.

Impacto:

- Possibilidade de forjar eventos e alterar estado de pagamento.

Correção recomendada:

- Validar assinatura do webhook conforme documentação oficial do Mercado Pago antes de processar payload.

## Achados altos (P1)

### P1-01: Estado crítico em memória (não resiliente para escala horizontal)

Evidências:

- `server/index.js` usa `Map`/objetos em memória para:
  - `phoneVerificationSessions` (`117`)
  - `whatsappRateLimit` (`1326`)
  - `whatsappConnections` (`989`)
  - `whatsappSockets` (`990`)

Impacto:

- Em múltiplas instâncias, validações e sessões podem quebrar.
- Reinício de processo perde estado e causa falha de fluxo.

Correção recomendada:

- Migrar estado crítico para Redis/DB com TTL e locking.

---

### P1-02: Inconsistência entre URLs Vercel (origem/CORS/configuração)

Evidências:

- Allowlist default no backend:
  - `server/index.js:530-537` inclui `https://clinxia.vercel.app` e `FRONTEND_URL`.
- Preview URL do Vercel (ex.: `simple-erp-1-...vercel.app`) não está garantida nessa lista.

Impacto:

- Um domínio funciona e outro falha em chamadas ao backend (ex.: carregar config global).

Correção recomendada:

- Definir `ALLOWED_ORIGINS` com todos os domínios de produção/preview ou estratégia segura de wildcard controlado para previews.
- Padronizar `FRONTEND_URL` por ambiente e evitar fallback ambíguo.

---

### P1-03: Risco multi-tenant por fallback para clinic global fixo

Evidências:

- `frontend/src/hooks/useAuth.ts:31-37` normaliza clinic inválida para `00000000-0000-0000-0000-000000000001`.
- `frontend/src/lib/supabaseSync.ts:69-76` também força fallback para clinic global.

Impacto:

- Dados podem ser gravados/lidos no tenant global por erro de identificação.

Correção recomendada:

- Remover fallback silencioso para tenant global.
- Falhar explicitamente quando `clinic_id` for inválido.

---

### P1-04: Tokens e payloads sensíveis em logs

Evidências:

- `server/index.js:2013` faz log de resposta do Supabase (pode conter `mp_access_token`).

Impacto:

- Vazamento de segredo em logs de aplicação.

Correção recomendada:

- Sanitizar/redigir campos sensíveis antes de logar.

## Achados médios (P2)

### P2-01: Frontend chama endpoints não implementados no backend

Evidências:

- `frontend/src/lib/integrationsApi.ts` chama:
  - `/api/asaas/charge`
  - `/api/asaas/subscription`
  - `/api/asaas/reconcile`
  - `/api/integrations/tiss/export`
  - `/api/integrations/pixel/event`
- Backend implementa apenas `/api/asaas/test` e `/api/integrations/rdstation/event` (`server/index.js:729`, `756`).

Impacto:

- Funcionalidades quebradas/parciais em produção.

Correção recomendada:

- Implementar endpoints faltantes ou remover chamadas até existir backend real.

---

### P2-02: Fluxos simulados ainda ativos em domínio crítico de assinatura

Evidências:

- `frontend/src/stores/subscriptionStore.ts:80-112` assinatura Mercado Pago “simulada”.

Impacto:

- Divergência entre o que usuário vê e o que realmente foi processado no gateway.

Correção recomendada:

- Remover simulação e centralizar fluxo real via backend.

---

### P2-03: Suite de testes incompleta/quebrada

Evidências:

- `tests/security.test.js:13` importa `../backend/security.js` (arquivo inexistente).
- `tests/tiss.test.js:10` importa `../backend/tissService.js` (arquivo inexistente).

Impacto:

- Cobertura falsa de segurança/TISS.

Correção recomendada:

- Criar os módulos testados ou atualizar os testes para a arquitetura atual.

---

### P2-04: Dependências com vulnerabilidades conhecidas

Evidências:

- `npm audit --json`: 8 vulnerabilidades (1 alta em `xlsx`).

Impacto:

- Superfície de ataque maior, especialmente em upload/processamento de planilhas.

Correção recomendada:

- Atualizar cadeia de dependências e revisar impacto de breaking changes.

## Melhorias estruturais recomendadas (documento de melhorias)

### Fase 0 (24 horas)

1. Rotacionar imediatamente todos os segredos expostos fora do cofre (Render/Supabase/Vercel/Mercado Pago).
2. Bloquear endpoints críticos com autenticação e autorização.
3. Remover logs de conteúdo sensível (tokens/payloads).
4. Remover persistência de credenciais e senhas no frontend/localStorage.
5. Consolidar em uma única versão das rotas Mercado Pago e webhook.

### Fase 1 (7 dias)

1. Criar migrações oficiais para `integration_config`, `payments`, `user_2fa`, `whatsapp_messages` com RLS/policies.
2. Implementar verificação de assinatura no webhook Mercado Pago.
3. Corrigir allowlist de CORS para todos os domínios válidos (produção + preview controlado).
4. Implementar endpoints backend faltantes ou remover contratos inválidos no frontend.
5. Corrigir suite de testes quebrada (`security`/`tiss`) e zerar erros não tratados do Vitest.

### Fase 2 (30 dias)

1. Migrar sessão/validação/rate limit para armazenamento distribuído (Redis/DB com TTL).
2. Refatorar `server/index.js` em módulos por domínio para reduzir regressão.
3. Implementar observabilidade (tracing, correlação por request-id, alarmes de falha de pagamento/provisioning).
4. Implantar pipeline de “pre-flight” de release:
   - schema drift check
   - smoke test de integrações
   - validação de variáveis obrigatórias por ambiente

## Plano de aceitação técnica (DoD)

O ciclo “cadastro -> validação telefone -> pagamento -> provisionamento -> login” só deve ser considerado pronto quando:

1. Funcionar em ambos os domínios Vercel autorizados.
2. Persistir 100% no Supabase sem fallback local para dados críticos.
3. Suportar concorrência (múltiplos cadastros simultâneos) sem perda de sessão/código.
4. Rejeitar webhooks inválidos.
5. Passar testes automatizados (unitário + integração) sem suites quebradas.

