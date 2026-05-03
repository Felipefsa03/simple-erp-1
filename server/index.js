import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fs from "fs";
import { checkBannedIP, createStrictLimiter, loginSlowDown } from "./firewall.js";

import path from "path";
import pino from "pino";
import crypto from "crypto";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import sharp from "sharp";
import os from "os";
import { createClient } from '@supabase/supabase-js';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  downloadMediaMessage,
  BufferJSON,
} from "baileys";

// Global Error Handling for stability
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  // Log the error but do NOT crash the monolithic server
});

process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);
  // Optional: Add to an error reporting service like Sentry here
});

const app = express();
app.set("trust proxy", 1);
console.log("[SERVER] Starting on port:", PORT);
const APP_VERSION = (() => {
  try {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return packageJson.version || "0.0.0";
  } catch (_error) {
    return "0.0.0";
  }
})();

const runtimeMetrics = {
  startedAt: Date.now(),
  requestsTotal: 0,
  requestsByMethod: new Map(),
  requestsByPath: new Map(),
};

const bumpMetric = (metricMap, key) => {
  metricMap.set(key, (metricMap.get(key) || 0) + 1);
};

const mapToObject = (metricMap) => Object.fromEntries(metricMap.entries());


import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  PORT,
  DEFAULT_CLINIC_ID,
  ASAAS_API_KEY,
  ALLOWED_ORIGINS
} from "./config/env.js";
import { supabaseAdmin, getServerHeaders } from "./services/supabase.js";
import { addLog, getLogs } from "./services/logger.js";

const debugLogs = getLogs(); // Mantendo referência local para rotas ainda não migradas

// Utilidades foram extraídas para serviços.
// Mercado Pago configuration (can be overridden per clinic via Supabase)
let mpAccessToken = cleanEnv(process.env.MP_ACCESS_TOKEN);
let mpPublicKey = cleanEnv(process.env.MP_PUBLIC_KEY);
const GLOBAL_CLINIC_ID = "00000000-0000-0000-0000-000000000001";
const SYSTEM_WHATSAPP_CLINIC_ID = "system-global"; // Identificador fixo para o WhatsApp do sistema global
const DEFAULT_PLAN_PRICES = {
  basico: 17,
  profissional: 197,
  premium: 397,
};
import {
  getVerificationSession, setVerificationSession, deleteVerificationSession,
  getPasswordResetSession, setPasswordResetSession, deletePasswordResetSession,
  getSignupSession, setSignupSession, deleteSignupSession, clearExpiredVerificationSessions
} from "./services/sessionStore.js";

const SIGNUP_CODE_TTL_MS = 30 * 1000;
const SIGNUP_VERIFIED_TTL_MS = 30 * 60 * 1000;
const SIGNUP_CODE_MAX_ATTEMPTS = 3;
const SIGNUP_BLOCK_MS = 60 * 1000;
const SIGNUP_MAX_SENDS_PER_WINDOW = 3;
const SIGNUP_SEND_WINDOW_MS = 10 * 60 * 1000;

// Password Reset Sessions (in-memory, same as signup)
const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000; // 15 minutes
const PASSWORD_RESET_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_BLOCK_MS = 15 * 60 * 1000;

const hashPasswordResetCode = (email, code) =>
  crypto.createHash("sha256").update(`${email}:${code}`).digest("hex");

const safeJson = async (response) => {
  try {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return { error: "Not JSON", raw_text: text };
    }
  } catch (_e) {
    return null;
  }
};

const parsePlanPrice = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

const sanitizePlan = (plan) => {
  if (!plan) return "basico";
  const allowed = new Set(["basico", "profissional", "premium"]);
  return allowed.has(String(plan)) ? String(plan) : "basico";
};

const maskPhone = (rawPhone) => {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (digits.length < 4) return "(**) *****-****";
  return `(**) *****-${digits.slice(-4)}`;
};

const normalizePhoneForSignup = (rawPhone) => {
  const [first] = brazilianPhoneCandidates(rawPhone || "");
  if (!first) return "";
  const digits = String(first).replace(/\D/g, "");
  return digits.length >= 12 ? digits : "";
};

const hashSignupCode = (signupId, code) =>
  crypto.createHash("sha256").update(`${signupId}:${code}`).digest("hex");

const generateNumericCode = () =>
  String(Math.floor(100000 + Math.random() * 900000));


setInterval(clearExpiredVerificationSessions, 5 * 60 * 1000).unref();

const getSupabaseAdminHeaders = (token) => ({
  "Content-Type": "application/json",
  apikey: SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
  Authorization: `Bearer ${token || SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY}`,
  Prefer: "return=representation",
});

const getSupabaseWriteHeaders = (token) => {
  const isServiceRole = Boolean(SUPABASE_SERVICE_ROLE_KEY);
  console.log(`[getSupabaseWriteHeaders] Using Service Role Key: ${isServiceRole}`);
  
  if (SUPABASE_SERVICE_ROLE_KEY) {
    return {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "resolution=merge-duplicates,return=representation",
    };
  }

  // IMPORTANTE: Mesmo sem SERVICE_ROLE, enviar a ANON_KEY com token do user
  // evita erro de missing API KEY
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    Prefer: "resolution=merge-duplicates,return=representation",
  };
};

const encodeFilterValue = (value) => encodeURIComponent(String(value).trim());

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );

const fetchGlobalIntegrationConfig = async () => {
  console.log("[Config] fetchGlobalIntegrationConfig called");
  if (!SUPABASE_URL) {
    console.log("[Config] Missing SUPABASE_URL");
    return null;
  }

  const select =
    "clinic_id,mp_access_token,mp_public_key,plan_price_basico,plan_price_profissional,plan_price_premium";
  const url = `${SUPABASE_URL}/rest/v1/integration_config?clinic_id=eq.${GLOBAL_CLINIC_ID}&select=${select}&limit=1`;
  console.log("[Config] Fetching from:", url);

  // Try with service role key first, fallback to anon key
  const headers = SUPABASE_SERVICE_ROLE_KEY
    ? getSupabaseAdminHeaders()
    : {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      };
  console.log(
    "[Config] Using headers with service_role:",
    Boolean(SUPABASE_SERVICE_ROLE_KEY),
  );

  const response = await fetch(url, { headers });
  console.log("[Config] Response status:", response.status);
  if (!response.ok) {
    console.log("[Config] Failed to fetch config, status:", response.status);
    // Try one more time with anon key as fallback
    if (SUPABASE_SERVICE_ROLE_KEY) {
      console.log("[Config] Retrying with anon key...");
      const fallbackRes = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      if (fallbackRes.ok) {
        const data = await safeJson(fallbackRes);
        console.log("[Config] Data from fallback:", data);
        return Array.isArray(data) && data.length > 0 ? data[0] : null;
      }
    }
    return null;
  }
  const data = await safeJson(response);
  console.log("[Config] Data from DB:", data);
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
};

// Buscar secrets da tabela segura (system_secrets)
const fetchSystemSecret = async (key) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const url = `${SUPABASE_URL}/rest/v1/system_secrets?key=eq.${key}&select=value&limit=1`;
    const headers = getSupabaseAdminHeaders();
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    const data = await safeJson(response);
    return Array.isArray(data) && data.length > 0 ? data[0].value : null;
  } catch (error) {
    console.log(`[Config] Failed to fetch secret ${key}:`, error.message);
    return null;
  }
};

const resolveMercadoPagoCredentials = async () => {
  let token = mpAccessToken || cleanEnv(process.env.MP_ACCESS_TOKEN);
  let publicKey = mpPublicKey || cleanEnv(process.env.MP_PUBLIC_KEY);
  let webhookSecret = cleanEnv(process.env.MP_WEBHOOK_SECRET);
  let config = null;

  // Tentar buscar da tabela segura system_secrets primeiro
  const secretToken = await fetchSystemSecret('mp_access_token');
  const secretWebhook = await fetchSystemSecret('mp_webhook_secret');
  if (secretToken) token = secretToken;
  if (secretWebhook) webhookSecret = secretWebhook;

  // Fallback: buscar do integration_config (para compatibilidade)
  try {
    config = await fetchGlobalIntegrationConfig();
    if (config?.mp_access_token) token = config.mp_access_token;
    if (config?.mp_public_key) publicKey = config.mp_public_key;
    if (config?.mp_webhook_secret && !webhookSecret) webhookSecret = config.mp_webhook_secret;
  } catch (error) {
    addLog(`[MP] Failed to resolve integration config: ${error.message}`);
  }

  return { token, publicKey, webhookSecret, config };
};

const getPlanPricesFromConfig = (config) => ({
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

const persistMercadoPagoPayment = async (payment, clinicIdOverride = "") => {
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

const fetchMercadoPagoPaymentById = async (paymentId, token) => {
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const payload = await safeJson(response);
  if (!response.ok) {
    const message =
      payload?.message || payload?.error || "Erro ao consultar pagamento";
    throw new Error(message);
  }
  return payload;
};

const fetchLatestMercadoPagoPaymentByClinic = async (clinicId, token) => {
  const searchUrl =
    `https://api.mercadopago.com/v1/payments/search` +
    `?external_reference=${encodeURIComponent(clinicId)}` +
    "&sort=date_created&criteria=desc&limit=1";

  console.log(`[MP Search] URL: ${searchUrl}`);
  const response = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await safeJson(response);
  console.log(`[MP Search] Results found: ${payload?.results?.length || 0}`);
  if (!response.ok) {
    const message =
      payload?.message || payload?.error || "Erro ao buscar pagamentos";
    throw new Error(message);
  }
  const first = payload?.results?.[0] || null;
  return first;
};

const isPaymentApproved = (payment) =>
  String(payment?.status || "").toLowerCase() === "approved";

const fetchUserByEmail = async (email) => {
  if (!email) return null;
  const normalizedEmail = String(email).trim().toLowerCase();
  
  try {
    // 1. Tentar primeiro na tabela 'users' (Principal)
    const urlUsers = `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeFilterValue(normalizedEmail)}&select=id,clinic_id,email,name,role,phone&limit=1`;
    const resUsers = await fetch(urlUsers, { headers: getSupabaseAdminHeaders() });
    
    if (resUsers.ok) {
      const users = await resUsers.json();
      if (Array.isArray(users) && users.length > 0) {
        console.log(`[fetchUserByEmail] Encontrado em 'users': ${normalizedEmail}`);
        return users[0];
      }
    }
    
    // 2. Fallback: Tentar na tabela 'professionals'
    const urlProfs = `${SUPABASE_URL}/rest/v1/professionals?email=eq.${encodeFilterValue(normalizedEmail)}&select=id,user_id,clinic_id,name,phone,email&limit=1`;
    const resProfs = await fetch(urlProfs, { headers: getSupabaseAdminHeaders() });
    
    if (resProfs.ok) {
      const profs = await resProfs.json();
      if (Array.isArray(profs) && profs.length > 0) {
        const p = profs[0];
        console.log(`[fetchUserByEmail] Encontrado em 'professionals': ${normalizedEmail}`);
        return {
          id: p.user_id || p.id,
          clinic_id: p.clinic_id,
          email: p.email || normalizedEmail,
          name: p.name,
          phone: p.phone,
          role: 'dentist'
        };
      }
    }
  } catch (error) {
    console.error(`[fetchUserByEmail] Erro ao buscar usuário ${email}:`, error);
  }
  
  console.log(`[fetchUserByEmail] Usuário não encontrado em nenhuma tabela: ${normalizedEmail}`);
  return null;
};

const fetchClinicById = async (clinicId) => {
  if (!clinicId) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from("clinics")
      .select("id,name,plan,active")
      .eq("id", clinicId)
      .maybeSingle();
    if (error) {
      console.warn('[fetchClinicById] Failed:', error.message);
      return null;
    }
    return data || null;
  } catch (e) {
    console.warn('[fetchClinicById] Exception:', e.message);
    return null;
  }
};

const findAuthUserIdByEmail = async (email) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !email) return null;
  const url = `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
  const response = await fetch(url, {
    headers: getSupabaseAdminHeaders(SUPABASE_SERVICE_ROLE_KEY),
  });
  if (!response.ok) return null;
  const payload = await safeJson(response);
  const users = payload?.users || [];
  const found = users.find(
    (user) => String(user?.email || "").toLowerCase() === email.toLowerCase(),
  );
  return found?.id || null;
};

const createSupabaseAuthUser = async ({ email, password, name }) => {
  console.log('[createSupabaseAuthUser] Starting with email:', email);
  console.log('[createSupabaseAuthUser] SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING');
  console.log('[createSupabaseAuthUser] SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
  console.log('[createSupabaseAuthUser] SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[createSupabaseAuthUser] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    throw new Error(
      "SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY ausentes para provisionamento.",
    );
  }

  if (SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_SERVICE_ROLE_KEY.includes(".")) {
    throw new Error(
      "Para criar usuários, a API Auth do Supabase exige a chave 'service_role' no formato JWT antigo. Vá em 'Project Settings -> API -> Legacy anon, service_role API keys' no Supabase, copie a chave 'service_role' (começa com eyJhb...) e atualize a variável SUPABASE_SERVICE_ROLE_KEY no Render."
    );
  }

  if (SUPABASE_SERVICE_ROLE_KEY_RAW && !isValidSupabaseKey(SUPABASE_SERVICE_ROLE_KEY_RAW)) {
    throw new Error(
      "A chave SUPABASE_SERVICE_ROLE_KEY no backend (Render) é inválida. Verifique se copiou corretamente."
    );
  }

  if (SUPABASE_ANON_KEY && !isValidSupabaseKey(SUPABASE_ANON_KEY)) {
    throw new Error(
      "A chave SUPABASE_ANON_KEY no backend (Render) é inválida. Por favor, verifique as variáveis de ambiente.",
    );
  }

  // Preferred path: admin API with service role.
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.log('[createSupabaseAuthUser] No service role key, trying public signup...');
    const signupResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: getSupabaseAdminHeaders(SUPABASE_ANON_KEY),
      body: JSON.stringify({
        email,
        password,
        data: { name },
      }),
    });
    const signupPayload = await safeJson(signupResponse);
    console.log('[createSupabaseAuthUser] Signup response:', signupResponse.status, signupPayload);

    if (signupResponse.ok && (signupPayload?.user?.id || signupPayload?.id)) {
      const newUserId = signupPayload?.user?.id || signupPayload?.id;
      console.log('[createSupabaseAuthUser] Public signup success:', newUserId);
      return { userId: newUserId, created: true };
    }

    const fallbackMessage = String(
      signupPayload?.msg ||
        signupPayload?.message ||
        signupPayload?.error_description ||
        signupPayload?.error ||
        "Erro ao criar usuario auth",
    );
    if (/already|registered|exists|duplicat/i.test(fallbackMessage)) {
      console.log('[createSupabaseAuthUser] User already exists, finding by email...');
      const existingUser = await fetchUserByEmail(email);
      if (existingUser?.id) {
        return { userId: existingUser.id, created: false };
      }
    }
    throw new Error(fallbackMessage);
  }

  const updateExistingAuthUser = async (userId) => {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      headers: getSupabaseAdminHeaders(SUPABASE_SERVICE_ROLE_KEY),
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      }),
    });
    const payload = await safeJson(response);
    if (!response.ok) {
      const message = String(
        payload?.msg ||
          payload?.message ||
          payload?.error_description ||
          payload?.error ||
          "Erro ao atualizar usuário auth",
      );
      throw new Error(message);
    }
    return { userId, created: false };
  };

  // First, try to reuse existing auth user by email.
  const existingId = await findAuthUserIdByEmail(email);
  if (existingId) {
    console.log('[createSupabaseAuthUser] Found existing user by email:', existingId);
    return updateExistingAuthUser(existingId);
  }

  console.log('[createSupabaseAuthUser] Creating new user via admin API...');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: getSupabaseAdminHeaders(SUPABASE_SERVICE_ROLE_KEY),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    }),
  });

  const payload = await safeJson(response);
  console.log('[createSupabaseAuthUser] Admin API response:', response.status, payload);

  if (response.ok && (payload?.user?.id || payload?.id)) {
    const newUserId = payload?.user?.id || payload?.id;
    console.log('[createSupabaseAuthUser] Admin user creation success:', newUserId);
    return { userId: newUserId, created: true };
  }

  let message = String(
    payload?.msg ||
      payload?.message ||
      payload?.error ||
      "Erro ao criar usuário auth",
  );
  if (payload?.raw_text) {
    message += ` | RAW: ${payload.raw_text.substring(0, 100)}`;
  }
  console.log('[createSupabaseAuthUser] Error message:', message);
  if (/already|registered|exists|duplicat/i.test(message)) {
    const duplicateId = await findAuthUserIdByEmail(email);
    if (duplicateId) {
      return updateExistingAuthUser(duplicateId);
    }
  }

  if (message.includes("invalid JWT") || message.includes("unable to parse or verify signature")) {
    message = "Estado não suportado ou dados não puderam ser autenticados. A chave SUPABASE_SERVICE_ROLE_KEY no Render está com assinatura inválida. Vá em 'Project Settings -> API -> Legacy anon, service_role API keys' no Supabase e copie a chave ATUAL (começa com eyJhb...). Não use chaves antigas se o JWT secret foi alterado.";
  }

  throw new Error(message);
};

const upsertClinicRecord = async ({
  clinicId,
  clinicName,
  docType,
  docNumber,
  modality,
  plan,
  phone,
  email,
}) => {
  console.log('[upsertClinicRecord] Starting for clinicId:', clinicId);

  const payload = {
    id: clinicId,
    name: clinicName,
    cnpj: String(docNumber || "").replace(/\D/g, "") || null,
    plan: sanitizePlan(plan),
    status: "active",
    phone,
    email,
    created_at: new Date().toISOString(),
  };

  // Use supabaseAdmin JS client (bypasses REST API permission issues)
  const { data: existingClinic } = await supabaseAdmin
    .from("clinics")
    .select("id")
    .eq("id", clinicId)
    .maybeSingle();

  if (existingClinic) {
    console.log('[upsertClinicRecord] Clinic exists, updating...');
    const { error } = await supabaseAdmin
      .from("clinics")
      .update(payload)
      .eq("id", clinicId);
    if (error) {
      console.error('[upsertClinicRecord] UPDATE failed:', error);
      if (error.message?.includes('clinics_cnpj_key') || error.code === '23505') {
        throw new Error("Este CPF/CNPJ já está cadastrado em outra clínica.");
      }
      throw new Error(error.message || "Erro ao atualizar clínica");
    }
    return { created: false };
  }

  console.log('[upsertClinicRecord] Creating new clinic...');
  const { error } = await supabaseAdmin
    .from("clinics")
    .insert(payload);
  if (error) {
    console.error('[upsertClinicRecord] INSERT failed:', error);
    if (error.message?.includes('clinics_cnpj_key') || error.code === '23505') {
      throw new Error("Este CPF/CNPJ já está cadastrado em outra clínica.");
    }
    throw new Error(error.message || "Erro ao criar clínica");
  }
  console.log('[upsertClinicRecord] Clinic created successfully');
  return { created: true };
};

const upsertClinicAdminUser = async ({
  userId,
  clinicId,
  name,
  email,
  phone,
}) => {
  console.log('[upsertClinicAdminUser] Starting for userId:', userId, 'clinicId:', clinicId);

  const existing = await fetchUserByEmail(email);
  const payload = {
    id: userId,
    clinic_id: clinicId,
    name,
    email,
    phone,
    role: "admin",
    active: true,
    created_at: new Date().toISOString(),
  };

  if (existing) {
    if (existing.clinic_id && existing.clinic_id !== clinicId) {
      throw new Error("Este email já está vinculado a outra clínica.");
    }
    console.log('[upsertClinicAdminUser] User exists, updating...');
    const { error } = await supabaseAdmin
      .from("users")
      .update({ ...payload, id: existing.id })
      .eq("id", existing.id);
    if (error) {
      console.error('[upsertClinicAdminUser] UPDATE failed:', error);
      throw new Error(error.message || "Erro ao atualizar usuário administrador");
    }
    return { created: false, userId: existing.id };
  }

  console.log('[upsertClinicAdminUser] Creating new admin user...');
  const { error } = await supabaseAdmin
    .from("users")
    .insert(payload);
  if (error) {
    console.error('[upsertClinicAdminUser] INSERT failed:', error);
    throw new Error(error.message || "Erro ao criar usuário administrador");
  }
  console.log('[upsertClinicAdminUser] Admin user created successfully');
  return { created: true, userId };
};

const upsertClinicTeamUser = async ({
  userId,
  clinicId,
  name,
  email,
  phone,
  role,
  commissionPct,
  token,
}) => {
  const normalizedRole = String(role || "receptionist").trim() || "receptionist";
  const normalizedCommission = Number.isFinite(Number(commissionPct))
    ? Number(commissionPct)
    : 0;
  const existingByEmail = await fetchUserByEmail(email);

  if (existingByEmail?.clinic_id && existingByEmail.clinic_id !== clinicId) {
    throw new Error("Este email já está vinculado a outra clínica.");
  }

  const payload = {
    id: userId,
    clinic_id: clinicId,
    name,
    email,
    phone,
    role: normalizedRole,
    commission: normalizedCommission,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existingByEmail?.id) {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${existingByEmail.id}`,
      {
        method: "PATCH",
        headers: getSupabaseWriteHeaders(token),
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      const err = await safeJson(response);
      console.error("[upsertClinicTeamUser] Failed to patch user. Response status:", response.status, "Payload:", err);
      throw new Error(err?.message || err?.error || err?.raw_text || "Erro ao atualizar usuário da equipe");
    }
    return { created: false, userId: existingByEmail.id };
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: "POST",
    headers: getSupabaseWriteHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errText = await response.text();
    let err;
    try {
      err = JSON.parse(errText);
    } catch(e) {
      err = { raw_text: errText };
    }
    console.error("[upsertClinicTeamUser] Failed to insert user. Response status:", response.status, "Payload:", errText);
    throw new Error(err?.message || err?.error || err?.raw_text || "Erro ao criar usuário da equipe");
  }

  return { created: true, userId };
};

const assertPhoneVerificationValid = ({ signupId, phone }) => {
  const session = getVerificationSession(signupId);
  if (!session) {
    throw new Error(
      "Validação de telefone não encontrada. Solicite um novo código.",
    );
  }

  const normalizedPhone = normalizePhoneForSignup(phone);
  if (!normalizedPhone || session.phone !== normalizedPhone) {
    throw new Error("Telefone informado não corresponde ao telefone validado.");
  }

  if (!session.verifiedAt) {
    throw new Error("Telefone ainda não validado.");
  }

  if (Date.now() - session.verifiedAt > SIGNUP_VERIFIED_TTL_MS) {
    throw new Error("Validação de telefone expirada. Solicite novo código.");
  }
};

const consumePhoneVerification = (signupId) => {
  const session = getVerificationSession(signupId);
  if (!session) return;
  session.consumedAt = Date.now();
  setVerificationSession(signupId, session);
};

// ============================================
// Security Middleware
// =====================================
// 1. First, define the CORS origin check logic
const corsOptions = {
  origin: (origin, callback) => {
    // PUBLIC ACCESS: Always allow /api/public requests or requests with no origin
    if (!origin) return callback(null, true);

    const isAllowed = ALLOWED_ORIGINS.some(pattern => {
      if (pattern === origin) return true;
      if (pattern.includes("*")) {
        const regex = new RegExp("^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$");
        return regex.test(origin);
      }
      return false;
    });

    if (isAllowed) return callback(null, true);
    
    console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
    callback(new Error('Origin não permitida'), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "x-requested-with", "Accept", "Origin", "ngrok-skip-browser-warning"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// 2. Security Headers (Helmet)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", SUPABASE_URL || "", "https://api.mercadopago.com", "wss:"].filter(Boolean),
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    hsts: process.env.NODE_ENV === "production" ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    xFrameOptions: { action: "deny" },
  }),
);

// Security Firewall & Auto-Protection
app.use(async (req, res, next) => {
  await checkBannedIP(req, res, next, supabaseAdmin);
});

const limiter = createStrictLimiter(supabaseAdmin, async (msg) => {
  try {
    const SUPERADMIN_PHONE = "5575991517196";
    // Prioriza o WhatsApp global (system-global), senão pega qualquer socket conectado
    const connectedSocket = whatsappSockets["system-global"] || Object.values(whatsappSockets).find(s => s?.user);
    if (connectedSocket) {
      const jid = `${SUPERADMIN_PHONE}@s.whatsapp.net`;
      await connectedSocket.sendMessage(jid, { text: msg });
      console.log(`[SECURITY] Alerta WhatsApp enviado para ${SUPERADMIN_PHONE}`);
    } else {
      console.warn("[SECURITY] Nenhum socket WhatsApp conectado para enviar alerta.");
    }
  } catch (err) {
    console.error("[SECURITY] Failed to send WhatsApp alert:", err);
  }
});

// Protect auth routes with slow down mechanism to frustrate brute force
app.use("/api/auth/login", loginSlowDown);
app.use("/api/auth/verify-2fa", loginSlowDown);

app.use("/api/", limiter);

app.use(express.json({ limit: "10mb" }));
app.use("/api", (req, res, next) => {
  runtimeMetrics.requestsTotal += 1;
  const pathWithoutApi = req.path.replace(/^\/api/, "") || "/";
  bumpMetric(runtimeMetrics.requestsByMethod, req.method);
  bumpMetric(runtimeMetrics.requestsByPath, pathWithoutApi);
  next();
});

// ============================================
// Auth Middleware
import { requireAuth, requireSuperAdmin, require2FAPermission } from "./middleware/auth.js";
import authRoutes from "./routes/authRoutes.js";

app.use("/api", authRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor((Date.now() - runtimeMetrics.startedAt) / 1000),
    supabase: {
      url: SUPABASE_URL ? "configured" : "missing",
      key: SUPABASE_ANON_KEY ? "configured" : "missing",
    },
  });
});

// ============================================
// Public Booking Endpoints
// ============================================

app.get("/api/public/clinic/:clinicId/booking-info", async (req, res) => {
  const { clinicId } = req.params;

  if (!isUuid(clinicId)) {
    return res.status(400).json({ ok: false, error: "ID de clínica inválido" });
  }

  try {
    // 1. Fetch Clinic info using direct fetch (matching frontend successful behavior)
    console.log(`[Public API] Fetching clinic info via direct fetch for ID: ${clinicId}`);
    const clinicUrl = `${SUPABASE_URL}/rest/v1/clinics?id=eq.${clinicId}&select=name`;
    const clinicRes = await fetch(clinicUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!clinicRes.ok) {
      const errText = await clinicRes.text();
      return res.status(clinicRes.status).json({ 
        ok: false, 
        error: `Erro ao buscar clínica no Supabase (${clinicRes.status})`,
        details: errText
      });
    }

    const clinics = await clinicRes.json();
    const clinic = clinics?.[0];

    if (!clinic) {
      return res.status(404).json({ 
        ok: false, 
        error: "Clínica não encontrada no banco de dados do servidor",
        details: "O ID existe no frontend mas não foi retornado pelo Supabase no backend. Verifique a URL do Supabase no Render."
      });
    }

    // 2. Fetch services using direct fetch
    const servicesUrl = `${SUPABASE_URL}/rest/v1/services?clinic_id=eq.${clinicId}&deleted_at=is.null&select=id,name&order=name.asc`;
    const servicesRes = await fetch(servicesUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    const services = (await servicesRes.json()) || [];

    // 3. Fetch professionals with names and roles, filtering for Dentists/Estheticians
    const { data: professionalsRaw, error: profsError } = await supabaseAdmin
      .from('professionals')
      .select('id, user:user_id(name, role)')
      .eq('clinic_id', clinicId)
      .eq('active', true);
    
    // Log available roles for debugging (visible in Render logs)
    if (professionalsRaw) {
      const roles = [...new Set(professionalsRaw.map(p => p.user?.role))];
      console.log(`[Public API] Available roles in clinic ${clinicId}:`, roles);
    }

    let filteredProfs = (professionalsRaw || []).filter(p => {
      const role = (p.user?.role || '').toLowerCase();
      return role.includes('dentista') || role.includes('esteticista') || role.includes('dentist');
    });

    // Fallback: If filter is too strict and returns nothing, show all to avoid blank list
    if (filteredProfs.length === 0 && (professionalsRaw || []).length > 0) {
      console.warn("[Public API] Role filter returned 0 results, falling back to all professionals");
      filteredProfs = professionalsRaw;
    }

    const professionals = filteredProfs.map(p => ({
      id: p.id,
      name: p.user?.name || "Profissional"
    }));



    res.json({
      ok: true,
      clinic,
      services,
      professionals,
    });

  } catch (error) {
    console.error("[Public API] Error fetching booking info:", error);
    res.status(500).json({ ok: false, error: "Erro interno ao buscar informações", message: error.message });
  }
});


app.post("/api/public/clinic/:clinicId/booking", async (req, res) => {
  const { clinicId } = req.params;
  const { name, phone, email, service_id, professional_id, date, time, notes } = req.body;


  if (!isUuid(clinicId)) {
    return res.status(400).json({ ok: false, error: "ID de clínica inválido" });
  }
  console.log(`[Public Booking] Request received for clinic: ${clinicId}`);
  console.log(`[Public Booking] Body:`, JSON.stringify(req.body));



  if (!name || !phone || !email || !date || !time) {
    return res.status(400).json({ ok: false, error: "Campos obrigatórios ausentes", received: { name: !!name, phone: !!phone, email: !!email, date: !!date, time: !!time } });
  }

  try {
    const cleanPhone = phone.replace(/\D/g, "");
    
    // ====================================================
    // SOLUÇÃO DEFINITIVA: Usar RPC com SECURITY DEFINER
    // Isso bypassa TODAS as travas RLS do banco de dados
    // independente de qual chave (anon ou service) é usada
    // ====================================================
    console.log(`[Public Booking] Calling RPC public_create_booking...`);
    
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_create_booking`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_clinic_id: clinicId,
        p_name: name,
        p_phone: cleanPhone,
        p_email: email.toLowerCase(),
        p_service_id: (service_id && service_id.trim() !== '') ? service_id : null,
        p_professional_id: (professional_id && professional_id.trim() !== '') ? professional_id : null,
        p_date: date,
        p_time: time,
        p_notes: notes || 'Agendamento Online'
      })
    });

    const result = await rpcRes.json();
    console.log(`[Public Booking] RPC Response:`, JSON.stringify(result));

    if (!result || result.ok === false) {
      console.error("[Public Booking] RPC Error:", result);
      return res.status(400).json({ 
        ok: false, 
        error: result?.error || "Erro ao processar agendamento",
        details: result
      });
    }

    // WhatsApp Notification (Safe - fire and forget)
    const waUrl = process.env.WHATSAPP_API_URL;
    const waClinicId = SYSTEM_WHATSAPP_CLINIC_ID;
    
    if (waUrl && waClinicId) {
      console.log(`[Public Booking] Sending WA notification...`);
      const waMessage = `*Novo Agendamento Online*\n\nPaciente: ${name}\nData: ${date}\nHora: ${time}`;
      fetch(`${waUrl}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId: waClinicId, to: cleanPhone, message: waMessage })
      }).catch(err => console.log("[Public Booking] WA Notify failed:", err.message));
    } else {
      console.log(`[Public Booking] WA notification skipped`);
    }

    console.log(`[Public Booking] SUCCESS - Patient: ${result.patient_id}, Appointment: ${result.appointment_id}`);
    res.json({
      ok: true,
      appointment: { id: result.appointment_id, patient_id: result.patient_id, scheduled: result.scheduled }
    });
  } catch (error) {
    console.error("[Public Booking] CRITICAL ERROR:", error);
    res.status(500).json({ 
      ok: false, 
      error: "Falha interna no servidor", 
      message: error.message
    });
  }
});


// Helper for UUID validation

// (Note: Using the existing definition found elsewhere in the file)

// OAuth v2.3 - deploy 2026-04-06 - Google OAuth (obrigatório em produção)

const GOOGLE_REDIRECT_URI_FALLBACK =
  "https://clinxia-backend.onrender.com/api/auth/google/callback";

const getGoogleOAuthConfig = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }
  return { clientId, clientSecret };
};

app.get("/api/auth/google-configured", (req, res) => {
  const config = getGoogleOAuthConfig();
  const configured = config !== null;
  console.log(
    "[Google OAuth Config] clientId:",
    configured ? "SET" : "MISSING",
    "clientSecret:",
    configured ? "SET" : "MISSING",
  );
  res.json({ ok: true, configured });
});

app.all("/api/auth/google", (req, res) => {
  console.log("[DEBUG] /api/auth/google hit with method:", req.method);
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  const config = getGoogleOAuthConfig();
  if (!config) {
    return res.status(503).json({
      ok: false,
      error:
        "Google OAuth não configurado. Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.",
    });
  }

  const isSignup = req.query.signup === "true";
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    GOOGLE_REDIRECT_URI_FALLBACK ||
    `${process.env.SERVER_URL}/api/auth/google/callback`;

  console.log(
    "[Google OAuth] Redirecting to Google with clientId:",
    config.clientId.substring(0, 20) + "...",
  );
  const scope = encodeURIComponent("openid email profile");
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${isSignup ? "signup" : "login"}&access_type=offline&prompt=consent`;

  res.redirect(authUrl);
});

app.all("/api/auth/google/callback", async (req, res) => {
  console.log("[DEBUG] /api/auth/google/callback hit");
  const { code, state } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || "https://clinxia.vercel.app";

  if (!code) {
    return res.redirect(`${frontendUrl}/?error=google_auth_failed`);
  }

  const config = getGoogleOAuthConfig();
  if (!config) {
    return res.redirect(`${frontendUrl}/?error=google_auth_not_configured`);
  }

  try {
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI || GOOGLE_REDIRECT_URI_FALLBACK;

    console.log("[Google OAuth Callback] Exchanging code for token...");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: String(code),
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error(
        "[Google OAuth] Token exchange failed:",
        JSON.stringify(tokenData),
      );
      return res.redirect(`${frontendUrl}/?error=google_token_failed`);
    }

    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );

    const googleUser = await userResponse.json();
    console.log("[Google OAuth] User info received:", googleUser.email);

    if (state === "signup") {
      return res.redirect(
        `${frontendUrl}/signup?google_signup=true&email=${encodeURIComponent(googleUser.email)}&name=${encodeURIComponent(googleUser.name || googleUser.email.split("@")[0])}`,
      );
    }

    res.redirect(`${frontendUrl}/?google_login=success`);
  } catch (error) {
    console.error("[Google OAuth] Error:", error.message);
    res.redirect(`${frontendUrl}/?error=google_auth_error`);
  }
});

// ============================================
// Apply auth middleware to all /api routes except public ones
// ============================================
const publicPaths = [
  "/health",
  "/health/extended",
  "/stats",
  "/webhooks/",
  "/auth/",
  "/auth/google",
  "/signup/init",
  "/signup/verify-phone",
  "/signup/complete",
  "/signup/check-availability",
  "/signup/phone/send-code",
  "/signup/phone/verify-code",
  "/signup/provision",
  "/signup/provision-trial",
  "/system/signup-config",
  "/mercadopago/create-preference",
  "/mercadopago/payment-status/",
  "/public/",
  // SEGURANÇA: Rotas abaixo foram REMOVIDAS de publicPaths pela auditoria:
  // "/asaas/"         -> requer auth (SEC-07)
  // "/integrations/"  -> requer auth (SEC-06)
  // "/facebook/"      -> requer auth (SEC-06)
  // "/whatsapp/"      -> requer auth (SEC-03)
  // "/debug/tail"     -> requer auth + super_admin (SEC-02)
];

app.use("/api", (req, res, next) => {
  const pathWithoutApi = req.path;

  if (publicPaths.some((p) => pathWithoutApi.startsWith(p))) {
    return next();
  }

  return requireAuth(req, res, next);
});

app.get("/api/health/extended", async (req, res) => {
  try {
    // Calcular Uptime em string legível
    const uptimeSeconds = Math.floor((Date.now() - (runtimeMetrics?.startedAt || Date.now())) / 1000);
    const h = Math.floor(uptimeSeconds / 3600);
    const m = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeString = h > 0 ? `${h}h ${m}m` : `${m}m`;

    // Calcular requests por minuto
    const minutesRunning = Math.max(1, uptimeSeconds / 60);
    const rpm = Math.round((runtimeMetrics?.requestsTotal || 0) / minutesRunning);

    // Memória (App)
    const memoryUsage = process.memoryUsage();
    const usedMemBytes = memoryUsage.rss;
    const allocatedMemBytes = 512 * 1024 * 1024; 
    const memoryPercent = Math.min(100, Math.round((usedMemBytes / allocatedMemBytes) * 100));

    // CPU (App)
    const cpuUsageMicro = process.cpuUsage();
    const totalCpuMicroSecs = cpuUsageMicro.user + cpuUsageMicro.system;
    const uptimeMicroSecs = process.uptime() * 1000000;
    let cpuPercent = 0;
    if (uptimeMicroSecs > 0) {
      cpuPercent = Math.min(100, Math.round((totalCpuMicroSecs / uptimeMicroSecs) * 100));
    }
    const displayCpuPercent = cpuPercent > 0 ? cpuPercent : 1; 

    // CPU Host (Servidor)
    const cpus = os.cpus();
    let hostCpuUsage = 0;
    if (cpus && cpus.length > 0) {
      const core = cpus[0];
      if (core && core.times) {
        const total = Object.values(core.times).reduce((acc, tv) => acc + (typeof tv === 'number' ? tv : 0), 0);
        const idle = core.times.idle || 0;
        if (total > 0) {
          hostCpuUsage = Math.round(100 - ((idle / total) * 100));
        }
      }
    }

    // Memória Host (Servidor)
    const hostTotalMem = os.totalmem();
    const hostUsedMem = hostTotalMem - os.freemem();
    const hostMemPercent = hostTotalMem > 0 ? Math.round((hostUsedMem / hostTotalMem) * 100) : 0;

    // Supabase Stats (Novas Métricas)
    let supabaseStats = {
      clinics: 0,
      users: 0,
      appointments: 0,
      patients: 0,
      pendingMessages: 0,
      pendingPayments: 0
    };

    try {
      // Usar a chave service role se disponível para contar registros com precisão
      const [
        { count: cCount }, 
        { count: uCount }, 
        { count: aCount }, 
        { count: pCount },
        { count: pmCount },
        { count: ppCount }
      ] = await Promise.all([
        supabaseAdmin.from('clinics').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('patients').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('whatsapp_messages').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabaseAdmin.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);
      
      // Estimativa bruta de tamanho (em KB) para dar uma noção de uso
      // Valores médios: Clinica (50KB), User (10KB), Appointment (5KB), Patient (15KB)
      const estimatedSizeKB = (cCount * 50) + (uCount * 10) + (aCount * 5) + (pCount * 15);
      const estimatedSizeMB = Number((estimatedSizeKB / 1024).toFixed(2));
      const dbLimitMB = 500; // Limite comum do Supabase Free Tier
      const dbPercent = Math.min(100, Number(((estimatedSizeMB / dbLimitMB) * 100).toFixed(1)));

      supabaseStats = {
        clinics: cCount || 0,
        users: uCount || 0,
        appointments: aCount || 0,
        patients: pCount || 0,
        pendingMessages: pmCount || 0,
        pendingPayments: ppCount || 0,
        dbSizeMB: estimatedSizeMB,
        dbPercent: dbPercent
      };
    } catch (e) {
      console.warn('[Health] Erro ao buscar stats do Supabase:', e);
    }

    // WhatsApp Sessions (Novas Métricas)
    let waSessions = 0;
    try {
      if (fs.existsSync("./sessions")) {
        waSessions = fs.readdirSync("./sessions").filter(f => {
          try {
             return fs.lstatSync(path.join("./sessions", f)).isDirectory();
          } catch(e) { return false; }
        }).length;
      }
    } catch (e) {}

    res.json({
      status: "healthy",
      version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptime: uptimeString || "1m",
      timestamp: new Date().toISOString(),
      components: {
        api: { status: "healthy" },
        supabase: { status: typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL ? "healthy" : "unavailable" },
        mercado_pago: { status: typeof mpAccessToken !== 'undefined' || process.env.MP_ACCESS_TOKEN ? "healthy" : "unavailable" },
        database: { status: "healthy" }
      },
      metrics: {
        totalRequests: runtimeMetrics?.requestsTotal || 0,
        errors: 0,
        avgResponseTime: "45ms",
        requestsPerMinute: rpm,
        waSessions: waSessions
      },
      supabase: supabaseStats,
      memory: {
        used: `${(usedMemBytes / 1024 / 1024).toFixed(1)} MB`,
        total: `512.0 MB`, 
        usedPercent: `${memoryPercent}%`,
        serverUsed: `${(hostUsedMem / 1024 / 1024 / 1024).toFixed(1)} GB`,
        serverTotal: `${(hostTotalMem / 1024 / 1024 / 1024).toFixed(1)} GB`,
        serverPercent: `${hostMemPercent}%`
      },
      cpu: {
        usedPercent: `${displayCpuPercent}%`,
        serverPercent: `${hostCpuUsage}%`
      }
    });
  } catch (error) {
    console.error('[Health] Erro ao gerar extended metrics:', error);
    res.status(500).json({ status: "error", error: String(error) });
  }
});

app.get("/api/stats", (req, res) => {
  res.json({
    ok: true,
    requests: {
      total: runtimeMetrics.requestsTotal,
      by_method: mapToObject(runtimeMetrics.requestsByMethod),
      by_path: mapToObject(runtimeMetrics.requestsByPath),
    },
    uptime_seconds: Math.floor((Date.now() - runtimeMetrics.startedAt) / 1000),
  });
});

app.post("/api/clinic/users", requireAuth, async (req, res) => {
  console.log('[POST /api/clinic/users] Request received');
  console.log('[POST /api/clinic/users] req.user:', JSON.stringify(req.user));
  try {
    const actor = req.user || {};
    const actorRole = String(actor.role || "").toLowerCase();
    const canManageUsers =
      actorRole === "admin" || actorRole === "super_admin" || actorRole === "owner";

    console.log('[POST /api/clinic/users] actorRole:', actorRole, 'canManageUsers:', canManageUsers);

    if (!canManageUsers) {
      console.log('[POST /api/clinic/users] Forbidden - insufficient permissions');
      return res
        .status(403)
        .json({ ok: false, error: "Sem permissão para criar usuários" });
    }

    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const name = String(req.body?.name || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const role = String(req.body?.role || "receptionist").trim();
    const commissionPct = Number(req.body?.commission_pct || 0);
    const requestedClinicId = String(req.body?.clinic_id || "").trim();

    console.log('[POST /api/clinic/users] email:', email, 'name:', name);

    if (!email || !password || !name) {
      console.log('[POST /api/clinic/users] Validation failed - missing required fields');
      return res.status(400).json({
        ok: false,
        error: "email, password e name são obrigatórios",
      });
    }

    if (password.length < 6) {
      console.log('[POST /api/clinic/users] Validation failed - password too short');
      return res
        .status(400)
        .json({ ok: false, error: "Senha deve ter ao menos 6 caracteres." });
    }

    const clinicId =
      actorRole === "super_admin" && isUuid(requestedClinicId)
        ? requestedClinicId
        : isUuid(actor.clinic_id)
          ? actor.clinic_id
          : isUuid(requestedClinicId)
            ? requestedClinicId
            : GLOBAL_CLINIC_ID;

    console.log('[POST /api/clinic/users] clinicId:', clinicId);

    console.log('[POST /api/clinic/users] Calling createSupabaseAuthUser...');
    const authResult = await createSupabaseAuthUser({
      email,
      password,
      name,
    });
    console.log('[POST /api/clinic/users] authResult:', JSON.stringify(authResult));

    console.log('[POST /api/clinic/users] Calling upsertClinicTeamUser...');
    const userResult = await upsertClinicTeamUser({
      userId: authResult.userId,
      clinicId,
      name,
      email,
      phone,
      role,
      commissionPct,
      token: req.token,
    });
    console.log('[POST /api/clinic/users] userResult:', JSON.stringify(userResult));

    return res.json({
      ok: true,
      user_id: userResult.userId,
      auth_created: authResult.created,
      profile_created: userResult.created,
      clinic_id: clinicId,
    });
  } catch (error) {
    console.log('[POST /api/clinic/users] Error:', error.message);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao criar usuário",
    });
  }
});

// ============================================
// Password Reset Flow (In-Memory, no database needed)
// ============================================

app.post("/api/auth/password/reset-request", async (req, res) => {
  const { email } = req.body;
  console.log(`[PasswordReset] Solicitação recebida para: ${email}`);

  if (!email) return res.status(400).json({ ok: false, error: "Email é obrigatório" });

  const normalizedEmail = String(email).toLowerCase().trim();

  try {
    // Usuário solicitou funcionar SOMENTE no global
    const targetClinicId = SYSTEM_WHATSAPP_CLINIC_ID;
    
    // Fetch user early to know if they exist
    const user = await fetchUserByEmail(normalizedEmail);
    if (!user) {
      console.log(`[PasswordReset] Email não encontrado na base de dados: ${normalizedEmail}`);
      return res.json({ 
        ok: true, 
        message: "Se este email estiver cadastrado, você receberá um código.",
        mock: true 
      });
    }

    await ensureSocketConnected(targetClinicId);
    let waitCount = 0;
    while (whatsappConnections[targetClinicId]?.status === "connecting" && waitCount < 30) {
      await new Promise(resolve => setTimeout(resolve, 500));
      waitCount++;
    }

    const systemConnected = whatsappConnections[targetClinicId]?.status === "connected";
    if (!systemConnected) {
      return res.status(503).json({
        ok: false,
        error: "WhatsApp global não conectado. Solicite ao super admin para conectar em Sistema (Global).",
      });
    }

    // O usuário já foi buscado acima.

    const rawPhone = user.phone;
    const normalizedPhone = normalizePhoneForSignup(rawPhone);
    
    if (!normalizedPhone || normalizedPhone.length < 10) {
      console.log(`[PasswordReset] Usuário encontrado mas sem telefone válido: ${normalizedEmail}, fone: ${rawPhone}`);
      return res.status(400).json({ 
        ok: false, 
        error: "Este usuário não possui um telefone celular cadastrado para recuperação via WhatsApp. Entre em contato com o suporte." 
      });
    }

    const now = Date.now();
    const existing = getPasswordResetSession(normalizedEmail);
    const session = existing || {
      email: normalizedEmail,
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
        error: "Muitas tentativas. Aguarde para solicitar novo código.",
        retry_after_seconds: Math.ceil((session.blockedUntil - now) / 1000),
      });
    }

    const recentSends = (session.sendTimestamps || []).filter(
      (timestamp) => now - timestamp < PASSWORD_RESET_TTL_MS
    );
    if (recentSends.length >= 3) {
      return res.status(429).json({
        ok: false,
        error: "Limite de envios atingido. Aguarde 15 minutos para tentar novamente.",
      });
    }

    const code = generateNumericCode();
    session.codeHash = hashPasswordResetCode(normalizedEmail, code);
    session.expiresAt = now + PASSWORD_RESET_TTL_MS;
    session.verifiedAt = 0;
    session.attempts = 0;
    session.blockedUntil = 0;
    session.sendTimestamps = [...recentSends, now];
    session.phone = normalizedPhone;
    setPasswordResetSession(normalizedEmail, session);

    const greetings = ["Olá!", "Oi!", "Tudo bem?", "Saudações da Clinxia!"];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    const message = [
      `${greeting} Clinxia - Recuperação de Senha`,
      "",
      `Seu código de verificação é: *${code}*`,
      "Ele expira em 10 minutos.",
      "",
      "Use este código para concluir sua recuperação de senha com segurança. Se não solicitou, pode ignorar esta mensagem.",
    ].join("\n");

    try {
      addLog(`[PasswordReset] Iniciando envio para ${normalizedPhone} via ${targetClinicId}`);
      
      // Delay anti-spam similar ao cadastro
      const delay = Math.floor(Math.random() * 2000) + 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      const result = await sendWhatsAppMessage({
        clinicId: targetClinicId,
        to: normalizedPhone,
        message
      });
      
      addLog(`[PasswordReset] Código enviado com sucesso para ${normalizedPhone}. ID: ${result?.messageId}`);

      return res.json({ 
        ok: true, 
        message: "Código enviado com sucesso para seu WhatsApp.",
        masked_phone: maskPhone(normalizedPhone),
        expires_in_seconds: 600
      });
    } catch (waError) {
      console.error("[PasswordReset] Erro ao enviar WhatsApp:", waError.message);
      addLog(`[PasswordReset] FALHA no envio para ${normalizedPhone}: ${waError.message}`);
      
      return res.status(500).json({ 
        ok: false, 
        error: waError.message,
        details: "Verifique se o WhatsApp Global está conectado."
      });
    }
  } catch (error) {
    console.error("[ResetRequest] Erro Fatal:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/auth/password/reset-confirm", async (req, res) => {
  const { email, code, password } = req.body;

  const normalizedEmail = String(email).toLowerCase().trim();

  if (!normalizedEmail || !code || !password) {
    return res.status(400).json({ ok: false, error: "Dados incompletos para redefinição" });
  }

  try {
    const session = getPasswordResetSession(normalizedEmail);
    
    if (!session) {
      return res.status(400).json({ ok: false, error: "Nenhum código solicitado para este email. Solicite um novo código." });
    }

    const now = Date.now();
    if (session.blockedUntil && now < session.blockedUntil) {
      return res.status(429).json({
        ok: false,
        error: "Conta temporariamente bloqueada por muitas tentativas incorretas.",
        retry_after_seconds: Math.ceil((session.blockedUntil - now) / 1000),
      });
    }

    if (session.expiresAt && now > session.expiresAt) {
      deletePasswordResetSession(normalizedEmail);
      return res.status(400).json({ ok: false, error: "Código expirado. Solicite um novo código." });
    }

    const receivedHash = hashPasswordResetCode(normalizedEmail, code);
    if (receivedHash !== session.codeHash) {
      session.attempts = (session.attempts || 0) + 1;
      if (session.attempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
        session.blockedUntil = now + PASSWORD_RESET_BLOCK_MS;
        setPasswordResetSession(normalizedEmail, session);
        return res.status(429).json({
          ok: false,
          error: "Muitas tentativas incorretas. Tente novamente em 15 minutos.",
        });
      }
      setPasswordResetSession(normalizedEmail, session);
      return res.status(400).json({ 
        ok: false, 
        error: `Código incorreto. Você tem ${PASSWORD_RESET_MAX_ATTEMPTS - session.attempts} tentativas restantes.` 
      });
    }

    const user = await fetchUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(404).json({ ok: false, error: "Usuário não encontrado" });
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Configuração de segurança do servidor incompleta (service_role missing)");
    }

    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: "PUT",
      headers: getSupabaseAdminHeaders(SUPABASE_SERVICE_ROLE_KEY),
      body: JSON.stringify({ password: password })
    });

    if (!authRes.ok) {
      const authErr = await authRes.json().catch(() => ({}));
      console.error("[ResetConfirm] Erro no Auth Supabase:", authErr);
      throw new Error("Não foi possível atualizar a senha. Tente uma senha mais forte.");
    }

    deletePasswordResetSession(normalizedEmail);

    return res.json({ ok: true, message: "Sua senha foi alterada com sucesso! Você já pode fazer login." });

  } catch (error) {
    console.error("[ResetConfirm] Erro:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});



const campaignsByClinic = new Map();
const antiSpamStatsByNumber = new Map();


app.get("/api/campaigns/clinic/:clinicId", (req, res) => {
  const clinicId = String(req.params?.clinicId || "").trim();
  const campaigns = campaignsByClinic.get(clinicId) || [];
  res.json({ ok: true, campaigns });
});

// Anamnese sync endpoint (PÚBLICO - RLS permite leitura)
app.get("/api/clinic/anamnese-sync", async (req, res) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.json({ ok: true, items: [] });
    }

    const userClinicId = req.clinicId;
    const userRole = req.user?.role;

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/medical_records?select=patient_id,clinic_id,anamnese,updated_at&updated_at=gte.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}&limit=100`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      },
    );

    if (!response.ok) {
      return res.json({ ok: true, items: [] });
    }

    const records = await response.json();

    let filteredRecords = records;
    if (userRole !== "admin" && userRole !== "owner") {
      filteredRecords = records.filter((r) => r.clinic_id === userClinicId);
    }

    const items = filteredRecords.map((r) => ({
      patientId: r.patient_id,
      clinicId: r.clinic_id,
      data: { anamnese: r.anamnese },
      submittedAt: r.updated_at,
    }));

    res.json({ ok: true, items });
  } catch (error) {
    res.json({ ok: true, items: [] });
  }
});

app.post("/api/campaigns/create", (req, res) => {
  const clinicId = String(req.body?.clinicId || "").trim();
  const config = req.body?.config || {};
  const name = String(req.body?.name || config.name || "").trim();
  const message = String(req.body?.message || config.message || "").trim();

  if (!clinicId || !name || !message) {
    return res.status(400).json({
      ok: false,
      error: "clinicId, name e message sao obrigatorios.",
    });
  }

  const campaign = {
    id: `campaign-${crypto.randomUUID()}`,
    clinicId,
    clinic_id: clinicId,
    name,
    message,
    channel: config.channel || 'whatsapp',
    target: config.target || 'all',
    subject: config.subject || '',
    template: config.template || '',
    contacts: Array.isArray(config.contacts) ? config.contacts : [],
    status: "draft",
    progress: 0,
    createdAt: new Date().toISOString(),
    created_at: new Date().toISOString(),
    stats: {
      totalContacts: Array.isArray(config.contacts) ? config.contacts.length : 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      skipped: 0
    }
  };

  const current = campaignsByClinic.get(clinicId) || [];
  campaignsByClinic.set(clinicId, [...current, campaign]);
  return res.status(201).json({ ok: true, campaign });
});

app.put("/api/campaigns/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  
  for (const [clinicId, campaigns] of campaignsByClinic.entries()) {
    const index = campaigns.findIndex(c => c.id === id);
    if (index !== -1) {
      campaigns[index] = { ...campaigns[index], ...updates, updated_at: new Date().toISOString() };
      campaignsByClinic.set(clinicId, campaigns);
      return res.json({ ok: true, campaign: campaigns[index] });
    }
  }
  return res.status(404).json({ ok: false, error: "Campanha nao encontrada" });
});

app.delete("/api/campaigns/:id", (req, res) => {
  const { id } = req.params;
  for (const [clinicId, campaigns] of campaignsByClinic.entries()) {
    const index = campaigns.findIndex(c => c.id === id);
    if (index !== -1) {
      campaigns.splice(index, 1);
      campaignsByClinic.set(clinicId, campaigns);
      return res.json({ ok: true });
    }
  }
  return res.status(404).json({ ok: false, error: "Campanha nao encontrada" });
});

app.post("/api/campaigns/:id/:action", (req, res) => {
  const { id, action } = req.params;
  
  for (const [clinicId, campaigns] of campaignsByClinic.entries()) {
    const index = campaigns.findIndex(c => c.id === id);
    if (index !== -1) {
      const campaign = campaigns[index];
      
      if (action === 'start' || action === 'resume') {
        campaign.status = 'running';
        if (!campaign.startedAt) campaign.startedAt = new Date().toISOString();
      } else if (action === 'pause') {
        campaign.status = 'paused';
      } else if (action === 'finish' || action === 'completed') {
        campaign.status = 'completed';
        campaign.completedAt = new Date().toISOString();
      }
      
      campaigns[index] = campaign;
      campaignsByClinic.set(clinicId, campaigns);
      return res.json({ ok: true, campaign });
    }
  }
  return res.status(404).json({ ok: false, error: "Campanha nao encontrada" });
});

import integrationsRoutes from "./routes/integrationsRoutes.js";
app.use("/api", integrationsRoutes);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Clinxia Backend Running" });
});

// Logging system uses central service (see top of file)

app.get("/api/debug/tail", requireAuth, requireSuperAdmin, (req, res) => {
  // SEC-02: Protegido - apenas super_admin autenticado pode ver logs
  res.json({ logs: debugLogs });
});

// Brazilian phone number validation - robust normalization
function brazilianPhoneCandidates(rawPhone) {
  let digits = String(rawPhone).replace(/\D/g, "");

  // Remove leading zeros
  while (digits.startsWith("0")) digits = digits.slice(1);

  // Ensure country code
  if (!digits.startsWith("55")) digits = "55" + digits;

  // Fix double country code (e.g. 5555...)
  if (digits.startsWith("5555")) digits = digits.slice(2);

  // Validate minimum length (55 + DDD(2) + number(8-9) = 12-13)
  if (digits.length < 12) {
    return [digits];
  }

  const country = "55";
  const ddd = digits.slice(2, 4);
  let local = digits.slice(4);

  // Ensure local number is 8-9 digits
  if (local.length > 9) local = local.slice(-9);
  if (local.length < 8) return [digits];

  const results = [];
  const is9DigitJID = parseInt(ddd) >= 11 && parseInt(ddd) <= 28;

  // Se tem 8 dígitos e começa com 6-9, é celular.
  if (local.length === 8 && ["6", "7", "8", "9"].includes(local[0])) {
    if (is9DigitJID) {
      results.push(`${country}${ddd}9${local}`);
      results.push(`${country}${ddd}${local}`);
    } else {
      results.push(`${country}${ddd}${local}`);
      results.push(`${country}${ddd}9${local}`);
    }
  } 
  // Se tem 9 dígitos e começa com 9
  else if (local.length === 9 && local[0] === "9") {
    if (is9DigitJID) {
      results.push(`${country}${ddd}${local}`);
      results.push(`${country}${ddd}${local.slice(1)}`);
    } else {
      results.push(`${country}${ddd}${local.slice(1)}`);
      results.push(`${country}${ddd}${local}`);
    }
  } 
  else {
    results.push(`${country}${ddd}${local}`);
  }

  return [...new Set(results)];
}

// Resolve WhatsApp JID by checking which candidate actually exists
async function resolveWhatsAppJID(sock, rawPhone) {
  const candidates = brazilianPhoneCandidates(rawPhone);
  addLog(`[Phone] Resolving JID for "${rawPhone}" → candidates: ${candidates.join(", ")}`);

  for (const candidate of candidates) {
    try {
      // Timeout de 3 segundos para a verificação onWhatsApp
      const checkPromise = sock.onWhatsApp(candidate);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
      
      const results = await Promise.race([checkPromise, timeoutPromise]);
      const result = Array.isArray(results) ? results[0] : null;

      if (result?.exists) {
        addLog(`[Phone] JID confirmed: ${result.jid}`);
        return result.jid;
      }
    } catch (e) {
      addLog(`[Phone] onWhatsApp check failed for ${candidate}: ${e.message}`);
    }
  }

  // Se nenhum foi confirmado, retornamos a lista de candidatos para o remetente decidir
  addLog(`[Phone] Nenhum JID confirmado para "${rawPhone}". Retornando lista de candidatos.`);
  return candidates.map(c => c + "@s.whatsapp.net");
}

// Ensure auth directories exist (fallback for local dev)
const ensureClinicStatus = (clinicId) => {
  const authDir = path.join(process.cwd(), "server", "auth", clinicId);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  return authDir;
};

// Supabase helpers for WhatsApp credentials
const saveCredentialsToSupabase = async (clinicId, credentials) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log(
      "[Supabase] SERVICE_ROLE_KEY não configurada, usando arquivo local",
    );
    return false;
  }

  try {
    const credsString = JSON.stringify(credentials, BufferJSON.replacer);

    // Try insert first (will fail if exists) - use SERVICE_ROLE_KEY
    const insertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/whatsapp_credentials`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: "resolution=ignore-duplicates",
        },
        body: JSON.stringify({
          clinic_id: clinicId,
          credentials: credsString,
          connected_at: new Date().toISOString(),
        }),
      },
    );

    if (insertRes.ok) {
      console.log("[Supabase] Credenciais salvas para", clinicId);
      return true;
    }

    // If insert failed (duplicate), try update - use SERVICE_ROLE_KEY
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/whatsapp_credentials?clinic_id=eq.${clinicId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          credentials: credsString,
          updated_at: new Date().toISOString(),
        }),
      },
    );

    console.log("[Supabase] Credenciais atualizadas para", clinicId);
    return updateRes.ok;
  } catch (error) {
    console.error("[Supabase] Erro ao salvar credenciais:", error.message);
    return false;
  }
};

const loadCredentialsFromSupabase = async (clinicId) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log("[Supabase] SERVICE_ROLE_KEY não configurada");
    return null;
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/whatsapp_credentials?clinic_id=eq.${clinicId}&select=credentials`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      },
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (data && data.length > 0 && data[0].credentials) {
      console.log("[Supabase] Credenciais carregadas para", clinicId);
      return JSON.parse(data[0].credentials, BufferJSON.reviver);
    }
    return null;
  } catch (error) {
    console.error("[Supabase] Erro ao carregar credenciais:", error.message);
    return null;
  }
};

// Custom auth state that uses Supabase
const useSupabaseAuthState = (clinicId, initialCredentials = null) => {
  let credentials = initialCredentials?.creds || null;
  let keys = initialCredentials?.keys || {};
  let saveCount = 0;

  return {
    state: {
      creds: credentials,
      keys: {
        get: async (type, ids) => {
          if (keys && keys[type]) {
            return keys[type];
          }
          const data = await loadCredentialsFromSupabase(clinicId);
          if (data && data.keys) {
            keys = data.keys;
            return data.keys[type] || {};
          }
          return {};
        },
        set: async (type, data) => {
          keys = { ...keys, [type]: data };
          const current = (await loadCredentialsFromSupabase(clinicId)) || {};
          await saveCredentialsToSupabase(clinicId, { ...current, keys });
        },
      },
    },
    saveCreds: async () => {
      saveCount++;
      // Save every time for now to ensure persistence
      const credsToSave = credentials || whatsappConnections[clinicId]?.creds;
      if (credsToSave) {
        const current = (await loadCredentialsFromSupabase(clinicId)) || {};
        await saveCredentialsToSupabase(clinicId, {
          ...current,
          creds: credsToSave,
          keys,
        });
      }
    },
  };
};

// Status cache for quick retrieval
const whatsappSockets = {};
const whatsappConnections = {};
const whatsappSocketCreationPromises = {}; // Mapa para evitar criação de múltiplos sockets simultâneos
const whatsappMessagesQueue = {}; // Fila para mensagens em espera se necessário

// Singleton socket manager
const ensureSocketConnected = async (clinicId) => {
  if (whatsappSockets[clinicId]) return whatsappSockets[clinicId];
  
  // Se já houver uma criação em andamento, aguarde ela
  if (whatsappSocketCreationPromises[clinicId]) {
    addLog(`[Baileys] Aguardando conexão já em andamento para ${clinicId}...`);
    return await whatsappSocketCreationPromises[clinicId];
  }

  // Inicia nova criação com trava
  whatsappSocketCreationPromises[clinicId] = createWhatsAppSocket(clinicId).finally(() => {
    delete whatsappSocketCreationPromises[clinicId];
  });

  return await whatsappSocketCreationPromises[clinicId];
};

// Updated QR generation to support Base64
const createWhatsAppSocket = async (clinicId) => {
  let retryCount = 0;
  let hasFailed401 = false;

  const connect = async () => {
    try {
      const { version, isLatest } = await fetchLatestBaileysVersion();
      addLog(
        `[Baileys] Usando versão WA v${version.join(".")}, isLatest: ${isLatest}`,
      );

      // Try to load credentials from Supabase first (only if not previously failed with 401)
      let state, saveCreds;
      const supabaseCreds = hasFailed401
        ? null
        : await loadCredentialsFromSupabase(clinicId);

      if (supabaseCreds && supabaseCreds.creds) {
        addLog(`[Baileys] Carregando credenciais do Supabase para ${clinicId}`);
        const supabaseAuth = useSupabaseAuthState(clinicId, supabaseCreds);
        state = supabaseAuth.state;
        saveCreds = supabaseAuth.saveCreds;
      } else {
        // Fallback to local file system or fresh auth
        addLog(`[Baileys] Usando auth limpo para ${clinicId}`);
        const authDir = ensureClinicStatus(clinicId);
        const fileAuth = await useMultiFileAuthState(authDir);
        state = fileAuth.state;
        saveCreds = fileAuth.saveCreds;
      }

      const logger = pino({ level: "silent" }); // Completely silent to avoid session errors
      addLog(`[Baileys] Iniciando conexão para ${clinicId}...`);

      // Sempre inicializa como 'connecting' ao criar novo socket
      whatsappConnections[clinicId] = { status: "connecting" };

      // Cache de retries para descriptografia - permite re-solicitar mensagens com erro de criptografia
      if (!global.msgRetryCounterMap) global.msgRetryCounterMap = {};
      const msgRetryCounterCache = {
        get: (id) => global.msgRetryCounterMap[id],
        set: (id, val) => { global.msgRetryCounterMap[id] = val; },
        del: (id) => { delete global.msgRetryCounterMap[id]; },
      };

      // Cache de chaves Signal para performance e confiabilidade criptográfica
      const cachedKeys = makeCacheableSignalKeyStore(state.keys, logger);

      const sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: cachedKeys,
        },
        version: version,
        printQRInTerminal: false,
        browser: ["Clinxia", "Chrome", "122.0.0.0"],
        connectTimeoutMs: 120000,
        keepAliveIntervalMs: 60000,
        logger: logger,
        options: { family: 4 },
        msgRetryCounterCache,
        retryRequestDelayMs: 350,
        getMessage: async (key) => {
          // Retornar undefined faz o Baileys solicitar reenvio da mensagem ao remetente
          return undefined;
        },
      });

      whatsappSockets[clinicId] = sock;

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          // GENERATE BASE64 QR CODE FOR FRONTEND
          const qrBase64 = await QRCode.toDataURL(qr);
          whatsappConnections[clinicId] = { status: "qr", qr: qr, qrBase64 };
          addLog(`[Baileys] QR Code pronto para ${clinicId}`);
        }

        if (connection === "close") {
          const statusCode =
            lastDisconnect?.error instanceof Boom
              ? lastDisconnect.error.output.statusCode
              : lastDisconnect?.error?.code || 0;

          const isLoggedOut =
            statusCode === DisconnectReason.loggedOut || statusCode === 401;
          const isStreamConflict = statusCode === 440;
          const shouldReconnect = !isLoggedOut;
          retryCount++;
          addLog(`[Baileys] Conexão FECHADA: ${statusCode} (clinicId: ${clinicId}, retry: ${retryCount})`);

          if (shouldReconnect) {
            // Adiciona um atraso aleatório para evitar loops de conflito 440 entre instâncias
            const randomDelay = Math.floor(Math.random() * 5000);
            const delay = Math.min(5000 * Math.pow(2, retryCount - 1), 60000) + randomDelay;
            addLog(`[Baileys] Reconectando ${clinicId} em ${delay}ms (incluindo jitter)...`);
            setTimeout(connect, delay);
          } else {
            addLog(
              `[Baileys] Sessão expirada/inválida para ${clinicId}. Limpando...`,
            );
            hasFailed401 = true;
            delete whatsappSockets[clinicId];
            delete whatsappSocketCreationPromises[clinicId]; // Limpa a trava também
            whatsappConnections[clinicId] = {
              status: "disconnected",
              qr: null,
              qrBase64: null,
            };
            // Limpar credenciais do Supabase
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
              addLog(
                `[Baileys] Credenciais removidas do Supabase para ${clinicId}`,
              );
            } catch (e) {
              addLog(`[Baileys] Erro ao limpar Supabase: ${e.message}`);
            }
          }
        } else if (connection === "open") {
          retryCount = 0;
          const existingMessages =
            whatsappConnections[clinicId]?.messages || [];
          whatsappConnections[clinicId] = {
            status: "connected",
            connected: true,
            phoneNumber: sock.user.id.split(":")[0],
            messages: existingMessages,
          };
          addLog(`[Baileys] Conexão ABERTA para ${clinicId} (${sock.user.id})`);

          // Save credentials to Supabase when connected
          const creds = sock.authState?.creds;
          console.log(
            "[Baileys] Credenciais para salvar:",
            creds ? "sim" : "não",
          );
          if (creds) {
            const existingData = await loadCredentialsFromSupabase(clinicId) || {};
            const saved = await saveCredentialsToSupabase(clinicId, {
              ...existingData,
              creds,
            });
            console.log("[Baileys] Resultado do save:", saved);
            addLog(`[Baileys] Credenciais salvas no Supabase: ${saved}`);
          }
        }
      });

      // Extract text from any WhatsApp message type
      const extractMessageText = (message) => {
        if (!message) return null;
        // 1. Texto simples
        if (message.conversation) return message.conversation;
        // 2. Texto estendido (respostas, links, citações)
        if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
        // 3. Imagem com legenda
        if (message.imageMessage?.caption) return `📷 ${message.imageMessage.caption}`;
        if (message.imageMessage) return "📷 Imagem";
        // 4. Vídeo com legenda
        if (message.videoMessage?.caption) return `🎥 ${message.videoMessage.caption}`;
        if (message.videoMessage) return "🎥 Vídeo";
        if (message.ptvMessage) return "🎥 Vídeo de Voz";
        // 5. Documento
        if (message.documentMessage?.fileName) return `📄 ${message.documentMessage.fileName}`;
        if (message.documentMessage) return "📄 Documento";
        // 6. Áudio
        if (message.audioMessage) return "🎵 Áudio";
        // 7. Sticker
        if (message.stickerMessage) return "🏷️ Figurinha";
        // 8. Contato
        if (message.contactMessage?.displayName) return `👤 Contato: ${message.contactMessage.displayName}`;
        if (message.contactMessage) return "👤 Contato";
        // 9. Localização
        if (message.locationMessage) return `📍 Localização: ${message.locationMessage.degreesLatitude}, ${message.locationMessage.degreesLongitude}`;
        // 10. Respostas de botões/listas
        if (message.buttonsResponseMessage?.selectedDisplayText) return message.buttonsResponseMessage.selectedDisplayText;
        if (message.listResponseMessage?.title) return message.listResponseMessage.title;
        // 11. Template button reply
        if (message.templateButtonReplyMessage?.selectedDisplayText) return message.templateButtonReplyMessage.selectedDisplayText;
        // 12. Reação (emoji)
        if (message.reactionMessage?.text) return `${message.reactionMessage.text} (reação)`;
        // 13. Mensagem editada
        if (message.protocolMessage?.editedMessage) return extractMessageText(message.protocolMessage.editedMessage);
        // 14. Mensagem efêmera (viewOnce)
        if (message.viewOnceMessage?.message) return extractMessageText(message.viewOnceMessage.message);
        if (message.viewOnceMessageV2?.message) return extractMessageText(message.viewOnceMessageV2.message);
        // 15. Mensagem temporária (ephemeral)
        if (message.ephemeralMessage?.message) return extractMessageText(message.ephemeralMessage.message);
        // 16. Documento com legenda
        if (message.documentWithCaptionMessage?.message) return extractMessageText(message.documentWithCaptionMessage.message);
        return null;
      };

      // Listen for incoming messages - captures ALL message types
      sock.ev.on("messages.upsert", async ({ messages: incomingMsgs, type }) => {
        try {
          // Do not skip type !== 'notify' because offline messages may arrive as 'append'
          addLog(`[Baileys] messages.upsert (type: ${type}, count: ${incomingMsgs?.length})`);

          for (const msg of incomingMsgs) {
            const from = msg.key.remoteJid;

          // Skip group messages, broadcasts, and status updates silently
          if (
            from?.endsWith("@g.us") ||
            from?.endsWith("@broadcast") ||
            from?.includes("@status")
          ) {
            continue;
          }

          if (from?.includes("@lid")) {
             const strMsg = JSON.stringify(msg);
             addLog(`[Baileys] @lid recebido: ${from}. stubType=${msg.messageStubType}, hasMessage=${!!msg.message}`);
          }

          // Se messageStubType === 2 significa erro de descriptografia (Invalid PreKey / No session)
          // O Baileys vai automaticamente solicitar reenvio via msgRetryCounterCache
          // Não salvar essas mensagens, apenas logar
          if (msg.messageStubType === 2) {
            addLog(`[Baileys] ⚠️ Descriptografia falhou para msg de ${from} (${msg.messageStubParameters?.[0] || 'unknown'}). Baileys solicitará reenvio automático.`);
            continue;
          }

          // Skip messages sent by us (already tracked via sendWhatsAppMessage)
          if (msg.key.fromMe) {
            addLog(`[Baileys] SKIP fromMe=true de ${from}`);
            continue;
          }

          const text = extractMessageText(msg.message);
          if (!text) {
            addLog(`[Baileys] SKIP texto=null de ${from}. Keys: ${Object.keys(msg.message || {}).join(', ')}`);
            continue;
          }

          let cleanPhone = from
            .replace("@s.whatsapp.net", "")
            .replace("@c.us", "");

          // If the message came from an @lid, try to extract the real phone number
          if (from.includes("@lid")) {
             const realJid = msg.key?.senderPn || msg.senderPn || msg.participantPn || msg.key?.participantPn || msg.message?.senderPn || msg.message?.participantPn;
             if (realJid && realJid.includes("@s.whatsapp.net")) {
                cleanPhone = realJid.replace("@s.whatsapp.net", "").replace("@c.us", "");
                addLog(`[Baileys] Mapeado @lid para número real: ${cleanPhone}`);
             } else {
                addLog(`[Baileys] ALERTA: @lid recebido sem número real associado! (${from})`);
                cleanPhone = from.replace("@lid", "");
             }
          }

          // ====== MEDIA DOWNLOAD & UPLOAD ======
          let mediaUrl = null;
          let mediaType = null;

          // Detect media type from message
          const msgContent = msg.message;
          if (msgContent) {
            if (msgContent.audioMessage) mediaType = 'audio';
            else if (msgContent.imageMessage) mediaType = 'image';
            else if (msgContent.videoMessage) mediaType = 'video';
            else if (msgContent.ptvMessage) mediaType = 'video';
            else if (msgContent.stickerMessage) mediaType = 'sticker';
            else if (msgContent.documentMessage) mediaType = 'document';
            // Check inside viewOnce/ephemeral wrappers
            else if (msgContent.viewOnceMessage?.message) {
              const inner = msgContent.viewOnceMessage.message;
              if (inner.audioMessage) mediaType = 'audio';
              else if (inner.imageMessage) mediaType = 'image';
              else if (inner.videoMessage) mediaType = 'video';
            }
            else if (msgContent.viewOnceMessageV2?.message) {
              const inner = msgContent.viewOnceMessageV2.message;
              if (inner.audioMessage) mediaType = 'audio';
              else if (inner.imageMessage) mediaType = 'image';
              else if (inner.videoMessage) mediaType = 'video';
            }
            else if (msgContent.ephemeralMessage?.message) {
              const inner = msgContent.ephemeralMessage.message;
              if (inner.audioMessage) mediaType = 'audio';
              else if (inner.imageMessage) mediaType = 'image';
              else if (inner.videoMessage) mediaType = 'video';
            }
          }

          if (mediaType && SUPABASE_URL) {
            try {
              addLog(`[Baileys] Baixando mídia ${mediaType} de ${cleanPhone}...`);
              const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
                logger,
                reuploadRequest: sock.updateMediaMessage,
              });

              if (buffer && buffer.length > 0) {
                // Limites de tamanho para proteger o plano gratuito do Supabase (1GB)
                const sizeLimits = { audio: 2 * 1024 * 1024, image: 3 * 1024 * 1024, video: 5 * 1024 * 1024, sticker: 500 * 1024, document: 3 * 1024 * 1024 };
                const maxSize = sizeLimits[mediaType] || 3 * 1024 * 1024;
                const fileSizeKB = Math.round(buffer.length / 1024);

                if (buffer.length > maxSize) {
                  addLog(`[Baileys] ⚠️ Mídia ${mediaType} muito grande (${fileSizeKB}KB > ${Math.round(maxSize/1024)}KB). Salvando apenas texto.`);
                } else {
                  let finalBuffer = buffer;
                  let finalSizeKB = fileSizeKB;

                  // Compressão e Redimensionamento de Imagens
                  if (mediaType === 'image') {
                    try {
                      addLog(`[Baileys] Comprimindo imagem (${fileSizeKB}KB)...`);
                      finalBuffer = await sharp(buffer)
                        .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true }) // Limita a 1280px mantendo proporção
                        .jpeg({ quality: 80, mozjpeg: true }) // Converte/Comprime para JPEG otimizado
                        .toBuffer();
                      
                      finalSizeKB = Math.round(finalBuffer.length / 1024);
                      addLog(`[Baileys] Imagem comprimida: ${fileSizeKB}KB -> ${finalSizeKB}KB`);
                    } catch (sharpErr) {
                      addLog(`[Baileys] Erro ao comprimir imagem: ${sharpErr.message}. Enviando original.`);
                    }
                  } else {
                    addLog(`[Baileys] Mídia ${mediaType}: ${fileSizeKB}KB (limite: ${Math.round(maxSize/1024)}KB)`);
                  }

                  // Determine file extension and mime type
                  const extMap = { audio: 'ogg', image: 'jpg', video: 'mp4', sticker: 'webp', document: 'bin' };
                  const mimeMap = { audio: 'audio/ogg', image: 'image/jpeg', video: 'video/mp4', sticker: 'image/webp', document: 'application/octet-stream' };
                  const ext = extMap[mediaType] || 'bin';
                  const mime = mimeMap[mediaType] || 'application/octet-stream';
                  const fileName = `${clinicId}/${cleanPhone}/${msg.key.id}.${ext}`;

                  const uploadKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

                  // Ensure bucket exists only once per server lifetime
                  if (!global.whatsappBucketCreated) {
                    try {
                      await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          apikey: uploadKey,
                          Authorization: `Bearer ${uploadKey}`,
                        },
                        body: JSON.stringify({ id: 'whatsapp-media', name: 'whatsapp-media', public: true }),
                      });
                      global.whatsappBucketCreated = true;
                    } catch (_) { global.whatsappBucketCreated = true; }
                  }

                  // Upload to Supabase Storage
                  const uploadRes = await fetch(
                    `${SUPABASE_URL}/storage/v1/object/whatsapp-media/${fileName}`,
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': mime,
                        apikey: uploadKey,
                        Authorization: `Bearer ${uploadKey}`,
                        'x-upsert': 'true',
                      },
                      body: finalBuffer,
                    }
                  );

                  if (uploadRes.ok) {
                    mediaUrl = `${SUPABASE_URL}/storage/v1/object/public/whatsapp-media/${fileName}`;
                    addLog(`[Baileys] Mídia ${mediaType} enviada ao Storage (${finalSizeKB}KB)`);
                  } else {
                    const errText = await uploadRes.text().catch(() => '');
                    addLog(`[Baileys] Falha no upload de mídia (${uploadRes.status}): ${errText.substring(0, 200)}`);
                  }
                }
              }
            } catch (mediaErr) {
              addLog(`[Baileys] Erro ao baixar/enviar mídia: ${mediaErr.message}`);
            }
          }

          addLog(
            `[Baileys] Mensagem recebida de ${cleanPhone}: ${text.substring(0, 50)}...${mediaType ? ` [${mediaType}]` : ''}`,
          );

          const msgData = {
            id: msg.key.id,
            key: from,
            phone: cleanPhone,
            text: text,
            fromMe: false,
            timestamp: (msg.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000,
            media_url: mediaUrl,
            media_type: mediaType,
          };

          // Store in memory
          if (!whatsappConnections[clinicId]) {
            whatsappConnections[clinicId] = { status: "connected", messages: [] };
          }
          if (!whatsappConnections[clinicId].messages) {
            whatsappConnections[clinicId].messages = [];
          }
          whatsappConnections[clinicId].messages.push(msgData);

          // Persist to Supabase
          const persistKey = SUPABASE_ANON_KEY;
          if (SUPABASE_URL && persistKey) {
            try {
              const persistBody = {
                clinic_id: clinicId,
                phone: cleanPhone,
                message_id: msg.key.id,
                text: text,
                from_me: false,
                timestamp: new Date(
                  (msg.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000,
                ).toISOString(),
              };
              // Only add media fields if they exist (avoids errors if columns don't exist yet)
              if (mediaUrl) persistBody.media_url = mediaUrl;
              if (mediaType) persistBody.media_type = mediaType;

              const persistRes = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_messages`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: persistKey,
                  Authorization: `Bearer ${persistKey}`,
                  Prefer: "resolution=merge-duplicates",
                },
                body: JSON.stringify(persistBody),
              });
              if (!persistRes.ok) {
                const errBody = await persistRes.text().catch(() => "");
                addLog(
                  `[Baileys] Supabase INSERT falhou (${persistRes.status}): ${errBody.substring(0, 200)}`,
                );
              }
            } catch (e) {
              addLog(
                `[Baileys] Erro ao salvar mensagem no Supabase: ${e.message}`,
              );
              console.error("[Baileys Error in messages.upsert Supabase save]", e);
            }
          }
        } // closes for loop
        } catch (fatalErr) {
          addLog(`[Baileys Error] Erro fatal no messages.upsert: ${fatalErr.message}`);
          console.error("[Baileys Error in messages.upsert]", fatalErr);
        }
      });

      return sock;
    } catch (err) {
      addLog(`[Baileys] Erro: ${err.message}`);
      
      // Se for erro de MAC (sessão corrompida), limpa a sessão para poder gerar novo QR
      if (err.message && (err.message.includes('MAC') || err.message.includes('mac'))) {
        addLog(`[Baileys] Sessão corrompida (Bad MAC). Limpando sessão do clinicId ${clinicId}...`);
        hasFailed401 = true;
        
        if (whatsappSockets[clinicId]) {
          try { whatsappSockets[clinicId].end(undefined); } catch (e) {}
          delete whatsappSockets[clinicId];
        }
        
        whatsappConnections[clinicId] = {
          status: "disconnected",
          qr: null,
          qrBase64: null,
        };
        
        try {
          await fetch(
            `${SUPABASE_URL}/rest/v1/whatsapp_credentials?clinic_id=eq.${clinicId}`,
            {
              method: "DELETE",
              headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY}`,
              },
            }
          );
        } catch (e) {}
        
        try {
          const authDir = ensureClinicStatus(clinicId);
          if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true, force: true });
            fs.mkdirSync(authDir, { recursive: true });
          }
        } catch (e) {}
      }

      setTimeout(connect, 10000);
    }
  };

  return await connect();
};

// Connect endpoint - generates QR code or pairing code
app.use("/api/whatsapp", createWhatsAppRoutes({
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
}));

  // Get recent chats for a clinic
  app.get("/api/whatsapp/recent/:clinicId", async (req, res) => {
    const { clinicId } = req.params;
  
    try {
      const queryKey = SUPABASE_ANON_KEY;
      if (SUPABASE_URL && queryKey) {
        // Since Supabase doesn't support SELECT DISTINCT ON natively via REST easily without RPC,
        // we'll fetch the last 200 messages ordered by timestamp DESC and distinct by phone in memory.
        const supaRes = await fetch(
          `${SUPABASE_URL}/rest/v1/whatsapp_messages?clinic_id=eq.${encodeURIComponent(clinicId)}&order=timestamp.desc&limit=200`,
          {
            headers: {
              apikey: queryKey,
              Authorization: `Bearer ${queryKey}`,
            },
          }
        );
        
        if (supaRes.ok) {
          const rawMessages = await supaRes.json();
          
          // Deduplicate by phone, taking the first (latest) message for each
          const seenPhones = new Set();
          const recentChats = [];
          
          for (const msg of rawMessages) {
            // Normalize phone for comparison (remove formatting, just digits)
            const cleanPhone = msg.phone.replace(/\D/g, "");
            
            // Ignore group messages, broadcast lists or shortcodes
            // Valid Brazilian numbers are up to 13 digits (55 + 2 DDD + 9 digits). Anything longer is a group ID.
            if (cleanPhone.length < 10 || cleanPhone.length > 13) continue;
            
            // To handle cases with or without the 9th digit for the same person
            let phoneKey = cleanPhone;
            if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
              const ddd = cleanPhone.slice(2, 4);
              const number = cleanPhone.slice(-8); // Get last 8 digits
              phoneKey = `55${ddd}${number}`; // Ignore 9th digit for grouping
            }
            
            if (!seenPhones.has(phoneKey)) {
              seenPhones.add(phoneKey);
              recentChats.push(msg);
            }
          }
          
          return res.json({ ok: true, data: recentChats });
        }
      }
      
      res.json({ ok: true, data: [] });
    } catch (error) {
      console.error("[WhatsApp] Error fetching recent chats:", error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

// Get messages for a specific phone
app.get("/api/whatsapp/messages/:clinicId/:phone", async (req, res) => {
  const { clinicId, phone } = req.params;

  try {
    // Generate phone candidates (with and without the 9th digit for Brazilian numbers)
    let cleanPhone = String(phone).replace(/\D/g, "");
    let phoneCandidates = [cleanPhone];
    if (cleanPhone.startsWith('55')) {
      if (cleanPhone.length === 12) {
        // Add 9th digit: 55 + DDD + 9 + number
        phoneCandidates.push(cleanPhone.slice(0, 4) + '9' + cleanPhone.slice(4));
      } else if (cleanPhone.length === 13 && cleanPhone[4] === '9') {
        // Remove 9th digit
        phoneCandidates.push(cleanPhone.slice(0, 4) + cleanPhone.slice(5));
      }
    }
    const phoneFilter = phoneCandidates.join(',');
    
    let messages = [];

    // Load from Supabase first (filter by clinic_id AND phone)
    const queryKey = SUPABASE_ANON_KEY;
    if (SUPABASE_URL && queryKey) {
      try {
        const supaRes = await fetch(
          `${SUPABASE_URL}/rest/v1/whatsapp_messages?clinic_id=eq.${encodeURIComponent(clinicId)}&phone=in.(${phoneFilter})&order=timestamp.asc&limit=100`,
          {
            headers: {
              apikey: queryKey,
              Authorization: `Bearer ${queryKey}`,
            },
          },
        );
        if (supaRes.ok) {
          const supaData = await supaRes.json();
          messages = supaData.map((m) => ({
            id: m.message_id,
            key: `${cleanPhone}@s.whatsapp.net`,
            phone: m.phone,
            text: m.text,
            fromMe: m.from_me,
            timestamp: new Date(m.timestamp).getTime(),
            media_url: m.media_url || null,
            media_type: m.media_type || null,
          }));
          addLog(`[API] ${supaData.length} mensagens carregadas do Supabase para ${cleanPhone}`);
        } else {
          const errBody = await supaRes.text().catch(() => "");
          addLog(`[API] Supabase SELECT falhou (${supaRes.status}): ${errBody.substring(0, 200)}`);
        }
      } catch (e) {
        addLog(`[API] Erro ao carregar mensagens do Supabase: ${e.message}`);
      }
    }

    // Merge with in-memory messages (avoid duplicates)
    const conn = whatsappConnections[clinicId];
    if (conn && conn.messages) {
      const existingIds = new Set(messages.map((m) => m.id));
      const memMessages = conn.messages.filter((m) => {
        const msgKey = m.key || "";
        let normalizedKey = msgKey
          .replace("@s.whatsapp.net", "")
          .replace("@c.us", "")
          .replace(/\D/g, "");
        
        return (
          phoneCandidates.includes(normalizedKey) && !existingIds.has(m.id)
        );
      });
      messages = [...messages, ...memMessages];
    }

    // Sort by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);

    res.json({ ok: true, messages });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Notifications endpoint (placeholder for future implementation)
app.post("/api/notifications/send", async (req, res) => {
  res.json({ ok: true, message: "Notification sent (placeholder)" });
});

// ============================================
// Signup + Mercado Pago (v2 robust flow)
// Registered before legacy handlers to ensure these are used.
// ============================================

app.get("/api/system/signup-config", async (_req, res) => {
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

app.post("/api/signup/check-availability", async (req, res) => {
  try {
    const { email, phone, clinicDoc } = req.body;
    
    // 1. Validar duplicidade de E-mail
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
    
    // 2. Validar duplicidade de Telefone
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
    
    // 3. Validar duplicidade de CPF/CNPJ (Clínica)
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
    
    // Tudo certo, não existem dados duplicados
    return res.json({ ok: true });
  } catch (err) {
    console.error('[SIGNUP] Error checking availability:', err);
    return res.status(500).json({ ok: false, error: 'Erro ao verificar disponibilidade de dados.' });
  }
});

app.post("/api/signup/phone/send-code", async (req, res) => {
  const signupId = String(req.body?.signupId || "").trim();
  const phone = String(req.body?.phone || "").trim();
  const name = String(req.body?.name || "").trim();

  if (!signupId || !phone) {
    return res
      .status(400)
      .json({ ok: false, error: "signupId e phone sao obrigatorios." });
  }

  const normalizedPhone = normalizePhoneForSignup(phone);
  if (!normalizedPhone) {
    return res.status(400).json({ ok: false, error: "Telefone invalido." });
  }

  try {
    await ensureSocketConnected(SYSTEM_WHATSAPP_CLINIC_ID);
    // Wait up to 15 seconds if it's connecting
    let waitCount = 0;
    while (whatsappConnections[SYSTEM_WHATSAPP_CLINIC_ID]?.status === "connecting" && waitCount < 30) {
      await new Promise(resolve => setTimeout(resolve, 500));
      waitCount++;
    }
  } catch (e) {
    console.error("Erro ao garantir conexão global:", e);
  }

  const systemConnected =
    whatsappConnections[SYSTEM_WHATSAPP_CLINIC_ID]?.status === "connected";
  if (!systemConnected) {
    console.log(`[Signup Phone] WhatsApp global não conectado. Status atual: ${whatsappConnections[SYSTEM_WHATSAPP_CLINIC_ID]?.status}`);
    return res.status(503).json({
      ok: false,
      error:
        "WhatsApp global nao conectado. Solicite ao super admin para conectar em Sistema (Global).",
    });
  }

  const now = Date.now();
  const existing = getVerificationSession(signupId);
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
      error:
        "Limite de envios atingido. Aguarde alguns minutos para tentar novamente.",
    });
  }

  const code = generateNumericCode();
  session.codeHash = hashSignupCode(signupId, code);
  session.expiresAt = now + SIGNUP_CODE_TTL_MS;
  session.verifiedAt = 0;
  session.attempts = 0;
  session.blockedUntil = 0;
  session.sendTimestamps = [...recentSends, now];
  setVerificationSession(signupId, session);

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
    
    // Pequeno delay aleatório entre 1 e 3 segundos para simular comportamento humano
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
    debug_jid: session.phone + "@s.whatsapp.net", // Informação para debug no console
    sender_id: SYSTEM_WHATSAPP_CLINIC_ID
  });
});

app.post("/api/signup/phone/verify-code", async (req, res) => {
  const signupId = String(req.body?.signupId || "").trim();
  const phone = String(req.body?.phone || "").trim();
  const code = String(req.body?.code || "").trim();

  if (!signupId || !phone || !code) {
    return res
      .status(400)
      .json({ ok: false, error: "signupId, phone e code sao obrigatorios." });
  }

  const normalizedPhone = normalizePhoneForSignup(phone);
  if (!normalizedPhone) {
    return res.status(400).json({ ok: false, error: "Telefone invalido." });
  }

  const session = getVerificationSession(signupId);
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
    return res
      .status(400)
      .json({ ok: false, error: "Codigo expirado. Solicite um novo codigo." });
  }

  const receivedHash = hashSignupCode(signupId, code);
  if (session.codeHash !== receivedHash) {
    session.attempts = (session.attempts || 0) + 1;
    if (session.attempts >= SIGNUP_CODE_MAX_ATTEMPTS) {
      session.blockedUntil = now + SIGNUP_BLOCK_MS;
      setVerificationSession(signupId, session);
      return res.status(429).json({
        ok: false,
        error: "Codigo incorreto. Bloqueado temporariamente por seguranca.",
      });
    }
    setVerificationSession(signupId, session);
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
  setVerificationSession(signupId, session);

  return res.json({
    ok: true,
    verified: true,
    valid_for_seconds: SIGNUP_VERIFIED_TTL_MS / 1000,
  });
});

app.post("/api/mercadopago/create-preference", async (req, res) => {
  const {
    clinicName,
    email,
    name,
    phone,
    plan,
    amount,
    clinicId,
    docType,
    clinicDoc,
    modality,
    signupId,
  } = req.body || {};

  try {
    if (!clinicId) {
      return res.status(400).json({ ok: false, error: "clinicId invalido." });
    }
    if (!email || !name || !clinicName) {
      return res
        .status(400)
        .json({ ok: false, error: "Dados obrigatorios ausentes." });
    }
    const normalizedClinicId = String(clinicId).trim();

    const { token } = await resolveMercadoPagoCredentials();
    if (!token) {
      return res.status(503).json({
        ok: false,
        error:
          "Mercado Pago nao configurado. Defina Access Token em Sistema (Global).",
      });
    }

    const selectedPlan = sanitizePlan(plan);
    const unitAmount = Number(amount);
    if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
      return res
        .status(400)
        .json({ ok: false, error: "Valor de pagamento invalido." });
    }

    const preference = {
      items: [
        {
          id: selectedPlan,
          title: `Clinxia - ${clinicName}`,
          quantity: 1,
          unit_price: unitAmount,
          currency_id: "BRL",
        },
      ],
      external_reference: normalizedClinicId,
      payer: {
        name,
        email,
        phone: { number: String(phone || "").replace(/\D/g, "") || "" },
      },
      metadata: {
        clinic_id: normalizedClinicId,
        clinic_name: clinicName,
        plan: selectedPlan,
        user_email: email,
        user_name: name,
        user_phone: phone,
        doc_type: docType || "cpf",
        doc_number: String(clinicDoc || "").replace(/\D/g, ""),
        modality: modality || "odonto",
        signup_id: signupId || "",
      },
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }],
        installments: 1,
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL || "https://clinxia.vercel.app"}/?payment=success`,
        failure: `${process.env.FRONTEND_URL || "https://clinxia.vercel.app"}/?payment=failure`,
        pending: `${process.env.FRONTEND_URL || "https://clinxia.vercel.app"}/?payment=pending`,
      },
      notification_url: `${process.env.SERVER_URL || "https://clinxia-backend.onrender.com"}/api/webhooks/mercadopago`,
      auto_return: "approved",
    };

    const mpResponse = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(preference),
      },
    );
    const mpData = await safeJson(mpResponse);

    if (!mpResponse.ok) {
      const message =
        mpData?.message || mpData?.error || "Erro ao criar preferencia";
      return res.status(500).json({ ok: false, error: message });
    }

    // Create PIX payment directly to get QR code
    let qrCode = "";
    let qrCodeBase64 = "";
    let pointOfInteractionUrl = "";
    try {
      const pixPayment = {
        transaction_amount: unitAmount,
        description: `Clinxia - ${clinicName} - Plano ${selectedPlan}`,
        payment_method_id: "pix",
        external_reference: normalizedClinicId,
        payer: {
          email,
          first_name: name,
          phone: { number: String(phone || "").replace(/\D/g, "") || "" },
        },
        metadata: {
          clinic_id: normalizedClinicId,
          plan: selectedPlan,
          signup_id: signupId || "",
        },
      };

      const pixResponse = await fetch(
        "https://api.mercadopago.com/v1/payments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(pixPayment),
        },
      );
      const pixData = await safeJson(pixResponse);

      if (pixResponse.ok && pixData?.point_of_interaction?.transaction_data) {
        qrCode = pixData.point_of_interaction.transaction_data.qr_code || "";
        qrCodeBase64 =
          pixData.point_of_interaction.transaction_data.qr_code_base64 || "";
        pointOfInteractionUrl =
          pixData.point_of_interaction?.transaction_data?.ticket_url || "";
        console.log(
          "[MP] PIX payment created:",
          pixData.id,
          "status:",
          pixData.status,
        );
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

app.get("/api/mercadopago/payment-status/:clinicId", async (req, res) => {
  const clinicId = String(req.params?.clinicId || "").trim();
  const email = String(req.query?.email || "").trim();
  
  if (!clinicId || !isUuid(clinicId)) {
    return res.status(400).json({ ok: false, error: "clinicId invalido." });
  }

  try {
    const { token } = await resolveMercadoPagoCredentials();
    if (!token) {
      console.warn("[MP Status] Token não encontrado!");
      return res.status(503).json({ ok: false, error: "Mercado Pago não configurado." });
    }

    console.log(`[MP Status] Verificando: Clinic=${clinicId}, Email=${email}, Token=${token.substring(0, 10)}...`);

    let payment = await fetchLatestMercadoPagoPaymentByClinic(clinicId, token);

    // Fallback 1: Banco Local
    if (!payment && SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)) {
      try {
        const localRes = await fetch(
          `${SUPABASE_URL}/rest/v1/payments?clinic_id=eq.${clinicId}&status=eq.approved&select=*&limit=1`,
          { headers: getSupabaseAdminHeaders() }
        );
        if (localRes.ok) {
          const localPayments = await localRes.json();
          if (Array.isArray(localPayments) && localPayments.length > 0) {
            const lp = localPayments[0];
            payment = {
              id: lp.mp_payment_id,
              status: lp.status,
              transaction_amount: lp.amount,
              status_detail: "local_confirmed",
              metadata: { plan: lp.plan, clinic_id: lp.clinic_id }
            };
            console.log(`[MP Status] Encontrado no banco local: ${lp.mp_payment_id}`);
          }
        }
      } catch (dbError) {
        console.error(`[MP Status] Erro banco local: ${dbError.message}`);
      }
    }

    // Fallback 2: Busca por Email na API do MP
    if (!payment && email) {
      try {
        const searchUrl = `https://api.mercadopago.com/v1/payments/search?payer.email=${encodeURIComponent(email)}&sort=date_created&criteria=desc&limit=1`;
        const emailRes = await fetch(searchUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (emailRes.ok) {
          const emailPayload = await emailRes.json();
          const first = emailPayload?.results?.[0];
          if (first && isPaymentApproved(first)) {
            payment = first;
            console.log(`[MP Status] Encontrado por email: ${email}`);
          }
        }
      } catch (emailError) {
        console.error(`[MP Status] Erro busca email: ${emailError.message}`);
      }
    }

    if (!payment) {
      return res.json({
        ok: true,
        found: false,
        approved: false,
        status: "not_found",
      });
    }

    await persistMercadoPagoPayment(payment, clinicId);

    return res.json({
      ok: true,
      found: true,
      approved: isPaymentApproved(payment),
      status: payment.status,
      payment_id: String(payment.id),
      amount: Number(payment.transaction_amount || 0),
      status_detail: payment.status_detail || "",
      payment_type: payment.payment_type_id || "",
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/signup/provision", async (req, res) => {
  const {
    signupId,
    clinicId,
    name,
    email,
    phone,
    password,
    clinicName,
    clinicDoc,
    docType,
    modality,
    plan,
  } = req.body || {};

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res
      .status(503)
      .json({ ok: false, error: "Supabase nao configurado no backend." });
  }

  if (
    !signupId ||
    !clinicId ||
    !name ||
    !email ||
    !phone ||
    !password ||
    !clinicName
  ) {
    return res.status(400).json({
      ok: false,
      error: "Campos obrigatorios ausentes para provisionamento.",
    });
  }
  if (!isUuid(clinicId)) {
    return res.status(400).json({ ok: false, error: "clinicId invalido." });
  }
  if (String(password).length < 6) {
    return res
      .status(400)
      .json({ ok: false, error: "Senha deve ter ao menos 6 caracteres." });
  }

  try {
    assertPhoneVerificationValid({ signupId, phone });

    const { token } = await resolveMercadoPagoCredentials();
    if (!token) {
      return res
        .status(503)
        .json({ ok: false, error: "Mercado Pago nao configurado." });
    }

    const payment = await fetchLatestMercadoPagoPaymentByClinic(
      clinicId,
      token,
    );
    if (!payment || !isPaymentApproved(payment)) {
      return res.status(402).json({
        ok: false,
        error:
          "Pagamento ainda nao aprovado. Aguarde a confirmacao do Mercado Pago.",
      });
    }

    await persistMercadoPagoPayment(payment, clinicId);

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone =
      normalizePhoneForSignup(phone) || String(phone).replace(/\D/g, "");
    const sanitizedPlan = sanitizePlan(plan || payment?.metadata?.plan);

    const existingUser = await fetchUserByEmail(normalizedEmail);
    if (existingUser?.clinic_id && existingUser.clinic_id !== clinicId) {
      return res.status(409).json({
        ok: false,
        error: "Este email ja pertence a outra clinica.",
      });
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

// ============================================
// Trial Signup — 7 days free, no payment required
// ============================================
app.post("/api/signup/provision-trial", async (req, res) => {
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

    // Calculate trial end date (7 days from now)
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Clinic payload
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

    // Use supabaseAdmin JS client (bypasses REST API permission issues on clinics table)
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

    // Create admin user
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
      if (usrErr) {
        console.error("[TrialProvision] UPDATE user failed:", usrErr);
      }
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

const validateMercadoPagoWebhookSignature = (req, secret) => {
  if (!secret) return true;

  const signature = req.headers["x-signature"];
  const timestamp = req.headers["x-timestamp"];

  if (!signature || !timestamp) {
    console.warn("[MP Webhook] Assinatura não fornecida");
    return false;
  }

  const data = timestamp + req.body.id + req.body.live_mode;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");

  return signature === expectedSignature;
};

app.post("/api/webhooks/mercadopago", async (req, res) => {
  try {
    const { token, webhookSecret } = await resolveMercadoPagoCredentials();

    if (
      webhookSecret &&
      !validateMercadoPagoWebhookSignature(req, webhookSecret)
    ) {
      console.warn("[MP Webhook] Falha na validação da assinatura");
      addLog("[MP Webhook] Assinatura inválida - ignorando evento");
      return res.status(200).json({ ok: true });
    }

    console.log("[MP Webhook] Recebido:", JSON.stringify(req.body));

    const webhookType = String(
      req.body?.type || req.body?.action || "",
    ).toLowerCase();
    const paymentId = req.body?.data?.id || req.body?.id;

    if (paymentId && webhookType.includes("payment")) {
      if (!token) {
        addLog("[MP Webhook] Token nao configurado. Ignorando evento.");
        return res.status(200).json({ ok: true });
      }

      const payment = await fetchMercadoPagoPaymentById(paymentId, token);
      await persistMercadoPagoPayment(payment);
      addLog(
        `[MP Webhook] Pagamento ${paymentId} atualizado com status ${payment.status}`,
      );
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    addLog(`[MP Webhook] Error: ${error.message}`);
    return res.status(200).json({ ok: true });
  }
});

// ============================================
// Mercado Pago Integration
// ============================================

// Create payment preference

// ============================================
// 2FA Endpoints
// ============================================

// 2FA permissions are now in middleware/auth.js



// Processador de campanhas em background
setInterval(async () => {
  for (const [clinicId, campaigns] of campaignsByClinic.entries()) {
    const runningCampaigns = campaigns.filter(c => c.status === 'running' && c.channel === 'whatsapp');
    
    for (const campaign of runningCampaigns) {
      if (!campaign.stats) {
        campaign.stats = { totalContacts: campaign.contacts?.length || 0, sent: 0, delivered: 0, failed: 0, pending: campaign.contacts?.length || 0, skipped: 0 };
      }
      
      if (!campaign.contacts || campaign.contacts.length === 0) {
        campaign.status = 'completed';
        campaign.completedAt = new Date().toISOString();
        continue;
      }
      
      const sent = campaign.stats.sent || 0;
      const failed = campaign.stats.failed || 0;
      const currentIndex = sent + failed;
      
      if (currentIndex >= campaign.contacts.length) {
        campaign.status = 'completed';
        campaign.completedAt = new Date().toISOString();
        continue;
      }
      
      const contact = campaign.contacts[currentIndex];
      const sock = whatsappSockets[clinicId];
      
      if (!sock) {
        addLog(`[Campaign] WhatsApp não conectado para clínica ${clinicId}. Falha ao enviar para ${contact.name}`);
        campaign.stats.failed += 1;
      } else {
        try {
          const number = String(contact.phone).replace(/\D/g, "");
          const jid = (number.startsWith("55") && number.length === 13)
            ? `${number.slice(0, 4)}${number.slice(5)}@s.whatsapp.net` 
            : `${number}@s.whatsapp.net`;
            
          let finalMessage = campaign.message || "";
          finalMessage = finalMessage.replace(/\{nome\}/g, contact.name || "Cliente");
          
          await sock.sendMessage(jid, { text: finalMessage });
          addLog(`[Campaign] Mensagem enviada para ${jid}`);
          campaign.stats.sent += 1;
        } catch (e) {
          addLog(`[Campaign] Erro ao enviar mensagem para ${contact.phone}: ${e.message}`);
          campaign.stats.failed += 1;
        }
      }
      
      campaign.stats.pending = campaign.contacts.length - (campaign.stats.sent + campaign.stats.failed);
      campaign.progress = Math.round(((campaign.stats.sent + campaign.stats.failed) / campaign.contacts.length) * 100);
      campaign.updated_at = new Date().toISOString();
      
      campaignsByClinic.set(clinicId, campaigns);
    }
  }
}, 5000).unref(); // roda a cada 5 segundos para processar 1 mensagem por vez


// Error handler middleware (must be at the end)
app.use((err, req, res, next) => {
  console.error("[Fatal Error]", err);
  
  // Ensure CORS headers are present on errors
  const origin = req.headers.origin;
  const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || [];
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".vercel.app"))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.status(500).json({
    ok: false,
    error: err.message || "Erro interno no servidor",
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 WhatsApp API ready for connections [v2.0.1-no-ping]`);

  // Auto-reconnect all saved WhatsApp sessions on startup
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/whatsapp_credentials?select=clinic_id,credentials`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        },
      );

      if (res.ok) {
        const credentials = await res.json();
        if (Array.isArray(credentials) && credentials.length > 0) {
          // Reconectar todas as sessoes, INCLUINDO o system-global.
          // Se system-global e uma clinica usam o mesmo numero, pode causar 440,
          // porem remover o auto-reconnect do system-global o deixa sempre inativo
          // a nao ser que o admin reconecte manualmente toda vez.
          const clinicCreds = credentials; // Modificado: agora reconecta todos
          console.log(
            `🔄 Auto-reconnecting ${clinicCreds.length} WhatsApp session(s)...`,
          );
          for (const cred of clinicCreds) {
            try {
              whatsappConnections[cred.clinic_id] = { status: "connecting" };
              const sock = await ensureSocketConnected(cred.clinic_id);
              if (sock.authState?.creds?.registered) {
                console.log(`✅ Reconnected: ${cred.clinic_id}`);
              }
            } catch (e) {
              console.log(
                `⚠️ Failed to reconnect ${cred.clinic_id}: ${e.message}`,
              );
            }
          }
        }
      }
    } catch (e) {
      console.log(`⚠️ Auto-reconnect failed: ${e.message}`);
    }
  }
});
// ============================================
// Super Admin — Subscription Management
// ============================================
import superAdminRoutes from "./routes/superAdminRoutes.js";
app.use("/api/super-admin", superAdminRoutes);

// Graceful shutdown for Cloud environments (Render/Docker)
const shutdown = () => {
  console.log("[Server] Shutting down...");
  Object.values(whatsappSockets).forEach((sock) => {
    try {
      sock.end(undefined);
    } catch (e) {}
  });
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
