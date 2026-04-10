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
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'apikey': supabaseAnonKey,
  'Authorization': currentSession ? `Bearer ${currentSession.access_token}` : `Bearer ${supabaseAnonKey}`,
  'Prefer': 'return=representation',
});

// Função para obter o token da sessão atual
export const getSupabaseSession = () => currentSession;

// ============================================
// Cliente Supabase Simplificado (sem pacote)
// ============================================

let currentSession: { access_token: string; user: Record<string, unknown> } | null = null;

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

        currentSession = {
          access_token: data.access_token,
          user: data.user,
        };

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

          let data = await response.json();

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
