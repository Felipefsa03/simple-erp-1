import express from 'express';
import cors from 'cors';
import { useMultiFileAuthState, makeWASocket, DisconnectReason } from 'baileys';
import { Boom } from '@hapi/boom';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 8787;

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
    
    const logger = {
      level: 'debug',
      child: () => logger,
      info: (msg) => console.log('[Baileys INFO]', msg),
      error: (msg) => console.error('[Baileys ERROR]', msg),
      warn: (msg) => console.warn('[Baileys WARN]', msg),
      debug: (msg) => console.log('[Baileys DEBUG]', msg),
      trace: (msg) => console.log('[Baileys TRACE]', msg)
    };
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      browser: ['LuminaFlow ERP', 'Chrome', '120.0'],
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      logger: logger,
      emitOwnEvents: true,
      agent: undefined,
      TLSConfig: {},
      phoneResponseTime: 60000,
      waitForConnection: true,
      markOnlineOnConnect: true,
      options: {
        family: 4 // Forçar IPv4 para evitar problemas de DNS/IPv6 no Windows
      }
    });

    sock.ev.on('creds.update', () => {
      console.log('[Baileys] Credentials updated, saving...');
      saveCreds();
    });

    sock.ev.on('connection.update', async (update) => {
      console.log('[Baileys] Connection update:', JSON.stringify({
        connection: update.connection,
        qr: !!update.qr,
        lastDisconnect: update.lastDisconnect?.error?.message
      }));
      
      const { connection, qr, lastDisconnect } = update;
      
      if (qr) {
        console.log('[Baileys] QR Code received! Length:', qr.length);
        whatsappConnections[clinicId] = {
          status: 'qr',
          qr: qr,
          connected: false,
          pairingCode: null
        };
      }
      
      if (connection === 'open') {
        console.log('[Baileys] Connected to WhatsApp!');
        whatsappConnections[clinicId] = {
          status: 'connected',
          connected: true,
          phoneNumber: sock.user?.id?.replace(':@s.whatsapp.net', '').replace('@s.whatsapp.net', ''),
          qr: null,
          pairingCode: null
        };
      }
      
      if (connection === 'close') {
        const boomError = lastDisconnect?.error ? new Boom(lastDisconnect.error) : null;
        const statusCode = boomError?.output?.statusCode;
        const errorMessage = lastDisconnect?.error?.message || 'Conexão interrompida';
        
        console.log('[Baileys] Connection closed. Status:', statusCode, 'Error:', errorMessage);
        
        if (statusCode === DisconnectReason.loggedOut) {
          console.log('[Baileys] Session logged out, resetting auth...');
          delete whatsappConnections[clinicId];
          const authDir = getAuthFolder(clinicId);
          if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true, force: true });
          }
        } else {
          whatsappConnections[clinicId] = {
            status: 'error',
            error: `Erro de conexão: ${errorMessage}`,
            connected: false
          };
        }
      }

      if (!sock.authState.creds.registered) {
        console.log('[Baileys] Device not registered yet');
      } else {
        console.log('[Baileys] Device already registered, waiting for connection...');
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
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 WhatsApp API ready for connections`);
});
