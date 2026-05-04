import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';

const isDev = import.meta.env.DEV;
const API_BASE = isDev ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://clinxia-backend.onrender.com');

interface WhatsAppStatus {
  status: string;
  connected?: boolean;
  phoneNumber?: string;
}

// Global sync state to avoid multiple syncs
let globalSyncStatus: 'synced' | 'not_synced' | 'syncing' = 'not_synced';
let lastSyncTime = 0;
let globalLastStatus: WhatsAppStatus | null = null;
let hasInitialized = false;

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
  const hasSynced = useRef(false);
  
  const syncStatus = useCallback(async (force = false) => {
    // If already synced recently and not forced, skip
    if (!force && globalSyncStatus === 'synced' && globalLastStatus && Date.now() - lastSyncTime < 30000) {
      if (onStatusChange) {
        onStatusChange(globalLastStatus.status === 'connected' || globalLastStatus.status === 'conectado' || globalLastStatus.status === 'Connected', globalLastStatus);
      }
      return globalLastStatus;
    }
    
    if (globalSyncStatus === 'syncing') {
      if (onStatusChange && globalLastStatus) {
        onStatusChange(globalLastStatus.status === 'connected' || globalLastStatus.status === 'conectado' || globalLastStatus.status === 'Connected', globalLastStatus);
      }
      return globalLastStatus;
    }
    
    globalSyncStatus = 'syncing';
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
      globalSyncStatus = connected ? 'synced' : 'not_synced';
      lastSyncTime = Date.now();
      globalLastStatus = data;
      setLastStatus(data);
      
      if (onStatusChange) {
        onStatusChange(connected, data);
      }
      
      return data;
    } catch (err: any) {
      if (err.message !== 'Failed to fetch' && !err.message?.includes('NetworkError')) {
        console.warn('[WhatsAppSync] Error:', err.message);
      }
      globalSyncStatus = 'not_synced';
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [clinicId, onStatusChange]);

  useEffect(() => {
    // Only sync once globally
    if (!hasSynced.current) {
      hasSynced.current = true;
      syncStatus();
    } else if (globalLastStatus && onStatusChange) {
      // Just notify with last known status
      onStatusChange(globalLastStatus.status === 'connected' || globalLastStatus.status === 'conectado' || globalLastStatus.status === 'Connected', globalLastStatus);
    }
  }, [syncStatus, onStatusChange]);

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
