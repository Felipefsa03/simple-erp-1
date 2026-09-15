import express from "express";
import fs from "fs";
import QRCode from "qrcode";
import crypto from "crypto";
import sharp from "sharp";

/**
 * ── ANTI-BAN: Media Fingerprint ──────────────────────────────────────────────
 * Modifica o hash binário da imagem de forma imperceptível antes de cada envio.
 * O WhatsApp usa o hash MD5/SHA da mídia para detectar envios em massa.
 * Com fingerprint único por cliente, cada hash é diferente.
 *
 * JPEG: insere segmento de comentário (0xFFFE) com 12 bytes aleatórios após SOI.
 * PNG:  modifica os bytes do chunk tEXt privado.
 * Outros: appenda bytes no final.
 */
async function addMediaFingerprint(base64Data, mimeType) {
  try {
    const buf = Buffer.from(base64Data, "base64");
    if (!mimeType || (!mimeType.includes("jpeg") && !mimeType.includes("png"))) {
      return base64Data;
    }
    
    // Use sharp to slightly alter the image by changing quality randomly
    const randomQuality = Math.floor(Math.random() * 5) + 90; // 90 to 94
    let processedBuf;
    
    if (mimeType.includes("png")) {
      processedBuf = await sharp(buf)
        .png({ compressionLevel: Math.floor(Math.random() * 3) + 6 }) // Random compression
        .toBuffer();
    } else {
      processedBuf = await sharp(buf)
        .jpeg({ quality: randomQuality }) // Random quality changes file hash
        .toBuffer();
    }
    
    return processedBuf.toString("base64");
  } catch (e) {
    console.error("[API] Error in addMediaFingerprint:", e);
    return base64Data;
  }
}

export const createWhatsAppRoutes = ({
  whatsappConnections,
  whatsappSockets,
  ensureSocketConnected,
  resolveWhatsAppJID,
  saveCredentialsToSupabase,
  ensureClinicStatus,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
  sendWhatsAppMessage,
  sendWhatsAppImage,
  disconnectWhatsAppSession,
  addLog,
  antiSpamStatsByNumber,
  whiskey
}) => {
  const router = express.Router();

  const resolveAuthorizedClinicId = (req, requestedClinicId) => {
    const actorRole = String(req.user?.role || "").toLowerCase();
    const actorClinicId = String(req.clinicId || req.user?.clinic_id || "").trim();
    const targetClinicId = String(requestedClinicId || "").trim();

    if (!actorClinicId && actorRole !== "super_admin") {
      return { ok: false, status: 401, error: "Contexto de clínica ausente na sessão" };
    }

    if (actorRole === "super_admin") {
      if (!targetClinicId) {
        return { ok: false, status: 400, error: "clinicId é obrigatório para super_admin" };
      }
      return { ok: true, clinicId: targetClinicId };
    }

    if (!targetClinicId) {
      return { ok: true, clinicId: actorClinicId };
    }

    if (targetClinicId !== actorClinicId) {
      return { ok: false, status: 403, error: "Acesso negado para outra clínica" };
    }

    return { ok: true, clinicId: actorClinicId };
  };

  const requireWhatsAppAdmin = (req, res, next) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (!['admin', 'owner', 'super_admin'].includes(role)) {
      return res.status(403).json({ ok: false, error: 'Apenas administradores podem alterar configurações ou grupos do WhatsApp.' });
    }
    return next();
  };

  // Rate limiting para o WhatsApp Send
  const whatsappRateLimit = new Map();
  const RATE_LIMIT_WINDOW = 10000; // 10 seconds
  const RATE_LIMIT_MAX = 5; // 5 messages per window

  // Endpoint antispam (requer autenticação por segurança, para evitar vazamento de dados de bloqueio)
  router.get("/antispam/:number", (req, res) => {
    // Validar permissão básica (somente usuários autenticados deveriam ver isso)
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "Não autorizado" });
    }
    const normalizedNumber = String(req.params?.number || "").replace(/\D/g, "");
    const current = antiSpamStatsByNumber.get(normalizedNumber) || {
      messages_sent: 0,
      blocked: false,
      risk_score: 0,
      updated_at: new Date().toISOString(),
    };

    res.json({
      ok: true,
      number: normalizedNumber,
      stats: current,
    });
  });

  router.post("/reset-session", requireWhatsAppAdmin, async (req, res) => {
    const auth = resolveAuthorizedClinicId(req, req.body?.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const clinicId = auth.clinicId;
    
    try {
      addLog(`[System] Reseting session for ${clinicId}...`);
      if (whatsappSockets[clinicId]) {
        try { whatsappSockets[clinicId].end(undefined); } catch(e) {}
        delete whatsappSockets[clinicId];
      }
      delete whatsappConnections[clinicId];
      
      const authDir = ensureClinicStatus(clinicId);
      if (fs.existsSync(authDir)) {
        fs.rmSync(authDir, { recursive: true, force: true });
      }
      
      // Também remover do Supabase se quiser começar do zero absoluto
      await saveCredentialsToSupabase(clinicId, null);
      
      res.json({ ok: true, message: "Sessão resetada com sucesso. Conecte novamente." });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post("/test-send", async (req, res) => {
    const { phone, message, clinicId: requestedClinicId } = req.body;
    if (!phone || !message) return res.status(400).json({ ok: false, error: "Phone and message required" });
    const auth = resolveAuthorizedClinicId(req, requestedClinicId || req.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    
    try {
      await sendWhatsAppMessage({ clinicId: auth.clinicId, to: phone, message });
      res.json({ ok: true, message: "Mensagem de teste enviada com sucesso!" });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post("/send-image", async (req, res) => {
    const { phone, imageUrl, caption, clinicId: requestedClinicId } = req.body;
    if (!phone || !imageUrl) return res.status(400).json({ ok: false, error: "Phone and imageUrl required" });
    const auth = resolveAuthorizedClinicId(req, requestedClinicId || req.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });

    // Anti-SSRF: permitir apenas URLs https de hosts confiáveis
    let parsed;
    try {
      parsed = new URL(String(imageUrl));
    } catch (e) {
      return res.status(400).json({ ok: false, error: "imageUrl inválida" });
    }
    const allowedHosts = new Set([
      ...(SUPABASE_URL ? [new URL(SUPABASE_URL).hostname] : []),
      "clinxia.vercel.app",
    ]);
    const hostAllowed = parsed.protocol === "https:" && (
      allowedHosts.has(parsed.hostname) ||
      parsed.hostname.endsWith(".supabase.co")
    );
    if (!hostAllowed) {
      return res.status(400).json({ ok: false, error: "imageUrl deve apontar para o storage do sistema." });
    }

    try {
      if (!sendWhatsAppImage) {
        return res.status(501).json({ ok: false, error: "Envio de imagem não suportado nesta versão." });
      }
      await sendWhatsAppImage({ clinicId: auth.clinicId, to: phone, imageUrl, caption: caption || '' });
      res.json({ ok: true, message: "Imagem enviada com sucesso!" });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post("/connect", requireWhatsAppAdmin, async (req, res) => {
    const { clinicId: requestedClinicId, phoneNumber } = req.body;
    const auth = resolveAuthorizedClinicId(req, requestedClinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const clinicId = auth.clinicId;

    if (clinicId === "jpb-wpp") {
      return res.status(400).json({ ok: false, error: "Conexão manual à sessão antiga jpb-wpp foi desativada. Use a multi-sessão." });
    }

    try {
      // Se já existe socket vivo, reutilizar (evita quebrar sessão conectada)
      const existingSock = whatsappSockets[clinicId];
      if (existingSock && whatsappConnections[clinicId]?.status === "connected") {
        return res.json({ success: true, status: "connected" });
      }

      // NÃO apagamos credenciais aqui: se a sessão já está pareada,
      // ela deve reconectar automaticamente. A limpeza forçada fica
      // apenas em /reset-session (pedido explícito do usuário).

      whatsappConnections[clinicId] = { status: "connecting" };

      const sock = await ensureSocketConnected(clinicId);

      if (!sock) {
        throw new Error("Não foi possível inicializar o socket do WhatsApp.");
      }

      // Generate pairing code if phone provided
      if (phoneNumber) {
        const cleanPhone = phoneNumber.replace(/\D/g, "");
        try {
          const pairingCode = await sock.requestPairingCode(cleanPhone);
          whatsappConnections[clinicId] = {
            status: "pairing",
            pairingCode: pairingCode,
            connected: false,
            qr: null,
          };
          return res.json({
            success: true,
            status: "pairing",
            pairingCode: pairingCode,
            message: "Código de pareamento gerado!",
          });
        } catch (pairError) {
          console.error("Pairing code error:", pairError);
        }
      }

      // If already has session, try to reconnect
      if (sock.authState?.creds?.registered) {
        whatsappConnections[clinicId] = {
          status: "connected",
          connected: true,
          phoneNumber: sock.user?.id?.replace(":@s.whatsapp.net", ""),
        };
        return res.json({ success: true, status: "connected" });
      }

      // Return connecting status - QR will be generated by polling status
      whatsappConnections[clinicId] = { status: "connecting" };
      res.json({
        success: true,
        status: "connecting",
        message: "Aguardando QR Code...",
      });
    } catch (error) {
      console.error("Connect error:", error);
      res.status(502).json({ success: false, error: "Não foi possível conectar o WhatsApp." });
    }
  });

  router.get("/status/:clinicId", async (req, res) => {
    const auth = resolveAuthorizedClinicId(req, req.params.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const clinicId = auth.clinicId;

    if (whatsappConnections[clinicId]) {
      const conn = whatsappConnections[clinicId];

      // Force generation of Base64 if missing but raw QR exists
      if (conn.qr && !conn.qrBase64) {
        try {
          conn.qrBase64 = await QRCode.toDataURL(conn.qr);
        } catch (e) {
          console.error("QR Generate Error:", e);
        }
      }

      return res.json({
        ok: true,
        ...conn,
        qrCode: conn.qrBase64,
      });
    }

    // Não auto-conectar - apenas retornar estado atual
    res.json({ ok: true, status: "disconnected" });
  });

  router.post("/disconnect/:clinicId", requireWhatsAppAdmin, async (req, res) => {
    const auth = resolveAuthorizedClinicId(req, req.params.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const clinicId = auth.clinicId;
    await disconnectWhatsAppSession(clinicId);
    res.json({ ok: true, status: "disconnected" });
  });

  router.post("/send", async (req, res) => {
    const { clinicId: requestedClinicId, to, message, media, fileName, mimeType } = req.body;
    const auth = resolveAuthorizedClinicId(req, requestedClinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const clinicId = auth.clinicId;

    // Rate limiting
    const rateKey = `${clinicId}-${to}`;
    const now = Date.now();
    const timestamps = whatsappRateLimit.get(rateKey) || [];
    const windowTimestamps = timestamps.filter(
      (t) => now - t < RATE_LIMIT_WINDOW,
    );

    if (windowTimestamps.length >= RATE_LIMIT_MAX) {
      return res
        .status(429)
        .json({ ok: false, error: "Muitas mensagens. Aguarde alguns segundos." });
    }

    windowTimestamps.push(now);
    whatsappRateLimit.set(rateKey, windowTimestamps);

    // Clean old entries periodically
    if (whatsappRateLimit.size > 1000) {
      for (const [key, timestamps] of whatsappRateLimit.entries()) {
        if (timestamps.every((t) => now - t > RATE_LIMIT_WINDOW)) {
          whatsappRateLimit.delete(key);
        }
      }
    }

    try {
      const sock = await ensureSocketConnected(clinicId);

      // Wait up to 15 seconds if it's connecting
      let waitCount = 0;
      while (whatsappConnections[clinicId]?.status === "connecting" && waitCount < 30) {
        await new Promise(resolve => setTimeout(resolve, 500));
        waitCount++;
      }

      if (whatsappConnections[clinicId]?.status !== "connected") {
        return res
          .status(400)
          .json({ ok: false, error: "Dispositivo não conectado. Status atual: " + (whatsappConnections[clinicId]?.status || "desconhecido") });
      }

      if (media) {
        // ── CAMADA 1: Fingerprint de imagem ───────────────────────────────────
        // Insere bloco de comentário JPEG único por envio (muda o hash da mídia)
        // sem alterar a imagem visível. Impede detecção de mídia duplicada em massa.
        const fingerprintedMedia = await addMediaFingerprint(media, mimeType || "image/jpeg");
        const buf = Buffer.from(fingerprintedMedia, "base64");
        const target = await resolveWhatsAppJID(sock, to);
        const jidsToSend = Array.isArray(target) ? target : [target];
        let lastResult = null;
        for (const jid of jidsToSend) {
          addLog(`[API] Enviando mídia via ${clinicId} para ${jid}...`);
          const msgPayload = { mimetype: mimeType || "image/jpeg" };
          if (mimeType && mimeType.startsWith("image")) {
            msgPayload.image = buf;
          } else if (mimeType && mimeType.startsWith("video")) {
            msgPayload.video = buf;
          } else if (mimeType && mimeType.startsWith("audio")) {
            msgPayload.audio = buf;
            msgPayload.ptt = false;
          } else {
            msgPayload.document = buf;
            msgPayload.fileName = fileName || "file";
          }
          if (message) msgPayload.caption = message;
          lastResult = await sock.sendMessage(jid, msgPayload);
          if (jidsToSend.length > 1) await new Promise(r => setTimeout(r, 1000));
        }
        return res.json({ ok: true, messageId: lastResult?.key?.id });
      }

      const quickResult = await sendWhatsAppMessage({ clinicId, to, message });
      return res.json({ ok: true, messageId: quickResult.messageId });
    } catch (error) {
      addLog(`[API] Erro ao enviar: ${error.message}`);
      res.status(502).json({ ok: false, error: "Não foi possível enviar a mensagem." });
    }
  });

  router.post("/presence", async (req, res) => {
    const { clinicId: requestedClinicId, to, presence } = req.body;
    if (!to) return res.status(400).json({ ok: false, error: "to é obrigatório" });
    const auth = resolveAuthorizedClinicId(req, requestedClinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const clinicId = auth.clinicId;

    try {
      const sock = await ensureSocketConnected(clinicId);
      let waitCount = 0;
      while (whatsappConnections[clinicId]?.status === "connecting" && waitCount < 30) {
        await new Promise(resolve => setTimeout(resolve, 500));
        waitCount++;
      }
      if (whatsappConnections[clinicId]?.status !== "connected") {
        return res.status(400).json({ ok: false, error: "Dispositivo não conectado" });
      }

      const target = await resolveWhatsAppJID(sock, to);
      const jid = Array.isArray(target) ? target[0] : target;
      if (!jid) return res.status(400).json({ ok: false, error: "JID não encontrado para " + to });

      await sock.sendPresenceUpdate(presence || "composing", jid);
      return res.json({ ok: true });
    } catch (error) {
      addLog(`[API] Erro ao enviar presença: ${error.message}`);
      return res.status(502).json({ ok: false, error: "Não foi possível atualizar a presença." });
    }
  });

  // ════════════════════════════════════════════════════════════════
  // AI Integration
  // ════════════════════════════════════════════════════════════════
  router.post("/ai/config", requireWhatsAppAdmin, (req, res) => {
    const { clinicId: cid } = req.body;
    const auth = resolveAuthorizedClinicId(req, cid);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!whiskey) return res.status(501).json({ ok: false, error: "WhiskeyService não disponível" });
    const config = req.body.config || req.body;
    if (config.enabled !== undefined) {
      whiskey.setAIConfig(auth.clinicId, {
        enabled: config.enabled,
        provider: config.provider || "openai",
        triggerWords: config.triggerWords || [],
        onlyGroups: config.onlyGroups || false,
      });
    }
    return res.json({ ok: true, config: whiskey.getAIConfig(auth.clinicId) });
  });

  router.get("/ai/config/:clinicId", (req, res) => {
    const auth = resolveAuthorizedClinicId(req, req.params.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!whiskey) return res.status(501).json({ ok: false, error: "WhiskeyService não disponível" });
    return res.json({ ok: true, config: whiskey.getAIConfig(auth.clinicId) });
  });

  // Rate limit de IA por clínica: 10 requisições/minuto
  const aiRateLimit = new Map();
  const AI_RATE_WINDOW = 60 * 1000;
  const AI_RATE_MAX = 10;

  router.post("/ai/ask", async (req, res) => {
    const { clinicId: cid, message } = req.body;
    const auth = resolveAuthorizedClinicId(req, cid);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!whiskey) return res.status(501).json({ ok: false, error: "WhiskeyService não disponível" });
    if (!message) return res.status(400).json({ ok: false, error: "message é obrigatório" });
    if (String(message).length > 2000) return res.status(400).json({ ok: false, error: "message muito longa" });

    const now = Date.now();
    const timestamps = (aiRateLimit.get(auth.clinicId) || []).filter((t) => now - t < AI_RATE_WINDOW);
    if (timestamps.length >= AI_RATE_MAX) {
      return res.status(429).json({ ok: false, error: "Limite de requisições de IA atingido. Aguarde um minuto." });
    }
    timestamps.push(now);
    aiRateLimit.set(auth.clinicId, timestamps);

    const allowedProviders = new Set(["openai", "deepseek"]);
    const provider = allowedProviders.has(String(req.body.provider || "").toLowerCase())
      ? String(req.body.provider).toLowerCase()
      : "openai";

    try {
      const reply = await whiskey._askAI(message, provider);
      return res.json({ ok: true, reply: reply || "Sem resposta da IA" });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ════════════════════════════════════════════════════════════════
  // Group Management
  // ════════════════════════════════════════════════════════════════
  const requireGroupJid = (req, res) => {
    if (!req.body.groupJid && !req.params.groupJid) {
      res.status(400).json({ ok: false, error: "groupJid é obrigatório" });
      return false;
    }
    return true;
  };

  router.post("/group/kick", requireWhatsAppAdmin, async (req, res) => {
    if (!requireGroupJid(req, res)) return;
    const auth = resolveAuthorizedClinicId(req, req.body.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!whiskey) return res.status(501).json({ ok: false, error: "WhiskeyService não disponível" });
    try {
      await whiskey.groupKick(auth.clinicId, req.body.groupJid, req.body.participants);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.post("/group/add", requireWhatsAppAdmin, async (req, res) => {
    if (!requireGroupJid(req, res)) return;
    const auth = resolveAuthorizedClinicId(req, req.body.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!whiskey) return res.status(501).json({ ok: false, error: "WhiskeyService não disponível" });
    try {
      await whiskey.groupAdd(auth.clinicId, req.body.groupJid, req.body.participants);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.post("/group/promote", requireWhatsAppAdmin, async (req, res) => {
    if (!requireGroupJid(req, res)) return;
    const auth = resolveAuthorizedClinicId(req, req.body.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!whiskey) return res.status(501).json({ ok: false, error: "WhiskeyService não disponível" });
    try {
      await whiskey.groupPromote(auth.clinicId, req.body.groupJid, req.body.participants);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.post("/group/demote", requireWhatsAppAdmin, async (req, res) => {
    if (!requireGroupJid(req, res)) return;
    const auth = resolveAuthorizedClinicId(req, req.body.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!whiskey) return res.status(501).json({ ok: false, error: "WhiskeyService não disponível" });
    try {
      await whiskey.groupDemote(auth.clinicId, req.body.groupJid, req.body.participants);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.post("/group/setting", requireWhatsAppAdmin, async (req, res) => {
    if (!requireGroupJid(req, res)) return;
    const auth = resolveAuthorizedClinicId(req, req.body.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!whiskey) return res.status(501).json({ ok: false, error: "WhiskeyService não disponível" });
    try {
      await whiskey.groupToggle(auth.clinicId, req.body.groupJid, req.body.setting);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.get("/group/info/:clinicId/:groupJid", async (req, res) => {
    const auth = resolveAuthorizedClinicId(req, req.params.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!whiskey) return res.status(501).json({ ok: false, error: "WhiskeyService não disponível" });
    try {
      const info = await whiskey.groupInfo(auth.clinicId, req.params.groupJid);
      res.json({ ok: true, data: info });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.get("/group/list/:clinicId", async (req, res) => {
    const auth = resolveAuthorizedClinicId(req, req.params.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!whiskey) return res.status(501).json({ ok: false, error: "WhiskeyService não disponível" });
    try {
      const groups = await whiskey.groupList(auth.clinicId);
      res.json({ ok: true, data: groups });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // ════════════════════════════════════════════════════════════════
  // Bot Config (autoread, always online, prefix, anti-link, etc)
  // ════════════════════════════════════════════════════════════════
  router.post("/bot/config", requireWhatsAppAdmin, async (req, res) => {
    const auth = resolveAuthorizedClinicId(req, req.body.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!whiskey) return res.status(501).json({ ok: false, error: "WhiskeyService não disponível" });
    const cfg = req.body.config || req.body;
    whiskey.setBotConfig(auth.clinicId, cfg);
    if (cfg.autoread !== undefined) await whiskey.setAutoRead(auth.clinicId, cfg.autoread);
    if (cfg.alwaysOnline !== undefined) await whiskey.setAlwaysOnline(auth.clinicId, cfg.alwaysOnline);
    res.json({ ok: true, config: whiskey.getBotConfig(auth.clinicId) });
  });

  router.get("/bot/config/:clinicId", (req, res) => {
    const auth = resolveAuthorizedClinicId(req, req.params.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!whiskey) return res.status(501).json({ ok: false, error: "WhiskeyService não disponível" });
    res.json({ ok: true, config: whiskey.getBotConfig(auth.clinicId) });
  });

  // ════════════════════════════════════════════════════════════════
  // Anti-Delete / Anti-Edit
  // ════════════════════════════════════════════════════════════════
  router.get("/deleted/:clinicId", (req, res) => {
    const auth = resolveAuthorizedClinicId(req, req.params.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!whiskey) return res.status(501).json({ ok: false, error: "WhiskeyService não disponível" });
    try {
      const deleted = whiskey.getDeletedMessages(auth.clinicId);
      res.json({ ok: true, data: deleted });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // ════════════════════════════════════════════════════════════════
  // Downloaders
  // ════════════════════════════════════════════════════════════════
  router.post("/download/youtube", async (req, res) => {
    const auth = resolveAuthorizedClinicId(req, req.body.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!whiskey) return res.status(501).json({ ok: false, error: "WhiskeyService não disponível" });
    if (!req.body.url) return res.status(400).json({ ok: false, error: "url é obrigatório" });
    try {
      const result = await whiskey.downloadYoutube(req.body.url, req.body.format || "audio");
      res.json({ ok: true, data: result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.post("/download/tiktok", async (req, res) => {
    const auth = resolveAuthorizedClinicId(req, req.body.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!whiskey) return res.status(501).json({ ok: false, error: "WhiskeyService não disponível" });
    if (!req.body.url) return res.status(400).json({ ok: false, error: "url é obrigatório" });
    try {
      const result = await whiskey.downloadTiktok(req.body.url);
      res.json({ ok: true, data: result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.post("/download/instagram", async (req, res) => {
    const auth = resolveAuthorizedClinicId(req, req.body.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!whiskey) return res.status(501).json({ ok: false, error: "WhiskeyService não disponível" });
    if (!req.body.url) return res.status(400).json({ ok: false, error: "url é obrigatório" });
    try {
      const result = await whiskey.downloadInstagram(req.body.url);
      res.json({ ok: true, data: result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // ════════════════════════════════════════════════════════════════
  // Sessions overview
  // ════════════════════════════════════════════════════════════════
  router.get("/sessions/:clinicId", (req, res) => {
    const auth = resolveAuthorizedClinicId(req, req.params.clinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    if (!whiskey) return res.status(501).json({ ok: false, error: "WhiskeyService não disponível" });
    try {
      // Apenas a sessão da clínica autorizada (nunca todas)
      const all = whiskey.getAllConnections();
      const own = Object.keys(all || {})
        .filter((cid) => cid === auth.clinicId)
        .reduce((acc, cid) => {
          acc[cid] = all[cid];
          return acc;
        }, {});
      res.json({ ok: true, data: own });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  return router;
};
