// ============================================
// LuminaFlow ERP - Supabase Client
// Versão que funciona SEM o pacote @supabase/supabase-js
// ============================================

import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  isProductionBuild,
  isSupabaseEnvConfigured,
} from '@/lib/supabaseConfig';

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_PUBLISHABLE_KEY;

const isConfigured = isSupabaseEnvConfigured();

if (!isConfigured) {
  const message =
    '[Supabase] Variáveis ausentes. Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (ou VITE_SUPABASE_ANON_KEY).';
  if (isProductionBuild) {
    throw new Error(message);
  }
  console.warn(`${message} Usando modo demo (somente desenvolvimento).`);
} else {
  console.log('[Supabase] Configurado com sucesso. URL:', supabaseUrl);
}

// Headers padrão para requisições - agora inclui o token da sessão
const getHeaders = (_token?: string) => ({
  'Content-Type': 'application/json',
  'apikey': supabaseAnonKey,
  ...(currentSession ? { 'Authorization': `Bearer ${currentSession.access_token}` } : {}),
  'Prefer': 'return=representation',
});

// Sessao em memoria e persistencia local
const STORAGE_KEY = 'luminaflow_supabase_session';

const saveSessionToStorage = (session: { access_token: string; user: Record<string, unknown> } | null) => {
  if (typeof window !== 'undefined') {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
};

const loadSessionFromStorage = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
  }
  return null;
};

// Funcao para obter o token da sessao atual
export const getSupabaseSession = () => currentSession;

// ============================================
// Cliente Supabase Simplificado (sem pacote)
// ============================================

let currentSession: { access_token: string; user: Record<string, unknown> } | null = loadSessionFromStorage();


export const supabase = isConfigured ? {
  auth: {
    // Registro (Sign Up)
    signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
      try {
        const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ email, password, data: options?.data }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { data: null, error: { message: data.error_description || data.msg || 'Signup failed' } };
        }

        if (data.access_token) {
          currentSession = {
            access_token: data.access_token,
            user: data.user,
          };
          saveSessionToStorage(currentSession);
          return { data: { user: data.user, session: data }, error: null };
        }
        
        return { data: { user: data.user || data, session: null }, error: null };
      } catch (err: unknown) {
        return { data: null, error: { message: err instanceof Error ? err.message : 'Unknown error' } };
      }
    },

    // Login
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      try {
        const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { data: null, error: { message: data.error_description || 'Login failed' } };
        }
        
        // Log token info for debugging
        console.log('[Auth] Login response:', {
          hasToken: !!data.access_token,
          tokenLength: data.access_token?.length || 0,
          tokenParts: data.access_token?.split('.')?.length || 0,
          userId: data.user?.id
        });

        currentSession = {
          access_token: data.access_token,
          user: data.user,
        };
        saveSessionToStorage(currentSession);

        return { data: { user: data.user, session: data }, error: null };
      } catch (err: unknown) {
        return { data: null, error: { message: err instanceof Error ? err.message : 'Unknown error' } };
      }
    },

    // Logout
    signOut: async () => {
      try {
        if (currentSession) {
          await fetch(`${supabaseUrl}/auth/v1/logout`, {
            method: 'POST',
            headers: getHeaders(currentSession.access_token),
          });
        }
        currentSession = null;
        saveSessionToStorage(null);
        return { error: null };
      } catch (err) {
        currentSession = null;
        return { error: null };
      }
    },

    // Recuperar sessão
    getSession: async () => {
      return { data: { session: currentSession }, error: null };
    },

    // Recuperar usuário
    getUser: async () => {
      if (!currentSession) return { data: { user: null }, error: null };

      try {
        const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: getHeaders(currentSession.access_token),
        });
        const user = await response.json();
        return { data: { user }, error: null };
      } catch {
        return { data: { user: currentSession.user }, error: null };
      }
    },

    // Reset de senha
    resetPasswordForEmail: async (email: string, options?: { redirectTo?: string }) => {
      try {
        const response = await fetch(`${supabaseUrl}/auth/v1/recover`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            email,
            redirect_to: options?.redirectTo,
          }),
        });
        return { error: response.ok ? null : { message: 'Failed to send reset email' } };
      } catch (err: unknown) {
        return { error: { message: err instanceof Error ? err.message : 'Unknown error' } };
      }
    },

    // Atualizar senha
    updateUser: async ({ password }: { password: string }) => {
      if (!currentSession) return { error: { message: 'Not authenticated' } };

      try {
        const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
          method: 'PUT',
          headers: getHeaders(currentSession.access_token),
          body: JSON.stringify({ password }),
        });
        return { error: response.ok ? null : { message: 'Failed to update password' } };
      } catch (err: unknown) {
        return { error: { message: err instanceof Error ? err.message : 'Unknown error' } };
      }
    },

    // Listener de mudanças de autenticação
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Simples implementação
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },

  // Query builder para tabelas
  from: (table: string) => {
    let query = `${supabaseUrl}/rest/v1/${table}`;
    let method = 'GET';
    let body: Record<string, unknown> | Record<string, unknown>[] | null = null;
    let filters: string[] = [];
    let selectFields = '*';
    let orderByField: string | null = null;
    let orderAsc = false;
    let limitCount: number | null = null;
    let singleResult = false;

    const builder: any = {
      select: (fields = '*') => {
        selectFields = fields;
        return builder;
      },
      eq: (field: string, value: any) => {
        filters.push(`${field}=eq.${value}`);
        return builder;
      },
      order: (field: string, options?: { ascending?: boolean }) => {
        orderByField = field;
        orderAsc = options?.ascending ?? false;
        return builder;
      },
      limit: (count: number) => {
        limitCount = count;
        return builder;
      },
      single: () => {
        singleResult = true;
        return builder;
      },
      insert: (data: any) => {
        method = 'POST';
        body = data;
        return builder;
      },
      update: (data: any) => {
        method = 'PATCH';
        body = data;
        return builder;
      },
      delete: () => {
        method = 'DELETE';
        return builder;
      },
      then: async (resolve: any, reject?: any) => {
        try {
          let url = `${query}?select=${selectFields}`;

          if (filters.length > 0) {
            url += '&' + filters.join('&');
          }

          if (orderByField) {
            url += `&order=${orderByField}.${orderAsc ? 'asc' : 'desc'}`;
          }

          if (limitCount) {
            url += `&limit=${limitCount}`;
          }

          const token = currentSession?.access_token;
          const headers = getHeaders(token);

          const response = await fetch(url, {
            method,
            headers: {
              ...headers,
              ...(method === 'POST' ? { 'Prefer': 'return=representation' } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
          });

          if (!response.ok) {
            const errorText = await response.text();
            return resolve({ data: null, error: { message: errorText, status: response.status } });
          }

          if (response.status === 204) {
            return resolve({ data: null, error: null });
          }

          const text = await response.text();
          let data = text ? JSON.parse(text) : null;

          if (singleResult && Array.isArray(data)) {
            data = data[0] || null;
          }

          return resolve({ data, error: null });
        } catch (err: unknown) {
          return resolve({ data: null, error: { message: err instanceof Error ? err.message : 'Unknown error' } });
        }
      },
    };

    return builder;
  },

  // Storage (simplificado)
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File, options?: any) => {
        try {
          const token = currentSession?.access_token;
          const formData = new FormData();
          formData.append('', file);

          const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
            method: 'POST',
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': token ? `Bearer ${token}` : `Bearer ${supabaseAnonKey}`,
            },
            body: formData,
          });

          if (!response.ok) {
            return { data: null, error: { message: 'Upload failed' } };
          }

          const data = await response.json();
          return { data, error: null };
        } catch (err: unknown) {
          return { data: null, error: { message: err instanceof Error ? err.message : 'Upload failed' } };
        }
      },
      getPublicUrl: (path: string) => ({
        publicUrl: `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`,
      }),
    }),
  },
} : null;

export const isSupabaseConfigured = () => isConfigured;

// ============================================
// Helper Functions
// ============================================

export async function fetchFromTable<T>(
  table: string,
  options?: {
    select?: string;
    filters?: Record<string, any>;
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
  }
): Promise<{ data: T[] | null; error: any }> {
  if (!supabase) return { data: null, error: 'Supabase não configurado' };

  let query = supabase.from(table).select(options?.select || '*');

  if (options?.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  if (options?.orderBy) {
    query = query.order(options.orderBy, { ascending: options.ascending ?? false });
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  return await query;
}

export async function insertIntoTable<T>(
  table: string,
  data: Partial<T>
): Promise<{ data: T | null; error: any }> {
  if (!supabase) return { data: null, error: 'Supabase não configurado' };
  return await supabase.from(table).insert(data).select().single();
}

export async function updateInTable<T>(
  table: string,
  id: string,
  data: Partial<T>
): Promise<{ data: T | null; error: any }> {
  if (!supabase) return { data: null, error: 'Supabase não configurado' };
  return await supabase.from(table).update(data).eq('id', id).select().single();
}

export async function deleteFromTable(
  table: string,
  id: string
): Promise<{ error: any }> {
  if (!supabase) return { error: 'Supabase não configurado' };
  const { error } = await supabase.from(table).delete().eq('id', id);
  return { error };
}

export async function createAuthUser(userData: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: string;
  commission_pct?: number;
  clinic_id?: string;
}): Promise<{ success?: boolean; user_id?: string; error?: string }> {
  if (!isSupabaseConfigured()) return { error: 'Supabase nao configurado' };

  try {
    const accessToken = currentSession?.access_token || '';
    
    // More rigorous JWT validation
    const isValidJwt = (token: string): boolean => {
      if (!token || typeof token !== 'string') {
        console.error('[createAuthUser] Token is not a string:', typeof token);
        return false;
      }
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('[createAuthUser] Token has', parts.length, 'parts (expected 3):', token.substring(0, 80));
        return false;
      }
      // Check each part is valid base64url
      const validBase64Url = /^[A-Za-z0-9_-]+$/;
      for (let i = 0; i < 3; i++) {
        if (!validBase64Url.test(parts[i])) {
          console.error('[createAuthUser] Part', i, 'invalid:', parts[i].substring(0, 20));
          return false;
        }
      }
      return true;
    };
    
    if (!accessToken || !isValidJwt(accessToken)) {
      return { error: 'Sessao invalida. Faca login novamente para criar usuarios.' };
    }

    // Prioriza backend do Render para provisionar Auth + perfil de usuário.
    const API_BASE = import.meta.env.DEV
      ? ''
      : import.meta.env.VITE_API_BASE_URL || 'https://clinxia-backend.onrender.com';
    
    console.log('[createAuthUser] Calling backend:', API_BASE, 'with email:', userData.email);
    
    const response = await fetch(`${API_BASE}/api/clinic/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(userData),
    });

    const result = await response.json().catch(() => ({}));
    
    console.log('[createAuthUser] Backend response:', response.status, result);

    if (!response.ok) {
      const message = result?.error || result?.message || result?.code || 'Erro ao criar usuario';
      return { error: message };
    }

    return { success: true, user_id: result.user_id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[createAuthUser] Exception:', message);
    return { error: message };
  }
}
