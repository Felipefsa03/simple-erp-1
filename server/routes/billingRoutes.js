import express from "express";
import crypto from "crypto";
import { cleanEnv, PAYMENT_STATUS_TOKEN_SECRET } from "../config/env.js";
import {
  resolveMercadoPagoCredentials,
  getPlanPricesFromConfig,
  persistMercadoPagoPayment,
  fetchMercadoPagoPaymentById,
  fetchLatestMercadoPagoPaymentByClinic,
  isPaymentApproved as isMercadoPagoApproved,
  sanitizePlan,
  
  resolveAsaasCredentials,
  createAsaasCustomer,
  createAsaasPayment,
  fetchAsaasPixQrCode,
  fetchAsaasPaymentStatus,
  isAsaasPaymentApproved,
  persistAsaasPayment,
  
  createStripeCheckoutSession,
  verifyStripeSignature,
  activateClinicSubscription,
} from "../services/paymentGateway.js";
// Helper para descobrir gateway preferencial via ENV
const getPreferredGateway = () => {
  const active = cleanEnv(process.env.ACTIVE_PAYMENT_GATEWAY || "").toLowerCase();
  if (active === "asaas") return "asaas";
  if (active === "mercadopago") return "mercadopago";
  return null;
};

const isSuperAdmin = (req) => String(req.user?.role || "").toLowerCase() === "super_admin";

export const createBillingRoutes = ({
  addLog,
  isUuid,
  safeJson,
  getSupabaseAdminHeaders,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
}) => {
  const router = express.Router();
  const persistCheckout = async ({ clinicId, plan, billingCycle, gateway, gatewayReference, checkoutUrl, paymentReference = null }) => {
    if (!SUPABASE_URL || !(SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY) || !gatewayReference) return;
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/clinic_subscriptions?on_conflict=gateway_reference`, {
        method: 'POST',
        headers: {
          ...getSupabaseAdminHeaders(SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY),
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          clinic_id: clinicId,
          plan,
          billing_cycle: billingCycle || 'monthly',
          status: 'pending',
          gateway,
          gateway_reference: String(gatewayReference),
          payment_reference: paymentReference ? String(paymentReference) : null,
          checkout_url: checkoutUrl || null,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!response.ok) console.error('[Billing] Falha ao persistir checkout:', response.status);
    } catch (error) {
      console.error('[Billing] Erro ao persistir checkout:', error.message);
    }
  };
  const paymentStatusSecret =
    String(
      PAYMENT_STATUS_TOKEN_SECRET ||
      process.env.JWT_SECRET ||
      "",
    ).trim();

  const toBase64Url = (value) =>
    Buffer.from(value, "utf8").toString("base64url");
  const fromBase64Url = (value) =>
    Buffer.from(String(value || ""), "base64url").toString("utf8");

  const signStatusToken = (clinicId, email, expiresInSeconds = 60 * 60 * 6) => {
    if (!paymentStatusSecret) return null;
    const now = Math.floor(Date.now() / 1000);
    const payloadObj = {
      cid: String(clinicId || "").trim(),
      em: String(email || "").toLowerCase().trim(),
      iat: now,
      exp: now + Math.max(60, Number(expiresInSeconds) || 0),
    };
    const payload = toBase64Url(JSON.stringify(payloadObj));
    const signature = crypto
      .createHmac("sha256", paymentStatusSecret)
      .update(payload)
      .digest("base64url");
    return `${payload}.${signature}`;
  };

  const verifyStatusToken = (token, clinicId, email) => {
    if (!paymentStatusSecret) return false; // fail closed
    if (!token || String(token).split(".").length !== 2) return false;
    const [payload, receivedSig] = String(token).split(".");
    const expectedSig = crypto
      .createHmac("sha256", paymentStatusSecret)
      .update(payload)
      .digest("base64url");

    const sameLength = receivedSig.length === expectedSig.length;
    if (!sameLength) return false;
    const isValidSig = crypto.timingSafeEqual(
      Buffer.from(receivedSig),
      Buffer.from(expectedSig),
    );
    if (!isValidSig) return false;

    try {
      const decoded = JSON.parse(fromBase64Url(payload));
      const now = Math.floor(Date.now() / 1000);
      const tokenClinicId = String(decoded?.cid || "").trim();
      const tokenEmail = String(decoded?.em || "").toLowerCase().trim();
      const targetClinicId = String(clinicId || "").trim();
      const targetEmail = String(email || "").toLowerCase().trim();
      if (!tokenClinicId || tokenClinicId !== targetClinicId) return false;
      if (!tokenEmail || tokenEmail !== targetEmail) return false;
      if (!decoded?.exp || Number(decoded.exp) < now) return false;
      return true;
    } catch (_error) {
      return false;
    }
  };

  const verifyBearerForClinic = async (authorizationHeader, clinicId, email) => {
    const raw = String(authorizationHeader || "");
    if (!raw.toLowerCase().startsWith("bearer ")) return false;
    const bearerToken = raw.slice(7).trim();
    if (!bearerToken || !SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${bearerToken}`,
        },
      });
      if (!response.ok) return false;
      const authUser = await response.json();
      const userEmail = String(authUser?.email || "").toLowerCase().trim();
      const userClinicId = String(authUser?.user_metadata?.clinic_id || authUser?.app_metadata?.clinic_id || "").trim();
      const userRole = String(authUser?.user_metadata?.role || authUser?.app_metadata?.role || "").toLowerCase().trim();
      const targetClinicId = String(clinicId || "").trim();
      const targetEmail = String(email || "").toLowerCase().trim();
      if (!userEmail || userEmail !== targetEmail) return false;
      if (userRole === "super_admin") return true;
      return Boolean(userClinicId && userClinicId === targetClinicId);
    } catch (_error) {
      return false;
    }
  };

  const resolveGatewayForClinic = async (clinicId, req) => {
    const preferred = getPreferredGateway();
    const superAdmin = isSuperAdmin(req);
    const isPublicFlow = !req?.user;
    const [asaasCreds, mpCreds] = await Promise.all([
      resolveAsaasCredentials(clinicId, { allowEnvFallback: false }),
      resolveMercadoPagoCredentials(clinicId, {
        allowClinicConfig: true,
        allowEnvFallback: true,
      }),
    ]);

    if (preferred === "asaas" && asaasCreds?.token) {
      return { gateway: "asaas", asaasCreds, mpCreds };
    }
    if ((superAdmin || isPublicFlow) && preferred === "mercadopago" && mpCreds?.token) {
      return { gateway: "mercadopago", asaasCreds, mpCreds };
    }

    // Regra padrão:
    // - Clínica usa apenas Asaas da própria clínica (sem ENV global)
    // - MercadoPago é exclusivo do super_admin
    if (asaasCreds?.token) {
      return { gateway: "asaas", asaasCreds, mpCreds };
    }
    if ((superAdmin || isPublicFlow) && mpCreds?.token) {
      return { gateway: "mercadopago", asaasCreds, mpCreds };
    }

    return { gateway: null, asaasCreds, mpCreds };
  };

  router.post("/create-preference", async (req, res) => {
    const {
      clinicName, email, name, phone, plan, amount,
      clinicId, docType, clinicDoc, modality, signupId, billingCycle,
    } = req.body || {};

    try {
      if (!clinicId) return res.status(400).json({ ok: false, error: "clinicId invalido." });
      if (!email || !name || !clinicName) return res.status(400).json({ ok: false, error: "Dados obrigatorios ausentes." });

      const normalizedClinicId = String(clinicId).trim();
      if (signupId) {
        if (!isUuid(String(signupId).trim())) {
          return res.status(400).json({ ok: false, error: "Reserva de clínica inválida." });
        }
        const intentResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/signup_provision_intents?signup_id=eq.${encodeURIComponent(String(signupId).trim())}&clinic_id=eq.${encodeURIComponent(normalizedClinicId)}&consumed_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=signup_id&limit=1`,
          { headers: getSupabaseAdminHeaders(SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY) },
        );
        const intents = intentResponse.ok ? await safeJson(intentResponse) : [];
        if (!Array.isArray(intents) || intents.length !== 1) {
          return res.status(403).json({ ok: false, error: "Sessão de cadastro inválida ou expirada." });
        }
      }
      if (signupId && isUuid(normalizedClinicId) && SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)) {
        // No cadastro público o UUID é apenas um identificador de correlação.
        // Nunca permita iniciar um novo provisionamento apontando para um tenant
        // que já existe; isso evita transformar a etapa de pagamento em porta de
        // entrada para assumir uma clínica existente.
        const existingClinicResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/clinics?id=eq.${encodeURIComponent(normalizedClinicId)}&select=id&limit=1`,
          { headers: getSupabaseAdminHeaders(SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY) },
        );
        const existingClinics = existingClinicResponse.ok ? await safeJson(existingClinicResponse) : [];
        if (Array.isArray(existingClinics) && existingClinics.length > 0) {
          return res.status(409).json({ ok: false, error: "Esta reserva de cadastro já está vinculada a uma clínica existente." });
        }
      }
      const { gateway, asaasCreds, mpCreds } = await resolveGatewayForClinic(normalizedClinicId, req);

      if (!gateway) {
        return res.status(503).json({ ok: false, error: "Nenhum gateway de pagamento (Mercado Pago ou Asaas) está configurado no servidor." });
      }

      const sanitizePlan = (p) => { if (!p) return "basico"; const s = new Set(["basico","profissional","premium"]); return s.has(String(p)) ? String(p) : "basico"; };
      const selectedPlan = sanitizePlan(plan);
      const configResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/integration_config?clinic_id=eq.00000000-0000-0000-0000-000000000001&select=plan_price_basico,plan_price_profissional,plan_price_premium&limit=1`,
        { headers: getSupabaseAdminHeaders(SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY) },
      );
      const configRows = configResponse.ok ? await safeJson(configResponse) : [];
      const planPrices = getPlanPricesFromConfig(Array.isArray(configRows) ? configRows[0] : null);
      const unitAmount = planPrices[selectedPlan];
      if (!Number.isFinite(unitAmount) || unitAmount <= 0) return res.status(503).json({ ok: false, error: "Preço do plano indisponível no servidor." });

      // ============================================
      // FLUXO ASAAS
      // ============================================
      if (gateway === "asaas") {
        const { token, baseUrl, source } = asaasCreds;
        if (!token) return res.status(503).json({ ok: false, error: "Asaas configurado mas sem token válido." });
        addLog(`[Billing] Gateway selecionado: asaas (source=${source}) clinicId=${normalizedClinicId}`);

        let customerId = "";
        try {
          const customer = await createAsaasCustomer({
            name, email,
            cpfCnpj: String(clinicDoc || "").replace(/\D/g, "") || "00000000000",
            phone
          }, token, baseUrl);
          customerId = customer.id;
        } catch (err) {
          return res.status(500).json({ ok: false, error: `Erro ao criar cliente Asaas: ${err.message}` });
        }

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3);
        const formattedDueDate = dueDate.toISOString().split("T")[0];

        let payment = null;
        let qrCodePayload = null;
        try {
          payment = await createAsaasPayment({
            customerId,
            value: unitAmount,
            description: `Clinxia - ${clinicName} - Plano ${selectedPlan}`,
            dueDate: formattedDueDate,
            externalReference: normalizedClinicId
          }, token, baseUrl);

          qrCodePayload = await fetchAsaasPixQrCode(payment.id, token, baseUrl);
        } catch (err) {
          return res.status(500).json({ ok: false, error: `Erro ao criar cobrança Asaas: ${err.message}` });
        }

        const metadata = { clinic_id: normalizedClinicId, plan: selectedPlan, user_email: email, user_name: name };
        await persistAsaasPayment(payment, normalizedClinicId, metadata);
        await persistCheckout({
          clinicId: normalizedClinicId,
          plan: selectedPlan,
          billingCycle,
          gateway: 'asaas',
          gatewayReference: payment.id,
          paymentReference: payment.id,
          checkoutUrl: payment.invoiceUrl,
        });

        return res.json({
          ok: true,
          preference_id: payment.id,
          init_point: payment.invoiceUrl,
          qr_code: qrCodePayload?.payload || "",
          qr_code_base64: qrCodePayload?.encodedImage || "",
          point_of_interaction_url: payment.invoiceUrl,
          payment_status_token: signStatusToken(normalizedClinicId, email),
        });
      }

      // ============================================
      // FLUXO MERCADO PAGO (ORIGINAL)
      // ============================================
      const { token, source } = mpCreds;
      if (!token) return res.status(503).json({ ok: false, error: "Mercado Pago configurado mas sem token." });
      addLog(`[Billing] Gateway selecionado: mercadopago (source=${source}) clinicId=${normalizedClinicId}`);

      const preference = {
        items: [{ id: selectedPlan, title: `Clinxia - ${clinicName}`, quantity: 1, unit_price: unitAmount, currency_id: "BRL" }],
        external_reference: normalizedClinicId,
        payer: { name, email, phone: { number: String(phone || "").replace(/\D/g, "") || "" } },
        metadata: {
          clinic_id: normalizedClinicId, clinic_name: clinicName, plan: selectedPlan,
          user_email: email, user_name: name, user_phone: phone,
          doc_type: docType || "cpf", doc_number: String(clinicDoc || "").replace(/\D/g, ""),
          modality: modality || "odonto", signup_id: signupId || "",
        },
        payment_methods: { excluded_payment_types: [{ id: "ticket" }], installments: 1 },
        back_urls: {
          success: `${process.env.FRONTEND_URL || "https://clinxia.vercel.app"}/?payment=success`,
          failure: `${process.env.FRONTEND_URL || "https://clinxia.vercel.app"}/?payment=failure`,
          pending: `${process.env.FRONTEND_URL || "https://clinxia.vercel.app"}/?payment=pending`,
        },
        notification_url: `${process.env.SERVER_URL || "https://clinxia-backend.onrender.com"}/api/webhooks/mercadopago`,
        auto_return: "approved",
      };

      const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(preference),
      });
      const mpData = await safeJson(mpResponse);

      if (!mpResponse.ok) {
        const message = mpData?.message || mpData?.error || "Erro ao criar preferencia";
        return res.status(500).json({ ok: false, error: message });
      }

      let qrCode = "";
      let qrCodeBase64 = "";
      let pointOfInteractionUrl = "";
      try {
        const pixPayment = {
          transaction_amount: unitAmount,
          description: `Clinxia - ${clinicName} - Plano ${selectedPlan}`,
          payment_method_id: "pix",
          external_reference: normalizedClinicId,
          payer: { email, first_name: name, phone: { number: String(phone || "").replace(/\D/g, "") || "" } },
          metadata: { clinic_id: normalizedClinicId, plan: selectedPlan, signup_id: signupId || "" },
        };

        const pixResponse = await fetch("https://api.mercadopago.com/v1/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(pixPayment),
        });
        const pixData = await safeJson(pixResponse);

        if (pixResponse.ok && pixData?.point_of_interaction?.transaction_data) {
          qrCode = pixData.point_of_interaction.transaction_data.qr_code || "";
          qrCodeBase64 = pixData.point_of_interaction.transaction_data.qr_code_base64 || "";
          pointOfInteractionUrl = pixData.point_of_interaction?.transaction_data?.ticket_url || "";
        }
      } catch (pixError) {
        console.log("[MP] Failed to create PIX payment:", pixError.message);
      }

      await persistCheckout({
        clinicId: normalizedClinicId,
        plan: selectedPlan,
        billingCycle,
        gateway: 'mercadopago',
        gatewayReference: mpData.id,
        paymentReference: null,
        checkoutUrl: mpData.init_point || pointOfInteractionUrl,
      });

      return res.json({
        ok: true,
        preference_id: mpData.id,
        init_point: mpData.init_point,
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
        point_of_interaction_url: pointOfInteractionUrl,
        payment_status_token: signStatusToken(normalizedClinicId, email),
      });

    } catch (error) {
      return res.status(502).json({ ok: false, error: "Não foi possível iniciar a cobrança." });
    }
  });

  router.get("/payment-status/:clinicId", async (req, res) => {
    const clinicId = String(req.params?.clinicId || "").trim();
    const email = String(req.query?.email || "").trim();
    const statusToken = String(req.query?.token || "").trim();

    if (!clinicId || !isUuid(clinicId)) {
      return res.status(400).json({ ok: false, error: "clinicId invalido." });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: "email é obrigatório." });
    }
    const tokenAuthorized = verifyStatusToken(statusToken, clinicId, email);
    const bearerAuthorized = tokenAuthorized
      ? false
      : await verifyBearerForClinic(req.headers?.authorization, clinicId, email);
    if (!tokenAuthorized && !bearerAuthorized) {
      return res.status(401).json({ ok: false, error: "Token de consulta inválido ou expirado." });
    }

    try {
      const { gateway, asaasCreds, mpCreds } = await resolveGatewayForClinic(clinicId, req);

      if (gateway === "asaas") {
        const { token, baseUrl } = asaasCreds;
        if (!token) return res.status(503).json({ ok: false, error: "Asaas sem credencial válida para esta clínica." });
        let localPayment = null;
        if (SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)) {
          const localRes = await fetch(`${SUPABASE_URL}/rest/v1/payments?clinic_id=eq.${clinicId}&status=in.(received,confirmed)&select=*&limit=1`, { headers: getSupabaseAdminHeaders() });
          if (localRes.ok) {
            const localPayments = await localRes.json();
            if (Array.isArray(localPayments) && localPayments.length > 0) localPayment = localPayments[0];
          }
        }
        if (localPayment) return res.json({ ok: true, approved: true, status: "approved", payment: { id: localPayment.mp_payment_id, status: localPayment.status } });

        const searchUrl = `${baseUrl}/payments?externalReference=${encodeURIComponent(clinicId)}&limit=1`;
        const searchRes = await fetch(searchUrl, { headers: { access_token: token } });
        if (searchRes.ok) {
          const payload = await searchRes.json();
          const first = payload?.data?.[0];
          if (first) {
            const approved = isAsaasPaymentApproved(first);
            if (approved) await persistAsaasPayment(first, clinicId);
            return res.json({ ok: true, approved, status: approved ? "approved" : "pending", payment: first });
          }
        }
        return res.json({ ok: true, approved: false, status: "pending", payment: null });
      }

      // Mercado Pago Fallback/Logic
      const { token } = mpCreds;
      if (!token) return res.status(503).json({ ok: false, error: "Mercado Pago não configurado." });

      let payment = await fetchLatestMercadoPagoPaymentByClinic(clinicId, token);
      
      if (!payment && SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)) {
        const localRes = await fetch(`${SUPABASE_URL}/rest/v1/payments?clinic_id=eq.${clinicId}&status=eq.approved&select=*&limit=1`, { headers: getSupabaseAdminHeaders() });
        if (localRes.ok) {
          const localPayments = await localRes.json();
          if (Array.isArray(localPayments) && localPayments.length > 0) {
            const lp = localPayments[0];
            payment = { id: lp.mp_payment_id, status: lp.status, transaction_amount: lp.amount, status_detail: "local_confirmed", metadata: { plan: lp.plan, clinic_id: lp.clinic_id } };
          }
        }
      }

      if (!payment && email) {
        const searchUrl = `https://api.mercadopago.com/v1/payments/search?payer.email=${encodeURIComponent(email)}&sort=date_created&criteria=desc&limit=1`;
        const emailRes = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (emailRes.ok) {
          const emailPayload = await emailRes.json();
          const first = emailPayload?.results?.[0];
          if (first && isMercadoPagoApproved(first)) payment = first;
        }
      }

      if (!payment) return res.json({ ok: true, approved: false, status: "pending", payment: null });

      const approved = isMercadoPagoApproved(payment);
      if (approved) await persistMercadoPagoPayment(payment, clinicId);

      return res.json({ ok: true, approved, status: approved ? "approved" : "pending", payment });

    } catch (error) {
      return res.status(502).json({ ok: false, error: "Não foi possível consultar o pagamento." });
    }
  });

  // Multi-gateway Webhook handler (Asaas + Mercado Pago)
  const handlePaymentWebhook = async (req, res) => {
    try {
      const body = req.body;

      // 1. Check if it's an Asaas webhook
      if (body?.event && body?.payment?.id?.startsWith("pay_")) {
        console.log(`[Asaas Webhook] Recebido evento ${body.event}`);
        if (body.event === "PAYMENT_RECEIVED" || body.event === "PAYMENT_CONFIRMED") {
          await persistAsaasPayment(body.payment);
          addLog(`[Asaas Webhook] Pagamento ${body.payment.id} processado.`);
        }
        return res.status(200).json({ ok: true });
      }

      // 2. Otherwise assume MercadoPago Webhook
      const { token, webhookSecret } = await resolveMercadoPagoCredentials(null, { allowEnvFallback: true });
      if (webhookSecret) {
        const rawSignatureHeader = String(req.headers["x-signature"] || "");
        const requestId = String(req.headers["x-request-id"] || req.body?.id || "");
        const dataId = String(req.body?.data?.id || req.body?.id || "");

        const parsedPairs = rawSignatureHeader
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
          .reduce((acc, part) => {
            const [k, v] = part.split("=");
            if (k && v) acc[k.trim()] = v.trim();
            return acc;
          }, {});

        const timestamp = parsedPairs.ts || String(req.headers["x-timestamp"] || "");
        const receivedV1 = parsedPairs.v1 || "";

        if (!timestamp || !receivedV1) {
          console.warn("[MP Webhook] Assinatura ausente ou malformada");
          return res.status(200).json({ ok: true });
        }

        const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
        const expectedV1 = crypto
          .createHmac("sha256", webhookSecret)
          .update(manifest)
          .digest("hex");

        const validLength = receivedV1.length === expectedV1.length;
        const isValidSignature =
          validLength &&
          crypto.timingSafeEqual(Buffer.from(receivedV1), Buffer.from(expectedV1));

        if (!isValidSignature) {
          console.warn("[MP Webhook] Assinatura inválida");
          return res.status(200).json({ ok: true });
        }
      }

      const webhookType = String(req.body?.type || req.body?.action || "").toLowerCase();
      const paymentId = req.body?.data?.id || req.body?.id;

      if (paymentId && webhookType.includes("payment") && token) {
        const payment = await fetchMercadoPagoPaymentById(paymentId, token);
        await persistMercadoPagoPayment(payment);
        addLog(`[MP Webhook] Pagamento ${paymentId} atualizado para ${payment.status}`);
        const clinicId = String(payment?.metadata?.clinic_id || payment?.external_reference || "").trim();
        if (isMercadoPagoApproved(payment) && clinicId) {
          await activateClinicSubscription(clinicId, sanitizePlan(payment?.metadata?.plan || "premium"), "mercadopago");
        }
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      addLog(`[Webhook] Error: ${error.message}`);
      return res.status(200).json({ ok: true });
    }
  };

  router.post("/webhook", handlePaymentWebhook);
  router.post("/mercadopago", handlePaymentWebhook);

  // Stripe checkout session
  router.post("/create-stripe-checkout", async (req, res) => {
    const { clinicId, plan, amount, email, name, phone, signupId } = req.body || {};
    if (!clinicId || !isUuid(clinicId)) return res.status(400).json({ ok: false, error: "clinicId invalido." });
    if (!amount || !email) return res.status(400).json({ ok: false, error: "Dados obrigatorios ausentes." });

    const normalizedClinicId = String(clinicId).trim();
    if (signupId) {
      if (!isUuid(String(signupId).trim())) {
        return res.status(400).json({ ok: false, error: "Reserva de clínica inválida." });
      }
      const intentResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/signup_provision_intents?signup_id=eq.${encodeURIComponent(String(signupId).trim())}&clinic_id=eq.${encodeURIComponent(normalizedClinicId)}&consumed_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=signup_id&limit=1`,
        { headers: getSupabaseAdminHeaders(SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY) },
      );
      const intents = intentResponse.ok ? await safeJson(intentResponse) : [];
      if (!Array.isArray(intents) || intents.length !== 1) {
        return res.status(403).json({ ok: false, error: "Sessão de cadastro inválida ou expirada." });
      }
    }
    if (signupId && SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)) {
      const existingClinicResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/clinics?id=eq.${encodeURIComponent(normalizedClinicId)}&select=id&limit=1`,
        { headers: getSupabaseAdminHeaders(SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY) },
      );
      const existingClinics = existingClinicResponse.ok ? await safeJson(existingClinicResponse) : [];
      if (Array.isArray(existingClinics) && existingClinics.length > 0) {
        return res.status(403).json({ ok: false, error: "Clínica já existe. Faça login." });
      }
    }

    try {
      const result = await createStripeCheckoutSession({ clinicId: normalizedClinicId, plan, amount, email, name, phone, signupId });
      if (result?.url) {
        await persistCheckout({
          clinicId: normalizedClinicId,
          plan: plan || "premium",
          billingCycle: "monthly",
          gateway: "stripe",
          gatewayReference: result.id,
          paymentReference: null,
          checkoutUrl: result.url,
        });
        return res.json({ ok: true, checkout_url: result.url, payment_intent: result.paymentIntent });
      }
      return res.status(502).json({ ok: false, error: "Não foi possível criar o checkout Stripe. Verifique as credenciais." });
    } catch (error) {
      addLog(`[Stripe Checkout] Erro ao criar checkout: ${error.message}`);
      return res.status(502).json({ ok: false, error: error.message || "Erro ao criar checkout Stripe." });
    }
  });

  // Stripe webhook (raw body is parsed by express.raw middleware in index.js)
  router.post("/stripe", async (req, res) => {
    try {
      const signature = String(req.headers["stripe-signature"] || "");
      if (!signature) {
        addLog("[Stripe Webhook] Assinatura ausente");
        return res.status(400).json({ ok: false, error: "Assinatura ausente" });
      }

      let verified = false;
      const globalSecret = cleanEnv(process.env.STRIPE_WEBHOOK_SECRET);
      if (globalSecret && verifyStripeSignature(req.body, signature, globalSecret)) {
        verified = true;
      }

      if (!verified && SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)) {
        const configsRes = await fetch(`${SUPABASE_URL}/rest/v1/integration_config?select=stripe`, {
          headers: getSupabaseAdminHeaders(SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY),
        });
        if (configsRes.ok) {
          const rows = await configsRes.json().catch(() => []);
          for (const row of Array.isArray(rows) ? rows : []) {
            const secret = String(row?.stripe?.webhook_secret || row?.stripe?.webhookSecret || "").trim();
            if (secret && verifyStripeSignature(req.body, signature, secret)) {
              verified = true;
              break;
            }
          }
        }
      }

      if (!verified) {
        addLog("[Stripe Webhook] Assinatura inválida");
        return res.status(400).json({ ok: false, error: "Assinatura inválida" });
      }

      const bodyText = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body);
      let event;
      try {
        event = JSON.parse(bodyText);
      } catch (err) {
        event = typeof req.body === "object" ? req.body : null;
      }

      if (event?.type === "checkout.session.completed") {
        const session = event?.data?.object || {};
        const clinicId = String(session?.metadata?.clinic_id || session?.client_reference_id || "").trim();
        const plan = String(session?.metadata?.plan || "").trim();
        const signupId = String(session?.metadata?.signup_id || "").trim();
        if (clinicId) {
          const adminHeaders = getSupabaseAdminHeaders(SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY);
          const paymentBody = {
            id: `stripe-${session.id || crypto.randomUUID()}`,
            clinic_id: clinicId,
            mp_payment_id: `stripe-${session.payment_intent || session.id}`,
            amount: Number(session.amount_total || 0) / 100,
            status: "approved",
            plan: sanitizePlan(plan || "premium"),
            payer_email: String(session.customer_details?.email || session.customer_email || ""),
            payer_name: String(session.customer_details?.name || ""),
            created_at: new Date().toISOString(),
          };
          await fetch(`${SUPABASE_URL}/rest/v1/payments?on_conflict=id`, {
            method: "POST",
            headers: { ...adminHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
            body: JSON.stringify(paymentBody),
          }).catch((err) => addLog(`[Stripe Webhook] Falha ao persistir pagamento: ${err.message}`));

          if (signupId && isUuid(signupId)) {
            await fetch(
              `${SUPABASE_URL}/rest/v1/signup_provision_intents?signup_id=eq.${encodeURIComponent(signupId)}&clinic_id=eq.${encodeURIComponent(clinicId)}`,
              { method: "PATCH", headers: adminHeaders, body: JSON.stringify({ paid_at: new Date().toISOString() }) },
            ).catch((err) => addLog(`[Stripe Webhook] Falha ao marcar intent pago: ${err.message}`));
          }

          await activateClinicSubscription(clinicId, sanitizePlan(plan || "premium"), "stripe");
        }
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      addLog(`[Stripe Webhook] Error: ${error.message}`);
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  return router;
};
