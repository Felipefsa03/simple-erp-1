# CHECKLIST DE VERIFICAÇÃO PÓS-CORREÇÃO
# PLATAFORMA CLINXIA
# Data: 09 de abril de 2026

---

## INSTRUÇÕES DE USO

Execute cada item de verificação e marque como:
- ✅ **PASS** - Verificação concluída com sucesso
- ❌ **FAIL** - Verificação falhou, ação corretiva necessária
- ⏭️ **SKIP** - Não aplicável (ex: ambiente específico)

**Responsável:** Engenheiro de Segurança / QA  
**Ambiente:** Production (ou staging equivalente)

---

## CRÍTICO 1 - Endpoint anamnese protegido

### Verificações Automatizadas

```bash
# 1. Testar endpoint SEM autenticação
curl -s -o /dev/null -w "%{http_code}" https://api.clinxia.com/api/clinic/anamnese-sync
# ESPERADO: 401 ou 403

# 2. Testar endpoint COM token inválido
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer invalid-token" \
  https://api.clinxia.com/api/clinic/anamnese-sync
# ESPERADO: 401

# 3. Testar endpoint COM token válido (usuário comum)
curl -s -o /dev_null -w "%{http_code}" \
  -H "Authorization: Bearer $USER_TOKEN" \
  https://api.clinxia.com/api/clinic/anamnese-sync
# ESPERADO: 200 (apenas dados da própria clínica)
```

### Checklist

| # | Verificação | Esperado | Status |
|---|-------------|----------|--------|
| C1.1 | GET sem token retorna 401/403 | 401/403 | ⬜ |
| C1.2 | GET com token inválido retorna 401 | 401 | ⬜ |
| C1.3 | GET com token válido retorna 200 | 200 | ⬜ |
| C1.4 | Usuário clínica A não vê dados da clínica B | ✓ | ⬜ |
| C1.5 | Response contém apenas dados do clinic_id do JWT | ✓ | ⬜ |

---

## CRÍTICO 2 - Remoção de variáveis de ambiente expostas

### Verificações

```bash
# 1. Verificar que .env não está no repositório
git ls-files --others --ignored --exclude-standard | grep -E "\\.env"

# 2. Verificar que chaves foram rotadas no Supabase
# (Verificar via dashboard Supabase - Settings > API)
```

### Checklist

| # | Verificação | Esperado | Status |
|---|-------------|----------|--------|
| C2.1 | `.env` não está no repositório | ✓ | ⬜ |
| C2.2 | `.env.development` não está no repositório | ✓ | ⬜ |
| C2.3 | Novas chaves Supabase geradas | ✓ | ⬜ |
| C2.4 | Chaves Asaas regeneradas | ✓ | ⬜ |
| C2.5 | Chaves Mercado Pago regeneradas | ✓ | ⬜ |

---

## CRÍTICO 3 - SERVICE_ROLE_KEY isolamento

### Verificações

```bash
# 1. Verificar que SERVICE_ROLE_KEY não é usada em endpoints públicos
grep -r "SUPABASE_SERVICE_ROLE_KEY" server/index.js | grep -v "getSupabaseAdminHeaders"

# 2. Verificar que RLS está habilitado em todas as tabelas
psql -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
```

### Checklist

| # | Verificação | Esperado | Status |
|---|-------------|----------|--------|
| C3.1 | SERVICE_ROLE_KEY apenas em funções admin | ✓ | ⬜ |
| C3.2 | RLS habilitado em medical_records | ✓ | ⬜ |
| C3.3 | RLS habilitado em patients | ✓ | ⬜ |
| C3.4 | RLS habilitado em users | ✓ | ⬜ |

---

## CRÍTICO 4 - Remoção de fallbacks hardcoded

### Verificações

```bash
# 1. Verificar que GOOGLE_CLIENT_ID_FALLBACK foi removido
grep -r "GOOGLE_CLIENT_ID_FALLBACK" . --include="*.js"

# 2. Verificar que GOOGLE_CLIENT_SECRET_FALLBACK foi removido
grep -r "GOOGLE_CLIENT_SECRET_FALLBACK" . --include="*.js"

# 3. Verificar que DEFAULT_KEY tem fallback seguro (não produção)
grep "DEFAULT_KEY" backend/security.js | grep -v "dev-only-key"
```

### Checklist

| # | Verificação | Esperado | Status |
|---|-------------|----------|--------|
| C4.1 | GOOGLE_CLIENT_ID_FALLBACK removido | N/A | ⬜ |
| C4.2 | GOOGLE_CLIENT_SECRET_FALLBACK removido | N/A | ⬜ |
| C4.3 | getGoogleOAuthConfig() retorna null se não configurado | ✓ | ⬜ |
| C4.4 | SECURITY_KEY lança erro em produção se ausente | ✓ | ⬜ |
| C4.5 | OAuth sem config retorna 503 claro | ✓ | ⬜ |

---

## ALTO 1 - CORS configurado corretamente

### Verificações

```bash
# 1. Verificar que origin permitida retorna headers CORS corretos
curl -s -I -H "Origin: https://app.clinxia.com" https://api.clinxia.com/health | grep -i "access-control"

# 2. Verificar que origin não permitida é bloqueada
curl -s -H "Origin: https://attacker.com" https://api.clinxia.com/health
# ESPERADO: Erro de CORS
```

### Checklist

| # | Verificação | Esperado | Status |
|---|-------------|----------|--------|
| A1.1 | Origin permitida tem Access-Control-Allow-Origin | ✓ | ⬜ |
| A1.2 | Origin não permitida é bloqueada | ✓ | ⬜ |
| A1.3 | OPTIONS (preflight) funciona corretamente | ✓ | ⬜ |
| A1.4 | Credentials enabled corretamente | ✓ | ⬜ |

---

## ALTO 2 - Headers de segurança HTTP

### Verificações

```bash
# Verificar headers de segurança
curl -sI https://api.clinxia.com/health | grep -E "(Strict-Transport|X-Frame|Content-Security)"

# ESPERADO:
# Strict-Transport-Security: max-age=31536000
# X-Frame-Options: DENY
# Content-Security-Policy: ...
```

### Checklist

| # | Verificação | Esperado | Status |
|---|-------------|----------|--------|
| A2.1 | HSTS header presente (produção) | ✓ | ⬜ |
| A2.2 | X-Frame-Options: DENY | ✓ | ⬜ |
| A2.3 | Content-Security-Policy ativo | ✓ | ⬜ |
| A2.4 | X-Content-Type-Options: nosniff | ✓ | ⬜ |

---

## ALTO 3 - XSS via dangerouslySetInnerHTML corrigido

### Verificações

```bash
# 1. Verificar que dangerouslySetInnerHTML não é mais usado
grep -r "dangerouslySetInnerHTML" frontend/ --include="*.tsx" | grep -v "qrCode"

# 2. Testar página de assinatura em browser
# Navegar para /subscription e verificar se QR Code renderiza
```

### Checklist

| # | Verificação | Esperado | Status |
|---|-------------|----------|--------|
| A3.1 | SubscriptionBlockPage não usa dangerouslySetInnerHTML | ✓ | ⬜ |
| A3.2 | SignupPage não usa dangerouslySetInnerHTML (QR) | ✓ | ⬜ |
| A3.3 | QR Code renderiza corretamente via img tag | ✓ | ⬜ |
| A3.4 | Não há XSS no campo de pagamento | ✓ | ⬜ |

---

## ALTO 4 - Rate Limiting configurado

### Verificações

```bash
# 1. Enviar 100+ requisições rapidamente
for i in {1..110}; do curl -s -o /dev/null https://api.clinxia.com/health; done

# 2. Verificar que rate limit é aplicado
# ESPERADO: 429 Too Many Requests após limite
```

### Checklist

| # | Verificação | Esperado | Status |
|---|-------------|----------|--------|
| A4.1 | Rate limit aplicado (429 após limite) | ✓ | ⬜ |
| A4.2 | /clinic/anamnese-sync não está no skip | ✓ | ⬜ |
| A4.3 | Health check excluded do rate limit | ✓ | ⬜ |
| A4.4 | Headers de rate limit presentes | ✓ | ⬜ |

---

## ALTO 5 - Algoritmo de hash seguro

### Verificações

```bash
# 1. Verificar que MD5 não está sendo usado
grep -r "md5\|MD5" . --include="*.js" --include="*.ts"

# 2. Verificar que PBKDF2 está sendo usado (security.js)
grep -A5 "pbkdf2Sync" backend/security.js
```

### Checklist

| # | Verificação | Esperado | Status |
|---|-------------|----------|--------|
| A5.1 | MD5 não encontrado no codebase | ✓ | ⬜ |
| A5.2 | PBKDF2 com 100000+ iterações | ✓ | ⬜ |
| A5.3 | Salt随机 por senha | ✓ | ⬜ |

---

## ALTO 6 - WAF / Origin validation

### Verificações

```bash
# 1. Verificar que apenas origens conocidas têm acesso
curl -s -H "Origin: https://malicious-site.com" https://api.clinxia.com/api/users
# ESPERADO: Erro de CORS

# 2. Verificar configuração do Cloudflare/WAF (se aplicável)
```

### Checklist

| # | Verificação | Esperado | Status |
|---|-------------|----------|--------|
| A6.1 | CORS rejeita origens desconhecidas | ✓ | ⬜ |
| A6.2 | WAF configurado (se aplicável) | ✓ | ⬜ |
| A6.3 | Backend não acessível diretamente (sem CDN) | ✓ | ⬜ |

---

## RESUMO - RESULTADO FINAL

| Severidade | Total | ✅ Pass | ❌ Fail | ⏭️ Skip |
|------------|-------|---------|---------|---------|
| CRÍTICO | 14 | | | |
| ALTO | 18 | | | |
| **TOTAL** | **32** | | | |

### Critério de Aprovação
- **Mínimo:** 100% dos CRÍTICOS passando
- **Ideal:** 95%+ de todos os itens passando

### Proximos Passos se Falhas
1. Executar ação corretiva para cada falha
2. Re-testar após correção
3. Documentar false positives (se houver)

---

## ASSINATURAS

| Papel | Nome | Data | Assinatura |
|-------|------|------|------------|
| Eng. Segurança | | | |
| QA | | | |
| Dev Backend | | | |
| DPO | | | |