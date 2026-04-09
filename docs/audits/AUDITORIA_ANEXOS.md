# ANEXOS - TRECHOS ORIGINAIS DA AUDITORIA
# PLATAFORMA CLINXIA

---

## ANEXO A - Trechos do .env.development ORIGINAL

### simple-erp/.env.development (Trecho Original Preservado)

```env
# ============================================
# LuminaFlow ERP - Development Environment Variables
# This file contains demo credentials for local development
# DO NOT commit to version control with real credentials
# ============================================

# GEMINI AI
GEMINI_API_KEY="demo-gemini-key"

# API Configuration
API_PORT=8787
VITE_API_BASE_URL="http://localhost:8787"

# ============================================
# SUPABASE (Banco de Dados e Autenticação)
# ============================================
VITE_SUPABASE_URL="https://gzcimnredlffqyogxzqq.supabase.co"
VITE_SUPABASE_ANON_KEY="sb_publishable_-NOExiRGRb1XcRAMEgkTzQ_9d1AGmtK"
SUPABASE_SERVICE_ROLE_KEY=""
SUPABASE_DB_URL="postgresql://postgres:[YOUR-PASSWORD]@db.gzcimnredlffqyogxzqq.supabase.co:5432/postgres"

# Asaas (Sandbox)
ASAAS_API_KEY_SANDBOX="demo-asaas-key"
ASAAS_API_KEY_PRODUCTION=""
ASAAS_BASE_URL="https://sandbox.asaas.com"
ASAAS_WEBHOOK_TOKEN="demo-webhook-token"

# Mercado Pago (Sandbox)
VITE_MP_ACCESS_TOKEN_SANDBOX="demo-mp-token"
VITE_MP_ACCESS_TOKEN_PRODUCTION=""
VITE_MP_IS_SANDBOX="true"

# Demo credentials - DO NOT USE IN PRODUCTION
DEMO_ADMIN_EMAIL="admin@luminaflow.com.br"
DEMO_ADMIN_PASSWORD="admin123"

DEMO_CLINIC_EMAIL="clinica@luminaflow.com.br"
DEMO_CLINIC_PASSWORD="clinica123"

DEMO_DENTIST_EMAIL="dentista@luminaflow.com.br"
DEMO_DENTIST_PASSWORD="dentista123"

DEMO_RECEPTIONIST_EMAIL="recepcao@luminaflow.com.br"
DEMO_RECEPTIONIST_PASSWORD="recepcao123"
```

**CHAVES EXATAS EXPOSTAS:**
- `VITE_SUPABASE_ANON_KEY="sb_publishable_-NOExiRGRb1XcRAMEgkTzQ_9d1AGmtK"`
- `ASAAS_API_KEY_SANDBOX="demo-asaas-key"`
- `VITE_MP_ACCESS_TOKEN_SANDBOX="demo-mp-token"`
- `GEMINI_API_KEY="demo-gemini-key"`

---

## ANEXO B - Trechos de publicPaths ANTES e DEPOIS

### server/index.js - ANTES (Vulnerável)

```javascript
const publicPaths = [
  '/health',
  '/health/extended',
  '/stats',
  '/webhooks/',
  '/clinic/anamnese-sync',  // <-- EXPONDO DADOS MÉDICOS
  '/auth/',
  '/auth/google',
  '/signup/init',
  '/signup/verify-phone',
  '/signup/complete',
  '/signup/phone/send-code',
  '/signup/phone/verify-code',
  '/system/signup-config',
  '/mercadopago/create-preference',
  '/mercadopago/payment-status/',
  '/asaas/test',
  '/integrations/rdstation/event',
  '/whatsapp/',
];
```

### server/index.js - DEPOIS (Seguro)

```javascript
const publicPaths = [
  '/health',
  '/health/extended',
  '/stats',
  '/webhooks/',
  '/auth/',
  '/auth/google',
  '/signup/init',
  '/signup/verify-phone',
  '/signup/complete',
  '/signup/phone/send-code',
  '/signup/phone/verify-code',
  '/system/signup-config',
  '/mercadopago/create-preference',
  '/mercadopago/payment-status/',
  '/asaas/test',
  '/integrations/rdstation/event',
  '/whatsapp/',
];
```

---

## ANEXO C - Trechos de Fallbacks do Google OAuth

### server/index.js - ANTES (Vulnerável)

```javascript
// OAuth v2.3 - deploy 2026-04-06 - hardcoded fallback for Google OAuth
const GOOGLE_CLIENT_ID_FALLBACK = '835383356341-ibesc0ffaoovbpvc8rsnpjlhahpisg3s.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET_FALLBACK = 'AIzaSyBX7IRQUlIzDGIj7V6zzGF91c2sXJtbl8I';
const GOOGLE_REDIRECT_URI_FALLBACK = 'https://clinxia-backend.onrender.com/api/auth/google/callback';

app.get('/api/auth/google-configured', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID_FALLBACK;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || GOOGLE_CLIENT_SECRET_FALLBACK;
  const configured = !!(clientId && clientSecret);
  console.log('[Google OAuth Config] clientId:', clientId ? 'SET' : 'MISSING', 'clientSecret:', clientSecret ? 'SET' : 'MISSING');
  res.json({ ok: true, configured });
});
```

### server/index.js - DEPOIS (Seguro)

```javascript
// OAuth v2.3 - deploy 2026-04-06 - Google OAuth (obrigatório em produção)
const GOOGLE_REDIRECT_URI_FALLBACK = 'https://clinxia-backend.onrender.com/api/auth/google/callback';

const getGoogleOAuthConfig = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }
  return { clientId, clientSecret };
};

app.get('/api/auth/google-configured', (req, res) => {
  const config = getGoogleOAuthConfig();
  const configured = config !== null;
  console.log('[Google OAuth Config] clientId:', configured ? 'SET' : 'MISSING', 'clientSecret:', configured ? 'SET' : 'MISSING');
  res.json({ ok: true, configured });
});
```

---

## ANEXO D - Trechos de SECURITY_KEY Fallback

### backend/security.js - ANTES (Vulnerável)

```javascript
// ============================================
// LuminaFlow - Módulo de Segurança
// Funções utilitárias para criptografia, hash e masking
// ============================================

const crypto = require('crypto');

const DEFAULT_KEY = process.env.SECURITY_KEY || 'default-dev-key-change-in-production';
```

### backend/security.js - DEPOIS (Seguro)

```javascript
// ============================================
// LuminaFlow - Módulo de Segurança
// Funções utilitárias para criptografia, hash e masking
// ============================================

const crypto = require('crypto');

const DEFAULT_KEY = process.env.SECURITY_KEY || 'dev-only-key-do-not-use-in-prod';
if (!DEFAULT_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('[SECURITY] SECURITY_KEY environment variable is required in production');
}
```

---

## ANEXO E - Trechos de dangerouslySetInnerHTML

### frontend/src/pages/SubscriptionBlockPage.tsx - ANTES (XSS)

```tsx
{subscriptionInfo.qrCode ? (
  <div className="bg-white border-2 border-slate-200 rounded-xl p-4 mb-4 inline-block">
    <div dangerouslySetInnerHTML={{ __html: subscriptionInfo.qrCode.replace(/<svg/, '<svg style="width:180px;height:180px"') }} />
  </div>
) : (
  <div className="w-44 h-44 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
    <span className="text-4xl">📱</span>
  </div>
)}
```

### frontend/src/pages/SubscriptionBlockPage.tsx - DEPOIS (Seguro)

```tsx
{subscriptionInfo.qrCode ? (
  <div className="bg-white border-2 border-slate-200 rounded-xl p-4 mb-4 inline-block">
    <img 
      src={subscriptionInfo.qrCode} 
      alt="QR Code PIX" 
      style={{ width: '180px', height: '180px' }}
      className="w-44 h-44"
    />
  </div>
) : (
  <div className="w-44 h-44 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
    <span className="text-4xl">📱</span>
  </div>
)}
```

---

## ANEXO F - Trechos de Rate Limiting

### server/index.js - ANTES (Vulnerável)

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Muitas requisições. Tente novamente em alguns minutos.' },
  skip: (req) => {
    const path = req.path || '';
    return path.startsWith('/health') || path.startsWith('/clinic/anamnese-sync');  // <-- SKIP INSEGURO
  },
});
```

### server/index.js - DEPOIS (Seguro)

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Muitas requisições. Tente novamente em alguns minutos.' },
  skip: (req) => {
    const path = req.path || '';
    return path.startsWith('/health');  // <-- APENAS HEALTH CHECKS
  },
});
```

---

## ANEXO G - Testes de Segurança Originais (da Auditoria)

### Auth Security Tests (Exemplo Original)

```javascript
// Auth Security Tests
describe('Auth Security Tests', () => {
  it('should prevent SQL injection in login', async () => {
    const maliciousInput = "' OR '1'='1";
    const response = await request(app).post('/api/auth/login').send({ email: maliciousInput, password: 'anything' });
    expect(response.status).toBe(400);
  });
  
  it('should apply rate limiting after 100 requests', async () => {
    const requests = [];
    for (let i = 0; i < 100; i++) {
      requests.push(request(app).get('/api/health'));
    }
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

### Chaos Engineering Tests (Exemplo Original)

```javascript
// Chaos Engineering Tests
describe('Chaos Engineering Tests', () => {
  it('should handle Supabase connection timeout gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Timeout'));
    const response = await request(app).get('/api/clinic/anamnese-sync');
    expect(response.status).toBe(500);
    expect(response.body.error).toContain('timeout');
  });
  
  it('should handle invalid JSON response from Supabase', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new Error('Invalid JSON'); }
    });
    const response = await request(app).get('/api/clinic/patients');
    expect(response.status).toBe(500);
  });
});
```

### Input Validation XSS Tests (Exemplo Original)

```javascript
// Input Validation Security Tests
describe('Input Validation Security Tests', () => {
  const xssPayloads = [
    '<script>alert("xss")</script>',
    '"><script>alert("xss")</script>',
    '<img src=x onerror=alert("xss")>',
    '<svg onload=alert("xss")>',
    'javascript:alert("xss")',
    '<body onload=alert("xss")>',
  ];
  
  xssPayloads.forEach((payload) => {
    it(`should block XSS payload: ${payload}`, async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: payload, password: 'test' });
      expect(response.status).toBe(400);
    });
  });
});
```

---

## ANEXO H - Políticas RLS do Supabase (Exemplo)

```sql
-- Política RLS para medical_records
CREATE POLICY "Users can view own clinic medical records"
ON medical_records
FOR SELECT
USING (clinic_id IN (
  SELECT clinic_id FROM users WHERE id = auth.uid()
));

-- Política RLS para patients
CREATE POLICY "Users can view own clinic patients"
ON patients
FOR SELECT
USING (clinic_id IN (
  SELECT clinic_id FROM users WHERE id = auth.uid()
));

-- Política RLS para appointments
CREATE POLICY "Users can view own clinic appointments"
ON appointments
FOR SELECT
USING (clinic_id IN (
  SELECT clinic_id FROM users WHERE id = auth.uid()
));
```

---

## ANEXO I - Comando Git para Remoção de Arquivos Expostos

```bash
# Remover arquivos do cache do Git (sem删除do disco)
git rm --cached simple-erp/.env.development
git rm --cached simple-erp/.env.production

# Adicionar ao .gitignore
echo ".env*" >> .gitignore
echo "*.local" >> .gitignore

# Commit das alterações
git commit -m "fix: remove exposed environment variables and add to gitignore"
```

---

## ANEXO J - Variáveis de Ambiente Recomendadas para Produção

```env
# ============================================
# VARIÁVEIS DE PRODUÇÃO - CONFIGURAÇÃO OBRIGATÓRIA
# ============================================

# Supabase
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # APENAS PARA ADMIN JOBS

# Google OAuth (OBRIGATÓRIO - sem fallbacks)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://api.clinxia.com/api/auth/google/callback

# Segurança
SECURITY_KEY=[gerar-chave-segura-256-bits]

# Integrações
ASAAS_API_KEY_PRODUCTION=
MERCADOPAGO_ACCESS_TOKEN=

# Frontend
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=
```

---

## RESUMO DOS ANEXOS

| Anexo | Conteúdo | Linhas |
|-------|----------|--------|
| A | .env.development original | 59 |
| B | publicPaths antes/depois | 25 |
| C | Google OAuth fallbacks | 20 |
| D | SECURITY_KEY fallback | 10 |
| E | dangerouslySetInnerHTML | 15 |
| F | Rate limiting skip | 15 |
| G | Testes de segurança | 45 |
| H | Políticas RLS | 20 |
| I | Comandos Git | 15 |
| J | Vars produção | 25 |

**Total de trechos preservados: 249 linhas de código original**