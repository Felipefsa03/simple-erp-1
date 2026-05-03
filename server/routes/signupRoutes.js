import express from "express";
import crypto from "crypto";
import {
  fetchUserByEmail,
  fetchClinicById,
  createSupabaseAuthUser,
  upsertClinicRecord,
  upsertClinicAdminUser,
  assertPhoneVerificationValid,
  consumePhoneVerification
} from "../services/dbService.js";
import {
  resolveMercadoPagoCredentials,
  getPlanPricesFromConfig
} from "../services/paymentGateway.js";
import {
  getVerificationSession, setVerificationSession
} from "../services/sessionStore.js";

export const createSignupRoutes = ({
  supabaseAdmin,
  fetchGlobalIntegrationConfig,
  whatsappConnections,
  ensureSocketConnected,
  sendWhatsAppMessage,
  SYSTEM_WHATSAPP_CLINIC_ID,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  addLog,
  isUuid,
  brazilianPhoneCandidates,
}) => {
  const router = express.Router();

  // ---- Constants ----
  const SIGNUP_CODE_TTL_MS = 30 * 1000;
  const SIGNUP_VERIFIED_TTL_MS = 30 * 60 * 1000;
  const SIGNUP_CODE_MAX_ATTEMPTS = 3;
  const SIGNUP_BLOCK_MS = 60 * 1000;
  const SIGNUP_MAX_SENDS_PER_WINDOW = 3;
  const SIGNUP_SEND_WINDOW_MS = 10 * 60 * 1000;

  // ---- Helpers ----
  const sanitizePlan = (plan) => {
    if (!plan) return "basico";
    const allowed = new Set(["basico", "profissional", "premium"]);
    return allowed.has(String(plan)) ? String(plan) : "basico";
  };

  const normalizePhoneForSignup = (rawPhone) => {
    const [first] = brazilianPhoneCandidates(rawPhone || "");
    if (!first) return "";
    const digits = String(first).replace(/\D/g, "");
    return digits.length >= 12 ? digits : "";
  };

  const maskPhone = (rawPhone) => {
    const digits = String(rawPhone || "").replace(/\D/g, "");
    if (digits.length < 4) return "(**) *****-****";
    return `(**) *****-${digits.slice(-4)}`;
  };

  const hashSignupCode = (signupId, code) =>
    crypto.createHash("sha256").update(`${signupId}:${code}`).digest("hex");

  const generateNumericCode = () =>
    String(Math.floor(100000 + Math.random() * 900000));

  // ---- Routes ----

  router.get("/config", async (_req, res) => {
    try {
      console.log("[SignupConfig] Endpoint called");
      const globalConfig = await fetchGlobalIntegrationConfig();
      console.log("[SignupConfig] globalConfig:", globalConfig);
      const planPrices = getPlanPricesFromConfig(globalConfig);
      console.log("[SignupConfig] planPrices:", planPrices);
      const { token, publicKey } = await resolveMercadoPagoCredentials();
      const whatsappConnected =
        whatsappConnections[SYSTEM_WHATSAPP_CLINIC_ID]?.status === "connected";

      return res.json({
        ok: true,
        plan_prices: planPrices,
        mercado_pago_configured: Boolean(token && publicKey),
        phone_verification_enabled: whatsappConnected,
        whatsapp_system_connected: whatsappConnected,
      });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post("/check-availability", async (req, res) => {
    try {
      const { email, phone, clinicDoc } = req.body;

      if (email) {
        const cleanEmail = email.trim().toLowerCase();
        const { data: userByEmail } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', cleanEmail)
          .limit(1);

        if (userByEmail && userByEmail.length > 0) {
          return res.json({ ok: false, error: 'Este e-mail já está cadastrado. Faça login para continuar.' });
        }
      }

      if (phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        const { data: userByPhone } = await supabaseAdmin
          .from('users')
          .select('id')
          .like('phone', `%${cleanPhone}%`)
          .limit(1);

        if (userByPhone && userByPhone.length > 0) {
          return res.json({ ok: false, error: 'Este telefone já está associado a outra conta.' });
        }
      }

      if (clinicDoc) {
        const cleanDoc = clinicDoc.replace(/\D/g, '');
        const { data: clinicByDoc } = await supabaseAdmin
          .from('clinics')
          .select('id')
          .eq('document', cleanDoc)
          .limit(1);

        if (clinicByDoc && clinicByDoc.length > 0) {
          return res.json({ ok: false, error: 'Esta clínica já está cadastrada no sistema com este CPF/CNPJ.' });
        }
      }

      return res.json({ ok: true });
    } catch (err) {
      console.error('[SIGNUP] Error checking availability:', err);
      return res.status(500).json({ ok: false, error: 'Erro ao verificar disponibilidade de dados.' });
    }
  });

  router.post("/phone/send-code", async (req, res) => {
    const signupId = String(req.body?.signupId || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const name = String(req.body?.name || "").trim();

    if (!signupId || !phone) {
      return res.status(400).json({ ok: false, error: "signupId e phone sao obrigatorios." });
    }

    const normalizedPhone = normalizePhoneForSignup(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ ok: false, error: "Telefone invalido." });
    }

    try {
      await ensureSocketConnected(SYSTEM_WHATSAPP_CLINIC_ID);
      let waitCount = 0;
      while (whatsappConnections[SYSTEM_WHATSAPP_CLINIC_ID]?.status === "connecting" && waitCount < 30) {
        await new Promise(resolve => setTimeout(resolve, 500));
        waitCount++;
      }
    } catch (e) {
      console.error("Erro ao garantir conexão global:", e);
    }

    const systemConnected = whatsappConnections[SYSTEM_WHATSAPP_CLINIC_ID]?.status === "connected";
    if (!systemConnected) {
      console.log(`[Signup Phone] WhatsApp global não conectado. Status atual: ${whatsappConnections[SYSTEM_WHATSAPP_CLINIC_ID]?.status}`);
      return res.status(503).json({
        ok: false,
        error: "WhatsApp global nao conectado. Solicite ao super admin para conectar em Sistema (Global).",
      });
    }

    const now = Date.now();
    const existing = await getVerificationSession(signupId);
    const session = existing || {
      signupId,
      phone: normalizedPhone,
      sendTimestamps: [],
      attempts: 0,
      blockedUntil: 0,
      verifiedAt: 0,
      expiresAt: 0,
      codeHash: "",
    };

    if (session.blockedUntil && now < session.blockedUntil) {
      return res.status(429).json({
        ok: false,
        error: "Muitas tentativas. Aguarde para solicitar novo codigo.",
        retry_after_seconds: Math.ceil((session.blockedUntil - now) / 1000),
      });
    }

    if (session.phone !== normalizedPhone) {
      session.phone = normalizedPhone;
      session.attempts = 0;
      session.blockedUntil = 0;
      session.verifiedAt = 0;
      session.sendTimestamps = [];
    }

    const recentSends = (session.sendTimestamps || []).filter(
      (timestamp) => now - timestamp < SIGNUP_SEND_WINDOW_MS,
    );
    if (recentSends.length >= SIGNUP_MAX_SENDS_PER_WINDOW) {
      return res.status(429).json({
        ok: false,
        error: "Limite de envios atingido. Aguarde alguns minutos para tentar novamente.",
      });
    }

    const code = generateNumericCode();
    session.codeHash = hashSignupCode(signupId, code);
    session.expiresAt = now + SIGNUP_CODE_TTL_MS;
    session.verifiedAt = 0;
    session.attempts = 0;
    session.blockedUntil = 0;
    session.sendTimestamps = [...recentSends, now];
    await setVerificationSession(signupId, session);

    const greetings = ["Olá!", "Oi!", "Tudo bem?", "Saudações da Clinxia!"];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    const message = [
      `${greeting} Clinxia - Validação de Telefone`,
      "",
      `Seu código de verificação é: *${code}*`,
      "Ele expira em 30 segundos.",
      "",
      "Use este código para concluir seu cadastro com segurança. Se não solicitou, pode ignorar esta mensagem.",
    ].join("\n");

    try {
      addLog(`[Signup] Attempting to send code to ${normalizedPhone} via ${SYSTEM_WHATSAPP_CLINIC_ID}`);

      const delay = Math.floor(Math.random() * 2000) + 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      await sendWhatsAppMessage({
        clinicId: SYSTEM_WHATSAPP_CLINIC_ID,
        to: normalizedPhone,
        message,
      });
      addLog(`[Signup] Code sent successfully to ${normalizedPhone}`);
    } catch (error) {
      addLog(`[Signup] Error sending code: ${error.message}`);
      return res.status(500).json({
        ok: false,
        error: error.message,
        details: "Verifique se o WhatsApp Global está conectado no painel de Super Admin."
      });
    }

    return res.json({
      ok: true,
      expires_in_seconds: 30,
      masked_phone: maskPhone(normalizedPhone),
      destination_name: name || "",
      debug_jid: session.phone + "@s.whatsapp.net",
      sender_id: SYSTEM_WHATSAPP_CLINIC_ID
    });
  });

  router.post("/phone/verify-code", async (req, res) => {
    const signupId = String(req.body?.signupId || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const code = String(req.body?.code || "").trim();

    if (!signupId || !phone || !code) {
      return res.status(400).json({ ok: false, error: "signupId, phone e code sao obrigatorios." });
    }

    const normalizedPhone = normalizePhoneForSignup(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ ok: false, error: "Telefone invalido." });
    }

    const session = await getVerificationSession(signupId);
    if (!session || session.phone !== normalizedPhone) {
      return res.status(400).json({
        ok: false,
        error: "Nenhuma validacao encontrada para este telefone.",
      });
    }

    const now = Date.now();
    if (session.blockedUntil && now < session.blockedUntil) {
      return res.status(429).json({
        ok: false,
        error: "Muitas tentativas incorretas. Tente novamente mais tarde.",
        retry_after_seconds: Math.ceil((session.blockedUntil - now) / 1000),
      });
    }

    if (!session.expiresAt || now > session.expiresAt) {
      return res.status(400).json({ ok: false, error: "Codigo expirado. Solicite um novo codigo." });
    }

    const receivedHash = hashSignupCode(signupId, code);
    if (session.codeHash !== receivedHash) {
      session.attempts = (session.attempts || 0) + 1;
      if (session.attempts >= SIGNUP_CODE_MAX_ATTEMPTS) {
        session.blockedUntil = now + SIGNUP_BLOCK_MS;
        await setVerificationSession(signupId, session);
        return res.status(429).json({
          ok: false,
          error: "Codigo incorreto. Bloqueado temporariamente por seguranca.",
        });
      }
      await setVerificationSession(signupId, session);
      return res.status(400).json({
        ok: false,
        error: `Codigo incorreto. Tentativas restantes: ${SIGNUP_CODE_MAX_ATTEMPTS - session.attempts}.`,
      });
    }

    session.verifiedAt = now;
    session.expiresAt = 0;
    session.attempts = 0;
    session.blockedUntil = 0;
    session.codeHash = "";
    await setVerificationSession(signupId, session);

    return res.json({
      ok: true,
      verified: true,
      valid_for_seconds: SIGNUP_VERIFIED_TTL_MS / 1000,
    });
  });

  router.post("/provision", async (req, res) => {
    const {
      signupId, clinicId, name, email, phone, password,
      clinicName, clinicDoc, docType, modality, plan,
    } = req.body || {};

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(503).json({ ok: false, error: "Supabase nao configurado no backend." });
    }
    if (!signupId || !clinicId || !name || !email || !phone || !password || !clinicName) {
      return res.status(400).json({ ok: false, error: "Campos obrigatorios ausentes para provisionamento." });
    }
    if (!isUuid(clinicId)) {
      return res.status(400).json({ ok: false, error: "clinicId invalido." });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ ok: false, error: "Senha deve ter ao menos 6 caracteres." });
    }

    try {
      assertPhoneVerificationValid({ signupId, phone });

      const { token } = await resolveMercadoPagoCredentials();
      if (!token) {
        return res.status(503).json({ ok: false, error: "Mercado Pago nao configurado." });
      }

      const { fetchLatestMercadoPagoPaymentByClinic, isPaymentApproved, persistMercadoPagoPayment } = await import("../services/paymentGateway.js");
      const payment = await fetchLatestMercadoPagoPaymentByClinic(clinicId, token);
      if (!payment || !isPaymentApproved(payment)) {
        return res.status(402).json({
          ok: false,
          error: "Pagamento ainda nao aprovado. Aguarde a confirmacao do Mercado Pago.",
        });
      }

      await persistMercadoPagoPayment(payment, clinicId);

      const normalizedEmail = String(email).trim().toLowerCase();
      const normalizedPhone = normalizePhoneForSignup(phone) || String(phone).replace(/\D/g, "");
      const sanitizedPlan = sanitizePlan(plan || payment?.metadata?.plan);

      const existingUser = await fetchUserByEmail(normalizedEmail);
      if (existingUser?.clinic_id && existingUser.clinic_id !== clinicId) {
        return res.status(409).json({ ok: false, error: "Este email ja pertence a outra clinica." });
      }

      let authUserId = existingUser?.id || null;
      if (!authUserId) {
        const authResult = await createSupabaseAuthUser({
          email: normalizedEmail,
          password: String(password),
          name: String(name),
        });
        authUserId = authResult.userId;
      }

      await upsertClinicRecord({
        clinicId,
        clinicName: String(clinicName).trim(),
        docType: String(docType || "cpf").trim(),
        docNumber: String(clinicDoc || "").replace(/\D/g, ""),
        modality: String(modality || "odonto").trim(),
        plan: sanitizedPlan,
        phone: normalizedPhone,
        email: normalizedEmail,
      });

      const userResult = await upsertClinicAdminUser({
        userId: authUserId,
        clinicId,
        name: String(name).trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
      });

      consumePhoneVerification(signupId);

      return res.json({
        ok: true,
        clinic_id: clinicId,
        user_id: userResult.userId,
        payment_id: String(payment.id),
        payment_status: payment.status,
      });
    } catch (error) {
      console.error("[Provision] Error:", error.message);
      if (error.message.includes("invalid JWT") || error.message.includes("unable to parse") || error.message.includes("assinatura inválida")) {
        return res.status(400).json({ ok: false, error: "ERRO CRÍTICO NO BACKEND: Sua chave SUPABASE_SERVICE_ROLE_KEY configurada no Render (variáveis de ambiente) está desatualizada ou incorreta. Vá no painel do Supabase > Project Settings > API > role: service_role, copie a chave e atualize no Render." });
      }
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.post("/provision-trial", async (req, res) => {
    const {
      signupId, clinicId, name, email, phone, password,
      clinicName, clinicDoc, docType, modality,
    } = req.body || {};

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(503).json({ ok: false, error: "Supabase nao configurado no backend." });
    }
    if (!signupId || !clinicId || !name || !email || !phone || !password || !clinicName) {
      return res.status(400).json({ ok: false, error: "Campos obrigatorios ausentes." });
    }
    if (!isUuid(clinicId)) {
      return res.status(400).json({ ok: false, error: "clinicId invalido." });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ ok: false, error: "Senha deve ter ao menos 6 caracteres." });
    }

    try {
      assertPhoneVerificationValid({ signupId, phone });

      const normalizedEmail = String(email).trim().toLowerCase();
      const normalizedPhone = normalizePhoneForSignup(phone) || String(phone).replace(/\D/g, "");

      const existingUser = await fetchUserByEmail(normalizedEmail);
      if (existingUser?.clinic_id && existingUser.clinic_id !== clinicId) {
        return res.status(409).json({ ok: false, error: "Este email ja pertence a outra clinica." });
      }

      let authUserId = existingUser?.id || null;
      if (!authUserId) {
        const authResult = await createSupabaseAuthUser({
          email: normalizedEmail,
          password: String(password),
          name: String(name),
        });
        authUserId = authResult.userId;
      }

      const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const clinicPayload = {
        id: clinicId,
        name: String(clinicName).trim(),
        cnpj: String(clinicDoc || "").replace(/\D/g, "") || null,
        plan: sanitizePlan("premium"),
        status: "trial",
        phone: normalizedPhone,
        email: normalizedEmail,
        expires_at: trialEndsAt,
        created_at: new Date().toISOString(),
      };

      console.log("[TrialProvision] Clinic payload:", JSON.stringify(clinicPayload));

      const existingClinic = await fetchClinicById(clinicId);
      if (existingClinic) {
        const { error: clinicErr } = await supabaseAdmin.from("clinics").update(clinicPayload).eq("id", clinicId);
        if (clinicErr) {
          console.error("[TrialProvision] UPDATE clinic failed:", clinicErr);
          if (clinicErr.message?.includes('clinics_cnpj_key') || clinicErr.code === '23505') {
            throw new Error("Este CPF/CNPJ já está cadastrado em outra clínica.");
          }
          throw new Error(clinicErr.message || "Erro ao atualizar clinica trial.");
        }
      } else {
        const { error: clinicErr } = await supabaseAdmin.from("clinics").insert(clinicPayload);
        if (clinicErr) {
          console.error("[TrialProvision] INSERT clinic failed:", clinicErr);
          if (clinicErr.message?.includes('clinics_cnpj_key') || clinicErr.code === '23505') {
            throw new Error("Este CPF/CNPJ já está cadastrado em outra clínica.");
          }
          throw new Error(clinicErr.message || "Erro ao criar clinica trial.");
        }
      }

      const userPayload = {
        id: authUserId,
        clinic_id: clinicId,
        name: String(name).trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        role: "admin",
        active: true,
        created_at: new Date().toISOString(),
      };

      console.log("[TrialProvision] User payload:", JSON.stringify(userPayload));

      const existingUsr = await fetchUserByEmail(normalizedEmail);
      if (existingUsr) {
        const { error: usrErr } = await supabaseAdmin.from("users").update(userPayload).eq("id", existingUsr.id);
        if (usrErr) console.error("[TrialProvision] UPDATE user failed:", usrErr);
      } else {
        const { error: usrErr } = await supabaseAdmin.from("users").insert(userPayload);
        if (usrErr) {
          console.error("[TrialProvision] INSERT user failed:", usrErr);
          throw new Error(usrErr.message || "Erro ao criar usuario admin trial.");
        }
      }

      consumePhoneVerification(signupId);

      console.log(`[TrialProvision] Trial account created: clinic=${clinicId}, user=${authUserId}, trial_ends=${trialEndsAt}`);

      return res.json({
        ok: true,
        clinic_id: clinicId,
        user_id: authUserId,
        plan: "premium",
        subscription_status: "trial",
        expires_at: trialEndsAt,
      });
    } catch (error) {
      console.error("[TrialProvision] Error:", error.message);
      if (error.message.includes("invalid JWT") || error.message.includes("unable to parse") || error.message.includes("assinatura inválida")) {
        return res.status(400).json({ ok: false, error: "ERRO CRÍTICO NO BACKEND: Sua chave SUPABASE_SERVICE_ROLE_KEY configurada no Render (variáveis de ambiente) está desatualizada ou incorreta. Atualize-a no Render copiando do Supabase." });
      }
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  return router;
};
