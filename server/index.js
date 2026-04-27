import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import pino from "pino";
import crypto from "crypto";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  BufferJSON,
} from "baileys";

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 8787;
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

// Supabase configuration (supports legacy and new key names)
const cleanEnv = (value) => {
  let cleaned = String(value || "").trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned;
};
const pickEnv = (...values) => {
  for (const value of values) {
    const cleaned = cleanEnv(value);
    if (cleaned) return cleaned;
  }
  return "";
};
const isValidSupabaseKey = (value) => {
  const token = cleanEnv(value);
  if (!token) return false;
  if (token.startsWith("sb_publishable_") || token.startsWith("sb_secret_")) return true;
  if (token.startsWith("eyJ")) return true; 
  const parts = token.split(".");
  return parts.length === 3 && parts.every(p => /^[A-Za-z0-9\-_]+$/.test(p));
};

const SUPABASE_URL = pickEnv(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_URL_PROD,
);
const SUPABASE_ANON_KEY = pickEnv(
  process.env.SUPABASE_ANON_KEY,
  process.env.SUPABASE_PUBLISHABLE_KEY,
  process.env.SUPABASE_ANON_KEY_PROD,
  process.env.SUPABASE_PUBLISHABLE_KEY_PROD,
);
const SUPABASE_SERVICE_ROLE_KEY_RAW = pickEnv(
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.SUPABASE_SECRET_KEY,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PROD,
);
const SUPABASE_SERVICE_ROLE_KEY = isValidSupabaseKey(SUPABASE_SERVICE_ROLE_KEY_RAW)
  ? SUPABASE_SERVICE_ROLE_KEY_RAW
  : "";

// ============================================
// Startup: validate required environment variables
// ============================================
const REQUIRED_ENVS = [
  ["SUPABASE_URL (ou SUPABASE_URL_PROD)", SUPABASE_URL],
  ["SUPABASE_PUBLISHABLE_KEY/SUPABASE_ANON_KEY (ou *_PROD)", SUPABASE_ANON_KEY],
];
const missingEnvs = REQUIRED_ENVS.filter(([, value]) => !value).map(
  ([name]) => name,
);
if (missingEnvs.length > 0 && process.env.NODE_ENV !== "development") {
  for (const key of missingEnvs) {
    console.error(`[FATAL] Variável de ambiente ausente: ${key}`);
  }
  console.error(
    "[FATAL] Configure as variáveis acima ou defina NODE_ENV=development para modo demo.",
  );
  process.exit(1);
}
if (missingEnvs.length > 0) {
  console.warn(
    `[WARN] Variáveis ausentes: ${missingEnvs.join(", ")}. Rodando em modo DESENVOLVIMENTO.`,
  );
}

if (SUPABASE_ANON_KEY && !isValidSupabaseKey(SUPABASE_ANON_KEY)) {
  console.error("[FATAL] SUPABASE_ANON_KEY configurada não é válida (verifique se copiou a chave certa).");
}

if (!SUPABASE_SERVICE_ROLE_KEY && process.env.NODE_ENV !== "development") {
  console.warn(
    "[WARN] SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY ausente ou não é válida. Operações de backend podem falhar por RLS.",
  );
}
if (SUPABASE_SERVICE_ROLE_KEY_RAW && !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[WARN] SUPABASE_SERVICE_ROLE_KEY inválida para Auth Admin (esperado formato sb_secret_... ou JWT).",
  );
}

// 2FA encryption key — dedicated env var preferred, falls back to service role key
const TOTP_ENCRYPTION_KEY =
  process.env.TOTP_ENCRYPTION_KEY || SUPABASE_SERVICE_ROLE_KEY;
if (!TOTP_ENCRYPTION_KEY && process.env.NODE_ENV !== "development") {
  console.error(
    "[WARN] TOTP_ENCRYPTION_KEY não definida. Endpoints 2FA desativados em produção.",
  );
}

// Server headers for Supabase REST API (with service role when available)
const getServerHeaders = (token) => ({
  "Content-Type": "application/json",
  apikey: SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
  Authorization: `Bearer ${token || SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY}`,
  Prefer: "return=representation",
});

// Mercado Pago configuration (can be overridden per clinic via Supabase)
let mpAccessToken = cleanEnv(process.env.MP_ACCESS_TOKEN);
let mpPublicKey = cleanEnv(process.env.MP_PUBLIC_KEY);
const GLOBAL_CLINIC_ID = "00000000-0000-0000-0000-000000000001";
const SYSTEM_WHATSAPP_CLINIC_ID = "system-global";
const DEFAULT_PLAN_PRICES = {
  basico: 17,
  profissional: 197,
  premium: 397,
};
const SIGNUP_CODE_TTL_MS = 30 * 1000;
const SIGNUP_VERIFIED_TTL_MS = 30 * 60 * 1000;
const SIGNUP_CODE_MAX_ATTEMPTS = 3;
const SIGNUP_BLOCK_MS = 60 * 1000;
const SIGNUP_MAX_SENDS_PER_WINDOW = 3;
const SIGNUP_SEND_WINDOW_MS = 10 * 60 * 1000;
const phoneVerificationSessions = new Map();

// Password Reset Sessions (in-memory, same as signup)
const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000; // 15 minutes
const PASSWORD_RESET_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_BLOCK_MS = 15 * 60 * 1000;
const passwordResetSessions = new Map();

const getPasswordResetSession = (email) => passwordResetSessions.get(String(email).toLowerCase());
const setPasswordResetSession = (email, data) => passwordResetSessions.set(String(email).toLowerCase(), data);
const deletePasswordResetSession = (email) => passwordResetSessions.delete(String(email).toLowerCase());

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

const getVerificationSession = (signupId) =>
  phoneVerificationSessions.get(String(signupId));

const setVerificationSession = (signupId, data) =>
  phoneVerificationSessions.set(String(signupId), data);

const clearExpiredVerificationSessions = () => {
  const now = Date.now();
  for (const [key, session] of phoneVerificationSessions.entries()) {
    const verificationExpired =
      !session.verifiedAt || now - session.verifiedAt > SIGNUP_VERIFIED_TTL_MS;
    const codeExpired = !session.expiresAt || now > session.expiresAt;
    const blockExpired = !session.blockedUntil || now > session.blockedUntil;
    const shouldDelete = verificationExpired && codeExpired && blockExpired;
    if (shouldDelete) {
      phoneVerificationSessions.delete(key);
    }
  }
};

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
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !clinicId) return null;
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/clinics?id=eq.${clinicId}&select=id,name,plan,active&limit=1`,
    { headers: getSupabaseAdminHeaders() },
  );
  if (!response.ok) return null;
  const rows = await safeJson(response);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
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
  const existingClinic = await fetchClinicById(clinicId);
  const payload = {
    id: clinicId,
    name: clinicName,
    document_type: docType,
    document_number: docNumber,
    modality,
    plan: sanitizePlan(plan),
    phone,
    email,
    active: true,
    created_at: new Date().toISOString(),
  };

  if (existingClinic) {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/clinics?id=eq.${clinicId}`,
      {
        method: "PATCH",
        headers: getSupabaseAdminHeaders(),
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      const err = await safeJson(response);
      throw new Error(err?.message || "Erro ao atualizar clínica");
    }
    return { created: false };
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/clinics`, {
    method: "POST",
    headers: getSupabaseWriteHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await safeJson(response);
    throw new Error(err?.message || "Erro ao criar clínica");
  }
  return { created: true };
};

const upsertClinicAdminUser = async ({
  userId,
  clinicId,
  name,
  email,
  phone,
}) => {
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
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${existing.id}`,
      {
        method: "PATCH",
        headers: getSupabaseAdminHeaders(),
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      const err = await safeJson(response);
      throw new Error(
        err?.message || "Erro ao atualizar usuário administrador",
      );
    }
    return { created: false, userId: existing.id };
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: "POST",
    headers: getSupabaseWriteHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await safeJson(response);
    throw new Error(err?.message || "Erro ao criar usuário administrador");
  }
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
// ============================================

// Helmet: secure HTTP headers with CSP + HSTS
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: [
          "'self'",
          SUPABASE_URL || "",
          "https://api.mercadopago.com",
          "wss:",
        ].filter(Boolean),
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    hsts:
      process.env.NODE_ENV === "production"
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    xFrameOptions: { action: "deny" },
  }),
);

// CORS: whitelist allowed origins (configurable via env)
// Supports multiple formats: comma-separated list, wildcard for Vercel previews
const ALLOWED_ORIGINS = (() => {
  const envOrigins =
    process.env.ALLOWED_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) || [];

  const defaultOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://clinxia.vercel.app",
    "https://simple-erp-1.vercel.app",
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  // Allow all Vercel preview URLs
  const vercelPreview = ["https://*.vercel.app"];

  return [...envOrigins, ...defaultOrigins, ...vercelPreview];
})();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      // Check exact match
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      // Check wildcard patterns (e.g., *.vercel.app)
      for (const pattern of ALLOWED_ORIGINS) {
        if (pattern.includes("*")) {
          const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
          if (regex.test(origin)) {
            return callback(null, true);
          }
        }
      }

      console.warn(`[CORS] Blocked request from: ${origin}`);
      callback(new Error(`Origem não permitida: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-requested-with",
      "Accept",
      "Origin",
      "ngrok-skip-browser-warning",
    ],
  }),
);

// Handle preflight explicitly
app.options(
  "*",
  cors({
    origin: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-requested-with",
      "Accept",
      "Origin",
      "ngrok-skip-browser-warning",
    ],
  }),
);

// Rate limiting: 500 requests per 15 minutes per IP (increased for health checks)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: "Muitas requisições. Tente novamente em alguns minutos.",
  },
  skip: (req) => {
    const path = req.path || "";
    return path.startsWith("/health");
  },
});
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
// Auth Middleware (validates Supabase JWT)
// ============================================
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();
  
  if (!token) {
    return res
      .status(401)
      .json({ ok: false, error: "Token de autenticação ausente" });
  }

  // Validate JWT format before calling Supabase
  const jwtParts = token.split(".");
  if (jwtParts.length !== 3) {
    console.error("[Auth] Invalid JWT format:", jwtParts.length, "parts");
    return res
      .status(401)
      .json({ ok: false, error: "Token mal formado" });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    req.user = { id: "dev-user", role: "admin", clinic_id: "dev-clinic" };
    return next();
  }

  try {
    console.log("[Auth] Calling Supabase /auth/v1/user with token:", token.substring(0, 50) + "...");
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    
    console.log("[Auth] Supabase /auth/v1/user response status:", userRes.status);

    if (!userRes.ok) {
      const errorData = await userRes.json().catch(() => ({}));
      console.error("[Auth] Supabase error:", errorData);
      return res
        .status(401)
        .json({ ok: false, error: "Token inválido ou expirado" });
    }

    const userData = await userRes.json();

    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${userData.id}&select=*`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (profileRes.ok) {
      const profiles = await profileRes.json();
      req.user = profiles[0] || { id: userData.id, role: "receptionist" };
    } else {
      req.user = { id: userData.id, role: "receptionist" };
    }

    req.token = token;
    req.clinicId = req.user.clinic_id;
    next();
  } catch (error) {
    console.error("[Auth] Error validating token:", error.message);
    return res.status(401).json({ ok: false, error: "Erro na autenticação" });
  }
};

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
  "/signup/phone/send-code",
  "/signup/phone/verify-code",
  "/signup/provision",
  "/system/signup-config",
  "/mercadopago/create-preference",
  "/mercadopago/payment-status/",
  "/asaas/",
  "/integrations/",
  "/facebook/",
  "/whatsapp/",
  "/debug/tail",
];

app.use("/api", (req, res, next) => {
  const pathWithoutApi = req.path;

  if (publicPaths.some((p) => pathWithoutApi.startsWith(p))) {
    return next();
  }

  return requireAuth(req, res, next);
});

app.get("/api/health/extended", (req, res) => {
  res.json({
    status: "ok",
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    components: {
      api: "ok",
      supabase: SUPABASE_URL && SUPABASE_ANON_KEY ? "configured" : "degraded",
      mercado_pago:
        mpAccessToken || process.env.MP_ACCESS_TOKEN
          ? "configured"
          : "degraded",
    },
    metrics: {
      uptime_seconds: Math.floor(
        (Date.now() - runtimeMetrics.startedAt) / 1000,
      ),
      requests_total: runtimeMetrics.requestsTotal,
      requests_by_method: mapToObject(runtimeMetrics.requestsByMethod),
      requests_by_path: mapToObject(runtimeMetrics.requestsByPath),
    },
  });
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
  const systemConnected =
    whatsappConnections[SYSTEM_WHATSAPP_CLINIC_ID]?.status === "connected";
  if (!systemConnected) {
    return res.status(503).json({
      ok: false,
      error:
        "WhatsApp global não conectado. Solicite ao super admin para conectar em Sistema (Global).",
    });
  }

  try {
    const user = await fetchUserByEmail(normalizedEmail);
    
    if (!user) {
      console.log(`[PasswordReset] Email não encontrado na base de dados: ${normalizedEmail}`);
      return res.json({ 
        ok: true, 
        message: "Se este email estiver cadastrado, você receberá um código.",
        mock: true 
      });
    }

    const rawPhone = user.phone;
    const cleanPhone = String(rawPhone || "").replace(/\D/g, "");
    
    if (!cleanPhone || cleanPhone.length < 10) {
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
      phone: cleanPhone,
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
    session.phone = cleanPhone;
    setPasswordResetSession(normalizedEmail, session);

    const message = `🔐 *Clinxia - Segurança*\n\nSeu código de recuperação de senha é: *${code}*\n\nUse este código no portal para definir sua nova senha. Se você não solicitou isso, ignore esta mensagem.`;
    
    try {
      await sendWhatsAppMessage({
        clinicId: SYSTEM_WHATSAPP_CLINIC_ID,
        to: user.phone,
        message
      });
    } catch (waError) {
      console.error("[ResetRequest] Erro ao enviar WhatsApp:", waError.message);
      if (user.clinic_id && user.clinic_id !== GLOBAL_CLINIC_ID) {
        try {
          await sendWhatsAppMessage({
            clinicId: user.clinic_id,
            to: user.phone,
            message
          });
        } catch (innerError) {
          deletePasswordResetSession(normalizedEmail);
          throw new Error("Serviço de WhatsApp temporariamente indisponível. Tente novamente em instantes.");
        }
      } else {
        deletePasswordResetSession(normalizedEmail);
        throw new Error("Serviço de WhatsApp temporariamente indisponível.");
      }
    }

    return res.json({ 
      ok: true, 
      message: "Código enviado com sucesso!",
      masked_phone: maskPhone(user.phone)
    });

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

app.post("/api/auth/password/reset-verify", async (req, res) => {
  const { email, code } = req.body;
  
  const normalizedEmail = String(email).toLowerCase().trim();
  
  if (!normalizedEmail || !code) {
    return res.status(400).json({ ok: false, error: "Email e código são obrigatórios" });
  }

  try {
    const session = getPasswordResetSession(normalizedEmail);
    
    if (!session) {
      return res.status(400).json({ ok: false, error: "Nenhum código solicitado para este email." });
    }

    const now = Date.now();
    if (session.expiresAt && now > session.expiresAt) {
      deletePasswordResetSession(normalizedEmail);
      return res.status(400).json({ ok: false, error: "Código expirado." });
    }

    const receivedHash = hashPasswordResetCode(normalizedEmail, code);
    if (receivedHash !== session.codeHash) {
      return res.status(400).json({ ok: false, error: "Código incorreto" });
    }

    return res.json({ ok: true, message: "Código validado com sucesso!" });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

const campaignsByClinic = new Map();
const antiSpamStatsByNumber = new Map();

app.get("/api/whatsapp/antispam/:number", (req, res) => {
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

app.post("/api/asaas/test", async (req, res) => {
  const apiKey = String(req.body?.apiKey || "").trim();
  if (!apiKey) {
    return res.status(400).json({ ok: false, error: "apiKey obrigatoria." });
  }

  // Buscar da tabela segura primeiro, fallback para env
  let expectedApiKey = cleanEnv(process.env.ASAAS_API_KEY || "");
  const serverApiKey = await fetchSystemSecret('asaas_api_key');
  if (serverApiKey) expectedApiKey = serverApiKey;
  
  const acceptedByPattern = /^aact_|^asaas_|^test_/.test(apiKey);
  const valid = expectedApiKey ? apiKey === expectedApiKey : acceptedByPattern;

  if (!valid) {
    return res.status(400).json({ ok: false, error: "API key invalida." });
  }

  return res.json({ ok: true, message: "Conexao com Asaas validada." });
});

app.get("/api/facebook/credentials/:clinicId", (req, res) => {
  const clinicId = String(req.params?.clinicId || "").trim();
  return res.json({
    ok: true,
    clinic_id: clinicId,
    connected: false,
    has_credentials: false,
  });
});

app.post("/api/integrations/rdstation/event", (req, res) => {
  const event = String(req.body?.event || "").trim();
  const email = String(req.body?.email || "").trim();
  if (!event || !email) {
    return res
      .status(400)
      .json({ ok: false, error: "event e email sao obrigatorios." });
  }

  return res.json({
    ok: true,
    event_id: `rd-${crypto.randomUUID()}`,
    received_at: new Date().toISOString(),
  });
});

app.post("/api/integrations/memed/prescription", (req, res) => {
  const patientName = String(req.body?.patient?.name || "").trim();
  const physicianName = String(
    req.body?.prescription?.physician_name || "",
  ).trim();
  const medications = Array.isArray(req.body?.prescription?.medications)
    ? req.body.prescription.medications
    : [];

  if (!patientName || !physicianName || medications.length === 0) {
    return res.status(400).json({
      ok: false,
      error:
        "patient.name, prescription.physician_name e medications sao obrigatorios.",
    });
  }

  return res.json({
    ok: true,
    prescription_id: `memed-${crypto.randomUUID()}`,
    created_at: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Clinxia Backend Running" });
});

// Helper for logs
const debugLogs = [];
const addLog = (msg) => {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] ${msg}`;
  console.log(formatted);
  debugLogs.push(formatted);
  if (debugLogs.length > 500) debugLogs.shift();
};

app.get("/api/debug/tail", (req, res) => {
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

  // Ensure 9th digit for mobile
  if (local.length === 8 && ["6", "7", "8", "9"].includes(local[0])) {
    local = "9" + local;
  }

  return [`${country}${ddd}${local}`];
}

// Resolve WhatsApp JID by checking which candidate actually exists
async function resolveWhatsAppJID(sock, rawPhone) {
  const candidates = brazilianPhoneCandidates(rawPhone);
  addLog(
    `[Phone] Resolving JID for "${rawPhone}" → candidates: ${candidates.join(", ")}`,
  );

  for (const candidate of candidates) {
    try {
      const [result] = await sock.onWhatsApp(candidate);
      if (result?.exists) {
        addLog(`[Phone] JID confirmed: ${result.jid}`);
        return result.jid;
      }
    } catch (e) {
      addLog(`[Phone] onWhatsApp failed for ${candidate}: ${e.message}`);
    }
  }

  const fallback = `${candidates[0]}@s.whatsapp.net`;
  addLog(
    `[Phone] No JID confirmed for "${rawPhone}". Using fallback: ${fallback}`,
  );
  return fallback;
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
const whatsappConnections = {};
const whatsappSockets = {};

// Singleton socket manager
const ensureSocketConnected = async (clinicId) => {
  if (whatsappSockets[clinicId]) return whatsappSockets[clinicId];
  return await createWhatsAppSocket(clinicId);
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

      const sock = makeWASocket({
        auth: state,
        version: version,
        printQRInTerminal: false,
        browser: ["Clinxia", "Chrome", "122.0.0.0"],
        connectTimeoutMs: 120000,
        keepAliveIntervalMs: 60000,
        logger: logger,
        options: { family: 4 },
        getMessage: async (key) => ({ conversation: "placeholder" }),
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
          const shouldReconnect = !isLoggedOut;
          addLog(`[Baileys] Conexão FECHADA: ${statusCode}`);

          if (shouldReconnect) {
            retryCount++;
            const delay = Math.min(5000 * Math.pow(2, retryCount - 1), 60000);
            setTimeout(connect, delay);
          } else {
            addLog(
              `[Baileys] Sessão expirada/inválida para ${clinicId}. Limpando...`,
            );
            hasFailed401 = true;
            delete whatsappSockets[clinicId];
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
            const saved = await saveCredentialsToSupabase(clinicId, {
              creds,
              keys: {},
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
          if (type !== "notify") return;
          addLog(`[Baileys] messages.upsert (type: ${type}, count: ${incomingMsgs?.length})`);

          for (const msg of incomingMsgs) {
            const from = msg.key.remoteJid;

          // Skip group messages, broadcasts, and status updates
          if (
            from?.endsWith("@g.us") ||
            from?.endsWith("@broadcast") ||
            from?.includes("@status") ||
            from?.includes("@lid")
          ) {
            continue;
          }

          // Skip messages sent by us (already tracked via sendWhatsAppMessage)
          if (msg.key.fromMe) continue;

          const text = extractMessageText(msg.message);
          if (!text) {
            addLog(`[Baileys] Mensagem recebida sem texto extraível de ${from}. Tipo: ${Object.keys(msg.message || {}).join(', ')}`);
            continue;
          }

          const cleanPhone = from
            .replace("@s.whatsapp.net", "")
            .replace("@c.us", "");

          addLog(
            `[Baileys] Mensagem recebida de ${from}: ${text.substring(0, 50)}...`,
          );

          const msgData = {
            id: msg.key.id,
            key: from,
            phone: cleanPhone,
            text: text,
            fromMe: false,
            timestamp: (msg.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000,
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
              const persistRes = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_messages`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: persistKey,
                  Authorization: `Bearer ${persistKey}`,
                  Prefer: "resolution=merge-duplicates",
                },
                body: JSON.stringify({
                  clinic_id: clinicId,
                  phone: cleanPhone,
                  message_id: msg.key.id,
                  text: text,
                  from_me: false,
                  timestamp: new Date(
                    (msg.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000,
                  ).toISOString(),
                }),
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
app.post("/api/whatsapp/connect", async (req, res) => {
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

app.get("/api/whatsapp/status/:clinicId", async (req, res) => {
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

const disconnectWhatsAppSession = async (clinicId) => {
  if (!clinicId) return;

  if (whatsappSockets[clinicId]) {
    try {
      whatsappSockets[clinicId].end(undefined);
    } catch (_e) {}
    delete whatsappSockets[clinicId];
  }

  delete whatsappConnections[clinicId];

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
  } catch (_e) {}
};

// Disconnect endpoint
app.post("/api/whatsapp/disconnect/:clinicId", async (req, res) => {
  const { clinicId } = req.params;
  await disconnectWhatsAppSession(clinicId);
  res.json({ ok: true, status: "disconnected" });
});

app.post("/api/whatsapp/disconnect", async (req, res) => {
  const clinicId = String(req.body?.clinicId || "").trim();
  if (!clinicId) {
    return res.status(400).json({ ok: false, error: "clinicId é obrigatório" });
  }
  await disconnectWhatsAppSession(clinicId);
  res.json({ ok: true, status: "disconnected" });
});

// Rate limiting for WhatsApp
const whatsappRateLimit = new Map();
const RATE_LIMIT_WINDOW = 10000; // 10 seconds
const RATE_LIMIT_MAX = 5; // 5 messages per window

const sendWhatsAppMessage = async ({ clinicId, to, message }) => {
  const sock = await ensureSocketConnected(clinicId);

  // Wait up to 15 seconds if it's connecting
  let waitCount = 0;
  while (whatsappConnections[clinicId]?.status === "connecting" && waitCount < 30) {
    await new Promise(resolve => setTimeout(resolve, 500));
    waitCount++;
  }

  if (whatsappConnections[clinicId]?.status !== "connected") {
    throw new Error("Dispositivo não conectado. Status atual: " + (whatsappConnections[clinicId]?.status || "desconhecido"));
  }

  const jid = await resolveWhatsAppJID(sock, to);
  addLog(`[API] Enviando para ${jid}...`);
  const result = await sock.sendMessage(jid, { text: message });

  const cleanPhone = String(to || "").replace(/\D/g, "");
  const msgData = {
    id: result.key.id,
    key: jid,
    phone: cleanPhone,
    text: message,
    fromMe: true,
    timestamp: Date.now(),
  };

  if (!whatsappConnections[clinicId].messages) {
    whatsappConnections[clinicId].messages = [];
  }
  whatsappConnections[clinicId].messages.push(msgData);

  // Persist sent message to Supabase
  const sendPersistKey = SUPABASE_ANON_KEY;
  if (SUPABASE_URL && sendPersistKey) {
    try {
      const sendPersistRes = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: sendPersistKey,
          Authorization: `Bearer ${sendPersistKey}`,
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          clinic_id: clinicId,
          phone: cleanPhone,
          message_id: result.key.id,
          text: message,
          from_me: true,
          timestamp: new Date().toISOString(),
        }),
      });
      if (!sendPersistRes.ok) {
        const errBody = await sendPersistRes.text().catch(() => "");
        addLog(`[API] Supabase INSERT (sent) falhou (${sendPersistRes.status}): ${errBody.substring(0, 200)}`);
      }
    } catch (e) {
      addLog(`[API] Erro ao salvar mensagem no Supabase: ${e.message}`);
    }
  }

  return { messageId: result.key.id, jid };
};

app.post("/api/whatsapp/send", async (req, res) => {
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

  const systemConnected =
    whatsappConnections[SYSTEM_WHATSAPP_CLINIC_ID]?.status === "connected";
  if (!systemConnected) {
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

  const message = [
    "Clinxia - Validacao de Telefone",
    "",
    `Seu codigo de verificacao: ${code}`,
    "Esse codigo expira em 30 segundos.",
    "",
    "Se voce nao solicitou, ignore esta mensagem.",
  ].join("\n");

  try {
    await sendWhatsAppMessage({
      clinicId: SYSTEM_WHATSAPP_CLINIC_ID,
      to: normalizedPhone,
      message,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }

  return res.json({
    ok: true,
    expires_in_seconds: 30,
    masked_phone: maskPhone(normalizedPhone),
    destination_name: name || "",
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
    return res.status(500).json({ ok: false, error: error.message });
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

const require2FAPermission = (req, res, next) => {
  const requestedUserId = req.body.userId || req.query.userId;
  const isSuperAdmin = req.user?.role === "super_admin";

  if (!requestedUserId) {
    return res.status(400).json({ ok: false, error: "userId é obrigatório" });
  }

  if (!req.user || !req.user.id) {
    return res.status(401).json({ ok: false, error: "Autenticação requerida" });
  }

  if (requestedUserId !== req.user.id && !isSuperAdmin) {
    return res.status(403).json({
      ok: false,
      error: "Não autorizado a gerenciar 2FA de outro usuário",
    });
  }

  next();
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ ok: false, error: "Autenticação requerida" });
  }

  if (req.user.role !== "super_admin") {
    return res
      .status(403)
      .json({ ok: false, error: "Acesso restrito a super_admin" });
  }

  next();
};

app.post(
  "/api/2fa/setup",
  requireAuth,
  require2FAPermission,
  async (req, res) => {
    try {
      const userId = req.body.userId || req.query.userId;
      const userEmail = req.user?.email || "user@clinxia.com";
      const isSuperAdmin = req.user?.role === "super_admin";

      // Generate cryptographically secure secret (32 chars base32)
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
      let secret = "";
      const randomBytes = crypto.randomBytes(32);
      for (let i = 0; i < 32; i++) {
        secret += chars[randomBytes[i] % chars.length];
      }

      // Encrypt secret with server key
      if (!TOTP_ENCRYPTION_KEY) {
        return res.status(503).json({
          ok: false,
          error: "2FA indisponível: chave de criptografia não configurada.",
        });
      }
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        "aes-256-gcm",
        crypto.scryptSync(TOTP_ENCRYPTION_KEY, "2fa-salt", 32),
        iv,
      );
      let encrypted = cipher.update(secret, "utf8", "hex");
      encrypted += cipher.final("hex");
      const authTag = cipher.getAuthTag();

      // Diagnostics — confirm which Supabase key is in use
      console.log(
        "[2FA Setup] Using Service Role Key:",
        SUPABASE_SERVICE_ROLE_KEY
          ? "YES (service_role)"
          : "NO (fallback to anon)",
      );
      console.log("[2FA Setup] userId:", userId);

      // Upsert 2FA record — avoids the delete+insert race/permission issue
      const upsertRes = await fetch(
        `${SUPABASE_URL}/rest/v1/user_2fa?on_conflict=user_id`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY}`,
            Prefer: "resolution=merge-duplicates,return=representation",
          },
          body: JSON.stringify({
            user_id: userId,
            secret_encrypted: JSON.stringify({
              encrypted,
              iv: iv.toString("hex"),
              authTag: authTag.toString("hex"),
            }),
            enabled: false,
            updated_at: new Date().toISOString(),
          }),
        },
      );

      // CHECK RESPONSE — upsert failure means DB permission/policy problem
      if (!upsertRes.ok) {
        const errorText = await upsertRes.text();
        console.error(
          "[2FA Setup] Failed to upsert 2FA secret:",
          upsertRes.status,
          errorText,
        );
        console.error(
          "[2FA Setup] Service Role Key present:",
          !!SUPABASE_SERVICE_ROLE_KEY,
        );
        return res
          .status(500)
          .json({ ok: false, error: "Erro ao salvar 2FA no banco de dados" });
      }

      // Generate QR code URI for authenticator app
      const appName = "Clinxia";
      const otpauthUri = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(appName)}&algorithm=SHA1&digits=6&period=30`;

      res.json({ ok: true, secret, otpauthUri, mandatory: isSuperAdmin });
    } catch (error) {
      console.error("[2FA Setup] Exception:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : "",
        code: error.code || "UNKNOWN",
      });
      res.status(500).json({
        ok: false,
        error:
          error instanceof Error ? error.message : "Erro ao configurar 2FA",
      });
    }
  },
);

app.post(
  "/api/2fa/verify",
  requireAuth,
  require2FAPermission,
  async (req, res) => {
    try {
      const { code, userId } = req.body;

      if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
        return res
          .status(400)
          .json({ ok: false, error: "Código deve ter 6 dígitos" });
      }

      if (!userId) {
        return res
          .status(400)
          .json({ ok: false, error: "userId é obrigatório" });
      }

      // Fetch encrypted secret from Supabase
      const supaRes = await fetch(
        `${SUPABASE_URL}/rest/v1/user_2fa?user_id=eq.${userId}&select=*`,
        {
          headers: getServerHeaders(),
        },
      );

      if (!supaRes.ok) {
        return res
          .status(500)
          .json({ ok: false, error: "Erro ao verificar 2FA" });
      }

      const data = await supaRes.json();
      if (!data || data.length === 0) {
        return res
          .status(400)
          .json({ ok: false, error: "2FA não configurado" });
      }

      // Decrypt secret
      const parsed = JSON.parse(data[0].secret_encrypted);
      if (!TOTP_ENCRYPTION_KEY) {
        return res.status(503).json({
          ok: false,
          error: "2FA indisponível: chave de criptografia não configurada.",
        });
      }
      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        crypto.scryptSync(TOTP_ENCRYPTION_KEY, "2fa-salt", 32),
        Buffer.from(parsed.iv, "hex"),
      );
      decipher.setAuthTag(Buffer.from(parsed.authTag, "hex"));
      let decrypted = decipher.update(parsed.encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      // TOTP verification (manual implementation - no external lib needed)
      function base32Decode(base32) {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        let bits = "";
        for (const char of base32.toUpperCase()) {
          const val = alphabet.indexOf(char);
          if (val === -1) continue;
          bits += val.toString(2).padStart(5, "0");
        }
        const bytes = [];
        for (let i = 0; i + 8 <= bits.length; i += 8) {
          bytes.push(parseInt(bits.substring(i, i + 8), 2));
        }
        return Buffer.from(bytes);
      }

      function generateTOTP(secret, time) {
        const key = base32Decode(secret);
        const timeBuffer = Buffer.alloc(8);
        timeBuffer.writeBigInt64BE(BigInt(time));
        const hmac = crypto.createHmac("sha1", key).update(timeBuffer).digest();
        const offset = hmac[hmac.length - 1] & 0x0f;
        const code =
          (((hmac[offset] & 0x7f) << 24) |
            ((hmac[offset + 1] & 0xff) << 16) |
            ((hmac[offset + 2] & 0xff) << 8) |
            (hmac[offset + 3] & 0xff)) %
          1000000;
        return String(code).padStart(6, "0");
      }

      const now = Math.floor(Date.now() / 1000 / 30);
      let isValid = false;
      // Janela de ±2 (150 segundos de tolerância para clock skew)
      for (let offset = -2; offset <= 2; offset++) {
        const expected = generateTOTP(decrypted, now + offset);
        if (expected === code) {
          isValid = true;
          break;
        }
      }

      if (isValid) {
        const updateRes = await fetch(
          `${SUPABASE_URL}/rest/v1/user_2fa?user_id=eq.${userId}`,
          {
            method: "PATCH",
            headers: getServerHeaders(),
            body: JSON.stringify({
              enabled: true,
              verified_at: new Date().toISOString(),
            }),
          },
        );

        if (!updateRes.ok) {
          console.error(
            "[2FA Verify] Failed to update 2FA status:",
            updateRes.status,
            await updateRes.text(),
          );
          return res
            .status(500)
            .json({ ok: false, error: "Erro ao ativar 2FA" });
        }

        res.json({ ok: true });
      } else {
        res.status(400).json({ ok: false, error: "Código inválido" });
      }
    } catch (error) {
      console.error(
        "[2FA Verify] Exception caught:",
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : "",
      );
      res.status(500).json({ ok: false, error: "Erro ao verificar 2FA" });
    }
  },
);

app.post(
  "/api/2fa/disable",
  requireAuth,
  require2FAPermission,
  async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res
          .status(400)
          .json({ ok: false, error: "userId é obrigatório" });
      }
      await fetch(`${SUPABASE_URL}/rest/v1/user_2fa?user_id=eq.${userId}`, {
        method: "DELETE",
        headers: getServerHeaders(),
      });
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ ok: false, error: "Erro ao desativar 2FA" });
    }
  },
);

app.get("/api/2fa/status", requireAuth, async (req, res) => {
  try {
    const userId = req.query.userId;
    console.log("[2FA Status] userId:", userId, "| req.user.id:", req.user?.id);
    if (!userId) {
      return res.status(400).json({ ok: false, error: "userId é obrigatório" });
    }
    const supaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_2fa?user_id=eq.${userId}&select=*`,
      {
        headers: getServerHeaders(),
      },
    );
    let enabled = false;
    if (supaRes.ok) {
      const data = await supaRes.json();
      enabled = data?.[0]?.enabled || false;
    }
    res.json({ ok: true, enabled });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Erro ao verificar status 2FA" });
  }
});

// Debug endpoint - test Supabase connectivity for 2FA table
app.get("/api/2fa/test", async (req, res) => {
  try {
    console.log("[2FA Test] Testing Supabase connectivity...");
    console.log("[2FA Test] SUPABASE_URL:", SUPABASE_URL);
    console.log(
      "[2FA Test] Using Service Role Key:",
      SUPABASE_SERVICE_ROLE_KEY ? "YES" : "NO",
    );

    const testRes = await fetch(`${SUPABASE_URL}/rest/v1/user_2fa?limit=1`, {
      headers: getServerHeaders(),
    });

    const data = await testRes.json();

    console.log("[2FA Test] Response status:", testRes.status);
    console.log("[2FA Test] Response:", data);

    if (!testRes.ok) {
      return res.status(testRes.status).json({
        ok: false,
        error: data?.message || "Failed to access user_2fa table",
        status: testRes.status,
        details: data,
      });
    }

    res.json({
      ok: true,
      message: "Supabase connection OK",
      tableExists: true,
      recordCount: Array.isArray(data) ? data.length : 0,
      data,
    });
  } catch (error) {
    console.error(
      "[2FA Test] Exception:",
      error instanceof Error ? error.message : String(error),
    );
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Test failed",
      stack: error instanceof Error ? error.stack : "",
    });
  }
});

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
  console.log(`📱 WhatsApp API ready for connections`);

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
          console.log(
            `🔄 Auto-reconnecting ${credentials.length} WhatsApp session(s)...`,
          );
          for (const cred of credentials) {
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
