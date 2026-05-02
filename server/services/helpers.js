/**
 * services/helpers.js
 * Funções utilitárias compartilhadas entre todos os módulos do backend.
 * Extraído do index.js para reduzir acoplamento e facilitar manutenção.
 */
import crypto from "crypto";

// ============================================
// Supabase Helpers
// ============================================
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

export const isValidSupabaseKey = (value) => {
  const token = cleanEnv(value);
  if (!token) return false;
  if (token.startsWith("sb_publishable_") || token.startsWith("sb_secret_")) return true;
  if (token.startsWith("eyJ")) return true;
  const parts = token.split(".");
  return parts.length === 3 && parts.every(p => /^[A-Za-z0-9\-_]+$/.test(p));
};

export const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );

export const encodeFilterValue = (value) => encodeURIComponent(String(value).trim());

// ============================================
// Sanitization & Parsing
// ============================================
export const sanitizePlan = (plan) => {
  if (!plan) return "basico";
  const allowed = new Set(["basico", "profissional", "premium"]);
  return allowed.has(String(plan)) ? String(plan) : "basico";
};

export const parsePlanPrice = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

export const maskPhone = (rawPhone) => {
  const digits = String(rawPhone || "").replace(/\\D/g, "");
  if (digits.length < 4) return "(**) *****-****";
  return `(**) *****-${digits.slice(-4)}`;
};

export const generateNumericCode = () =>
  String(Math.floor(100000 + Math.random() * 900000));

export const hashCode = (prefix, code) =>
  crypto.createHash("sha256").update(`${prefix}:${code}`).digest("hex");

export const safeJson = async (response) => {
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

// ============================================
// Brazilian Phone Number Normalization
// ============================================
export function brazilianPhoneCandidates(rawPhone) {
  let digits = String(rawPhone).replace(/\\D/g, "");

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

  if (local.length === 8 && ["6", "7", "8", "9"].includes(local[0])) {
    if (is9DigitJID) {
      results.push(\`\${country}\${ddd}9\${local}\`);
      results.push(\`\${country}\${ddd}\${local}\`);
    } else {
      results.push(\`\${country}\${ddd}\${local}\`);
      results.push(\`\${country}\${ddd}9\${local}\`);
    }
  } else if (local.length === 9 && local[0] === "9") {
    if (is9DigitJID) {
      results.push(\`\${country}\${ddd}\${local}\`);
      results.push(\`\${country}\${ddd}\${local.slice(1)}\`);
    } else {
      results.push(\`\${country}\${ddd}\${local.slice(1)}\`);
      results.push(\`\${country}\${ddd}\${local}\`);
    }
  } else {
    results.push(\`\${country}\${ddd}\${local}\`);
  }

  return [...new Set(results)];
}

// ============================================
// Debug Log Helper
// ============================================
const debugLogs = [];
export const addLog = (msg) => {
  const timestamp = new Date().toISOString();
  const formatted = \`[\${timestamp}] \${msg}\`;
  console.log(formatted);
  debugLogs.push(formatted);
  if (debugLogs.length > 500) debugLogs.shift();
};

export const getDebugLogs = () => debugLogs;
