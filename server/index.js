import express from 'express';
import cors from 'cors';
import { useMultiFileAuthState, makeWASocket, DisconnectReason } from 'baileys';
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
  const authDir = getAuthFolder(clinicId);
  
  console.log('[Baileys] Loading auth state from:', authDir);
  
  try {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    console.log('[Baileys] Auth state loaded successfully');
    
    // Pino is the recommended logger for Baileys, especially in cloud environments
    const logger = pino({ level: 'debug' });
    
    addLog(`[Baileys] Inicianizando socket para ${clinicId}...`);
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['Ubuntu', 'Chrome', '121.0.6167.184'], // More common signature
      connectTimeoutMs: 120000, // 2 minutes
      keepAliveIntervalMs: 60000,
      logger: logger,
      emitOwnEvents: true,
      agent: undefined,
      TLSConfig: {},
      phoneResponseTime: 90000,
      waitForConnection: true,
      markOnlineOnConnect: true,
      options: {
        family: 4 // Force IPv4 for stability
      }
    });

    sock.ev.on('creds.update', () => {
      console.log('[Baileys] Credentials updated, saving...');
      saveCreds();
    });

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        addLog(`[Baileys] QR Code gerado para ${clinicId}`);
        whatsappSockets[clinicId].qr = qr;
        whatsappSockets[clinicId].status = 'qr';
        whatsappSockets[clinicId].message = 'QR Code gerado. Escaneie para conectar.';
      }
      
      if (connection === 'connecting') {
        addLog(`[Baileys] Conectando ${clinicId}...`);
        whatsappSockets[clinicId].status = 'connecting';
      }

      if (connection === 'open') {
        addLog(`[Baileys] Conexão ABERTA para ${clinicId}`);
        whatsappSockets[clinicId].status = 'connected';
        whatsappSockets[clinicId].qr = null;
        whatsappSockets[clinicId].message = 'Conectado com sucesso!';
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error)?.output?.statusCode || 0;
        const reason = lastDisconnect?.error?.message || 'Motivo desconhecido';
        addLog(`[Baileys] Conexão FECHADA para ${clinicId}. Razão: ${reason} (Código: ${statusCode})`);
        
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        if (shouldReconnect) {
          whatsappSockets[clinicId].status = 'connecting';
          whatsappSockets[clinicId].message = 'Conexão perdida. Tentando reconectar...';
          addLog(`[Baileys] Tentando reconectar ${clinicId} em 5s...`);
          setTimeout(() => createWhatsAppSocket(clinicId), 5000);
        } else {
          whatsappSockets[clinicId].status = 'disconnected';
          whatsappSockets[clinicId].message = 'Sessão encerrada (Logout).';
          delete whatsappSockets[clinicId];
        }
      }
    });

    sock.ev.on('messages.upsert', ({ messages }) => {
      console.log('[Baileys] New messages received:', messages.length);
    });

    console.log('[Baileys] Socket created successfully');
    return sock;
    
  } catch (error) {
    console.error('[Baileys] Error creating socket:', error);
    throw error;
  }
};

const ensureSocketConnected = async (clinicId) => {
  if (!whatsappSockets[clinicId]) {
    console.log(`[WhatsApp] Creating new socket for ${clinicId}`);
    whatsappSockets[clinicId] = await createWhatsAppSocket(clinicId);
    whatsappConnections[clinicId] = { status: 'connecting' };
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
