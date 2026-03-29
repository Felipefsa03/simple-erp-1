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
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Clinxia Backend Running' });
});

// Helper for logs
const addLog = (msg) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`);
};

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
    // First try to update, if not exists then insert
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_credentials?clinic_id=eq.${clinicId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        credentials: JSON.stringify(credentials, BufferJSON.replacer),
        updated_at: new Date().toISOString()
      })
    });
    
    if (updateRes.ok && updateRes.status !== 404) {
      console.log('[Supabase] Credenciais atualizadas para', clinicId);
      return true;
    }
    
    // If no update happened, insert new
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        clinic_id: clinicId,
        credentials: JSON.stringify(credentials, BufferJSON.replacer),
        connected_at: new Date().toISOString()
      })
    });
    
    console.log('[Supabase] Credenciais salvas para', clinicId);
    return insertRes.ok;
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
const useSupabaseAuthState = (clinicId) => {
  let credentials = null;
  let saveCount = 0;
  
  return {
    state: {
      creds: credentials,
      keys: {
        get: async (type, ids) => {
          const data = await loadCredentialsFromSupabase(clinicId);
          if (data && data.keys) {
            return data.keys[type] || {};
          }
          return {};
        },
        set: async (type, data) => {
          const current = await loadCredentialsFromSupabase(clinicId) || {};
          const updated = { ...current, keys: { ...(current.keys || {}), [type]: data } };
          await saveCredentialsToSupabase(clinicId, updated);
        }
      }
    },
    saveCreds: async () => {
      saveCount++;
      // Save periodically (every 5 saves) to avoid too many DB calls
      if (saveCount % 5 === 0) {
        const credsToSave = { ...whatsappConnections[clinicId]?.creds };
        const current = await loadCredentialsFromSupabase(clinicId) || {};
        await saveCredentialsToSupabase(clinicId, { ...current, creds: credsToSave });
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

  const connect = async () => {
    try {
      const { version, isLatest } = await fetchLatestBaileysVersion();
      addLog(`[Baileys] Usando versão WA v${version.join('.')}, isLatest: ${isLatest}`);

      // Try to load credentials from Supabase first
      let state, saveCreds;
      const supabaseCreds = await loadCredentialsFromSupabase(clinicId);
      
      if (supabaseCreds) {
        addLog(`[Baileys] Carregando credenciais do Supabase para ${clinicId}`);
        const supabaseAuth = useSupabaseAuthState(clinicId);
        state = supabaseAuth.state;
        saveCreds = supabaseAuth.saveCreds;
      } else {
        // Fallback to local file system
        addLog(`[Baileys] Usando arquivo local para ${clinicId}`);
        const authDir = ensureClinicStatus(clinicId);
        const fileAuth = await useMultiFileAuthState(authDir);
        state = fileAuth.state;
        saveCreds = fileAuth.saveCreds;
      }
      
      const logger = pino({ level: 'error' }); // Less noisy for prod
      addLog(`[Baileys] Iniciando conexão para ${clinicId}...`);
      
      const sock = makeWASocket({
        auth: state,
        version: version,
        printQRInTerminal: false,
        browser: ['LuminaFlow', 'Chrome', '122.0.0.0'], // "Evolution API" style branding
        connectTimeoutMs: 120000,
        keepAliveIntervalMs: 60000,
        logger: logger,
        options: { family: 4 }
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
          
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          addLog(`[Baileys] Conexão FECHADA: ${statusCode}`);
          
          if (shouldReconnect) {
            retryCount++;
            const delay = Math.min(5000 * Math.pow(2, retryCount - 1), 60000);
            setTimeout(connect, delay);
          } else {
            addLog(`[Baileys] Sessão limpa para ${clinicId}`);
            delete whatsappSockets[clinicId];
            delete whatsappConnections[clinicId];
          }
        } else if (connection === 'open') {
          retryCount = 0;
          whatsappConnections[clinicId] = { 
            status: 'connected', 
            connected: true,
            phoneNumber: sock.user.id.split(':')[0],
            messages: []
          };
          addLog(`[Baileys] Conexão ABERTA para ${clinicId} (${sock.user.id})`);
          
          // Save credentials to Supabase when connected
          const creds = sock.authState?.creds;
          if (creds) {
            await saveCredentialsToSupabase(clinicId, { creds, keys: {} });
            addLog(`[Baileys] Credenciais salvas no Supabase para ${clinicId}`);
          }
        }
      });

      // Listen for incoming messages
      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        
        for (const msg of messages) {
          if (!msg.key.fromMe && msg.message?.conversation) {
            const from = msg.key.remoteJid;
            const text = msg.message.conversation;
            
            addLog(`[Baileys] Mensagem recebida de ${from}: ${text.substring(0, 30)}...`);
            
            // Store received message
            if (!whatsappConnections[clinicId].messages) {
              whatsappConnections[clinicId].messages = [];
            }
            whatsappConnections[clinicId].messages.push({
              id: msg.key.id,
              key: from,
              text: text,
              fromMe: false,
              timestamp: msg.messageTimestamp * 1000
            });
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
      qrCode: conn.qrBase64 // Retrocompatibilidade
    });
  }
  
  // Try to auto-connect if it exists in auth but no socket
  const authDir = path.join(process.cwd(), 'server', 'auth', clinicId);
  if (fs.existsSync(path.join(authDir, 'creds.json'))) {
     ensureSocketConnected(clinicId);
     return res.json({ ok: true, status: 'connecting' });
  }

  res.json({ ok: true, status: 'disconnected' });
});

app.post('/api/whatsapp/send', async (req, res) => {
  const { clinicId, to, message } = req.body;
  
  try {
    const sock = await ensureSocketConnected(clinicId);
    
    if (whatsappConnections[clinicId]?.status !== 'connected') {
      return res.status(400).json({ ok: false, error: 'Dispositivo não conectado' });
    }

    const cleanTo = to.replace(/\D/g, '');
    const jid = `${cleanTo}@s.whatsapp.net`;
    
    addLog(`[API] Enviando para ${jid}...`);
    const result = await sock.sendMessage(jid, { text: message });
    
    // Store sent message
    if (!whatsappConnections[clinicId].messages) {
      whatsappConnections[clinicId].messages = [];
    }
    whatsappConnections[clinicId].messages.push({
      id: result.key.id,
      key: jid,
      text: message,
      fromMe: true,
      timestamp: Date.now()
    });
    
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
    const conn = whatsappConnections[clinicId];
    if (!conn || !conn.messages) {
      return res.json({ ok: true, messages: [] });
    }
    
    // Filter messages for this phone
    const cleanPhone = phone.replace(/\D/g, '');
    const messages = conn.messages.filter(m => 
      m.key.includes(cleanPhone) || m.key.includes(`${cleanPhone}@s.whatsapp.net`)
    );
    
    res.json({ ok: true, messages });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
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
