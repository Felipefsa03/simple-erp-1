# DOCUMENTAÇÃO DA API
## LuminaFlow ERP v1.2.0

---

## BASE URL
```
http://localhost:8787/api
```

---

## AUTENTICAÇÃO

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "clinica@luminaflow.com.br",
  "password": "123456"
}
```

**Resposta:**
```json
{
  "ok": true,
  "user": {
    "id": "user-1",
    "email": "clinica@luminaflow.com.br",
    "name": "Dr. Lucas Silva",
    "role": "admin",
    "clinic_id": "clinic-1"
  }
}
```

---

## HEALTH CHECKS

### Health Básico
```http
GET /health
```

**Resposta:**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-24T12:00:00.000Z",
  "uptime": "5h 30m",
  "version": "1.2.0"
}
```

### Health Estendido
```http
GET /health/extended
```

**Resposta:**
```json
{
  "status": "healthy",
  "components": {
    "database": { "status": "available", "poolsCount": 5 },
    "cache": { "status": "healthy", "keysCount": 150 },
    "queue": { "status": "healthy", "queues": [...] }
  },
  "metrics": {
    "totalRequests": 1500,
    "errors": 2,
    "avgResponseTime": "45ms"
  }
}
```

---

## WHATSAPP

### Conectar
```http
POST /whatsapp/connect
Content-Type: application/json

{ "clinicId": "clinic-1" }
```

### Enviar Mensagem
```http
POST /whatsapp/send
Content-Type: application/json

{
  "clinicId": "clinic-1",
  "to": "5511999999999",
  "message": "Olá {{nome}}, sua consulta é amanhã às 14h!"
}
```

### Verificar Número
```http
GET /whatsapp/check-number/clinic-1/5511999999999
```

### Status da Conexão
```http
GET /whatsapp/status/clinic-1
```

---

## CAMPANHAS

### Criar Campanha
```http
POST /campaigns/create
Content-Type: application/json

{
  "clinicId": "clinic-1",
  "name": "Campanha de Retorno",
  "channel": "whatsapp",
  "message": "Olá {{nome}}! Já faz um tempo que não atendemos você...",
  "contacts": [
    { "phone": "5511999999999", "name": "João Silva" }
  ],
  "settings": {
    "minDelay": 30000,
    "maxDelay": 120000,
    "dailyLimit": 100
  }
}
```

### Listar Campanhas
```http
GET /campaigns/clinic/clinic-1
```

### Iniciar Campanha
```http
POST /campaigns/{campaignId}/start
```

### Pausar Campanha
```http
POST /campaigns/{campaignId}/pause
```

### Parar Campanha
```http
POST /campaigns/{campaignId}/stop
```

---

## PAGAMENTOS (ASAAS)

### Testar Conexão
```http
POST /asaas/test
Content-Type: application/json

{
  "apiKey": "$$ sandbox_api_key",
  "environment": "sandbox"
}
```

### Criar Cobrança
```http
POST /asaas/charge
Content-Type: application/json

{
  "patient": {
    "name": "João Silva",
    "cpf": "12345678900",
    "email": "joao@email.com",
    "phone": "5511999999999"
  },
  "payment": {
    "billingType": "PIX",
    "value": 150.00,
    "dueDate": "2026-03-30",
    "description": "Consulta odontológica"
  }
}
```

### Webhook (Automático)
```http
POST /asaas/webhook
Asaas-Access-Token: {token}
Content-Type: application/json

{
  "event": "PAYMENT_RECEIVED",
  "payment": { "id": "pay_123", "value": 150.00 }
}
```

---

## INTEGRAÇÕES

### Facebook Ads - Credenciais
```http
POST /facebook/credentials
Content-Type: application/json

{
  "clinicId": "clinic-1",
  "app_id": "123456789",
  "app_secret": "secret_key"
}
```

### Google Calendar - Sincronizar
```http
POST /integrations/google/calendar/sync
Content-Type: application/json

{
  "clinicId": "clinic-1",
  "action": "create",
  "appointment": {
    "title": "Consulta",
    "patient_name": "João Silva",
    "scheduled_at": "2026-03-25T14:00:00",
    "duration_min": 60
  }
}
```

### Memed - Receituário
```http
POST /integrations/memed/prescription
Content-Type: application/json

{
  "patient": {
    "name": "João Silva",
    "cpf": "12345678900"
  },
  "prescription": {
    "physician_name": "Dr. Lucas Silva",
    "physician_crm": "CRO-SP 12345",
    "medications": [
      {
        "name": "Dipirona",
        "dosage": "500mg",
        "quantity": 30,
        "instructions": "1 comprimido a cada 6 horas"
      }
    ]
  }
}
```

### RD Station - Eventos
```http
POST /integrations/rdstation/event
Content-Type: application/json

{
  "event": "lead_created",
  "email": "lead@email.com",
  "name": "Novo Lead",
  "phone": "5511999999999"
}
```

---

## TISS (Exportação para Convênios)

### Gerar TISS
```http
POST /integrations/tiss/export
Content-Type: application/json

{
  "clinicId": "clinic-1",
  "prestador": {
    "cnpj": "12345678000100",
    "nome": "Clínica Oral",
    "codigo": "123456"
  },
  "beneficiario": {
    "nome": "Paciente Convênio",
    "carteira": "123456789"
  },
  "procedimento": {
    "codigo": "10101012",
    "descricao": "Consulta"
  },
  "valor": 150.00,
  "dataExecucao": "2026-03-24"
}
```

---

## ERROS

### Formato de Erro
```json
{
  "ok": false,
  "message": "Descrição do erro",
  "error": "detalhes técnicos",
  "code": "ERROR_CODE"
}
```

### Códigos de Erro
| Código | Descrição |
|--------|------------|
| AUTH_INVALID | Credenciais inválidas |
| NOT_FOUND | Recurso não encontrado |
| VALIDATION_ERROR | Dados inválidos |
| RATE_LIMIT | Limite de requisições excedido |
| PAYMENT_FAILED | Falha no pagamento |
| WHATSAPP_ERROR | Erro no WhatsApp |

---

## RATE LIMIT

- **Padrão**: 100 requisições/minuto
- **Autenticação**: 10/minuto
- **WhatsApp**: 60/minuto
- **Campanhas**: 30/minuto

---

## VERSIONAMENTO

Versão atual: **1.2.0**

Para especificar versão:
```http
Accept: application/vnd.luminaflow.v1+json
```

---

*LuminaFlow ERP - Documentação API v1.2.0*
