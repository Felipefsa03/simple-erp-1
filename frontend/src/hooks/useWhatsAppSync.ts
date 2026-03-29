import { useEffect, useRef, useCallback } from 'react';

const isDev = import.meta.env.DEV;
const API_BASE = isDev ? '' : (import.meta.env.VITE_API_BASE_URL || '');

interface WhatsAppStatus {
  status: string;
  connected?: boolean;
  phoneNumber?: string;
}

export function useWhatsAppSync(
  clinicId: string, 
  onStatusChange?: (connected: boolean, status?: WhatsAppStatus) => void
) {
  const isSyncing = useRef(false);
  
  const syncStatus = useCallback(async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/status/${clinicId}?t=${Date.now()}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data: WhatsAppStatus = await res.json();
      
      const connected = data.status === 'connected';
      if (onStatusChange) {
        onStatusChange(connected, data);
      }
      
      return data;
    } catch (err) {
      console.error('[WhatsAppSync] Error:', err);
      return null;
    } finally {
      isSyncing.current = false;
    }
  }, [clinicId, onStatusChange]);

  useEffect(() => {
    // Initial sync
    syncStatus();
    
    // Fast polling for first 15 seconds (every 2s)
    let pollCount = 0;
    const fastPoll = setInterval(() => {
      pollCount++;
      if (pollCount < 8) {
        syncStatus();
      } else {
        clearInterval(fastPoll);
      }
    }, 2000);
    
    // Then slow polling every 30 seconds
    const interval = setInterval(syncStatus, 30000);
    
    return () => {
      clearInterval(fastPoll);
      clearInterval(interval);
    };
  }, [syncStatus]);

  return { syncStatus, isSyncing };
}
