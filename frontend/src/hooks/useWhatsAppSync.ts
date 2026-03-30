import { useEffect, useRef, useCallback, useState } from 'react';

const isDev = import.meta.env.DEV;
const API_BASE = isDev ? '' : (import.meta.env.VITE_API_BASE_URL || '');

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
        onStatusChange(globalLastStatus.status === 'connected', globalLastStatus);
      }
      return globalLastStatus;
    }
    
    if (globalSyncStatus === 'syncing') {
      if (onStatusChange && globalLastStatus) {
        onStatusChange(globalLastStatus.status === 'connected', globalLastStatus);
      }
      return globalLastStatus;
    }
    
    globalSyncStatus = 'syncing';
    setIsSyncing(true);
    
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/status/${clinicId}?t=${Date.now()}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data: WhatsAppStatus = await res.json();
      
      const connected = data.status === 'connected';
      globalSyncStatus = connected ? 'synced' : 'not_synced';
      lastSyncTime = Date.now();
      globalLastStatus = data;
      setLastStatus(data);
      
      if (onStatusChange) {
        onStatusChange(connected, data);
      }
      
      return data;
    } catch (err) {
      console.error('[WhatsAppSync] Error:', err);
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
      onStatusChange(globalLastStatus.status === 'connected', globalLastStatus);
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
      const res = await fetch(`${API_BASE}/api/whatsapp/status/${clinicId}?t=${Date.now()}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data: WhatsAppStatus = await res.json();
      setStatus(data);
      setIsConnected(data.status === 'connected');
      return data;
    } catch (err) {
      console.error('[WhatsAppStatus] Error:', err);
      return null;
    }
  }, []);
  
  return { status, isConnected, checkStatus };
}
