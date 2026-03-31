import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  BufferJSON 
} from 'baileys';

const app = express();
const PORT = process.env.PORT || 8787;

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_URL_PROD || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY_PROD || '';

// Mercado Pago configuration (can be overridden per clinic via Supabase)
let mpAccessToken = process.env.MP_ACCESS_TOKEN || '';
let mpPublicKey = process.env.MP_PUBLIC_KEY || '';

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning', 'x-requested-with', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight explicitly
app.options('*', cors());

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    supabase: {
      url: SUPABASE_URL ? 'configured' : 'missing',
      key: SUPABASE_ANON_KEY ? 'configured' : 'missing'
    }
  });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Clinxia Backend Running' });
});

// Helper for logs
const addLog = (msg) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`);
};

// Brazilian phone number validation - robust normalization
function brazilianPhoneCandidates(rawPhone) {
  let digits = String(rawPhone).replace(/\D/g, '');
  
  // Remove leading zeros
  while (digits.startsWith('0')) digits = digits.slice(1);
  
  // Ensure country code
  if (!digits.startsWith('55')) digits = '55' + digits;
  
  // Fix double country code (e.g. 5555...)
  if (digits.startsWith('5555')) digits = digits.slice(2);
  
  // Validate minimum length (55 + DDD(2) + number(8-9) = 12-13)
  if (digits.length < 12) {
    return [digits];
  }
  
  const country = '55';
  const ddd = digits.slice(2, 4);
  let local = digits.slice(4);
  
  // Ensure local number is 8-9 digits
  if (local.length > 9) local = local.slice(-9);
  if (local.length < 8) return [digits];
  
  // Ensure 9th digit for mobile
  if (local.length === 8 && ['6', '7', '8', '9'].includes(local[0])) {
    local = '9' + local;
  }
  
  return [`${country}${ddd}${local}`];
}

// Resolve WhatsApp JID by checking which candidate actually exists
async function resolveWhatsAppJID(sock, rawPhone) {
  const candidates = brazilianPhoneCandidates(rawPhone);
  addLog(`[Phone] Resolving JID for "${rawPhone}" → candidates: ${candidates.join(', ')}`);
  
  for (const candidate of candidates) {
    try {
      const [result] = await sock.onWhatsApp(candidate);
      if (result?.exists) {
        addLog(`[Phone] JID confirmed: ${result.jid}`);
        return result.jid;
      }
    } catch (e) {
      addLog(`[Phone] onWhatsApp failed for ${candidate}: ${e.message}`);
    }
  }
  
  const fallback = `${candidates[0]}@s.whatsapp.net`;
  addLog(`[Phone] No JID confirmed for "${rawPhone}". Using fallback: ${fallback}`);
  return fallback;
}

// Ensure auth directories exist (fallback for local dev)
const ensureClinicStatus = (clinicId) => {
  const authDir = path.join(process.cwd(), 'server', 'auth', clinicId);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  return authDir;
};

// Supabase helpers for WhatsApp credentials
const saveCredentialsToSupabase = async (clinicId, credentials) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('[Supabase] Credenciais não configuradas, usando arquivo local');
    return false;
  }
  
  try {
    const credsString = JSON.stringify(credentials, BufferJSON.replacer);
    
    // Try insert first (will fail if exists)
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'resolution=ignore-duplicates'
      },
      body: JSON.stringify({
        clinic_id: clinicId,
        credentials: credsString,
        connected_at: new Date().toISOString()
      })
    });
    
    if (insertRes.ok) {
      console.log('[Supabase] Credenciais salvas para', clinicId);
      return true;
    }
    
    // If insert failed (duplicate), try update
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_credentials?clinic_id=eq.${clinicId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        credentials: credsString,
        updated_at: new Date().toISOString()
      })
    });
    
    console.log('[Supabase] Credenciais atualizadas para', clinicId);
    return updateRes.ok;
  } catch (error) {
    console.error('[Supabase] Erro ao salvar credenciais:', error.message);
    return false;
  }
};

const loadCredentialsFromSupabase = async (clinicId) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('[Supabase] Credenciais não configuradas');
    return null;
  }
  
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_credentials?clinic_id=eq.${clinicId}&select=credentials`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    if (data && data.length > 0 && data[0].credentials) {
      console.log('[Supabase] Credenciais carregadas para', clinicId);
      return JSON.parse(data[0].credentials, BufferJSON.reviver);
    }
    return null;
  } catch (error) {
    console.error('[Supabase] Erro ao carregar credenciais:', error.message);
    return null;
  }
};

// Custom auth state that uses Supabase
const useSupabaseAuthState = (clinicId, initialCredentials = null) => {
  let credentials = initialCredentials?.creds || null;
  let keys = initialCredentials?.keys || {};
  let saveCount = 0;
  
  return {
    state: {
      creds: credentials,
      keys: {
        get: async (type, ids) => {
          if (keys && keys[type]) {
            return keys[type];
          }
          const data = await loadCredentialsFromSupabase(clinicId);
          if (data && data.keys) {
            keys = data.keys;
            return data.keys[type] || {};
          }
          return {};
        },
        set: async (type, data) => {
          keys = { ...keys, [type]: data };
          const current = await loadCredentialsFromSupabase(clinicId) || {};
          await saveCredentialsToSupabase(clinicId, { ...current, keys });
        }
      }
    },
    saveCreds: async () => {
      saveCount++;
      // Save every time for now to ensure persistence
      const credsToSave = credentials || whatsappConnections[clinicId]?.creds;
      if (credsToSave) {
        const current = await loadCredentialsFromSupabase(clinicId) || {};
        await saveCredentialsToSupabase(clinicId, { ...current, creds: credsToSave, keys });
      }
    }
  };
};

// Status cache for quick retrieval
const whatsappConnections = {};
const whatsappSockets = {};

// Singleton socket manager
const ensureSocketConnected = async (clinicId) => {
  if (whatsappSockets[clinicId]) return whatsappSockets[clinicId];
  return await createWhatsAppSocket(clinicId);
};

// Updated QR generation to support Base64
const createWhatsAppSocket = async (clinicId) => {
  let retryCount = 0;
  let hasFailed401 = false;

  const connect = async () => {
    try {
      const { version, isLatest } = await fetchLatestBaileysVersion();
      addLog(`[Baileys] Usando versão WA v${version.join('.')}, isLatest: ${isLatest}`);

      // Try to load credentials from Supabase first (only if not previously failed with 401)
      let state, saveCreds;
      const supabaseCreds = hasFailed401 ? null : await loadCredentialsFromSupabase(clinicId);
      
      if (supabaseCreds && supabaseCreds.creds) {
        addLog(`[Baileys] Carregando credenciais do Supabase para ${clinicId}`);
        const supabaseAuth = useSupabaseAuthState(clinicId, supabaseCreds);
        state = supabaseAuth.state;
        saveCreds = supabaseAuth.saveCreds;
      } else {
        // Fallback to local file system or fresh auth
        addLog(`[Baileys] Usando auth limpo para ${clinicId}`);
        const authDir = ensureClinicStatus(clinicId);
        const fileAuth = await useMultiFileAuthState(authDir);
        state = fileAuth.state;
        saveCreds = fileAuth.saveCreds;
      }
      
      const logger = pino({ level: 'silent' }); // Completely silent to avoid session errors
      addLog(`[Baileys] Iniciando conexão para ${clinicId}...`);
      
      const sock = makeWASocket({
        auth: state,
        version: version,
        printQRInTerminal: false,
        browser: ['LuminaFlow', 'Chrome', '122.0.0.0'],
        connectTimeoutMs: 120000,
        keepAliveIntervalMs: 60000,
        logger: logger,
        options: { family: 4 },
        getMessage: async (key) => ({ conversation: 'placeholder' })
      });

      whatsappSockets[clinicId] = sock;

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          // GENERATE BASE64 QR CODE FOR FRONTEND
          const qrBase64 = await QRCode.toDataURL(qr);
          whatsappConnections[clinicId] = { status: 'qr', qr: qr, qrBase64 };
          addLog(`[Baileys] QR Code pronto para ${clinicId}`);
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error instanceof Boom) 
            ? lastDisconnect.error.output.statusCode 
            : lastDisconnect?.error?.code || 0;
          
          const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
          const shouldReconnect = !isLoggedOut;
          addLog(`[Baileys] Conexão FECHADA: ${statusCode}`);
          
          if (shouldReconnect) {
            retryCount++;
            const delay = Math.min(5000 * Math.pow(2, retryCount - 1), 60000);
            setTimeout(connect, delay);
          } else {
            addLog(`[Baileys] Sessão expirada/inválida para ${clinicId}. Limpando...`);
            hasFailed401 = true;
            delete whatsappSockets[clinicId];
            whatsappConnections[clinicId] = { status: 'disconnected', qr: null, qrBase64: null };
            // Limpar credenciais do Supabase
            try {
              await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_credentials?clinic_id=eq.${clinicId}`, {
                method: 'DELETE',
                headers: {
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                }
              });
              addLog(`[Baileys] Credenciais removidas do Supabase para ${clinicId}`);
            } catch (e) {
              addLog(`[Baileys] Erro ao limpar Supabase: ${e.message}`);
            }
          }
        } else if (connection === 'open') {
          retryCount = 0;
          const existingMessages = whatsappConnections[clinicId]?.messages || [];
          whatsappConnections[clinicId] = { 
            status: 'connected', 
            connected: true,
            phoneNumber: sock.user.id.split(':')[0],
            messages: existingMessages
          };
          addLog(`[Baileys] Conexão ABERTA para ${clinicId} (${sock.user.id})`);
          
          // Save credentials to Supabase when connected
          const creds = sock.authState?.creds;
          console.log('[Baileys] Credenciais para salvar:', creds ? 'sim' : 'não');
          if (creds) {
            const saved = await saveCredentialsToSupabase(clinicId, { creds, keys: {} });
            console.log('[Baileys] Resultado do save:', saved);
            addLog(`[Baileys] Credenciais salvas no Supabase: ${saved}`);
          }
        }
      });

      // Listen for incoming messages
      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        
        for (const msg of messages) {
          const from = msg.key.remoteJid;
          
          // Skip group messages, broadcasts, and status updates
          if (
            from?.endsWith('@g.us') || 
            from?.endsWith('@broadcast') || 
            from?.includes('@status') ||
            from?.includes('@lid')
          ) {
            continue;
          }
          
          if (!msg.key.fromMe && msg.message?.conversation) {
            const text = msg.message.conversation;
            const cleanPhone = from.replace('@s.whatsapp.net', '').replace('@c.us', '');
            
            addLog(`[Baileys] Mensagem recebida de ${from}: ${text.substring(0, 30)}...`);
            
            const msgData = {
              id: msg.key.id,
              key: from,
              phone: cleanPhone,
              text: text,
              fromMe: false,
              timestamp: msg.messageTimestamp * 1000
            };
            
            // Store in memory
            if (!whatsappConnections[clinicId].messages) {
              whatsappConnections[clinicId].messages = [];
            }
            whatsappConnections[clinicId].messages.push(msgData);
            
            // Persist to Supabase
            try {
              await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_messages`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                  'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                  clinic_id: clinicId,
                  phone: cleanPhone,
                  message_id: msg.key.id,
                  text: text,
                  from_me: false,
                  timestamp: new Date(msg.messageTimestamp * 1000).toISOString()
                })
              });
            } catch (e) {
              addLog(`[Baileys] Erro ao salvar mensagem no Supabase: ${e.message}`);
            }
          }
        }
      });

      return sock;
    } catch (err) {
      addLog(`[Baileys] Erro: ${err.message}`);
      setTimeout(connect, 10000);
    }
  };

  return await connect();
};

// Connect endpoint - generates QR code or pairing code
app.post('/api/whatsapp/connect', async (req, res) => {
  const { clinicId, phoneNumber } = req.body;
  
  try {
    // Limpar qualquer sessão existente antes de conectar
    if (whatsappSockets[clinicId]) {
      try { whatsappSockets[clinicId].end(undefined); } catch (e) {}
      delete whatsappSockets[clinicId];
    }
    
    // Limpar credenciais do Supabase para forçar QR limpo
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_credentials?clinic_id=eq.${clinicId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      });
    } catch (e) {}
    
    // Limpar auth local
    try {
      const authDir = ensureClinicStatus(clinicId);
      if (fs.existsSync(authDir)) {
        fs.rmSync(authDir, { recursive: true, force: true });
        fs.mkdirSync(authDir, { recursive: true });
      }
    } catch (e) {}
    
    whatsappConnections[clinicId] = { status: 'connecting' };
    
    const sock = await ensureSocketConnected(clinicId);
    
    // Generate pairing code if phone provided
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      try {
        const pairingCode = await sock.requestPairingCode(cleanPhone);
        whatsappConnections[clinicId] = {
          status: 'pairing',
          pairingCode: pairingCode,
          connected: false,
          qr: null
        };
        return res.json({ 
          success: true, 
          status: 'pairing', 
          pairingCode: pairingCode,
          message: 'Código de pareamento gerado!' 
        });
      } catch (pairError) {
        console.error('Pairing code error:', pairError);
      }
    }
    
    // If already has session, try to reconnect
    if (sock.authState?.creds?.registered) {
      whatsappConnections[clinicId] = {
        status: 'connected',
        connected: true,
        phoneNumber: sock.user?.id?.replace(':@s.whatsapp.net', '')
      };
      return res.json({ success: true, status: 'connected' });
    }
    
    // Return connecting status - QR will be generated by polling status
    whatsappConnections[clinicId] = { status: 'connecting' };
    res.json({ success: true, status: 'connecting', message: 'Aguardando QR Code...' });
    
  } catch (error) {
    console.error('Connect error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/whatsapp/status/:clinicId', async (req, res) => {
  const { clinicId } = req.params;
  
  if (whatsappConnections[clinicId]) {
    const conn = whatsappConnections[clinicId];
    
    // Force generation of Base64 if missing but raw QR exists
    if (conn.qr && !conn.qrBase64) {
      try {
        conn.qrBase64 = await QRCode.toDataURL(conn.qr);
      } catch (e) {
        console.error('QR Generate Error:', e);
      }
    }

    return res.json({ 
      ok: true, 
      ...conn,
      qrCode: conn.qrBase64
    });
  }
  
  // Não auto-conectar - apenas retornar estado atual
  res.json({ ok: true, status: 'disconnected' });
});

// Disconnect endpoint
app.post('/api/whatsapp/disconnect/:clinicId', async (req, res) => {
  const { clinicId } = req.params;
  
  // Close socket if exists
  if (whatsappSockets[clinicId]) {
    try {
      whatsappSockets[clinicId].end(undefined);
    } catch (e) {}
    delete whatsappSockets[clinicId];
  }
  
  // Clear connection state
  delete whatsappConnections[clinicId];
  
  // Delete credentials from Supabase
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_credentials?clinic_id=eq.${clinicId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
  } catch (e) {}
  
  res.json({ ok: true, status: 'disconnected' });
});

// Rate limiting for WhatsApp
const whatsappRateLimit = new Map();
const RATE_LIMIT_WINDOW = 10000; // 10 seconds
const RATE_LIMIT_MAX = 5; // 5 messages per window

app.post('/api/whatsapp/send', async (req, res) => {
  const { clinicId, to, message } = req.body;
  
  // Rate limiting
  const rateKey = `${clinicId}-${to}`;
  const now = Date.now();
  const timestamps = whatsappRateLimit.get(rateKey) || [];
  const windowTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (windowTimestamps.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({ ok: false, error: 'Muitas mensagens. Aguarde alguns segundos.' });
  }
  
  windowTimestamps.push(now);
  whatsappRateLimit.set(rateKey, windowTimestamps);
  
  try {
    const sock = await ensureSocketConnected(clinicId);
    
    if (whatsappConnections[clinicId]?.status !== 'connected') {
      return res.status(400).json({ ok: false, error: 'Dispositivo não conectado' });
    }

    const jid = await resolveWhatsAppJID(sock, to);
    addLog(`[API] Enviando para ${jid}...`);
    const result = await sock.sendMessage(jid, { text: message });
    
    const cleanPhone = to.replace(/\D/g, '');
    const msgData = {
      id: result.key.id,
      key: jid,
      phone: cleanPhone,
      text: message,
      fromMe: true,
      timestamp: Date.now()
    };
    
    // Store in memory
    if (!whatsappConnections[clinicId].messages) {
      whatsappConnections[clinicId].messages = [];
    }
    whatsappConnections[clinicId].messages.push(msgData);
    
    // Persist to Supabase
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          clinic_id: clinicId,
          phone: cleanPhone,
          message_id: result.key.id,
          text: message,
          from_me: true,
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      addLog(`[API] Erro ao salvar mensagem no Supabase: ${e.message}`);
    }
    
    res.json({ ok: true, messageId: result.key.id });
  } catch (error) {
    addLog(`[API] Erro ao enviar: ${error.message}`);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get messages for a specific phone
app.get('/api/whatsapp/messages/:clinicId/:phone', async (req, res) => {
  const { clinicId, phone } = req.params;
  
  try {
    const cleanPhone = phone.replace(/\D/g, '');
    let messages = [];
    
    // Load from Supabase first
    try {
      const supaRes = await fetch(
        `${SUPABASE_URL}/rest/v1/whatsapp_messages?phone=eq.${cleanPhone}&order=timestamp.asc`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          }
        }
      );
      if (supaRes.ok) {
        const supaData = await supaRes.json();
        messages = supaData.map(m => ({
          id: m.message_id,
          key: `${cleanPhone}@s.whatsapp.net`,
          phone: m.phone,
          text: m.text,
          fromMe: m.from_me,
          timestamp: new Date(m.timestamp).getTime()
        }));
      }
    } catch (e) {
      addLog(`[API] Erro ao carregar mensagens do Supabase: ${e.message}`);
    }
    
    // Merge with in-memory messages (avoid duplicates)
    const conn = whatsappConnections[clinicId];
    if (conn && conn.messages) {
      const existingIds = new Set(messages.map(m => m.id));
      const memMessages = conn.messages.filter(m => {
        const msgKey = m.key || '';
        const normalizedKey = msgKey.replace('@s.whatsapp.net', '').replace('@c.us', '');
        return (normalizedKey === cleanPhone || normalizedKey.includes(cleanPhone) || cleanPhone.includes(normalizedKey))
          && !existingIds.has(m.id);
      });
      messages = [...messages, ...memMessages];
    }
    
    // Sort by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);
    
    res.json({ ok: true, messages });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Notifications endpoint (placeholder for future implementation)
app.post('/api/notifications/send', async (req, res) => {
  res.json({ ok: true, message: 'Notification sent (placeholder)' });
});

// ============================================
// Mercado Pago Integration
// ============================================

// Create payment preference
app.post('/api/mercadopago/create-preference', async (req, res) => {
  const { clinicName, email, name, phone, plan, amount, clinicId } = req.body;
  
  try {
    // Get MP credentials from Supabase or env
    let token = mpAccessToken;
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        const { data: configData } = await fetch(`${SUPABASE_URL}/rest/v1/integration_config?clinic_id=eq.00000000-0000-0000-0000-000000000001&select=mp_access_token,mp_public_key`, {
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        }).then(r => r.json());
        if (configData && configData[0]?.mp_access_token) {
          token = configData[0].mp_access_token;
        }
      } catch (e) { /* use env token */ }
    }
    
    if (!token) {
      return res.status(500).json({ ok: false, error: 'Mercado Pago não configurado' });
    }
    
    const preference = {
      items: [{
        id: plan || 'plano-clinica',
        title: `LuminaFlow - ${clinicName}`,
        quantity: 1,
        unit_price: parseFloat(amount) || 97,
        currency_id: 'BRL',
      }],
      payer: {
        name: name,
        email: email,
        phone: { number: phone?.replace(/\D/g, '') || '' },
      },
      metadata: {
        clinic_id: clinicId,
        clinic_name: clinicName,
        plan: plan || 'basico',
        user_email: email,
        user_name: name,
        user_phone: phone,
      },
      payment_methods: {
        excluded_payment_types: [{ id: 'ticket' }],
        installments: 1,
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL || 'https://clinxia.vercel.app'}/?payment=success`,
        failure: `${process.env.FRONTEND_URL || 'https://clinxia.vercel.app'}/?payment=failure`,
        pending: `${process.env.FRONTEND_URL || 'https://clinxia.vercel.app'}/?payment=pending`,
      },
      notification_url: `${process.env.SERVER_URL || 'https://clinxia-backend.onrender.com'}/api/webhooks/mercadopago`,
      auto_return: 'approved',
    };
    
    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(preference),
    });
    
    const mpData = await mpRes.json();
    
    if (!mpRes.ok) {
      console.error('[MP] Error creating preference:', mpData);
      return res.status(500).json({ ok: false, error: mpData.message || 'Erro ao criar preferência' });
    }
    
    res.json({
      ok: true,
      preference_id: mpData.id,
      init_point: mpData.init_point,
      qr_code: mpData.qr_code || '',
      qr_code_base64: mpData.qr_code_base64 || '',
    });
  } catch (error) {
    console.error('[MP] Error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Mercado Pago Webhook
app.post('/api/webhooks/mercadopago', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (type === 'payment') {
      const paymentId = data.id;
      
      // Get MP credentials
      let token = mpAccessToken;
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        try {
          const { data: configData } = await fetch(`${SUPABASE_URL}/rest/v1/integration_config?clinic_id=eq.00000000-0000-0000-0000-000000000001&select=mp_access_token`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
          }).then(r => r.json());
          if (configData && configData[0]?.mp_access_token) {
            token = configData[0].mp_access_token;
          }
        } catch (e) { /* use env token */ }
      }
      
      if (!token) {
        addLog('[MP Webhook] Token não configurado');
        return res.status(200).json({ ok: true });
      }
      
      // Fetch payment details
      const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const payment = await payRes.json();
      
      addLog(`[MP Webhook] Payment ${paymentId}: status=${payment.status}, metadata=${JSON.stringify(payment.metadata)}`);
      
      if (payment.status === 'approved') {
        const metadata = payment.metadata || {};
        const clinicId = metadata.clinic_id;
        
        if (clinicId && SUPABASE_URL && SUPABASE_ANON_KEY) {
          // Create clinic in Supabase
          const { error: clinicError } = await fetch(`${SUPABASE_URL}/rest/v1/clinics`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
              id: clinicId,
              name: metadata.clinic_name || 'Nova Clínica',
              document_type: metadata.doc_type || 'cpf',
              document_number: metadata.doc_number || '',
              modality: metadata.modality || 'odonto',
              plan: metadata.plan || 'basico',
              phone: metadata.user_phone || '',
              email: metadata.user_email || '',
              active: true,
              created_at: new Date().toISOString(),
            }),
          }).then(r => r.json());
          
          // Create admin user
          const userId = crypto.randomUUID();
          await fetch(`${SUPABASE_URL}/rest/v1/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              id: userId,
              clinic_id: clinicId,
              name: metadata.user_name || 'Admin',
              email: metadata.user_email || '',
              phone: metadata.user_phone || '',
              role: 'admin',
              active: true,
              created_at: new Date().toISOString(),
            }),
          });
          
          // Record payment
          await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              id: `mp-${paymentId}`,
              clinic_id: clinicId,
              mp_payment_id: paymentId,
              amount: payment.transaction_amount || 0,
              status: payment.status,
              plan: metadata.plan || 'basico',
              payer_email: metadata.user_email || '',
              payer_name: metadata.user_name || '',
              created_at: new Date().toISOString(),
            }),
          });
          
          addLog(`[MP Webhook] Clínica ativada: ${metadata.clinic_name} (${clinicId})`);
        }
      }
    }
    
    res.status(200).json({ ok: true });
  } catch (error) {
    addLog(`[MP Webhook] Error: ${error.message}`);
    res.status(200).json({ ok: true }); // Always return 200 to MP
  }
});

app.get('/api/clinic/anamnese-sync', (req, res) => {
  res.json({ ok: true, items: [] });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 WhatsApp API ready for connections`);
});

// Graceful shutdown for Cloud environments (Render/Docker)
const shutdown = () => {
  console.log('[Server] Shutting down...');
  Object.values(whatsappSockets).forEach(sock => {
    try { sock.end(undefined); } catch (e) {}
  });
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
