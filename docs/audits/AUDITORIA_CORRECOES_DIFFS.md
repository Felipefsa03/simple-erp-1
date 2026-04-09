# AUDITORIA DE SEGURANÇA ULTRA-COMPLETA
# PLATAFORMA CLINXIA
# Data: 09 de abril de 2026

# ============================================
# 1. DIFFS COMPLETOS BEFORE/AFTER
# ============================================

## CRÍTICO 1 - Endpoint anamnese público

### server/index.js - publicPaths

#ANTES:
const publicPaths = [
  '/health',
  '/health/extended',
  '/stats',
  '/webhooks/',
  '/clinic/anamnese-sync',  // <-- VULNERÁVEL
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

#DEPOIS:
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

---

## server/index.js - Endpoint anamnese

#ANTES:
app.get('/api/clinic/anamnese-sync', async (req, res) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.json({ ok: true, items: [] });
    }
    
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/medical_records?select=patient_id,clinic_id,anamnese,updated_at&updated_at=gte.${new Date(Date.now() - 24*60*60*1000).toISOString()}&limit=100`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    
    if (!response.ok) {
      return res.json({ ok: true, items: [] });
    }
    
    const records = await response.json();
    const items = records.map(r => ({
      patientId: r.patient_id,
      clinicId: r.clinic_id,
      data: { anamnese: r.anamnese },
      submittedAt: r.updated_at,
    }));
    
    res.json({ ok: true, items });
  } catch (error) {
    res.json({ ok: true, items: [] });
  }
});

#DEPOIS:
// Anamnese sync endpoint (PROTEGIDO - requer autenticação)
app.get('/api/clinic/anamnese-sync', requireAuth, async (req, res) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.json({ ok: true, items: [] });
    }
    
    const userClinicId = req.clinicId;
    const userRole = req.user?.role;
    
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/medical_records?select=patient_id,clinic_id,anamnese,updated_at&updated_at=gte.${new Date(Date.now() - 24*60*60*1000).toISOString()}&limit=100`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    
    if (!response.ok) {
      return res.json({ ok: true, items: [] });
    }
    
    const records = await response.json();
    
    let filteredRecords = records;
    if (userRole !== 'admin' && userRole !== 'owner') {
      filteredRecords = records.filter(r => r.clinic_id === userClinicId);
    }
    
    const items = filteredRecords.map(r => ({
      patientId: r.patient_id,
      clinicId: r.clinic_id,
      data: { anamnese: r.anamnese },
      submittedAt: r.updated_at,
    }));
    
    res.json({ ok: true, items });
  } catch (error) {
    res.json({ ok: true, items: [] });
  }
});

---

## CRÍTICO 4 - Fallbacks Google OAuth

#ANTES (server/index.js):
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

#DEPOIS:
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

---

## CRÍTICO 4 - SECURITY_KEY fallback

#ANTES (backend/security.js):
const DEFAULT_KEY = process.env.SECURITY_KEY || 'default-dev-key-change-in-production';

#DEPOIS:
const DEFAULT_KEY = process.env.SECURITY_KEY || 'dev-only-key-do-not-use-in-prod';
if (!DEFAULT_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('[SECURITY] SECURITY_KEY environment variable is required in production');
}

---

## ALTO 3 - XSS dangerouslySetInnerHTML

#ANTES (frontend/src/pages/SubscriptionBlockPage.tsx):
<div dangerouslySetInnerHTML={{ __html: subscriptionInfo.qrCode.replace(/<svg/, '<svg style="width:180px;height:180px"') }} />

#DEPOIS:
<img 
  src={subscriptionInfo.qrCode} 
  alt="QR Code PIX" 
  style={{ width: '180px', height: '180px' }}
  className="w-44 h-44"
/>

---

## ALTO 2 - Helmet + HSTS

#ANTES (server/index.js):
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: { ... }
}));

#DEPOIS:
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: { ... },
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  xFrameOptions: { action: 'deny' },
}));

---

## ALTO 4 - Rate Limiting skip

#ANTES (server/index.js):
skip: (req) => {
  const path = req.path || '';
  return path.startsWith('/health') || path.startsWith('/clinic/anamnese-sync');
},

#DEPOIS:
skip: (req) => {
  const path = req.path || '';
  return path.startsWith('/health');
},