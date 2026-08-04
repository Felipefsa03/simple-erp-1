import pino from "pino";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = pino({ level: "silent" });

export class WhiskeyService {
  constructor(config) {
    this.supabaseUrl = config.supabaseUrl;
    this.supabaseKey = config.supabaseKey;
    this.supabaseAnonKey = config.supabaseAnonKey;
    this.openaiKey = config.openaiKey || process.env.OPENAI_API_KEY || "";
    this.deepseekKey = config.deepseekKey || process.env.DEEPSEEK_API_KEY || "";

    this.sockets = {};
    this.connections = {};
    this.creationPromises = {};
    this.messagesQueue = {};
    this.rateLimitMap = new Map();
    this.antiSpamStats = new Map();
    this.aiConfigs = {};
    this.groupConfigs = {};
    this.botConfigs = {};
    this.jidCache = new Map();
    this.saveCredsTimeouts = {};
    this._waVersionCache = null;
    this._waVersionCacheTime = 0;
    this.addLog = config.addLog || console.log;
  }

  async _getCachedWaVersion() {
    const now = Date.now();
    if (this._waVersionCache && now - this._waVersionCacheTime < 21600000) return this._waVersionCache;
    // Versão atual do WhatsApp Web (2026-08). Fallback pois a bundled do baileys
    // 6.7.21 (2.3000.1023223821) é rejeitada com erro 405.
    const FALLBACK_WA_VERSION = [2, 3000, 1043857760];
    try {
      const { fetchLatestBaileysVersion } = await import("baileys");
      const fetched = await fetchLatestBaileysVersion();
      if (fetched?.isLatest && fetched?.version) {
        this._waVersionCache = fetched;
      } else {
        this._waVersionCache = { version: FALLBACK_WA_VERSION, isLatest: false };
      }
    } catch {
      this._waVersionCache = { version: FALLBACK_WA_VERSION, isLatest: false };
    }
    this._waVersionCacheTime = now;
    return this._waVersionCache;
  }

  getConnection(clinicId) {
    return this.connections[clinicId] || { status: "disconnected" };
  }

  getSocket(clinicId) {
    return this.sockets[clinicId] || null;
  }

  getAllConnections() {
    return Object.entries(this.connections).reduce((acc, [id, conn]) => {
      acc[id] = { status: conn.status, connected: conn.connected, phoneNumber: conn.phoneNumber };
      return acc;
    }, {});
  }

  async ensureSocket(clinicId) {
    if (this.sockets[clinicId]) return this.sockets[clinicId];
    if (this.creationPromises[clinicId]) {
      this.addLog(`[Whiskey] Aguardando conexão existente para ${clinicId}...`);
      return await this.creationPromises[clinicId];
    }
    this.creationPromises[clinicId] = this._createSocket(clinicId).finally(() => {
      delete this.creationPromises[clinicId];
    });
    return await this.creationPromises[clinicId];
  }

  async _createSocket(clinicId) {
    const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore, downloadMediaMessage, BufferJSON, jidDecode } = await import("baileys");
    let retryCount = 0;
    let hasFailed401 = false;
    let hasValidCreds = false;
    let isReconnecting = false;

    const authDir = path.join(process.cwd(), "server", "auth", clinicId);
    if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

    const connect = async () => {
      if (isReconnecting) { this.addLog(`[Whiskey] connect() ignorada para ${clinicId} - já reconectando`); return; }
      isReconnecting = true;
      try {
        const { version } = await this._getCachedWaVersion();
        this.addLog(`[Whiskey] Versão WA v${version.join(".")} para ${clinicId}`);

        let state, saveCreds;
        const fileAuth = await useMultiFileAuthState(authDir);
        state = fileAuth.state;
        saveCreds = fileAuth.saveCreds;

        if (!global.msgRetryCounterMap) global.msgRetryCounterMap = {};
        const msgRetryCounterCache = {
          get: (id) => global.msgRetryCounterMap[id],
          set: (id, val) => { global.msgRetryCounterMap[id] = val; },
          del: (id) => { delete global.msgRetryCounterMap[id]; },
        };

        this.connections[clinicId] = { status: "connecting" };
        const sock = makeWASocket({
          auth: state,
          version,
          printQRInTerminal: false,
          browser: ["WhiskeyBot", "Chrome", "122.0.0.0"],
          connectTimeoutMs: 120000,
          keepAliveIntervalMs: 60000,
          logger,
          msgRetryCounterCache,
          getMessage: async () => undefined,
          syncFullHistory: false,
          fireInitQueries: false,
          shouldSyncLogicMessage: () => false,
        });

        this.sockets[clinicId] = sock;
        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", async (update) => {
          const { connection, lastDisconnect, qr } = update;
          if (qr) {
            const qrBase64 = await QRCode.toDataURL(qr);
            this.connections[clinicId] = { status: "qr", qr, qrBase64 };
          }
          if (connection === "close") {
            const statusCode = lastDisconnect?.error instanceof Boom
              ? lastDisconnect.error.output.statusCode : lastDisconnect?.error?.code || 0;
            const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
            retryCount++;
            if (isLoggedOut) {
              delete this.sockets[clinicId];
              this.connections[clinicId] = { status: "disconnected" };
              return;
            }
            const delay = Math.min(5000 * Math.pow(2, Math.min(retryCount - 1, 4)), 60000) + Math.floor(Math.random() * 5000);
            this.addLog(`[Whiskey] Reconectando ${clinicId} em ${delay}ms (retry ${retryCount})`);
            setTimeout(connect, delay);
          } else if (connection === "open") {
            retryCount = 0;
            hasValidCreds = true;
            this.connections[clinicId] = {
              status: "connected", connected: true,
              phoneNumber: sock.user?.id?.split(":")[0] || "",
              messages: this.connections[clinicId]?.messages || [],
            };
            this.addLog(`[Whiskey] Conectado: ${clinicId} (${sock.user?.id})`);
          }
        });

        sock.ev.on("messages.upsert", async ({ messages: msgs, type }) => {
          for (const msg of msgs) {
            try {
              const from = msg.key.remoteJid;
              if (from?.endsWith("@g.us") || from?.endsWith("@broadcast") || from?.includes("@status")) continue;
              const text = this._extractText(msg.message);
              if (!text && !msg.message?.reactionMessage) continue;
              let phone = from?.replace("@s.whatsapp.net", "").replace("@c.us", "") || "";

              if (msg.message?.reactionMessage) {
                const r = msg.message.reactionMessage;
                this.addLog(`[Whiskey] Reação ${r.text} de ${phone} para ${r.key?.id}`);
                continue;
              }

              const msgData = {
                id: msg.key.id, key: from, phone, text: text || "",
                pushName: msg.pushName || "", fromMe: !!msg.key.fromMe,
                timestamp: (msg.messageTimestamp || 0) * 1000,
              };
              if (!this.connections[clinicId].messages) this.connections[clinicId].messages = [];
              this.connections[clinicId].messages.push(msgData);

              this._handleAutoReply(clinicId, msgData);
            } catch (e) {
              this.addLog(`[Whiskey] Erro processing msg: ${e.message}`);
            }
          }
        });

        isReconnecting = false;
        return sock;
      } catch (err) {
        isReconnecting = false;
        this.addLog(`[Whiskey] Erro: ${err.message}`);
        setTimeout(connect, 10000);
      }
    };
    return await connect();
  }

  _extractText(message) {
    if (!message) return null;
    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    if (message.imageMessage?.caption) return `📷 ${message.imageMessage.caption}`;
    if (message.videoMessage?.caption) return `🎥 ${message.videoMessage.caption}`;
    if (message.documentMessage?.fileName) return `📄 ${message.documentMessage.fileName}`;
    if (message.buttonsResponseMessage?.selectedDisplayText) return message.buttonsResponseMessage.selectedDisplayText;
    if (message.listResponseMessage?.title) return message.listResponseMessage.title;
    if (message.templateButtonReplyMessage?.selectedDisplayText) return message.templateButtonReplyMessage.selectedDisplayText;
    if (message.viewOnceMessage?.message) return this._extractText(message.viewOnceMessage.message);
    if (message.viewOnceMessageV2?.message) return this._extractText(message.viewOnceMessageV2.message);
    if (message.ephemeralMessage?.message) return this._extractText(message.ephemeralMessage.message);
    if (message.reactionMessage?.text) return `${message.reactionMessage.text} (reação)`;
    return null;
  }

  async _handleAutoReply(clinicId, msg) {
    const config = this.aiConfigs[clinicId];
    if (!config?.enabled || msg.fromMe || !msg.text) return;
    if (config.onlyGroups) return;
    if (!config.triggerWords || config.triggerWords.length === 0) return;
    const matched = config.triggerWords.some(w => msg.text.toLowerCase().includes(w.toLowerCase()));
    if (!matched) return;
    try {
      const reply = await this._askAI(msg.text, config.provider || "openai");
      if (reply && this.sockets[clinicId]) {
        await this.sockets[clinicId].sendMessage(msg.key, { text: reply });
        this.addLog(`[AI] Resposta automática enviada para ${msg.phone}`);
      }
    } catch (e) {
      this.addLog(`[AI] Erro auto-reply: ${e.message}`);
    }
  }

  async _askAI(prompt, provider = "openai") {
    if (provider === "deepseek" && this.deepseekKey) {
      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.deepseekKey}` },
        body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "user", content: prompt }], max_tokens: 500 }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    }
    if (this.openaiKey) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.openaiKey}` },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 500 }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    }
    return null;
  }

  async sendText(clinicId, to, message) {
    const sock = await this.ensureSocket(clinicId);
    let waitCount = 0;
    while (this.connections[clinicId]?.status === "connecting" && waitCount < 30) {
      await new Promise(r => setTimeout(r, 500));
      waitCount++;
    }
    if (this.connections[clinicId]?.status !== "connected") throw new Error("WhatsApp não conectado");
    const jid = await this._resolveJID(sock, to);
    const jids = Array.isArray(jid) ? jid : [jid];
    let last = null;
    for (const j of jids) {
      last = await sock.sendMessage(j, { text: message });
      if (jids.length > 1) await new Promise(r => setTimeout(r, 1000));
    }
    return last?.key?.id || "unknown";
  }

  async sendMedia(clinicId, to, base64, fileName, mimeType, caption) {
    const sock = await this.ensureSocket(clinicId);
    let waitCount = 0;
    while (this.connections[clinicId]?.status === "connecting" && waitCount < 30) {
      await new Promise(r => setTimeout(r, 500));
      waitCount++;
    }
    if (this.connections[clinicId]?.status !== "connected") throw new Error("WhatsApp não conectado");
    const buf = Buffer.from(base64, "base64");
    const jid = await this._resolveJID(sock, to);
    const jids = Array.isArray(jid) ? jid : [jid];
    let payload = {};
    if (mimeType?.startsWith("image")) payload = { image: buf, caption: caption || "" };
    else if (mimeType?.startsWith("video")) payload = { video: buf, caption: caption || "" };
    else if (mimeType?.startsWith("audio")) payload = { audio: buf, ptt: mimeType.includes("ogg") };
    else payload = { document: buf, fileName: fileName || "file", caption: caption || "" };
    let last = null;
    for (const j of jids) {
      last = await sock.sendMessage(j, payload);
      if (jids.length > 1) await new Promise(r => setTimeout(r, 1000));
    }
    return last?.key?.id || "unknown";
  }

  async sendPresence(clinicId, to, type = "composing") {
    const sock = await this.ensureSocket(clinicId);
    const jid = await this._resolveJID(sock, to);
    const target = Array.isArray(jid) ? jid[0] : jid;
    if (!target) throw new Error("JID não encontrado");
    await sock.sendPresenceUpdate(type, target);
  }

  async setAlwaysOnline(clinicId, enable) {
    const sock = await this.ensureSocket(clinicId);
    if (enable) {
      sock.sendPresenceUpdate("available");
      if (this._onlineInterval?.[clinicId]) clearInterval(this._onlineInterval[clinicId]);
      this._onlineInterval = this._onlineInterval || {};
      this._onlineInterval[clinicId] = setInterval(() => {
        if (this.sockets[clinicId]) this.sockets[clinicId].sendPresenceUpdate("available");
      }, 300000);
    } else {
      if (this._onlineInterval?.[clinicId]) {
        clearInterval(this._onlineInterval[clinicId]);
        delete this._onlineInterval[clinicId];
      }
    }
  }

  // ── Group Management ──────────────────────────────────────────
  async groupKick(clinicId, groupJid, participants) {
    const sock = await this.ensureSocket(clinicId);
    return sock.groupParticipantsUpdate(groupJid, participants, "remove");
  }
  async groupAdd(clinicId, groupJid, participants) {
    const sock = await this.ensureSocket(clinicId);
    return sock.groupParticipantsUpdate(groupJid, participants, "add");
  }
  async groupPromote(clinicId, groupJid, participants) {
    const sock = await this.ensureSocket(clinicId);
    return sock.groupParticipantsUpdate(groupJid, participants, "promote");
  }
  async groupDemote(clinicId, groupJid, participants) {
    const sock = await this.ensureSocket(clinicId);
    return sock.groupParticipantsUpdate(groupJid, participants, "demote");
  }
  async groupMute(clinicId, groupJid, durationMs) {
    const sock = await this.ensureSocket(clinicId);
    const until = durationMs ? Date.now() + durationMs : 0;
    return sock.groupSettingUpdate(groupJid, until > 0 ? "announcement" : "not_announcement");
  }
  async groupToggle(clinicId, groupJid, setting) {
    const sock = await this.ensureSocket(clinicId);
    return sock.groupSettingUpdate(groupJid, setting);
  }
  async groupInviteCode(clinicId, groupJid) {
    const sock = await this.ensureSocket(clinicId);
    return sock.groupInviteCode(groupJid);
  }
  async groupRevokeInvite(clinicId, groupJid) {
    const sock = await this.ensureSocket(clinicId);
    return sock.revokeInviteCode(groupJid);
  }
  async groupInfo(clinicId, groupJid) {
    const sock = await this.ensureSocket(clinicId);
    return sock.groupMetadata(groupJid);
  }
  async groupList(clinicId) {
    const sock = await this.ensureSocket(clinicId);
    const groups = [];
    for (const [jid, metadata] of Object.entries(sock?.store?.groups || {})) {
      groups.push({ jid, subject: metadata.subject, size: metadata.participants?.length || 0 });
    }
    if (groups.length === 0) {
      const groupMeta = await sock.groupFetchAllParticipating();
      for (const [jid, meta] of Object.entries(groupMeta)) {
        groups.push({ jid, subject: meta.subject, size: meta.participants?.length || 0 });
      }
    }
    return groups;
  }

  // ── Anti-Delete / Anti-Edit ────────────────────────────────────
  async getDeletedMessages(clinicId) {
    const conn = this.connections[clinicId];
    return conn?.deletedMessages || [];
  }

  // ── AI Config ──────────────────────────────────────────────────
  setAIConfig(clinicId, config) {
    this.aiConfigs[clinicId] = config;
  }
  getAIConfig(clinicId) {
    return this.aiConfigs[clinicId] || { enabled: false, provider: "openai", triggerWords: [], onlyGroups: false };
  }

  // ── Bot Config ─────────────────────────────────────────────────
  setBotConfig(clinicId, config) {
    this.botConfigs[clinicId] = { ...this.botConfigs[clinicId], ...config };
  }
  getBotConfig(clinicId) {
    const raw = this.botConfigs[clinicId] || {};
    return {
      autoread: raw.autoread === true,
      alwaysOnline: raw.alwaysOnline === true,
      prefix: raw.prefix || ".",
      autoReactStatus: raw.autoReactStatus === true,
      antiLink: raw.antiLink === true,
      antiBadwords: raw.antiBadwords === true,
    };
  }

  async setAutoRead(clinicId, enable) {
    if (!this._autoReadIntervals) this._autoReadIntervals = {};
    if (this._autoReadIntervals[clinicId]) {
      clearInterval(this._autoReadIntervals[clinicId]);
      delete this._autoReadIntervals[clinicId];
    }
    if (!enable) return;
    this._autoReadIntervals[clinicId] = setInterval(async () => {
      const sock = this.sockets[clinicId];
      if (!sock) return;
      try {
        for (const [jid, chat] of Object.entries(sock?.store?.chats || {})) {
          if (chat.unreadCount > 0) await sock.readMessages([jid]);
        }
      } catch (e) { /* silent */ }
    }, 15000);
  }

  updateAntiSpam(number) {
    const now = Date.now();
    const stats = this.antiSpamStats.get(number) || { count: 0, firstHit: now };
    stats.count++;
    this.antiSpamStats.set(number, stats);
    return stats;
  }

  // ── Downloaders (stubs - add real API keys in production) ──────
  async downloadYoutube(url, format = "audio") {
    return { error: "YouTube downloader requires external API (e.g. RapidAPI, yt-dlp). Configure DOWNLOADER_API_KEY in .env" };
  }

  async downloadTiktok(url) {
    return { error: "TikTok downloader requires external API (e.g. RapidAPI). Configure DOWNLOADER_API_KEY in .env" };
  }

  async downloadInstagram(url) {
    return { error: "Instagram downloader requires external API (e.g. RapidAPI). Configure DOWNLOADER_API_KEY in .env" };
  }

  // ── JID Resolution ─────────────────────────────────────────────
  async _resolveJID(sock, rawPhone) {
    const cached = this.jidCache.get(rawPhone);
    if (cached && Date.now() - cached.ts < 86400000) return cached.jid;

    const digits = String(rawPhone).replace(/\D/g, "");
    const candidates = this._phoneCandidates(digits);

    for (const c of candidates) {
      try {
        const check = await Promise.race([
          sock.onWhatsApp(c),
          new Promise((_, rej) => setTimeout(() => rej(new Error("Timeout")), 3000)),
        ]);
        const result = Array.isArray(check) ? check[0] : null;
        if (result?.exists) {
          this.jidCache.set(rawPhone, { jid: result.jid, ts: Date.now() });
          return result.jid;
        }
      } catch (_) {}
    }
    return candidates.map(c => `${c}@s.whatsapp.net`);
  }

  _phoneCandidates(raw) {
    let d = String(raw).replace(/\D/g, "");
    while (d.startsWith("0")) d = d.slice(1);
    if (!d.startsWith("55")) d = "55" + d;
    if (d.startsWith("5555")) d = d.slice(2);
    if (d.length < 12) return [d];
    const ddd = d.slice(2, 4);
    const local = d.slice(4).slice(-9);
    const r = [];
    if (local.length === 8 && ["6", "7", "8", "9"].includes(local[0])) {
      r.push(`55${ddd}9${local}`, `55${ddd}${local}`);
    } else if (local.length === 9 && local[0] === "9") {
      r.push(`55${ddd}${local}`, `55${ddd}${local.slice(1)}`);
    } else {
      r.push(`55${ddd}${local}`);
    }
    return [...new Set(r)];
  }

  // ── Disconnect ─────────────────────────────────────────────────
  async disconnect(clinicId) {
    if (this.sockets[clinicId]) {
      try { this.sockets[clinicId].ev.removeAllListeners(); this.sockets[clinicId].end(undefined); } catch (_) {}
      delete this.sockets[clinicId];
    }
    delete this.connections[clinicId];
    delete this.creationPromises[clinicId];
    try {
      const authDir = path.join(process.cwd(), "server", "auth", clinicId);
      if (fs.existsSync(authDir)) fs.rmSync(authDir, { recursive: true, force: true });
    } catch (_) {}
  }

  async resetSession(clinicId) {
    await this.disconnect(clinicId);
  }

  async connectWithCode(clinicId, phoneNumber) {
    const sock = await this.ensureSocket(clinicId);
    if (!sock) throw new Error("Falha ao criar socket");
    if (!sock.requestPairingCode) throw new Error("Pairing code não suportado");
    const code = await sock.requestPairingCode(phoneNumber);
    this.connections[clinicId] = { status: "pairing", pairingCode: code, connected: false };
    return code;
  }
}
