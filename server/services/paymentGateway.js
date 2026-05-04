import crypto from "crypto";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config/env.js";
import { addLog } from "./logger.js";
import { supabaseAdmin } from "./supabase.js";

const DEFAULT_PLAN_PRICES = {
  basico: 97.0,
  profissional: 147.0,
  premium: 297.0,
};

const parsePlanPrice = (val, fallback) => {
  const num = Number(val);
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

const cleanEnv = (v) => String(v || "").trim();
const sanitizePlan = (p) => String(p || "basico").toLowerCase().trim();

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
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
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
    ...(allowClinicConfig ? [mpClinicConfig?.access_token, mpClinicConfig?.accessToken] : []),
    ...(allowEnvFallback ? [process.env.MP_ACCESS_TOKEN] : []),
  );
  const publicKey = pickString(
    ...(allowClinicConfig ? [mpClinicConfig?.public_key, mpClinicConfig?.publicKey] : []),
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
    await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
      method: "POST",
      headers: getSupabaseWriteHeaders(),
      body: JSON.stringify(body),
    });
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
    mp_payment_id: String(payment.id), // Using same column as mp_payment_id
    amount: Number(payment.value || 0),
    status: String(payment.status || "PENDING").toLowerCase(),
    plan: sanitizePlan(metadata.plan || "basico"),
    payer_email: String(metadata.user_email || ""),
    payer_name: String(metadata.user_name || ""),
    created_at: new Date().toISOString(),
  };

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
      method: "POST",
      headers: getSupabaseWriteHeaders(),
      body: JSON.stringify(body),
    });
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
