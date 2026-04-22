import { getSupabaseSession } from '@/lib/supabase';
type Json = Record<string, any>;

async function request<T = Json>(path: string, init?: RequestInit): Promise<T> {
  const token = getSupabaseSession()?.access_token || null;
  
  const response = await fetch(path, {
    headers: {
      'content-type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.message || `Erro ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

export const integrationsApi = {
  health: () => request<{ status: string }>('/api/health'),
  asaasTest: (payload: { apiKey?: string; environment?: 'sandbox' | 'production' }) =>
    request<{ ok: boolean; message?: string }>('/api/asaas/test', { method: 'POST', body: JSON.stringify(payload) }),
  createAsaasCharge: (payload: Json) =>
    request<{ payment: { id: string; status: string; pixCopyPaste?: string } | null }>('/api/asaas/charge', { method: 'POST', body: JSON.stringify(payload) }),
  createAsaasSubscription: (payload: Json) =>
    request<{ subscription: { id: string; status: string } | null }>('/api/asaas/subscription', { method: 'POST', body: JSON.stringify(payload) }),
  reconcileAsaas: (payload: Json) =>
    request<{ updates: Array<{ next_status: string; asaas_status: string; paid_at: string }> }>('/api/asaas/reconcile', { method: 'POST', body: JSON.stringify(payload) }),
  sendNotification: (payload: Json) =>
    request<{ ok: boolean; delivered?: boolean; details?: Record<string, unknown> }>('/api/notifications/send', { method: 'POST', body: JSON.stringify(payload) }),
  memedPrescription: (payload: Json) =>
    request<{ prescription_id: string }>('/api/integrations/memed/prescription', { method: 'POST', body: JSON.stringify({ payload }) }),
  tissExport: (claim: Json) =>
    request<{ export: string }>('/api/integrations/tiss/export', { method: 'POST', body: JSON.stringify({ claim }) }),
  rdEvent: (eventType: string, payload: Json) =>
    request<{ ok: boolean }>('/api/integrations/rdstation/event', {
      method: 'POST',
      body: JSON.stringify({ eventType, payload }),
    }),
  pixelEvent: (provider: 'meta' | 'google', payload: Json) =>
    request<{ ok: boolean }>('/api/integrations/pixel/event', {
      method: 'POST',
      body: JSON.stringify({ provider, payload }),
    }),
};
