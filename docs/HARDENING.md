# Hardening Técnico - LuminaFlow ERP

## 1. Índice de Performance

### 1.1 Métricas Alvo
- **Time to First Byte (TTFB):** < 200ms
- **Largest Contentful Paint (LCP):** < 2.5s
- **First Input Delay (FID):** < 100ms
- **Time to Interactive (TTI):** < 3.5s

### 1.2 Otimização de Bundle
- Implementar code-splitting para rotas
- Lazy loading para componentes pesados
- Tree shaking para remover código não utilizado

---

## 2. Banco de Dados

### 2.1 Índices Compostos Recomendados
```sql
-- Pacientes por clínica
CREATE INDEX idx_patients_clinic_id ON patients(clinic_id);

-- Agendamentos por clínica e data
CREATE INDEX idx_appointments_clinic_date ON appointments(clinic_id, scheduled_at);

-- Transações por clínica e data
CREATE INDEX idx_transactions_clinic_date ON transactions(clinic_id, created_at);

-- Prontuários por paciente
CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);

-- Estoque por clínica
CREATE INDEX idx_stock_clinic ON stock_items(clinic_id);
```

### 2.2 Particionamento
- Particionar transações por mês
- Arquivar dados com mais de 12 meses
- Usar partitioning por clinic_id para multi-tenancy

---

## 3. Cache e Performance

### 3.1 Estratégia de Cache
- **Dados estáticos:** Cache lifetime longo (1h)
- **Dados de usuário:** Cache curto (5min)
- **Dados financeiros:** Sem cache (dados sensíveis)

### 3.2 TanStack Query Configuração
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});
```

---

## 4. Rate Limiting

### 4.1 Limites Recomendados
| Endpoint | Limite | Janela |
|----------|--------|--------|
| /api/auth/login | 5 | 15 min |
| /api/patients/import | 10 | 1 hora |
| /api/asaas/* | 100 | 1 minuto |
| /api/notifications/* | 50 | 1 minuto |

### 4.2 Estratégia de Retry
- Retry exponencial com jitter
- Máximo 3 tentativas
- Backoff: 1s, 2s, 4s

---

## 5. Segurança

### 5.1 Headers de Segurança
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

### 5.2 Criptografia
- Dados sensíveis em localStorage devem ser criptografados
- Usar AES-256-GCM para dados em repouso
- TLS 1.3 para transmissão

### 5.3 Audit Log
- Todas as ações sensíveis devem ser logadas
- Logs imutáveis (append-only)
- Retenção: 7 anos para dados financeiros

---

## 6. Monitoramento

### 6.1 Métricas a Monitorar
- Taxa de erro por endpoint
- Latência p95 e p99
- Uso de memória
- Tamanho de bundle
- Taxa de conversion (importação, finalização)

### 6.2 Alertas
- Erro 5xx > 1%
- Latência > 3s
- Falha em integração Asaas
- Estoque abaixo do mínimo

---

## 7. Contingência

### 7.1 Estratégia de Rollback
- Mantener últimas 5 versões em produção
- Feature flags para desabilitar funcionalidades
- Database migrations reversíveis

### 7.2 Disaster Recovery
- RTO (Recovery Time Objective): 4 horas
- RPO (Recovery Point Objective): 1 hora
- Backup automático a cada 6 horas
- Teste de recuperação mensal

---

## 8. Checklist de Deploy

- [ ] Build passando sem erros
- [ ] Todos os testes unitários passando
- [ ] Testes de integração passando
- [ ] Análise estática de código aprovada
- [ ] Revisão de segurança concluída
- [ ] Documentação atualizada
- [ ] Monitoramento configurado
- [ ] Alertas testados
- [ ] Rollback procedure documentada
- [ ] Equipe treinada

---

## 9.-versionamento e Changelog

### Formato de Versão (SemVer)
- **MAJOR:** Mudanças incompatíveis na API
- **MINOR:** Novas funcionalidades compatíveis
- **PATCH:** Correções de bugs

### Changelog
- Usar Conventional Commits
- Categorizar: Features, Fixes, Breaking Changes, Performance, Security

---

*Documento atualizado em: 2026-03-08*
