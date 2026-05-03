import express from "express";
import fs from "fs";
import QRCode from "qrcode";

export const createWhatsAppRoutes = ({
  whatsappConnections,
  whatsappSockets,
  ensureSocketConnected,
  saveCredentialsToSupabase,
  ensureClinicStatus,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
  sendWhatsAppMessage,
  disconnectWhatsAppSession,
  addLog,
  antiSpamStatsByNumber
}) => {
  const router = express.Router();

  // Rate limiting para o WhatsApp Send
  const whatsappRateLimit = new Map();
  const RATE_LIMIT_WINDOW = 10000; // 10 seconds
  const RATE_LIMIT_MAX = 5; // 5 messages per window

  // Endpoint antispam
  router.get("/antispam/:number", (req, res) => {
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
    const { clinicId } = req.body;
    if (!clinicId) return res.status(400).json({ ok: false, error: "clinicId required" });
    
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
    const { phone, message, clinicId } = req.body;
    if (!phone || !message) return res.status(400).json({ ok: false, error: "Phone and message required" });
    
    try {
      // Nota: SYSTEM_WHATSAPP_CLINIC_ID e GLOBAL_CLINIC_ID eram defaults no index.js
      // Assumimos que 'system-global' será tratado dentro de sendWhatsAppMessage ou clinicId virá preenchido.
      await sendWhatsAppMessage({ clinicId: clinicId || 'system-global', to: phone, message });
      res.json({ ok: true, message: "Mensagem de teste enviada com sucesso!" });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post("/connect", async (req, res) => {
    const { clinicId, phoneNumber } = req.body;

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
    const { clinicId } = req.params;

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
    const { clinicId } = req.params;
    await disconnectWhatsAppSession(clinicId);
    res.json({ ok: true, status: "disconnected" });
  });

  router.post("/send", async (req, res) => {
    const { clinicId, to, message } = req.body;

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
      const quickResult = await sendWhatsAppMessage({ clinicId, to, message });
      return res.json({ ok: true, messageId: quickResult.messageId });
    } catch (error) {
      addLog(`[API] Erro ao enviar: ${error.message}`);
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  return router;
};
