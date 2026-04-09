# ESTIMATIVA DE ESFORÇO POR ITEM
# PLATAFORMA CLINXIA

---

## METODOLOGIA

Estimativas baseadas em:
- Complexidade técnica real do código
- Tempo de análise e correção
- Testes e validação necessários
- Documentação requerida

---

## CRÍTICO 1 - Endpoint anamnese público

| Fase | Atividade | Esforço |
|------|-----------|---------|
| Análise | Identificar todas as ocorrências de `publicPaths` | 30 min |
| Modificação | Remover `/clinic/anamnese-sync` de `publicPaths` em 2 arquivos | 15 min |
| Modificação | Adicionar `requireAuth` middleware ao endpoint | 30 min |
| Modificação | Implementar filtro por `clinic_id` baseado no JWT | 45 min |
| Modificação | Corrigir rate limiting skip | 15 min |
| Testes | Testar endpoint com token válido → 200 | 15 min |
| Testes | Testar endpoint sem token → 401 | 15 min |
| Testes | Testar com token de clínica A acessando dados da clínica B → 403 | 20 min |

**TOTAL: 2h 45min (arredondado: 3h)**

---

## CRÍTICO 2 - Exposição de chaves de API

| Fase | Atividade | Esforço |
|------|-----------|---------|
| Verificação | Confirmar que `.gitignore` tem `*.env*` | 5 min |
| Documentação | Alertar sobre necessidade de rotação de chaves | 15 min |
| Remediação | Executar `git rm --cached` (se necessário) | 10 min |
| Remediação | Rotar chaves expostas no Supabase | 4h (manual) |
| Remediação | Regenerar chaves Asaas, MP, Gemini | 2h (manual) |

**TOTAL: 6h 30min (incluindo espera de regeneração de chaves)**

---

## CRÍTICO 3 - SERVICE_ROLE_KEY no backend

| Fase | Atividade | Esforço |
|------|-----------|---------|
| Análise | Mapear todos os usos de SERVICE_ROLE_KEY | 1h |
| Documentação | Documentar onde é necessário (admin jobs) | 30 min |
| Verificação | Confirmar uso apenas em operações justificadas | 1h |

**TOTAL: 2h 30min (documentação e validação)**

---

## CRÍTICO 4 - Fallbacks hardcoded

| Fase | Atividade | Esforço |
|------|-----------|---------|
| Análise | Identificar todos os fallbacks (security.js, server/index.js) | 30 min |
| Modificação | Remover `GOOGLE_CLIENT_ID_FALLBACK` | 20 min |
| Modificação | Remover `GOOGLE_CLIENT_SECRET_FALLBACK` | 20 min |
| Modificação | Criar função `getGoogleOAuthConfig()` com verificação explícita | 45 min |
| Modificação | Adicionar validação de `SECURITY_KEY` em produção | 30 min |
| Testes | Testar OAuth com variáveis configuradas → funciona | 20 min |
| Testes | Testar OAuth sem variáveis → erro claro | 20 min |

**TOTAL: 3h 25min (arredondado: 3.5h)**

---

## ALTO 1 - CORS muito permissivo

| Fase | Atividade | Esforço |
|------|-----------|---------|
| Análise | Verificar configuração atual de CORS | 20 min |
| Modificação | Implementar validação rigorosa de origins | 30 min |
| Testes | Testar com origin permitida → 200 | 15 min |
| Testes | Testar com origin bloqueada → 403 | 15 min |

**TOTAL: 1h 20min**

---

## ALTO 2 - Falta de headers de segurança

| Fase | Atividade | Esforço |
|------|-----------|---------|
| Análise | Verificar configuração atual do Helmet | 15 min |
| Modificação | Adicionar HSTS header para produção | 15 min |
| Modificação | Adicionar X-Frame-Options | 10 min |
| Testes | Verificar headers com `curl -I` | 15 min |

**TOTAL: 55min (arredondado: 1h)**

---

## ALTO 3 - XSS dangerouslySetInnerHTML

| Fase | Atividade | Esforço |
|------|-----------|---------|
| Análise | Identificar todos os usos de `dangerouslySetInnerHTML` | 20 min |
| Modificação | Substituir por `<img>` em SubscriptionBlockPage.tsx | 15 min |
| Modificação | Substituir por `<img>` em SignupPage.tsx (simple-erp) | 15 min |
| Modificação | Verificar se QR Code vem como base64 ou URL | 30 min |
| Testes | Renderizar página de assinatura → QR Code aparece corretamente | 20 min |

**TOTAL: 1h 40min**

---

## ALTO 4 - Rate Limiting ausente

| Fase | Atividade | Esforço |
|------|-----------|---------|
| Análise | Verificar configuração atual do express-rate-limit | 15 min |
| Verificação | Confirmar que `/clinic/anamnese-sync` não está no skip | 15 min |
| Testes | Enviar 100+ requisições → rate limit aplicado | 20 min |

**TOTAL: 50min**

---

## ALTO 5 - MD5 para senhas

| Fase | Atividade | Esforço |
|------|-----------|---------|
| Análise | Buscar uso de MD5 em todo o codebase | 30 min |
| Verificação | Confirmar que使用的是 PBKDF2 (seguro) | 20 min |

**TOTAL: 50min (verificação)**

---

## ALTO 6 - Backend acessível sem WAF

| Fase | Atividade | Esforço |
|------|-----------|---------|
| Análise | Avaliar configuração atual | 15 min |
| Documentação | Recomendar WAF (Cloudflare, AWS WAF) | 20 min |
| Implementação | Configurar origin check (se aplicável) | 30 min |

**TOTAL: 1h 5min**

---

## RESUMO - TOTAL POR SEVERIDADE

| Severidade | Items | Esforço Total |
|------------|-------|---------------|
| CRÍTICO | 4 | **15h** |
| ALTO | 6 | **6h** |
| MÉDIO | 5 | (contínuo) |
| BAIXO | 4 | (contínuo) |

**ESFORÇO TOTAL IMPLEMENTAÇÃO: ~21 horas**

---

## MATRIZ DE ESFORÇO

| Item | Complexidade | Esforço | Dependências |
|------|--------------|---------|--------------|
| C1 - Endpoint anamnese | Alta | 3h | C4 (OAuth) |
| C2 - Chaves expostas | Média | 6.5h | Nenhuma |
| C3 - SERVICE_ROLE_KEY | Baixa | 2.5h | C2 |
| C4 - Fallbacks | Alta | 3.5h | Nenhuma |
| A1 - CORS | Média | 1.3h | Nenhuma |
| A2 - Headers | Baixa | 1h | Nenhuma |
| A3 - XSS | Média | 1.7h | Nenhuma |
| A4 - Rate Limit | Baixa | 0.8h | C1 |
| A5 - MD5 | Baixa | 0.8h | Nenhuma |
| A6 - WAF | Média | 1.1h | A1 |

---

## SUGESTÃO DE ALOCAÇÃO

| Semana | Atividade | Responsável |
|--------|-----------|--------------|
| Semana 1 | C1, C4 (9h) | Eng. Backend |
| Semana 1-2 | C2 - Rotação chaves (6.5h) | DevOps + Infra |
| Semana 2 | C3, A1-A6 (11h) | Eng. Backend |
| Semana 3 | Testes integrados (8h) | QA/DevSecOps |