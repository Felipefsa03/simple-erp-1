try {
  const dotenv = await import('dotenv');
  dotenv.config();
} catch (err) {
  // Ignora o erro se o dotenv não estiver disponível (ex: Render/Produção injeta direto)
  console.log('[ENV] Dotenv not found or failed to load. Relying on OS environment variables.');
}

export const cleanEnv = (value) => {
  let cleaned = String(value || "").trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned;
};

export const pickEnv = (...values) => {
  for (const value of values) {
    const cleaned = cleanEnv(value);
    if (cleaned) return cleaned;
  }
  return "";
};

export const SUPABASE_URL = pickEnv(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_URL_PROD,
);

export const SUPABASE_ANON_KEY = pickEnv(
  process.env.SUPABASE_ANON_KEY,
  process.env.SUPABASE_PUBLISHABLE_KEY,
  process.env.SUPABASE_ANON_KEY_PROD,
  process.env.SUPABASE_PUBLISHABLE_KEY_PROD,
);

export const SUPABASE_SERVICE_ROLE_KEY = cleanEnv(pickEnv(
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.SUPABASE_SECRET_KEY,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PROD,
));

export const TOTP_ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY || SUPABASE_SERVICE_ROLE_KEY;

export const PORT = parseInt(process.env.PORT || "8787", 10);
export const DEFAULT_CLINIC_ID = process.env.DEFAULT_CLINIC_ID || "00000000-0000-0000-0000-000000000001";
export const ASAAS_API_KEY = cleanEnv(process.env.ASAAS_API_KEY || "");
export const ALLOWED_ORIGINS = (() => {
  const envOrigins =
    process.env.ALLOWED_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) || [];

  const defaultOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://clinxia.vercel.app",
    "https://simple-erp-1.vercel.app",
    "https://www.clinxia.com",
    "https://clinxia.com",
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  // Allow all Vercel preview URLs
  const vercelPreview = ["https://*.vercel.app"];

  return [...envOrigins, ...defaultOrigins, ...vercelPreview];
})();

const REQUIRED_ENVS = [
  ["SUPABASE_URL (ou SUPABASE_URL_PROD)", SUPABASE_URL],
  ["SUPABASE_PUBLISHABLE_KEY/SUPABASE_ANON_KEY (ou *_PROD)", SUPABASE_ANON_KEY],
];

const missingEnvs = REQUIRED_ENVS.filter(([, value]) => !value).map(([name]) => name);

if (missingEnvs.length > 0 && process.env.NODE_ENV !== "development") {
  for (const key of missingEnvs) {
    console.error(`[FATAL] Variável de ambiente ausente: ${key}`);
  }
  console.error("[FATAL] Configure as variáveis acima ou defina NODE_ENV=development para modo demo.");
  process.exit(1);
}
