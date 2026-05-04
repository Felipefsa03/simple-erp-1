import express from "express";
import crypto from "crypto";
import { cleanEnv } from "../config/env.js";
import {
  resolveMercadoPagoCredentials,
  persistMercadoPagoPayment,
  fetchMercadoPagoPaymentById,
  fetchLatestMercadoPagoPaymentByClinic,
  isPaymentApproved as isMercadoPagoApproved,
  
  resolveAsaasCredentials,
  createAsaasCustomer,
  createAsaasPayment,
  fetchAsaasPixQrCode,
  fetchAsaasPaymentStatus,
  isAsaasPaymentApproved,
  persistAsaasPayment
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

  const resolveGatewayForClinic = async (clinicId, req) => {
    const preferred = getPreferredGateway();
    const superAdmin = isSuperAdmin(req);
    const isPublicFlow = !req?.user;
    const [asaasCreds, mpCreds] = await Promise.all([
      resolveAsaasCredentials(clinicId, { allowEnvFallback: false }),
      resolveMercadoPagoCredentials(clinicId, {
        allowClinicConfig: false,
        allowEnvFallback: superAdmin || isPublicFlow,
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
      clinicId, docType, clinicDoc, modality, signupId,
    } = req.body || {};

    try {
      if (!clinicId) return res.status(400).json({ ok: false, error: "clinicId invalido." });
      if (!email || !name || !clinicName) return res.status(400).json({ ok: false, error: "Dados obrigatorios ausentes." });

      const normalizedClinicId = String(clinicId).trim();
      const { gateway, asaasCreds, mpCreds } = await resolveGatewayForClinic(normalizedClinicId, req);

      if (!gateway) {
        return res.status(503).json({ ok: false, error: "Nenhum gateway de pagamento (Mercado Pago ou Asaas) está configurado no servidor." });
      }

      const sanitizePlan = (p) => { if (!p) return "basico"; const s = new Set(["basico","profissional","premium"]); return s.has(String(p)) ? String(p) : "basico"; };
      const selectedPlan = sanitizePlan(plan);
      const unitAmount = Number(amount);
      if (!Number.isFinite(unitAmount) || unitAmount <= 0) return res.status(400).json({ ok: false, error: "Valor de pagamento invalido." });

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

        return res.json({
          ok: true,
          preference_id: payment.id,
          init_point: payment.invoiceUrl,
          qr_code: qrCodePayload?.payload || "",
          qr_code_base64: qrCodePayload?.encodedImage || "",
          point_of_interaction_url: payment.invoiceUrl,
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

      return res.json({
        ok: true,
        preference_id: mpData.id,
        init_point: mpData.init_point,
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
        point_of_interaction_url: pointOfInteractionUrl,
      });

    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/payment-status/:clinicId", async (req, res) => {
    const clinicId = String(req.params?.clinicId || "").trim();
    const email = String(req.query?.email || "").trim();

    if (!clinicId || !isUuid(clinicId)) {
      return res.status(400).json({ ok: false, error: "clinicId invalido." });
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
        if (localPayment) return res.json({ ok: true, status: "approved", payment: { id: localPayment.mp_payment_id, status: localPayment.status } });

        const searchUrl = `${baseUrl}/payments?externalReference=${encodeURIComponent(clinicId)}&limit=1`;
        const searchRes = await fetch(searchUrl, { headers: { access_token: token } });
        if (searchRes.ok) {
          const payload = await searchRes.json();
          const first = payload?.data?.[0];
          if (first) {
            const approved = isAsaasPaymentApproved(first);
            if (approved) await persistAsaasPayment(first, clinicId);
            return res.json({ ok: true, status: approved ? "approved" : "pending", payment: first });
          }
        }
        return res.json({ ok: true, status: "pending", payment: null });
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

      if (!payment) return res.json({ ok: true, status: "pending", payment: null });

      const approved = isMercadoPagoApproved(payment);
      if (approved) await persistMercadoPagoPayment(payment, clinicId);

      return res.json({ ok: true, status: approved ? "approved" : "pending", payment });

    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Multi-gateway Webhook handler
  router.post("/webhook", async (req, res) => {
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
      const { token, webhookSecret } = await resolveMercadoPagoCredentials();
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
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      addLog(`[Webhook] Error: ${error.message}`);
      return res.status(200).json({ ok: true });
    }
  });

  return router;
};
