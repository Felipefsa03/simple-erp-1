import crypto from "crypto";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config/env.js";
import { addLog } from "./logger.js";
import { supabaseAdmin } from "./supabase.js";

export const DEFAULT_PLAN_PRICES = {
  basico: 17.0,
  profissional: 197.0,
  premium: 397.0,
};

export const parsePlanPrice = (val, fallback) => {
  const num = Number(val);
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

export const cleanEnv = (v) => String(v || "").trim();
export const sanitizePlan = (p) => {
  const s = String(p || "basico").toLowerCase().trim();
  const allowed = new Set(["basico", "profissional", "premium"]);
  return allowed.has(s) ? s : "basico";
};

const getClinicIntegrationConfig = async (clinicId) => {
  const normalizedClinicId = String(clinicId || "").trim();
  if (!normalizedClinicId) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from("integration_config")
      .select("*")
      .eq("clinic_id", normalizedClinicId)
      .maybeSingle();
    if (error) {
      addLog(`[Gateway] Falha ao buscar integração da clínica ${normalizedClinicId}: ${error.message}`);
      return null;
    }
    return data || null;
  } catch (error) {
    addLog(`[Gateway] Erro ao buscar integração da clínica ${normalizedClinicId}: ${error.message}`);
    return null;
  }
};

const pickString = (...values) => {
  for (const value of values) {
    const normalized = cleanEnv(value);
    if (normalized) return normalized;
  }
  return "";
};

const getSupabaseWriteHeaders = () => ({
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=representation",
});

// ============================================
// MERCADO PAGO GATEWAY
// ============================================

export const resolveMercadoPagoCredentials = async (clinicId = "", options = {}) => {
  const { allowClinicConfig = true, allowEnvFallback = true } = options;
  const config = allowClinicConfig ? await getClinicIntegrationConfig(clinicId) : null;
  const mpClinicConfig =
    config?.mercadopago ||
    config?.mercado_pago ||
    config?.mercadoPago ||
    null;

  const token = pickString(
    ...(allowClinicConfig ? [mpClinicConfig?.access_token, mpClinicConfig?.accessToken, config?.mp_access_token] : []),
    ...(allowEnvFallback ? [process.env.MP_ACCESS_TOKEN] : []),
  );
  const publicKey = pickString(
    ...(allowClinicConfig ? [mpClinicConfig?.public_key, mpClinicConfig?.publicKey, config?.mp_public_key] : []),
    ...(allowEnvFallback ? [process.env.MP_PUBLIC_KEY] : []),
  );
  const webhookSecret = pickString(
    ...(allowClinicConfig ? [mpClinicConfig?.webhook_secret, mpClinicConfig?.webhookSecret] : []),
    ...(allowEnvFallback ? [process.env.MP_WEBHOOK_SECRET] : []),
  );

  const source = mpClinicConfig
    ? "clinic"
    : token || publicKey || webhookSecret
      ? "env"
      : "none";

  return { token, publicKey, webhookSecret, config: mpClinicConfig, source };
};

export const getPlanPricesFromConfig = (config) => ({
  basico: parsePlanPrice(config?.plan_price_basico, DEFAULT_PLAN_PRICES.basico),
  profissional: parsePlanPrice(
    config?.plan_price_profissional,
    DEFAULT_PLAN_PRICES.profissional,
  ),
  premium: parsePlanPrice(
    config?.plan_price_premium,
    DEFAULT_PLAN_PRICES.premium,
  ),
});

export const persistMercadoPagoPayment = async (payment, clinicIdOverride = "") => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !payment?.id) return;

  const metadata = payment.metadata || {};
  const clinicId = String(
    clinicIdOverride || payment.external_reference || metadata.clinic_id || "",
  ).trim();
  if (!clinicId) return;

  const body = {
    id: `mp-${payment.id}`,
    clinic_id: clinicId,
    mp_payment_id: String(payment.id),
    amount: Number(payment.transaction_amount || 0),
    status: String(payment.status || "pending"),
    plan: sanitizePlan(metadata.plan || "basico"),
    payer_email: String(payment.payer?.email || metadata.user_email || ""),
    payer_name: String(payment.payer?.first_name || metadata.user_name || ""),
    created_at: new Date().toISOString(),
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/payments?on_conflict=id`, {
      method: "POST",
      headers: getSupabaseWriteHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      addLog(`[MP] Failed to persist payment ${payment.id}: ${res.status} ${await res.text().catch(() => "")}`);
    }
  } catch (error) {
    addLog(`[MP] Failed to persist payment ${payment.id}: ${error.message}`);
  }
};

export const fetchMercadoPagoPaymentById = async (paymentId, token) => {
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  
  const text = await response.text();
  let payload;
  try {
      payload = JSON.parse(text);
  } catch (err) {
      payload = { raw_text: text };
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error || "Erro ao consultar pagamento";
    throw new Error(message);
  }
  return payload;
};

export const fetchLatestMercadoPagoPaymentByClinic = async (clinicId, token) => {
  const searchUrl =
    `https://api.mercadopago.com/v1/payments/search` +
    `?external_reference=${encodeURIComponent(clinicId)}` +
    "&sort=date_created&criteria=desc&limit=1";

  const response = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  const text = await response.text();
  let payload;
  try {
      payload = JSON.parse(text);
  } catch (err) {
      payload = { raw_text: text };
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error || "Erro ao buscar pagamentos";
    throw new Error(message);
  }
  return payload?.results?.[0] || null;
};

export const isPaymentApproved = (payment) => String(payment?.status || "").toLowerCase() === "approved";

export const persistAsaasPayment = async (payment, clinicIdOverride = "", metadata = {}) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !payment?.id) return;

  const clinicId = String(
    clinicIdOverride || payment.externalReference || metadata.clinic_id || "",
  ).trim();
  if (!clinicId) return;

    const body = {
      id: `asaas-${payment.id}`,
      clinic_id: clinicId,
      asaas_payment_id: String(payment.id),
      amount: Number(payment.value || 0),
    status: String(payment.status || "PENDING").toLowerCase(),
    plan: sanitizePlan(metadata.plan || "basico"),
    payer_email: String(metadata.user_email || ""),
    payer_name: String(metadata.user_name || ""),
    created_at: new Date().toISOString(),
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/payments?on_conflict=id`, {
      method: "POST",
      headers: getSupabaseWriteHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      addLog(`[Asaas] Failed to persist payment ${payment.id}: ${res.status} ${await res.text().catch(() => "")}`);
    }
  } catch (error) {
    addLog(`[Asaas] Failed to persist payment ${payment.id}: ${error.message}`);
  }
};

// ============================================
// ASAAS GATEWAY
// ============================================

export const resolveAsaasCredentials = async (clinicId = "", options = {}) => {
  const { allowEnvFallback = false } = options;
  const config = await getClinicIntegrationConfig(clinicId);
  const asaasConfig = config?.asaas || null;

  const token = pickString(
    asaasConfig?.api_key,
    asaasConfig?.apiKey,
    ...(allowEnvFallback ? [process.env.ASAAS_API_KEY] : []),
  );
  const environment = pickString(
    asaasConfig?.environment,
    asaasConfig?.env,
    ...(allowEnvFallback ? [process.env.ASAAS_ENV] : []),
  ) || "sandbox";
  const baseUrl = environment === 'production' 
    ? 'https://api.asaas.com/v3'
    : 'https://api-sandbox.asaas.com/v3';

  const source = asaasConfig ? "clinic" : token ? "env" : "none";
  return { token, baseUrl, source, config: asaasConfig };
};

const asaasRequest = async (endpoint, options = {}, token, baseUrl) => {
  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'access_token': token,
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (err) {
    payload = { raw_text: text };
  }

  if (!response.ok) {
    const errorMsg = payload?.errors?.[0]?.description || payload?.message || payload?.error || "Erro na API do Asaas";
    throw new Error(errorMsg);
  }
  return payload;
};

export const createAsaasCustomer = async ({ name, email, cpfCnpj, phone }, token, baseUrl) => {
  const payload = await asaasRequest('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name,
      email,
      cpfCnpj: String(cpfCnpj).replace(/\D/g, ''),
      phone: String(phone).replace(/\D/g, '')
    })
  }, token, baseUrl);

  return payload; // Returns { id: "cus_...", ... }
};

export const createAsaasPayment = async ({ customerId, value, description, dueDate, externalReference }, token, baseUrl) => {
  const payload = await asaasRequest('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: customerId,
      billingType: 'PIX',
      value: Number(value),
      dueDate: dueDate, // YYYY-MM-DD
      description: description,
      externalReference: externalReference
    })
  }, token, baseUrl);

  return payload; // Returns { id: "pay_...", invoiceUrl: "...", ... }
};

export const fetchAsaasPixQrCode = async (paymentId, token, baseUrl) => {
  const payload = await asaasRequest(`/payments/${paymentId}/pixQrCode`, {
    method: 'GET'
  }, token, baseUrl);

  return payload; // Returns { encodedImage: "base64...", payload: "BR.GOV.BCB.PIX..." }
};

export const fetchAsaasPaymentStatus = async (paymentId, token, baseUrl) => {
  const payload = await asaasRequest(`/payments/${paymentId}`, {
    method: 'GET'
  }, token, baseUrl);

  return payload;
};

export const isAsaasPaymentApproved = (payment) => {
  const status = String(payment?.status || "").toUpperCase();
  return status === "RECEIVED" || status === "CONFIRMED";
};

export const resolveStripeCredentials = async (clinicId = "", options = {}) => {
  const { allowClinicConfig = true, allowEnvFallback = true } = options;
  const config = allowClinicConfig ? await getClinicIntegrationConfig(clinicId) : null;
  const stripeConfig = config?.stripe || config?.stripe_config || null;
  const secretKey = pickString(
    ...(allowClinicConfig ? [stripeConfig?.secret_key, stripeConfig?.secretKey] : []),
    ...(allowEnvFallback ? [process.env.STRIPE_SECRET_KEY] : []),
  );
  const publishableKey = pickString(
    ...(allowClinicConfig ? [stripeConfig?.publishable_key, stripeConfig?.publishableKey] : []),
    ...(allowEnvFallback ? [process.env.STRIPE_PUBLISHABLE_KEY] : []),
  );
  const webhookSecret = pickString(
    ...(allowClinicConfig ? [stripeConfig?.webhook_secret, stripeConfig?.webhookSecret] : []),
    ...(allowEnvFallback ? [process.env.STRIPE_WEBHOOK_SECRET] : []),
  );
  const source = stripeConfig
    ? "clinic"
    : secretKey || publishableKey || webhookSecret
      ? "env"
      : "none";
  return { secretKey, publishableKey, webhookSecret, config: stripeConfig, source };
};

const stripeRequest = async (endpoint, { method = "GET", body } = {}, secretKey) => {
  const formBody = body
    ? Object.entries(body)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join("&")
    : undefined;
  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody,
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (err) {
    payload = { raw_text: text };
  }
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.message || "Erro na API do Stripe");
  }
  return payload;
};

export const createStripeCheckoutSession = async ({
  clinicId,
  plan,
  amount,
  email,
  name,
  phone,
  successUrl,
  cancelUrl,
  signupId = "",
}) => {
  const { secretKey } = await resolveStripeCredentials(clinicId);
  if (!secretKey) return null;
  const frontendUrl = process.env.FRONTEND_URL || "https://clinxia.vercel.app";
  const session = await stripeRequest(
    "/checkout/sessions",
    {
      method: "POST",
      body: {
        mode: "payment",
        "payment_method_types[0]": "card",
        success_url: successUrl || `${frontendUrl}/?payment=success`,
        cancel_url: cancelUrl || `${frontendUrl}/?payment=failure`,
        customer_email: email,
        client_reference_id: String(clinicId || ""),
        "line_items[0][quantity]": 1,
        "line_items[0][price_data][currency]": "brl",
        "line_items[0][price_data][unit_amount]": Math.round(Number(amount) * 100),
        "line_items[0][price_data][product_data][name]": `Clinxia - Plano ${plan}`,
        "metadata[clinic_id]": String(clinicId || ""),
        "metadata[plan]": String(plan || ""),
        "metadata[gateway]": "stripe",
        ...(signupId ? { "metadata[signup_id]": String(signupId) } : {}),
      },
    },
    secretKey,
  );
  return { id: session.id, url: session.url, paymentIntent: session.payment_intent };
};

export const verifyStripeSignature = (rawBody, signatureHeader, webhookSecret) => {
  try {
    if (!rawBody || !signatureHeader || !webhookSecret) return false;
    const parts = String(signatureHeader).split(",").map((p) => p.trim()).filter(Boolean);
    const ts = parts.find((p) => p.startsWith("t="))?.slice(2);
    const v1s = parts.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
    if (!ts || v1s.length === 0) return false;
    const payload = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(`${ts}.${payload}`)
      .digest("hex");
    return v1s.some((v1) => {
      if (v1.length !== expected.length) return false;
      return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
    });
  } catch (err) {
    return false;
  }
};

export const activateClinicSubscription = async (clinicId, plan = "", gateway = "stripe") => {
  const normalizedClinicId = String(clinicId || "").trim();
  if (!normalizedClinicId || !SUPABASE_URL) return false;
  const headers = {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };
  const now = new Date().toISOString();
  const clinicPatch = { status: "active", updated_at: now };
  if (plan) clinicPatch.plan = sanitizePlan(plan);
  try {
    const [subRes, clinicRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/clinic_subscriptions?clinic_id=eq.${encodeURIComponent(normalizedClinicId)}`,
        { method: "PATCH", headers, body: JSON.stringify({ status: "active", gateway, updated_at: now }) },
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/clinics?id=eq.${encodeURIComponent(normalizedClinicId)}`,
        { method: "PATCH", headers, body: JSON.stringify(clinicPatch) },
      ),
    ]);
    addLog(`[Payment] Clínica ${normalizedClinicId} ativada via ${gateway} (sub=${subRes.ok}, clinic=${clinicRes.ok})`);
    return subRes.ok || clinicRes.ok;
  } catch (err) {
    addLog(`[Payment] Erro ao ativar assinatura de ${normalizedClinicId}: ${err.message}`);
    return false;
  }
};
