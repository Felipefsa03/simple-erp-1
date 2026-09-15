import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';

const isDev = import.meta.env.DEV;
const API_BASE = isDev ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://clinxia-backend.onrender.com');

interface WhatsAppStatus {
  status: string;
  connected?: boolean;
  phoneNumber?: string;
}

// Cache por clínica (multi-tenant: cada clínica tem seu próprio status)
const statusCache = new Map<string, { status: WhatsAppStatus; time: number }>();

const getAccessToken = async () => {
  if (!supabase) return "";
  const session = (await supabase.auth.getSession()).data.session;
  return session?.access_token || "";
};

export function useWhatsAppSync(
  clinicId: string, 
  onStatusChange?: (connected: boolean, status?: WhatsAppStatus) => void
) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastStatus, setLastStatus] = useState<WhatsAppStatus | null>(null);
  
  const syncStatus = useCallback(async (force = false) => {
    const cached = statusCache.get(clinicId);

    // Se tem cache recente (< 30s) e não forçado, usa o cache
    if (!force && cached && Date.now() - cached.time < 30000) {
      setLastStatus(cached.status);
      if (onStatusChange) {
        onStatusChange(cached.status.status === 'connected', cached.status);
      }
      return cached.status;
    }

    setIsSyncing(true);

    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE}/api/whatsapp/status/${clinicId}?t=${Date.now()}`, {
        headers: { 
          'ngrok-skip-browser-warning': 'true',
          'Authorization': `Bearer ${token}`
        }
      });
      const data: WhatsAppStatus = await res.json();

      const connected = data.status === 'connected' || data.status === 'conectado' || data.status === 'Connected';
      statusCache.set(clinicId, { status: data, time: Date.now() });
      setLastStatus(data);

      if (onStatusChange) {
        onStatusChange(connected, data);
      }

      return data;
    } catch (err: any) {
      if (err.message !== 'Failed to fetch' && !err.message?.includes('NetworkError')) {
        console.warn('[WhatsAppSync] Error:', err.message);
      }
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [clinicId, onStatusChange]);

  useEffect(() => {
    syncStatus();
    // Polling leve: mantém o status atualizado a cada 30s
    const interval = setInterval(() => syncStatus(), 30000);
    return () => clearInterval(interval);
  }, [syncStatus]);

  return { syncStatus, isSyncing, lastStatus };
}

// Helper to force resync when needed
export function useWhatsAppStatus() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const checkStatus = useCallback(async (clinicId: string) => {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE}/api/whatsapp/status/${clinicId}?t=${Date.now()}`, {
        headers: { 
          'ngrok-skip-browser-warning': 'true',
          'Authorization': `Bearer ${token}`
        }
      });
      const data: WhatsAppStatus = await res.json();
      setStatus(data);
      setIsConnected(data.status === 'connected' || data.status === 'conectado' || data.status === 'Connected');
      return data;
    } catch (err: any) {
      if (err.message !== 'Failed to fetch' && !err.message?.includes('NetworkError')) {
        console.warn('[WhatsAppStatus] Error:', err.message);
      }
      return null;
    }
  }, []);
  
  return { status, isConnected, checkStatus };
}
