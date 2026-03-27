type Json = Record<string, any>;

async function request<T = Json>(path: string, init?: RequestInit): Promise<T> {
  const authData = typeof window !== 'undefined' ? localStorage.getItem('luminaflow-auth') : null;
  const token = authData ? JSON.parse(authData)?.token : null;
  
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
  health: () => request('/api/health'),
  asaasTest: (payload: { apiKey?: string; environment?: 'sandbox' | 'production' }) =>
    request('/api/asaas/test', { method: 'POST', body: JSON.stringify(payload) }),
  createAsaasCharge: (payload: Json) =>
    request('/api/asaas/charge', { method: 'POST', body: JSON.stringify(payload) }),
  createAsaasSubscription: (payload: Json) =>
    request('/api/asaas/subscription', { method: 'POST', body: JSON.stringify(payload) }),
  reconcileAsaas: (payload: Json) =>
    request('/api/asaas/reconcile', { method: 'POST', body: JSON.stringify(payload) }),
  sendNotification: (payload: Json) =>
    request('/api/notifications/send', { method: 'POST', body: JSON.stringify(payload) }),
  memedPrescription: (payload: Json) =>
    request('/api/integrations/memed/prescription', { method: 'POST', body: JSON.stringify({ payload }) }),
  tissExport: (claim: Json) =>
    request('/api/integrations/tiss/export', { method: 'POST', body: JSON.stringify({ claim }) }),
  rdEvent: (eventType: string, payload: Json) =>
    request('/api/integrations/rdstation/event', {
      method: 'POST',
      body: JSON.stringify({ eventType, payload }),
    }),
  pixelEvent: (provider: 'meta' | 'google', payload: Json) =>
    request('/api/integrations/pixel/event', {
      method: 'POST',
      body: JSON.stringify({ provider, payload }),
    }),
};
