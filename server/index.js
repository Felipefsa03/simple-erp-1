import QRCode from 'qrcode';

// Status cache for quick retrieval
const whatsappConnections = {};
const whatsappSockets = {};

// ... logging stays the same ...

// REMOVED: app.get('/api/whatsapp/proxy*', ...) - Iframe is dead.

// Updated QR generation to support Base64
const createWhatsAppSocket = async (clinicId) => {
  let retryCount = 0;

  const connect = async () => {
    try {
      const authDir = ensureClinicStatus(clinicId);
      const { version, isLatest } = await fetchLatestBaileysVersion();
      addLog(`[Baileys] Usando versão WA v${version.join('.')}, isLatest: ${isLatest}`);

      const { state, saveCreds } = await useMultiFileAuthState(authDir);
      
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
            phoneNumber: sock.user.id.split(':')[0]
          };
          addLog(`[Baileys] Conexão ABERTA para ${clinicId} (${sock.user.id})`);
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

// ... health remains ...

app.get('/api/whatsapp/status/:clinicId', async (req, res) => {
  const { clinicId } = req.params;
  
  if (whatsappConnections[clinicId]) {
    const conn = whatsappConnections[clinicId];
    return res.json({ 
      ok: true, 
      ...conn 
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
    
    res.json({ ok: true, messageId: result.key.id });
  } catch (error) {
    addLog(`[API] Erro ao enviar: ${error.message}`);
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
