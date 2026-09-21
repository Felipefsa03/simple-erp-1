import express from "express";
import crypto from "crypto";
import {
  fetchUserByEmail,
  fetchClinicById,
  createSupabaseAuthUser,
  upsertClinicRecord,
  upsertClinicAdminUser,
  assertPhoneVerificationValid,
  consumePhoneVerification,
  deleteSupabaseAuthUser,
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
  GLOBAL_CLINIC_ID,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  addLog,
  isUuid,
  brazilianPhoneCandidates,
}) => {
  const router = express.Router();

  // ---- Constants ----
  const SIGNUP_CODE_TTL_MS = 5 * 60 * 1000;
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

  const loadSignupIntent = async (signupId) => {
    const { data, error } = await supabaseAdmin
      .from('signup_provision_intents')
      .select('signup_id, clinic_id, expires_at, consumed_at')
      .eq('signup_id', String(signupId || '').trim())
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error) throw error;
    return data || null;
  };

  const consumeSignupIntent = async (signupId) => {
    const { error } = await supabaseAdmin
      .from('signup_provision_intents')
      .update({ consumed_at: new Date().toISOString() })
      .eq('signup_id', String(signupId || '').trim())
      .is('consumed_at', null);
    if (error) throw error;
  };

  // ---- Routes ----

  router.post("/init", async (req, res) => {
    try {
      const signupId = crypto.randomUUID();
      const clinicId = GLOBAL_CLINIC_ID || "00000000-0000-0000-0000-000000000001";
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const { error } = await supabaseAdmin.from('signup_provision_intents').insert({
        signup_id: signupId,
        clinic_id: clinicId,
        expires_at: expiresAt,
      });
      if (error) throw error;
      return res.json({ ok: true, signup_id: signupId, clinic_id: clinicId, expires_at: expiresAt });
    } catch (error) {
      console.error('[SignupInit] Falha ao reservar cadastro:', error.message);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/config", async (_req, res) => {
    try {
      console.log("[SignupConfig] Endpoint called");
      const globalConfig = await fetchGlobalIntegrationConfig();
      const planPrices = getPlanPricesFromConfig(globalConfig);
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
      console.error("[SignupConfig] Failed to load configuration:", error.message);
      return res.status(503).json({ ok: false, error: "Configuração de cadastro temporariamente indisponível." });
    }
  });

  router.post("/check-availability", async (req, res) => {
    try {
      const { email, phone, clinicDoc } = req.body;

      if (email) {
        const cleanEmail = email.trim().toLowerCase();
        const { data: userByEmail } = await supabaseAdmin
          .from('users')
          .select('id,clinic_id,phone')
          .eq('email', cleanEmail)
          .limit(1);

        if (userByEmail && userByEmail.length > 0) {
          const row = userByEmail[0];
          // Cadastro incompleto (linha criada pelo trigger de auth, sem
          // clínica nem telefone) pode ser retomado pelo mesmo fluxo.
          const incomplete = !row.clinic_id && !row.phone;
          if (!incomplete) {
            return res.json({ ok: false, error: 'Este e-mail já está cadastrado. Faça login para continuar.' });
          }
        }
      }

      if (phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        const { data: userByPhone } = await supabaseAdmin
          .from('users')
          .select('id,clinic_id,phone')
          .like('phone', `%${cleanPhone}%`)
          .limit(1);

        if (userByPhone && userByPhone.length > 0) {
          const row = userByPhone[0];
          const incomplete = !row.clinic_id && !row.phone;
          if (!incomplete) {
            return res.json({ ok: false, error: 'Este telefone já está associado a outra conta.' });
          }
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
      "Ele expira em 5 minutos.",
      "",
      "Use este código para concluir seu cadastro com segurança. Se não solicitou, pode ignorar esta mensagem.",
    ].join("\n");

    try {
      addLog(`[Signup] Attempting to send code to ${maskPhone(normalizedPhone)}`);

      const delay = Math.floor(Math.random() * 2000) + 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      await sendWhatsAppMessage({
        clinicId: SYSTEM_WHATSAPP_CLINIC_ID,
        to: normalizedPhone,
        message,
      });
      addLog(`[Signup] Code sent successfully to ${maskPhone(normalizedPhone)}`);
    } catch (error) {
      addLog("[Signup] Error sending verification code");
      return res.status(502).json({
        ok: false,
        error: "Não foi possível enviar o código pelo WhatsApp.",
        details: "Verifique se o WhatsApp Global está conectado no painel de Super Admin."
      });
    }

    return res.json({
      ok: true,
      expires_in_seconds: Math.round(SIGNUP_CODE_TTL_MS / 1000),
      masked_phone: maskPhone(normalizedPhone),
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

    let authUserId = null;
    let authUserCreated = false;
    let clinicCreated = false;
    try {
      const normalizedPhone = normalizePhoneForSignup(phone) || String(phone).replace(/\D/g, "");
      await assertPhoneVerificationValid({ signupId, phone: normalizedPhone });

      const signupIntent = await loadSignupIntent(signupId);
      if (!signupIntent || String(signupIntent.clinic_id) !== String(clinicId)) {
        return res.status(403).json({ ok: false, error: "Sessão de provisionamento inválida ou expirada." });
      }

      const { token } = await resolveMercadoPagoCredentials();
      if (!token) {
        return res.status(503).json({ ok: false, error: "Mercado Pago nao configurado." });
      }

      // O provisionamento pago é somente para um tenant novo. Mesmo com um
      // pagamento válido, nunca atualize uma clínica existente a partir de
      // valores controlados pelo navegador.
      const { data: existingClinic, error: existingClinicError } = await supabaseAdmin
        .from('clinics')
        .select('id')
        .eq('id', clinicId)
        .maybeSingle();
      if (existingClinicError) throw existingClinicError;
      if (existingClinic) {
        return res.status(409).json({ ok: false, error: "O provisionamento pago só pode criar uma clínica nova." });
      }

      const { fetchLatestMercadoPagoPaymentByClinic, isPaymentApproved, persistMercadoPagoPayment } = await import("../services/paymentGateway.js");
      const payment = await fetchLatestMercadoPagoPaymentByClinic(clinicId, token);
      if (!payment || !isPaymentApproved(payment)) {
        return res.status(402).json({
          ok: false,
          error: "Pagamento ainda nao aprovado. Aguarde a confirmacao do Mercado Pago.",
        });
      }

      const paymentMetadata = payment.metadata || {};
      if (String(paymentMetadata.signup_id || '') !== String(signupId) || String(paymentMetadata.clinic_id || '') !== String(clinicId)) {
        return res.status(403).json({ ok: false, error: "Pagamento não corresponde a esta sessão de cadastro." });
      }

      await persistMercadoPagoPayment(payment, clinicId);

      const normalizedEmail = String(email).trim().toLowerCase();
      const sanitizedPlan = sanitizePlan(plan || payment?.metadata?.plan);

      const existingUser = await fetchUserByEmail(normalizedEmail);
      if (existingUser?.clinic_id && existingUser.clinic_id !== clinicId) {
        return res.status(409).json({ ok: false, error: "Este email ja pertence a outra clinica." });
      }

      // Sempre chamar: cria ou atualiza o auth user (senha digitada vale).
      const authResult = await createSupabaseAuthUser({
        email: normalizedEmail,
        password: String(password),
        name: String(name),
      });
      authUserId = authResult.userId;
      authUserCreated = Boolean(authResult.created);

      const clinicResult = await upsertClinicRecord({
        clinicId,
        clinicName: String(clinicName).trim(),
        docType: String(docType || "cpf").trim(),
        docNumber: String(clinicDoc || "").replace(/\D/g, ""),
        modality: String(modality || "odonto").trim(),
        plan: sanitizedPlan,
        phone: normalizedPhone,
        email: normalizedEmail,
      });
      clinicCreated = Boolean(clinicResult.created);

      const userResult = await upsertClinicAdminUser({
        userId: authUserId,
        clinicId,
        name: String(name).trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
      });

      await consumePhoneVerification(signupId);
      await consumeSignupIntent(signupId);

      return res.json({
        ok: true,
        clinic_id: clinicId,
        user_id: userResult.userId,
        payment_id: String(payment.id),
        payment_status: payment.status,
      });
    } catch (error) {
      console.error("[Provision] Error:", error.message);
      if (clinicCreated) {
        await supabaseAdmin.from('clinics').delete().eq('id', clinicId);
      }
      if (authUserCreated) {
        await supabaseAdmin.from('users').delete().eq('id', authUserId);
        await deleteSupabaseAuthUser(authUserId);
      }
      return res.status(500).json({ ok: false, error: "Não foi possível concluir o provisionamento." });
    }
  });

  router.post("/provision-trial", async (req, res) => {
    const {
      signupId, name, email, phone, password,
      clinicName, clinicDoc, docType, modality,
    } = req.body || {};

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(503).json({ ok: false, error: "Supabase nao configurado no backend." });
    }
    if (!signupId || !name || !email || !phone || !password || !clinicName) {
      return res.status(400).json({ ok: false, error: "Campos obrigatorios ausentes." });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ ok: false, error: "Senha deve ter ao menos 6 caracteres." });
    }

    let authUserId = null;
    let clinicId = null;
    let authUserCreated = false;
    let clinicCreated = false;
    try {
      const normalizedPhone = normalizePhoneForSignup(phone) || String(phone).replace(/\D/g, "");
      await assertPhoneVerificationValid({ signupId, phone: normalizedPhone });

      // O identificador foi reservado pelo servidor em /signup/init. Nunca
      // aceite UUID arbitrário enviado pelo navegador em um novo tenant.
      const signupIntent = await loadSignupIntent(signupId);
      if (!signupIntent) {
        return res.status(403).json({ ok: false, error: "Sessão de provisionamento inválida ou expirada." });
      }
      clinicId = String(signupIntent.clinic_id);

      const normalizedEmail = String(email).trim().toLowerCase();

      const existingUser = await fetchUserByEmail(normalizedEmail);
      if (existingUser?.clinic_id && existingUser.clinic_id !== clinicId) {
        return res.status(409).json({ ok: false, error: "Este email ja pertence a outra clinica." });
      }

      // Sempre chamar: se o auth user já existir, atualiza email/senha;
      // se não existir, cria. Garante que a senha digitada valha.
      const authResult = await createSupabaseAuthUser({
        email: normalizedEmail,
        password: String(password),
        name: String(name),
      });
      authUserId = authResult.userId;
      authUserCreated = Boolean(authResult.created);

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

      console.log("[TrialProvision] Creating clinic");

      const { error: clinicErr } = await supabaseAdmin.from("clinics").insert(clinicPayload);
      if (clinicErr) {
        console.error("[TrialProvision] INSERT clinic failed:", clinicErr);
        if (clinicErr.message?.includes('clinics_cnpj_key') || clinicErr.code === '23505') {
          throw new Error("Este CPF/CNPJ já está cadastrado em outra clínica.");
        }
        throw new Error(clinicErr.message || "Erro ao criar clinica trial.");
      }
      clinicCreated = true;

      const userPayload = {
        id: authUserId,
        clinic_id: clinicId,
        name: String(name).trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        role: "admin",
        active: true,
        updated_at: new Date().toISOString(),
      };

      console.log("[TrialProvision] Creating admin user");

      // Upsert com onConflict id: o trigger de auth pode já ter criado a
      // linha em users (clinic_id null) — sem isso ocorre
      // "duplicate key value violates unique constraint users_pkey".
      const { error: usrErr } = await supabaseAdmin
        .from("users")
        .upsert(userPayload, { onConflict: "id" });
      if (usrErr) {
        console.error("[TrialProvision] UPSERT user failed:", usrErr);
        throw new Error(usrErr.message || "Erro ao criar usuario admin trial.");
      }

      await consumePhoneVerification(signupId);
      await consumeSignupIntent(signupId);

      console.log(`[TrialProvision] Trial account created: trial_ends=${trialEndsAt}`);

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
      if (clinicCreated) {
        const { error: rollbackError } = await supabaseAdmin.from('clinics').delete().eq('id', clinicId);
        if (rollbackError) console.error('[TrialProvision] Clinic rollback failed:', rollbackError.message);
      }
      if (authUserCreated) {
        const { error: userRollbackError } = await supabaseAdmin.from('users').delete().eq('id', authUserId);
        if (userRollbackError) console.error('[TrialProvision] User rollback failed:', userRollbackError.message);
        await deleteSupabaseAuthUser(authUserId);
      }
      return res.status(500).json({ ok: false, error: "Não foi possível criar a conta trial." });
    }
  });

  return router;
};
