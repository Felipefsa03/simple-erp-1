import express from 'express';
import cors from 'cors';
import { useMultiFileAuthState, makeWASocket, DisconnectReason, fetchLatestBaileysVersion } from 'baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import * as fs from 'fs';
import pino from 'pino';

const app = express();
const PORT = process.env.PORT || 8787;

// For debugging in Cloud environments
const serverLogs = [];
const addLog = (msg) => {
  const log = `[${new Date().toISOString()}] ${msg}`;
  console.log(log);
  serverLogs.push(log);
  if (serverLogs.length > 100) serverLogs.shift();
};

app.use(cors({
  origin: '*',
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning']
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, ngrok-skip-browser-warning');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

const whatsappSockets = {};
const whatsappConnections = {};

// Debug endpoint to see server logs
app.get('/api/whatsapp/debug', (req, res) => {
  res.json({ logs: serverLogs });
});

// Proxy to bypass X-Frame-Options for WhatsApp (Use with caution)
app.get('/api/whatsapp/proxy', async (req, res) => {
  try {
    // Forward the user agent from the client or use a standard modern one
    const userAgent = req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

    const response = await fetch('https://web.whatsapp.com', {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (!response.ok) throw new Error(`Status: ${response.status}`);

    const body = await response.text();
    
    // Remove security headers that prevent framing
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    
    // Inject a <base> tag to help internal links work via absolute paths
    const modifiedBody = body.replace('<head>', '<head><base href="https://web.whatsapp.com/">');
    
    res.send(modifiedBody);
  } catch (error) {
    addLog(`[Proxy] Erro ao buscar WhatsApp: ${error.message}`);
    res.status(500).send(`Proxy error: ${error.message}`);
  }
});

// Clinic status initialization helper
const ensureClinicStatus = (clinicId) => {
  const authDir = path.join(process.cwd(), 'server', 'auth', clinicId);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  return authDir;
};

const getAuthFolder = (clinicId) => {
  const authDir = path.join(process.cwd(), 'server', 'auth', clinicId);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  return authDir;
};

const createWhatsAppSocket = async (clinicId) => {
  let retryCount = 0;

  const connect = async () => {
    try {
      const authDir = ensureClinicStatus(clinicId);
      const { version, isLatest } = await fetchLatestBaileysVersion();
      addLog(`[Baileys] Usando versão WA v${version.join('.')}, isLatest: ${isLatest}`);

      const { state, saveCreds } = await useMultiFileAuthState(authDir);
      
      const logger = pino({ level: 'debug' });
      addLog(`[Baileys] Iniciando conexão para ${clinicId} (Tentativa ${retryCount + 1})...`);
      
      const sock = makeWASocket({
        auth: state,
        version: version,
        printQRInTerminal: false,
        browser: ['Mac OS', 'Chrome', '121.0.0.0'],
        connectTimeoutMs: 120000,
        keepAliveIntervalMs: 60000,
        logger: logger,
        options: { family: 4 }
      });

      whatsappSockets[clinicId] = sock;

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          whatsappConnections[clinicId] = { status: 'qr', qr };
          addLog(`[Baileys] QR Code gerado para ${clinicId}`);
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error instanceof Boom) 
            ? lastDisconnect.error.output.statusCode 
            : lastDisconnect?.error?.code || 0;
          
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          addLog(`[Baileys] Conexão FECHADA para ${clinicId}. Código: ${statusCode}`);
          
          if (shouldReconnect) {
            retryCount++;
            const delay = Math.min(5000 * Math.pow(2, retryCount - 1), 60000);
            addLog(`[Baileys] Reconectando ${clinicId} em ${delay/1000}s...`);
            setTimeout(connect, delay);
          } else {
            addLog(`[Baileys] Sessão encerrada para ${clinicId}`);
            delete whatsappSockets[clinicId];
            delete whatsappConnections[clinicId];
          }
        } else if (connection === 'open') {
          retryCount = 0;
          whatsappConnections[clinicId] = { status: 'connected', connected: true };
          addLog(`[Baileys] Conexão ABERTA para ${clinicId}`);
        }
      });

      sock.ev.on('messages.upsert', ({ messages }) => {
        // Silently log message count
      });

    } catch (err) {
      addLog(`[Baileys] Falha crítica em ${clinicId}: ${err.message}`);
      setTimeout(connect, 10000);
    }
  };

  await connect();
};

const ensureSocketConnected = async (clinicId) => {
  if (!whatsappSockets[clinicId]) {
    await createWhatsAppSocket(clinicId);
  }
  return whatsappSockets[clinicId];
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/whatsapp/status/:clinicId', async (req, res) => {
  const { clinicId } = req.params;
  
  console.log(`[Status] Checking status for ${clinicId}`);
  
  if (whatsappConnections[clinicId]) {
    const conn = whatsappConnections[clinicId];
    
    if (conn.connected) {
      return res.json({ 
        ok: true, 
        status: 'connected', 
        deviceInfo: { 
          name: conn.phoneNumber, 
          platform: 'WhatsApp' 
        } 
      });
    } else if (conn.qr) {
      return res.json({ 
        ok: true, 
        status: 'qr', 
        qrCode: conn.qr 
      });
    } else if (conn.pairingCode) {
      return res.json({ 
        ok: true, 
        status: 'pairing', 
        pairingCode: conn.pairingCode 
      });
    } else if (conn.status === 'connecting') {
      return res.json({
        ok: true,
        status: 'connecting'
      });
    } else if (conn.status === 'error') {
      return res.json({
        ok: false,
        status: 'error',
        message: conn.error || 'Erro interno no servidor de WhatsApp'
      });
    }
  }
  
  res.json({ ok: true, status: 'disconnected' });
});

app.post('/api/whatsapp/connect', async (req, res) => {
  const { clinicId, phoneNumber } = req.body;
  
  try {
    console.log(`[Connect] Starting for ${clinicId}...`);
    
    if (whatsappSockets[clinicId]) {
      try { 
        whatsappSockets[clinicId].end(undefined); 
      } catch (e) {
        console.log('[Connect] Error ending old socket:', e.message);
      }
      delete whatsappSockets[clinicId];
    }
    
    const sock = await createWhatsAppSocket(clinicId);
    whatsappSockets[clinicId] = sock;
    
    const cleanPhone = phoneNumber ? phoneNumber.replace(/\D/g, '') : null;
    
    if (cleanPhone && !sock.authState.creds.registered) {
      console.log(`[Connect] Requesting pairing code for ${cleanPhone}`);
      try {
        const pairingCode = await sock.requestPairingCode(cleanPhone);
        console.log(`[Connect] Pairing code generated: ${pairingCode}`);
        
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
          message: 'Código de pareamento gerado! Digite no WhatsApp' 
        });
      } catch (pairError) {
        console.error('[Connect] Pairing code error:', pairError);
      }
    }
    
    whatsappConnections[clinicId] = { status: 'connecting' };
    
    res.json({ 
      success: true, 
      status: 'connecting', 
      message: 'Aguardando QR Code ou tentando código de pareamento...' 
    });
  } catch (error) {
    console.error('[Connect] Error:', error);
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

app.post('/api/whatsapp/request-pairing-code', async (req, res) => {
  const { clinicId, phoneNumber } = req.body;
  
  try {
    console.log(`[PairingCode] Requesting for ${clinicId}, phone: ${phoneNumber}`);
    
    const sock = await ensureSocketConnected(clinicId);
    
    if (!sock.authState.creds.registered) {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const pairingCode = await sock.requestPairingCode(cleanPhone);
      
      console.log(`[PairingCode] Generated: ${pairingCode}`);
      
      whatsappConnections[clinicId] = {
        status: 'pairing',
        pairingCode: pairingCode,
        connected: false,
        qr: null
      };
      
      res.json({ 
        success: true, 
        pairingCode: pairingCode,
        message: 'Código de pareamento gerado. Abra o WhatsApp > Dispositivos Vinculados > Vincular com número' 
      });
    } else {
      res.json({ 
        success: false, 
        error: 'Dispositivo já está registrado' 
      });
    }
  } catch (error) {
    console.error('[PairingCode] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/whatsapp/disconnect', (req, res) => {
  const { clinicId } = req.params;
  
  if (whatsappSockets[clinicId]) {
    whatsappSockets[clinicId].end(undefined);
    delete whatsappSockets[clinicId];
  }
  delete whatsappConnections[clinicId];
  
  const authDir = getAuthFolder(clinicId);
  if (fs.existsSync(authDir)) {
    fs.rmSync(authDir, { recursive: true, force: true });
  }
  
  res.json({ success: true });
});

app.post('/api/whatsapp/send', async (req, res) => {
  const { clinicId, to, message } = req.body;
  const conn = whatsappConnections[clinicId];
  
  if (!conn?.connected) {
    return res.status(400).json({ ok: false, error: 'WhatsApp não conectado' });
  }
  
  try {
    const sock = whatsappSockets[clinicId];
    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    const result = await sock.sendMessage(jid, { text: message });
    res.json({ ok: true, messageId: result.key.id });
  } catch (error) {
    console.error('[Send] Error:', error);
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
