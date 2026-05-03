import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } from "../config/env.js";

console.log("[Supabase] Initializing backend client...");
console.log("[Supabase] URL:", SUPABASE_URL ? `${SUPABASE_URL.substring(0, 15)}...` : "MISSING");
console.log("[Supabase] Service Role Key (First 5):", SUPABASE_SERVICE_ROLE_KEY ? `${SUPABASE_SERVICE_ROLE_KEY.substring(0, 5)}...` : "MISSING");
console.log("[Supabase] Anon Key (First 5):", SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 5)}...` : "MISSING");

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("[Supabase] WARNING: SUPABASE_SERVICE_ROLE_KEY is missing. Administrative operations WILL FAIL.");
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

// Server headers for Supabase REST API (with service role when available)
export const getServerHeaders = (token = null) => ({
  "Content-Type": "application/json",
  apikey: SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
  Authorization: `Bearer ${token || SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY}`,
  Prefer: "return=representation",
});
