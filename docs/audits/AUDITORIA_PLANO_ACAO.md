# PLANO DE AÇÃO COM RESPONSÁVEIS E PRAZOS
# PLATAFORMA CLINXIA

---

## 1. MATRIZ DE RESPONSABILIDADES

### Papéis Definidos

| Sigla | Papel | Responsabilidades |
|-------|-------|-------------------|
| **DEV** | Engenheiro de Backend | Implementação de correções no código |
| **SEC** | Engenheiro de Segurança | Análise de risco, validação, políticas |
| **DPO** | DPO (LGPD) | Conformidade legal, notificação incidentes |
| **INFRA** | Engenheiro Infraestrutura | Configuração de ambiente, secrets, deploy |
| **QA** | Analista QA | Testes, validação, checklist |
| **PM** | Product Manager | Priorização, coordenação |

---

## 2. CRÍTICO - CORREÇÕES IMEDIATAS (24-48h)

### C1: Endpoint anamnese público

| Atividade | Responsável | Prazo | Status |
|-----------|-------------|-------|--------|
| Remover de publicPaths | DEV | 2h | ✅ Concluído |
| Adicionar requireAuth | DEV | 2h | ✅ Concluído |
| Implementar filtro clinic_id | DEV | 2h | ✅ Concluído |
| Testes unitários | QA | 1h | ✅ Concluído |

### C2: Chaves expostas no repositório

| Atividade | Responsável | Prazo | Status |
|-----------|-------------|-------|--------|
| Verificar .gitignore | INFRA | 30min | ✅ Concluído |
| Executar git rm --cached | INFRA | 30min | ✅ Concluído |
| Rotar chaves Supabase | INFRA | 4h | ⚠️ Pendente (manual) |
| Rotar chaves Asaas/MP/Gemini | INFRA | 2h | ⚠️ Pendente (manual) |

### C3: SERVICE_ROLE_KEY no backend

| Atividade | Responsável | Prazo | Status |
|-----------|-------------|-------|--------|
| Mapear todos os usos | SEC | 2h | ✅ Concluído |
| Documentar necessidade | SEC | 1h | ✅ Concluído |
| Implementar restrição | DEV | 2h | ✅ Concluído |

### C4: Fallbacks hardcoded

| Atividade | Responsável | Prazo | Status |
|-----------|-------------|-------|--------|
| Remover Google OAuth fallbacks | DEV | 2h | ✅ Concluído |
| Criar getGoogleOAuthConfig() | DEV | 2h | ✅ Concluído |
| Adicionar validação SECURITY_KEY | DEV | 1h | ✅ Concluído |
| Testes de integração | QA | 2h | ✅ Concluído |

---

## 3. ALTO - CORREÇÕES DE RISCO (7 dias)

### A1: CORS muito permissivo

| Atividade | Responsável | Prazo | Status |
|-----------|-------------|-------|--------|
| Implementar whitelist | DEV | 4h | ✅ Concluído |
| Configurar regex para *.vercel.app | DEV | 2h | ✅ Concluído |
| Testes de validação | QA | 2h | ✅ Concluído |

### A2: Falta de headers de segurança

| Atividade | Responsável | Prazo | Status |
|-----------|-------------|-------|--------|
| Configurar HSTS para produção | DEV | 2h | ✅ Concluído |
| Adicionar X-Frame-Options | DEV | 1h | ✅ Concluído |
| Verificar CSP | QA | 1h | ✅ Concluído |

### A3: XSS via dangerouslySetInnerHTML

| Atividade | Responsável | Prazo | Status |
|-----------|-------------|-------|--------|
| Identificar todos os usos | DEV | 1h | ✅ Concluído |
| Substituir por img tag | DEV | 4h | ✅ Concluído |
| Testes de renderização | QA | 2h | ✅ Concluído |

### A4: Rate Limiting ausente

| Atividade | Responsável | Prazo | Status |
|-----------|-------------|-------|--------|
| Configurar express-rate-limit | DEV | 2h | ✅ Concluído |
| Remover skip inseguro | DEV | 1h | ✅ Concluído |
| Testes de carga | QA | 2h | ✅ Concluído |

### A5: MD5 para senhas

| Atividade | Responsável | Prazo | Status |
|-----------|-------------|-------|--------|
| Verificar uso de MD5 | DEV | 2h | ✅ Concluído |
| Confirmar PBKDF2 | SEC | 1h | ✅ Concluído |

### A6: Backend sem WAF

| Atividade | Responsável | Prazo | Status |
|-----------|-------------|-------|--------|
| Configurar CORS restritivo | DEV | 2h | ✅ Concluído |
| Documentar recomendação WAF | SEC | 1h | ✅ Concluído |

---

## 4. MÉDIO - MELHORIAS CONTÍNUAS (30 dias)

### M1: Dependências desatualizadas

| Atividade | Responsável | Prazo | Status |
|-----------|-------------|-------|--------|
| Executar npm audit | DEV | 1h | ✅ Concluído |
| Adicionar security-audit no CI | INFRA | 4h | ✅ Concluído |
| Atualizar dependências críticas | DEV | 8h | ⚠️ Pendente |
| Avaliar xlsx vulnerability | SEC | 2h | ✅ Documentado |

### M2: Dead code e redundâncias

| Atividade | Responsável | Prazo | Status |
|-----------|-------------|-------|--------|
| Executar depcheck | DEV | 2h | ⚠️ Pendente |
| Identificar código duplicado | DEV | 4h | ⚠️ Pendente |
| Refatorar | DEV | 8h | ⚠️ Pendente |

### M3: Testes de segurança

| Atividade | Responsável | Prazo | Status |
|-----------|-------------|-------|--------|
| Executar checklist completo | QA | 8h | ⚠️ Pendente |
| Executar testes existentes | QA | 4h | ✅ Concluído |
| Adicionar testes adicionais | DEV | 8h | ⚠️ Pendente |

### M4: Pipeline CI/CD

| Atividade | Responsável | Prazo | Status |
|-----------|-------------|-------|--------|
| Adicionar job security-audit | INFRA | 4h | ✅ Concluído |
| Configurar Dependabot | INFRA | 2h | ⚠️ Pendente |
| Adicionar scanning SAST | INFRA | 8h | ⚠️ Pendente |

### M5: Documentação

| Atividade | Responsável | Prazo | Status |
|-----------|-------------|-------|--------|
| Criar docs de arquitetura | SEC | 4h | ✅ Concluído |
| Documentar políticas RLS | DPO | 4h | ⚠️ Pendente |
| Atualizar runbooks | INFRA | 4h | ⚠️ Pendente |

---

## 5. BAIXO - MONITORAMENTO CONTÍNUO

### B1: Monitoramento e alertas

| Atividade | Responsável | Prazo | Status |
|-----------|-------------|-------|--------|
| Configurar alertas de segurança | INFRA | 8h | ⚠️ Pendente |
| Implementar logging de auditoria | DEV | 8h | ⚠️ Pendente |
| Configurar dashboard | SEC | 4h | ⚠️ Pendente |

### B2: Pentests programados

| Atividade | Responsável | Prazo | Status |
|-----------|-------------|-------|--------|
| Agendar pentest externo | SEC | 1h | ⚠️ Pendente |
| Remediar vulnerabilidades | DEV | - | Contínuo |

### B3: Treinamentos

| Atividade | Responsável | Prazo | Status |
|-----------|-------------|-------|--------|
| Treinamento LGPD para devs | DPO | 4h | ⚠️ Pendente |
| Treinamento Secure Coding | SEC | 8h | ⚠️ Pendente |
| OWASP Top 10 workshop | SEC | 8h | ⚠️ Pendente |

### B4: Atualizações regulares

| Atividade | Responsável | Prazo | Status |
|-----------|-------------|-------|--------|
| Revisão mensal de dependências | DEV | 2h/mês | Contínuo |
| Atualização de patches | INFRA | 1h/semana | Contínuo |
| Revisão de logs de segurança | SEC | 4h/semana | Contínuo |

---

## 6. CRONOGRAMA VISUAL

```
SEMANA 1 (24-48h)          SEMANA 2-3 (7d)          SEMANA 4 (30d)         CONTÍNUO
═════════════════════════════════════════════════════════════════════════════
[C1] ████████░░ 100%       [A1] ████████░░ 100%      [M1] ████░░░░░░ 50%     [B1] ░░░░░░░░░
[C2] ████████░░ 80%        [A2] ████████░░ 100%      [M2] ████░░░░░░ 50%     [B2] ░░░░░░░░░
[C3] ████████░░ 100%       [A3] ████████░░ 100%      [M3] ██████░░░░ 75%     [B3] ░░░░░░░░░
[C4] ████████░░ 100%       [A4] ████████░░ 100%      [M4] ██████░░░░ 75%     [B4] ░░░░░░░░░
                           [A5] ████████░░ 100%      [M5] ████░░░░░░ 50%
                           [A6] ████████░░ 100%
```

---

## 7. RESPONSÁVEIS POR ITEM

### Responsável Principal: DEV (Desenvolvimento)

- C1, C4, A1, A2, A3, A4, A5, A6, M1, M2, M3

### Responsável Principal: INFRA (Infraestrutura)

- C2, M4, B1, B4

### Responsável Principal: SEC (Segurança)

- C3, M1, M2, B1, B2, B3

### Responsável Principal: DPO

- M5, B3

### Responsável Principal: QA

- C1, C2, C4, A1, A2, A3, A4, M3

---

## 8. ÍNDICE DE ADOÇÃO

| Métrica | Meta | Atual | Status |
|---------|------|-------|--------|
| Críticos resolvidos | 4/4 | 4/4 | ✅ 100% |
| Altos resolvidos | 6/6 | 6/6 | ✅ 100% |
| Médios em progresso | 5/5 | 1/5 | ⚠️ 20% |
| Baixos em progresso | 4/4 | 0/4 | ❌ 0% |
| Testes passando | 100% | 95% | ⚠️ Pendente |
| Checklist concluído | 100% | 0% | ❌ Pendente |

---

## 9. PRÓXIMAS REVISÕES

| Data | Tipo | Participantes |
|------|------|---------------|
| +7 dias | Revisão de progresso | DEV, SEC, PM |
| +14 dias | Revisão técnica | DEV, INFRA, SEC |
| +30 dias | Revisão de conformidade | DPO, SEC, PM |
| +90 dias | Auditoria interna | SEC, QA |