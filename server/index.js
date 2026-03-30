import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
} from 'baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import qrcode from 'qrcode';
import dotenv from 'dotenv';

dotenv.config();

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AUTH_DIR = path.join(__dirname, '.wa_auth');

// Logger silencioso para Baileys (evita spam no console)
const baileysLogger = pino({ level: 'silent' });

// App logger
const log = {
  info: (...a) => console.log('[INFO]', new Date().toISOString(), ...a),
  warn: (...a) => console.warn('[WARN]', new Date().toISOString(), ...a),
  error: (...a) => console.error('[ERROR]', new Date().toISOString(), ...a),
};

// ─────────────────────────────────────────────
// SUPABASE
// ─────────────────────────────────────────────
const supabase = (SUPABASE_URL && SUPABASE_SERVICE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

async function saveCredentials(clinicId, creds) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('whatsapp_credentials')
      .upsert(
        { clinic_id: clinicId, credentials: creds, last_sync: new Date().toISOString() },
        { onConflict: 'clinic_id' }
      );
    if (error) log.warn('saveCredentials error', error.message);
  } catch (e) {
    log.error('saveCredentials exception', e.message);
  }
}

async function loadCredentials(clinicId) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('whatsapp_credentials')
      .select('credentials')
      .eq('clinic_id', clinicId)
      .single();
    if (error || !data) return null;
    return data.credentials;
  } catch (e) {
    log.error('loadCredentials exception', e.message);
    return null;
  }
}

async function deleteCredentials(clinicId) {
  if (!supabase) return;
  try {
    await supabase
      .from('whatsapp_credentials')
      .delete()
      .eq('clinic_id', clinicId);
  } catch (e) {
    log.error('deleteCredentials exception', e.message);
  }
}

// ─────────────────────────────────────────────
// PHONE NUMBER — LÓGICA ROBUSTA BRASIL
// ─────────────────────────────────────────────

/**
 * Normaliza um número brasileiro para o formato E.164 sem '+'
 * Retorna um array de candidatos (do mais provável ao menos provável)
 * para que possamos tentar com onWhatsApp().
 *
 * Regras:
 *  - Remove tudo que não for dígito
 *  - Adiciona 55 se não tiver código do país
 *  - Para número local de 8 dígitos → gera versão com 9 na frente
 *  - Para número local de 9 dígitos começando com 9 → também gera versão sem o 9 inicial
 *  - Isso cobre TODOS os DDDs do Brasil, inclusive Bahia (DDD 71-77)
 */
function brazilianPhoneCandidates(rawPhone) {
  let digits = String(rawPhone).replace(/\D/g, '');

  // Garante código do país
  if (digits.startsWith('0')) digits = digits.slice(1); // remove 0 de discagem
  if (!digits.startsWith('55')) digits = '55' + digits;

  // Remove +55 duplicado
  if (digits.startsWith('5555')) digits = digits.slice(2);

  const country = '55';
  const rest = digits.slice(2); // DDD + número local

  if (rest.length < 10) {
    log.warn(`Número muito curto após normalização: ${digits}`);
    return [digits]; // retorna como está
  }

  const ddd = rest.slice(0, 2);
  const local = rest.slice(2);

  const candidates = [];

  if (local.length === 9) {
    // 9 dígitos: provavelmente já tem o 9º dígito
    candidates.push(`${country}${ddd}${local}`);
    // Também tenta sem o 9 inicial (para casos onde foi adicionado incorretamente)
    if (local.startsWith('9')) {
      candidates.push(`${country}${ddd}${local.slice(1)}`);
    }
  } else if (local.length === 8) {
    // 8 dígitos: precisa adicionar o 9
    candidates.push(`${country}${ddd}9${local}`);
    candidates.push(`${country}${ddd}${local}`); // fallback sem o 9
  } else {
    // Comprimento inesperado — retorna como está
    candidates.push(digits);
  }

  return [...new Set(candidates)]; // deduplicar
}

/**
 * Encontra o JID correto do WhatsApp para um número brasileiro.
 * Tenta todos os candidatos com onWhatsApp() e retorna o primeiro que existe.
 * Se nenhum for confirmado, usa o candidato mais provável como fallback.
 */
async function resolveWhatsAppJID(sock, rawPhone) {
  const candidates = brazilianPhoneCandidates(rawPhone);
  log.info(`Resolvendo JID para "${rawPhone}" → candidatos: ${candidates.join(', ')}`);

  for (const candidate of candidates) {
    const jid = `${candidate}@s.whatsapp.net`;
    try {
      const [result] = await sock.onWhatsApp(candidate);
      if (result?.exists) {
        log.info(`JID confirmado: ${result.jid}`);
        return result.jid;
      }
    } catch (e) {
      log.warn(`onWhatsApp falhou para ${candidate}: ${e.message}`);
    }
  }

  // Nenhum confirmado — usa o mais provável e loga aviso
  const fallback = `${candidates[0]}@s.whatsapp.net`;
  log.warn(`Nenhum JID confirmado para "${rawPhone}". Usando fallback: ${fallback}`);
  return fallback;
}

// ─────────────────────────────────────────────
// SESSÕES WHATSAPP (in-memory, por clinicId)
// ─────────────────────────────────────────────
const sessions = new Map();
// session = { sock, state, qr, status, connectingAt, clinicId }

const SESSION_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  QR_READY: 'qr_ready',
  CONNECTED: 'connected',
  ERROR: 'error',
};

function getSession(clinicId) {
  return sessions.get(clinicId);
}

function setSession(clinicId, data) {
  const existing = sessions.get(clinicId) || {};
  sessions.set(clinicId, { ...existing, ...data, clinicId });
}

async function getAuthPath(clinicId) {
  const dir = path.join(AUTH_DIR, clinicId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

// ─────────────────────────────────────────────
// CRIAR / RECONECTAR SESSÃO BAILEYS
// ─────────────────────────────────────────────
async function createSession(clinicId) {
  const existing = getSession(clinicId);

  // Evita criar sessão duplicada
  if (existing?.status === SESSION_STATUS.CONNECTING || existing?.status === SESSION_STATUS.QR_READY) {
    log.info(`[${clinicId}] Sessão já está conectando/aguardando QR`);
    return;
  }
  if (existing?.status === SESSION_STATUS.CONNECTED && existing.sock) {
    log.info(`[${clinicId}] Sessão já está conectada`);
    return;
  }

  log.info(`[${clinicId}] Iniciando sessão Baileys...`);
  setSession(clinicId, { status: SESSION_STATUS.CONNECTING, qr: null, connectingAt: Date.now() });

  const authPath = await getAuthPath(clinicId);

  // Carrega credenciais do Supabase se disponível
  const savedCreds = await loadCredentials(clinicId);
  if (savedCreds) {
    try {
      await fs.writeFile(path.join(authPath, 'creds.json'), JSON.stringify(savedCreds));
      log.info(`[${clinicId}] Credenciais restauradas do Supabase`);
    } catch (e) {
      log.warn(`[${clinicId}] Falha ao restaurar credenciais: ${e.message}`);
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();

  log.info(`[${clinicId}] Baileys versão WA: ${version.join('.')}`);

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
    },
    logger: baileysLogger,
    printQRInTerminal: false,
    browser: ['Clinxia ERP', 'Chrome', '120.0.0'],
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 30_000,
    retryRequestDelayMs: 2_000,
    maxMsgRetryCount: 3,
    getMessage: async () => ({ conversation: '' }),
  });

  setSession(clinicId, { sock, state });

  // ── Eventos ──────────────────────────────────

  sock.ev.on('creds.update', async () => {
    await saveCreds();
    // Persiste no Supabase
    try {
      const credsData = JSON.parse(await fs.readFile(path.join(authPath, 'creds.json'), 'utf8'));
      await saveCredentials(clinicId, credsData);
    } catch (e) {
      log.warn(`[${clinicId}] Erro ao persistir creds: ${e.message}`);
    }
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      log.info(`[${clinicId}] QR Code gerado`);
      try {
        const qrDataUrl = await qrcode.toDataURL(qr);
        setSession(clinicId, { status: SESSION_STATUS.QR_READY, qr: qrDataUrl });
      } catch (e) {
        log.error(`[${clinicId}] Erro ao gerar QR: ${e.message}`);
      }
    }

    if (connection === 'open') {
      log.info(`[${clinicId}] ✅ Conectado ao WhatsApp`);
      setSession(clinicId, { status: SESSION_STATUS.CONNECTED, qr: null });
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const reasonName = DisconnectReason[reason] || String(reason);
      log.warn(`[${clinicId}] Desconectado. Motivo: ${reasonName} (${reason})`);

      const shouldReconnect = reason !== DisconnectReason.loggedOut
        && reason !== DisconnectReason.forbidden;

      if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.forbidden) {
        log.warn(`[${clinicId}] Logout detectado — removendo credenciais`);
        setSession(clinicId, { status: SESSION_STATUS.DISCONNECTED, sock: null, qr: null });
        await deleteCredentials(clinicId);
        try { await fs.rm(authPath, { recursive: true, force: true }); } catch {}
      } else if (shouldReconnect) {
        log.info(`[${clinicId}] Reagendando reconexão em 5s...`);
        setSession(clinicId, { status: SESSION_STATUS.DISCONNECTED, sock: null });
        setTimeout(() => createSession(clinicId), 5_000);
      } else {
        setSession(clinicId, { status: SESSION_STATUS.ERROR, sock: null });
      }
    }
  });

  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
      if (!msg.key.fromMe && !isJidBroadcast(msg.key.remoteJid)) {
        log.info(`[${clinicId}] 📨 Mensagem recebida de ${msg.key.remoteJid}`);
      }
    }
  });
}

// ─────────────────────────────────────────────
// EXPRESS
// ─────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: [
    'https://clinxia.vercel.app',
    'https://simple-erp-three.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
  ],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));

// ── Health ────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    sessions: sessions.size,
    uptime: Math.floor(process.uptime()),
  });
});

// ── Status da sessão ──────────────────────────
app.get('/api/whatsapp/status/:clinicId', (req, res) => {
  const { clinicId } = req.params;
  const session = getSession(clinicId);
  res.json({
    status: session?.status || SESSION_STATUS.DISCONNECTED,
    hasQR: !!session?.qr,
    connected: session?.status === SESSION_STATUS.CONNECTED,
  });
});

// ── QR Code ───────────────────────────────────
app.get('/api/whatsapp/qr/:clinicId', (req, res) => {
  const { clinicId } = req.params;
  const session = getSession(clinicId);

  if (!session || session.status === SESSION_STATUS.DISCONNECTED) {
    return res.status(404).json({ error: 'Sem sessão ativa. Chame /connect primeiro.' });
  }
  if (!session.qr) {
    return res.status(202).json({
      message: 'QR ainda não disponível',
      status: session.status,
    });
  }
  res.json({ qr: session.qr, status: session.status });
});

// ── Conectar ──────────────────────────────────
app.post('/api/whatsapp/connect/:clinicId', async (req, res) => {
  const { clinicId } = req.params;
  try {
    await createSession(clinicId);
    res.json({ message: 'Conexão iniciada', clinicId });
  } catch (e) {
    log.error(`[${clinicId}] Erro ao criar sessão: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ── Desconectar ───────────────────────────────
app.delete('/api/whatsapp/disconnect/:clinicId', async (req, res) => {
  const { clinicId } = req.params;
  const session = getSession(clinicId);

  try {
    if (session?.sock) {
      await session.sock.logout().catch(() => {});
    }
    setSession(clinicId, { status: SESSION_STATUS.DISCONNECTED, sock: null, qr: null });
    await deleteCredentials(clinicId);
    const authPath = await getAuthPath(clinicId);
    await fs.rm(authPath, { recursive: true, force: true }).catch(() => {});
    sessions.delete(clinicId);
    res.json({ message: 'Desconectado com sucesso' });
  } catch (e) {
    log.error(`[${clinicId}] Erro ao desconectar: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ── Enviar mensagem ───────────────────────────
app.post('/api/whatsapp/send', async (req, res) => {
  const { clinicId, phone, message } = req.body;

  // Validação
  if (!clinicId || !phone || !message) {
    return res.status(400).json({
      error: 'Campos obrigatórios: clinicId, phone, message',
    });
  }

  const session = getSession(clinicId);
  if (!session || session.status !== SESSION_STATUS.CONNECTED || !session.sock) {
    return res.status(503).json({
      error: 'WhatsApp não conectado para esta clínica',
      status: session?.status || SESSION_STATUS.DISCONNECTED,
    });
  }

  try {
    log.info(`[${clinicId}] Enviando para "${phone}": "${message.slice(0, 50)}..."`);

    // ── CORREÇÃO PRINCIPAL: resolve o JID correto ──
    const jid = await resolveWhatsAppJID(session.sock, phone);
    log.info(`[${clinicId}] JID resolvido: ${jid}`);

    const result = await session.sock.sendMessage(jid, { text: message });

    log.info(`[${clinicId}] ✅ Mensagem enviada. ID: ${result?.key?.id}`);
    res.json({
      success: true,
      messageId: result?.key?.id,
      to: jid,
      phone,
    });
  } catch (e) {
    log.error(`[${clinicId}] Erro ao enviar para "${phone}": ${e.message}`);
    res.status(500).json({
      error: 'Erro ao enviar mensagem',
      details: e.message,
      phone,
    });
  }
});

// ── Enviar para múltiplos números ─────────────
app.post('/api/whatsapp/send-bulk', async (req, res) => {
  const { clinicId, recipients, message } = req.body;
  // recipients = [{ phone, name }]

  if (!clinicId || !recipients?.length || !message) {
    return res.status(400).json({ error: 'Campos obrigatórios: clinicId, recipients, message' });
  }

  const session = getSession(clinicId);
  if (!session || session.status !== SESSION_STATUS.CONNECTED || !session.sock) {
    return res.status(503).json({ error: 'WhatsApp não conectado', status: session?.status });
  }

  const results = [];
  for (const recipient of recipients) {
    try {
      const jid = await resolveWhatsAppJID(session.sock, recipient.phone);
      const personalizedMsg = message.replace('{nome}', recipient.name || '');
      const result = await session.sock.sendMessage(jid, { text: personalizedMsg });

      results.push({ phone: recipient.phone, jid, success: true, messageId: result?.key?.id });
      log.info(`[${clinicId}] ✅ Bulk enviado para ${jid}`);

      // Delay entre envios para evitar rate limiting
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      results.push({ phone: recipient.phone, success: false, error: e.message });
      log.error(`[${clinicId}] ❌ Bulk falhou para ${recipient.phone}: ${e.message}`);
    }
  }

  const successful = results.filter(r => r.success).length;
  res.json({ total: recipients.length, successful, failed: recipients.length - successful, results });
});

// ── Verificar número no WhatsApp ──────────────
app.get('/api/whatsapp/check/:clinicId/:phone', async (req, res) => {
  const { clinicId, phone } = req.params;
  const session = getSession(clinicId);

  if (!session || session.status !== SESSION_STATUS.CONNECTED || !session.sock) {
    return res.status(503).json({ error: 'WhatsApp não conectado' });
  }

  try {
    const candidates = brazilianPhoneCandidates(phone);
    const checks = [];

    for (const candidate of candidates) {
      try {
        const [result] = await session.sock.onWhatsApp(candidate);
        checks.push({ number: candidate, exists: !!result?.exists, jid: result?.jid });
      } catch {
        checks.push({ number: candidate, exists: false });
      }
    }

    res.json({ phone, candidates, checks, found: checks.some(c => c.exists) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Placeholder para notificações (não quebra rota) ──
app.get('/api/whatsapp/notifications', (_, res) => {
  res.json({ notifications: [], message: 'Endpoint de notificações (em desenvolvimento)' });
});

// ── 404 handler ───────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
});

// ── Error handler ─────────────────────────────
app.use((err, req, res, next) => {
  log.error('Erro não tratado:', err.message);
  res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
});

// ─────────────────────────────────────────────
// INICIALIZAÇÃO
// ─────────────────────────────────────────────
async function start() {
  // Cria diretório de autenticação
  await fs.mkdir(AUTH_DIR, { recursive: true });

  app.listen(PORT, '0.0.0.0', () => {
    log.info(`🚀 Servidor rodando na porta ${PORT}`);
    log.info(`   Supabase: ${supabase ? '✅ conectado' : '❌ não configurado'}`);
    log.info(`   Auth dir: ${AUTH_DIR}`);
  });
}

// Tratamento de erros fatais
process.on('uncaughtException', (err) => {
  log.error('UncaughtException:', err.message, err.stack);
  // Não encerra o processo — tenta continuar
});

process.on('unhandledRejection', (reason) => {
  log.error('UnhandledRejection:', reason);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  log.info('SIGTERM recebido — encerrando sessões...');
  for (const [clinicId, session] of sessions) {
    if (session?.sock) {
      try { await session.sock.ws?.close(); } catch {}
    }
  }
  process.exit(0);
});

start().catch((e) => {
  log.error('Falha ao iniciar servidor:', e.message);
  process.exit(1);
});
