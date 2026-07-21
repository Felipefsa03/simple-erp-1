import express from "express";
import fs from "fs";
import QRCode from "qrcode";
import crypto from "crypto";

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
function addMediaFingerprint(base64Data, mimeType) {
  try {
    const buf = Buffer.from(base64Data, "base64");
    const randBytes = crypto.randomBytes(12);

    // ── JPEG ──────────────────────────────────────────────────────────────────
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
      if (buf[0] !== 0xFF || buf[1] !== 0xD8) return base64Data; // not JPEG

      // JPEG comment segment: FF FE [uint16-BE length] [data]
      // length = 2 (for length field itself) + data.length
      const commentSeg = Buffer.alloc(2 + 2 + randBytes.length);
      commentSeg[0] = 0xFF;
      commentSeg[1] = 0xFE;
      commentSeg.writeUInt16BE(2 + randBytes.length, 2);
      randBytes.copy(commentSeg, 4);

      const fingerprintedBuf = Buffer.concat([
        buf.slice(0, 2),  // SOI: FF D8
        commentSeg,        // comment segment com bytes únicos
        buf.slice(2),      // resto do JPEG
      ]);
      return fingerprintedBuf.toString("base64");
    }

    // ── PNG ───────────────────────────────────────────────────────────────────
    if (mimeType.includes("png")) {
      const PNG_SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      if (!buf.slice(0, 8).equals(PNG_SIG)) return base64Data;

      // Chunk tEXt privado logo após assinatura PNG (antes do IHDR)
      // Estrutura: [uint32-BE length][chunk type 4b][data][crc 4b]
      const keyword = Buffer.from("Comment\0"); // keyword + null separator
      const comment = randBytes;
      const chunkData = Buffer.concat([keyword, comment]);
      const chunkType = Buffer.from("tEXt");
      const lengthBuf = Buffer.alloc(4);
      lengthBuf.writeUInt32BE(chunkData.length, 0);

      // CRC cobre tipo + data
      const crcInput = Buffer.concat([chunkType, chunkData]);
      const crcValue = crc32(crcInput);
      const crcBuf = Buffer.alloc(4);
      crcBuf.writeUInt32BE(crcValue >>> 0, 0);

      const chunk = Buffer.concat([lengthBuf, chunkType, chunkData, crcBuf]);

      // Insere após assinatura PNG (8 bytes), antes do IHDR
      const fingerprintedBuf = Buffer.concat([
        buf.slice(0, 8), // PNG signature
        chunk,
        buf.slice(8),
      ]);
      return fingerprintedBuf.toString("base64");
    }

    // ── Outros formatos: append de bytes ─────────────────────────────────────
    return Buffer.concat([buf, randBytes]).toString("base64");

  } catch (e) {
    return base64Data; // fallback seguro — envia original
  }
}

/** CRC32 para chunks PNG */
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
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
  antiSpamStatsByNumber
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

  router.post("/reset-session", async (req, res) => {
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

  router.post("/connect", async (req, res) => {
    const { clinicId: requestedClinicId, phoneNumber } = req.body;
    const auth = resolveAuthorizedClinicId(req, requestedClinicId);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const clinicId = auth.clinicId;

    try {
      // Limpar qualquer sessão existente antes de conectar
      if (whatsappSockets[clinicId]) {
        try {
          whatsappSockets[clinicId].end(undefined);
        } catch (e) {}
        delete whatsappSockets[clinicId];
      }

      // Limpar credenciais do Supabase para forçar QR limpo
      try {
        await fetch(
          `${SUPABASE_URL}/rest/v1/whatsapp_credentials?clinic_id=eq.${clinicId}`,
          {
            method: "DELETE",
            headers: {
              apikey: SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY}`,
            },
          },
        );
      } catch (e) {}

      // Limpar auth local
      try {
        const authDir = ensureClinicStatus(clinicId);
        if (fs.existsSync(authDir)) {
          fs.rmSync(authDir, { recursive: true, force: true });
          fs.mkdirSync(authDir, { recursive: true });
        }
      } catch (e) {}

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
      res.status(500).json({ success: false, error: error.message });
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

  router.post("/disconnect/:clinicId", async (req, res) => {
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
        const fingerprintedMedia = addMediaFingerprint(media, mimeType || "image/jpeg");
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
      res.status(400).json({ ok: false, error: error.message });
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
      return res.json({ ok: false, error: error.message });
    }
  });

  return router;
};
