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
// MP credentials foram movidos para paymentGateway.js
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

import { createSignupRoutes } from './routes/signupRoutes.js';
import { createBillingRoutes } from './routes/billingRoutes.js';
import { createCampaignRoutes } from './routes/campaignRoutes.js';
import { createClinicRoutes } from './routes/clinicRoutes.js';
import { createPublicRoutes } from './routes/publicRoutes.js';
import { createWhatsAppRoutes } from './routes/whatsappRoutes.js';
import {
  fetchUserByEmail,
  fetchClinicById,
  createSupabaseAuthUser,
  upsertClinicRecord,
  upsertClinicAdminUser,
  upsertClinicTeamUser,
  assertPhoneVerificationValid,
  consumePhoneVerification
} from './services/dbService.js';
import {
  resolveMercadoPagoCredentials,
  persistMercadoPagoPayment,
  fetchMercadoPagoPaymentById,
  fetchLatestMercadoPagoPaymentByClinic,
  isPaymentApproved
} from './services/paymentGateway.js';


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

app.use("/api", createPublicRoutes({ SUPABASE_URL, SUPABASE_ANON_KEY, supabaseAdmin, isUuid, SYSTEM_WHATSAPP_CLINIC_ID }));


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
    const existing = await getPasswordResetSession(normalizedEmail);
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
    await setPasswordResetSession(normalizedEmail, session);

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
    const session = await getPasswordResetSession(normalizedEmail);
    
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
      await deletePasswordResetSession(normalizedEmail);
      return res.status(400).json({ ok: false, error: "Código expirado. Solicite um novo código." });
    }

    const receivedHash = hashPasswordResetCode(normalizedEmail, code);
    if (receivedHash !== session.codeHash) {
      session.attempts = (session.attempts || 0) + 1;
      if (session.attempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
        session.blockedUntil = now + PASSWORD_RESET_BLOCK_MS;
        await setPasswordResetSession(normalizedEmail, session);
        return res.status(429).json({
          ok: false,
          error: "Muitas tentativas incorretas. Tente novamente em 15 minutos.",
        });
      }
      await setPasswordResetSession(normalizedEmail, session);
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

    await deletePasswordResetSession(normalizedEmail);

    return res.json({ ok: true, message: "Sua senha foi alterada com sucesso! Você já pode fazer login." });

  } catch (error) {
    console.error("[ResetConfirm] Erro:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});


// Status cache for quick retrieval
const whatsappSockets = {};
const whatsappConnections = {};
const whatsappSocketCreationPromises = {}; // Mapa para evitar criação de múltiplos sockets simultâneos
const whatsappMessagesQueue = {}; // Fila para mensagens em espera se necessário

const campaignsByClinic = new Map();
const antiSpamStatsByNumber = new Map();


app.use("/api/campaigns", createCampaignRoutes({ campaignsByClinic }));
app.use("/api/clinic", createClinicRoutes({ 
  requireAuth, 
  isUuid, 
  GLOBAL_CLINIC_ID, 
  createSupabaseAuthUser, 
  upsertClinicTeamUser, 
  SUPABASE_URL, 
  SUPABASE_SERVICE_ROLE_KEY 
}));


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

const disconnectWhatsAppSession = async (clinicId) => {
  if (!clinicId) return;

  if (whatsappSockets[clinicId]) {
    try {
      whatsappSockets[clinicId].ev.removeAllListeners();
      whatsappSockets[clinicId].end(undefined);
    } catch (_e) {}
    delete whatsappSockets[clinicId];
  }

  delete whatsappConnections[clinicId];
  delete whatsappSocketCreationPromises[clinicId];

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

  try {
    const authDir = ensureClinicStatus(clinicId);
    if (fs.existsSync(authDir)) {
      await new Promise(r => setTimeout(r, 1000));
      fs.rmSync(authDir, { recursive: true, force: true });
    }
  } catch (e) {
    console.error(`[Baileys] Erro ao deletar authDir para ${clinicId}:`, e.message);
  }
};

// Rate limiting for WhatsApp
const whatsappRateLimit = new Map();
const RATE_LIMIT_WINDOW = 10000;
const RATE_LIMIT_MAX = 5;

const sendWhatsAppMessage = async ({ clinicId, to, message }) => {
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const sock = await ensureSocketConnected(clinicId);

      let waitCount = 0;
      while (whatsappConnections[clinicId]?.status === "connecting" && waitCount < 30) {
        await new Promise(resolve => setTimeout(resolve, 500));
        waitCount++;
      }

      if (whatsappConnections[clinicId]?.status !== "connected") {
        throw new Error("Dispositivo não conectado. Status atual: " + (whatsappConnections[clinicId]?.status || "desconhecido"));
      }

      if (!sock) {
        throw new Error("Falha ao obter socket do WhatsApp.");
      }

      const target = await resolveWhatsAppJID(sock, to);
      const jidsToSend = Array.isArray(target) ? target : [target];

      let lastResult = null;
      for (const jid of jidsToSend) {
        addLog(`[API] Enviando via ${clinicId} para ${jid} (tentativa ${attempts})...`);
        const result = await sock.sendMessage(jid, { text: message });
        lastResult = result;
        if (jidsToSend.length > 1) await new Promise(r => setTimeout(r, 1000));
      }

      const result = lastResult;

      if (result?.key?.id) {
        const cleanPhone = String(to || "").replace(/\D/g, "");
        const targetJid = Array.isArray(target) ? target[0] : target;

        const msgData = {
          id: result.key.id,
          key: targetJid,
          phone: cleanPhone,
          text: message,
          fromMe: true,
          timestamp: Date.now(),
        };

        if (!whatsappConnections[clinicId].messages) {
          whatsappConnections[clinicId].messages = [];
        }
        whatsappConnections[clinicId].messages.push(msgData);

        const sendPersistKey = SUPABASE_ANON_KEY;
        if (SUPABASE_URL && sendPersistKey) {
          try {
            const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_messages`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: sendPersistKey,
                Authorization: `Bearer ${sendPersistKey}`,
              },
              body: JSON.stringify({
                clinic_id: clinicId === "system-global" ? GLOBAL_CLINIC_ID : clinicId,
                phone: cleanPhone,
                message_id: result.key.id,
                text: message,
                status: "sent",
                timestamp: new Date().toISOString()
              })
            });
            if (!supaRes.ok) {
              const supaErr = await supaRes.text();
              addLog(`[API] Falha ao persistir no Supabase: ${supaErr}`);
            }
          } catch (pErr) {
            addLog(`[API] Erro ao persistir no Supabase: ${pErr.message}`);
          }
        }

        return { success: true, messageId: result.key.id };
      }

      throw new Error("Não foi possível obter ID da mensagem após envio.");

    } catch (err) {
      const isConnectionError = err.message.toLowerCase().includes("fechada") ||
                               err.message.toLowerCase().includes("closed") ||
                               err.message.toLowerCase().includes("timed out") ||
                               err.message.toLowerCase().includes("conflict") ||
                               err.message.toLowerCase().includes("440");

      if (isConnectionError && attempts < maxAttempts) {
        addLog(`[API] Erro de conexão detectado (${err.message}). Tentando novamente em 2s...`);
        delete whatsappSockets[clinicId];
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }
};

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


// Signup Routes (phone verification, provisioning, trial)
app.use("/api/signup", createSignupRoutes({
  supabaseAdmin,
  fetchGlobalIntegrationConfig,
  get whatsappConnections() { return whatsappConnections; },
  get ensureSocketConnected() { return ensureSocketConnected; },
  get sendWhatsAppMessage() { return sendWhatsAppMessage; },
  SYSTEM_WHATSAPP_CLINIC_ID,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  addLog,
  isUuid,
  brazilianPhoneCandidates,
}));

// Billing Routes (MercadoPago preferences, payment status, webhook)
const billingRouter = createBillingRoutes({
  addLog,
  isUuid,
  safeJson,
  getSupabaseAdminHeaders,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
});
app.use("/api/mercadopago", billingRouter);
app.use("/api/webhooks", billingRouter);

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

