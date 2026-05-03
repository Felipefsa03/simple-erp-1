// Supabase env compatibility layer
// Supports both legacy keys (anon/service_role) and new keys (publishable/secret).

const cleanEnv = (value?: string) => String(value || '').trim();

export const SUPABASE_URL = cleanEnv(
  import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.VITE_SUPABASE_URL_PROD ||
    '',
);

export const SUPABASE_PUBLISHABLE_KEY = cleanEnv(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY_PROD ||
    '',
);

// SEGURANÇA (SEC-05): Service Role Key NUNCA deve ser exposta no frontend.
// Ela bypassa toda RLS do Supabase. Qualquer operação administrativa
// deve ser feita exclusivamente pelo backend (Render).
export const SUPABASE_SERVICE_ROLE_KEY = '';

export const isProductionBuild = import.meta.env.PROD;

export const isSupabaseEnvConfigured = () =>
  Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
