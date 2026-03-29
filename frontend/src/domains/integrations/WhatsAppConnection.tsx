// ============================================
// LuminaFlow - WhatsApp Business Connection (Real QR Code)
// Polling-based architecture: call /connect once, then poll /status
// ============================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Smartphone, RefreshCw, CheckCircle2, AlertTriangle,
  X, Loader2, Wifi, Signal, Clock, Shield, Link2, Key
} from 'lucide-react';
import { toast } from '@/hooks/useShared';
import { useClinicStore } from '@/stores/clinicStore';

const isDev = import.meta.env.DEV;
const API_BASE = isDev ? '' : (import.meta.env.VITE_API_BASE_URL || '');

const isApiAvailable = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return res.ok;
  } catch {
    return false;
  }
};

interface WhatsAppConnectionProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
  clinicId?: string;
  onStatusChange?: (connected: boolean) => void;
}

type UIStatus = 'loading' | 'qr' | 'pairing' | 'connected' | 'error' | 'expired' | 'disconnected';

export function WhatsAppConnectionModal({ isOpen, onClose, onConnect, clinicId = 'clinic-1', onStatusChange }: WhatsAppConnectionProps) {
  const [uiStatus, setUiStatus] = useState<UIStatus>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [countdown, setCountdown] = useState(120);
  const [deviceInfo, setDeviceInfo] = useState<{ name: string; id: string; platform: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didInitRef = useRef(false);
  const connectedNotifiedRef = useRef(false);

  // Store for WhatsApp connection state
  const setWhatsAppConnected = useClinicStore(s => s.setWhatsAppConnected);

  // --- Helpers ---
  const stopTimers = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const startCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(120);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
          setUiStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // --- Core: poll backend status ---
  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/whatsapp/status/${clinicId}?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        if (!res.ok) return;
        const data = await res.json();

        // CONNECTED (aceita 'connected' ou 'conectado')
        if (data.status === 'connected' || data.status === 'conectado' || data.status === 'Connected') {
          stopTimers();
          setUiStatus('connected');
          setQrCode(null);
          if (data.deviceInfo) {
            setDeviceInfo({
              name: data.deviceInfo.name || data.deviceInfo.nome || 'WhatsApp Web',
              id: data.deviceInfo.id || '',
              platform: data.deviceInfo.platform || data.deviceInfo.plataforma || 'Web',
            });
          }
          if (!connectedNotifiedRef.current) {
            connectedNotifiedRef.current = true;
            onConnect();
            if (onStatusChange) onStatusChange(true);
            toast('WhatsApp Business conectado com sucesso!', 'success');
          }
          return;
        }

        // QR CODE AVAILABLE
        if ((data.status === 'qr' || data.status === 'waiting_scan')) {
          const imgSource = data.qrBase64 || (data.qrCode?.startsWith('data:image') ? data.qrCode : null);
          if (imgSource) {
            setQrCode(imgSource);
            setUiStatus('qr');
            setPairingCode(null);
            if (!countdownRef.current) {
              startCountdown();
            }
          }
          return;
        }

        // PAIRING CODE AVAILABLE
        if (data.status === 'pairing' && data.pairingCode) {
          setPairingCode(data.pairingCode);
          setUiStatus('pairing');
          setQrCode(null);
          return;
        }

        // ERROR from backend
        if (data.status === 'error' || data.ok === false) {
          stopTimers();
          setUiStatus('error');
          setErrorMsg(data.message || 'Erro desconhecido no servidor de WhatsApp');
          return;
        }

        // CONNECTING / RECONNECTING → keep showing loading
        if (data.status === 'connecting' || data.status === 'loading') {
           setUiStatus('loading');
           return;
        }

      } catch (err) {
        console.error('[WhatsApp] poll error:', err);
      }
    };

    poll(); 
    pollingRef.current = setInterval(poll, 3000); // Polling faster for better UX
  }, [clinicId, stopTimers, startCountdown, onConnect]);

  // --- Initiate connection ---
  const initiate = useCallback(async (phone?: string) => {
    setUiStatus('loading');
    setQrCode(null);
    setPairingCode(null);
    setErrorMsg(null);
    connectedNotifiedRef.current = false;

    // Check if API is available first - if not, use demo mode automatically
    if (!isDev) {
      const apiOk = await isApiAvailable();
      if (!apiOk) {
        console.log('[WhatsApp] API not available, using demo mode');
        setUiStatus('connected');
        setWhatsAppConnected(clinicId, true, '', '5511999999999');
        if (onStatusChange) onStatusChange(true);
        setDeviceInfo({ name: 'WhatsApp Demo', platform: 'Modo Simulação', lastSync: new Date().toLocaleString('pt-BR') });
        toast('Modo demo ativado - API não disponível', 'info');
        return;
      }
    }

    try {
      // In professional mode, we first check status. The backend auto-connects if needed.
      const res = await fetch(`${API_BASE}/api/health`, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (!res.ok) {
        setUiStatus('error');
        setErrorMsg('Servidor de conexão não está respondendo corretamente.');
        return;
      }
    } catch (err) {
      console.error('[WhatsApp] API check error:', err);
      setUiStatus('error');
      setErrorMsg('Não foi possível conectar ao servidor. O backend pode estar offline.');
      return;
    }

    // Now try to get WhatsApp status
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/status/${clinicId}?t=${Date.now()}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await res.json();

      if (data.ok === false) {
        setUiStatus('error');
        setErrorMsg(data.error || 'Falha ao iniciar conexão');
        return;
      }

      // If already connected
      if (data.status === 'connected') {
        setUiStatus('connected');
        setDeviceInfo({
          name: data.phoneNumber || 'WhatsApp Web',
          id: '',
          platform: 'API'
        });
        onConnect();
        if (onStatusChange) onStatusChange(true);
        toast('WhatsApp Business conectado!', 'success');
        return;
      }

      // Start polling to get the QR code
      startPolling();

    } catch (err: any) {
      console.error('[WhatsApp] initiate error:', err);
      setUiStatus('error');
      setErrorMsg('Servidor fora do ar ou URL do Render incorreta.');
    }
  }, [clinicId, startPolling, onConnect]);

  // --- Auto-start ONCE when modal opens ---
  useEffect(() => {
    if (isOpen && !didInitRef.current) {
      didInitRef.current = true;
      initiate();
    }
  }, [isOpen, initiate]);

  // --- Reset when modal closes ---
  useEffect(() => {
    if (!isOpen) {
      stopTimers();
      didInitRef.current = false;
      connectedNotifiedRef.current = false;
      setUiStatus('loading');
      setQrCode(null);
      setPairingCode(null);
      setErrorMsg(null);
      setCountdown(120);
      setDeviceInfo(null);
    }
  }, [isOpen, stopTimers]);

  // --- Cleanup on unmount ---
  useEffect(() => () => stopTimers(), [stopTimers]);

  // --- Manual retry ---
  const handleRetry = useCallback(() => {
    stopTimers();
    didInitRef.current = false;
    setUiStatus('loading');
    setQrCode(null);
    setPairingCode(null);
    setErrorMsg(null);
    setCountdown(120);
    connectedNotifiedRef.current = false;

    setTimeout(() => {
      didInitRef.current = true;
      initiate();
    }, 300);
  }, [stopTimers, initiate]);

  // --- Disconnect ---
  const handleDisconnect = useCallback(async () => {
    try {
      // Endpoint logic handled by backend cleanup
      await fetch(`${API_BASE}/api/whatsapp/disconnect/${clinicId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
      });
      stopTimers();
      setUiStatus('disconnected');
      setQrCode(null);
      setDeviceInfo(null);
      didInitRef.current = false;
      if (onStatusChange) onStatusChange(false);
      toast('WhatsApp desconectado.', 'info');
    } catch (err: any) {
      toast('Erro ao desconectar: ' + err.message, 'error');
    }
  }, [clinicId, stopTimers, onStatusChange]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Smartphone className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold">WhatsApp Business</h2>
                <p className="text-sm text-white/80">Conexão via API Profissional</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* LOADING */}
          {uiStatus === 'loading' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Iniciando API...</h3>
              <p className="text-slate-500 text-sm">Aguardando resposta do servidor Render</p>
            </div>
          )}

          {/* ERROR */}
          {uiStatus === 'error' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Falha na Conexão</h3>
              <p className="text-slate-500 text-sm mb-6">{errorMsg || 'Não foi possível conectar à sua API no Render.'}</p>
              
              <div className="space-y-3">
                <button onClick={handleRetry} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Tentar Novamente
                </button>
                <button onClick={onClose} className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200">
                  Fechar
                </button>
              </div>
            </div>
          )}

          {/* QR CODE */}
          {uiStatus === 'qr' && qrCode && (
            <div className="text-center">
              <p className="text-slate-600 mb-4 font-medium text-sm">Escaneie o QR Code abaixo:</p>
              <div className="bg-white border-4 border-slate-100 rounded-3xl p-6 inline-block mb-4 shadow-inner">
                <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 mx-auto" />
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-6 bg-slate-50 py-2 rounded-full w-fit mx-auto px-4">
                <Clock className="w-3 h-3" />
                <span>Expira em {countdown}s</span>
              </div>
              
              <button 
                onClick={handleRetry} 
                className="flex items-center justify-center gap-2 text-green-600 hover:text-green-700 font-bold mx-auto mb-6 text-sm py-2 px-4 rounded-xl hover:bg-green-50 transition-all"
              >
                <RefreshCw className="w-4 h-4" /> Gerar novo QR Code
              </button>
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-400 font-medium mb-3">Como conectar:</p>
                <ol className="text-xs text-slate-500 space-y-2 text-left">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                    Abra o WhatsApp no celular
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                    Toque em <strong>⋮</strong> → <strong>Aparelhos conectados</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                    Toque em <strong>Conectar um aparelho</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                    Escaneie este QR Code
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* PAIRING CODE */}
          {uiStatus === 'pairing' && (
            <div className="text-center">
              <p className="text-slate-600 mb-4">Código de pareamento gerado!</p>
              <div className="bg-white border-2 border-green-200 rounded-2xl p-6 inline-block mb-4">
                <p className="text-xs text-slate-500 mb-2">Digite este código no WhatsApp:</p>
                <div className="text-4xl font-bold text-green-600 tracking-widest">{pairingCode}</div>
              </div>
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-400 font-medium mb-3">Como parear:</p>
                <ol className="text-xs text-slate-500 space-y-2 text-left">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                    Abra o WhatsApp no celular
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                    Toque em <strong>⋮</strong> → <strong>Aparelhos conectados</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                    Toque em <strong>Conectar um aparelho</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                    Toque em <strong>Vincular com número</strong> e digite o código acima
                  </li>
                </ol>
              </div>
              <div className="mt-6">
                <p className="text-sm text-slate-500 mb-3">Ou gere um QR Code:</p>
                <button onClick={handleRetry} className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 flex items-center gap-2 mx-auto">
                  <RefreshCw className="w-4 h-4" /> Gerar QR Code
                </button>
              </div>
            </div>
          )}

          {/* EXPIRED */}
          {uiStatus === 'expired' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Código Expirado</h3>
              <p className="text-slate-500 text-sm mb-6">O código expirou. Gere um novo para tentar novamente.</p>
              <button onClick={handleRetry} className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 flex items-center gap-2 mx-auto">
                <RefreshCw className="w-4 h-4" /> Gerar Novo Código
              </button>
            </div>
          )}

          {/* CONNECTED */}
          {uiStatus === 'connected' && (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Conectado!</h3>
              <p className="text-slate-500 text-sm mb-6">WhatsApp Business conectado com sucesso</p>
              {deviceInfo && (
                <div className="bg-slate-50 rounded-2xl p-4 mb-6">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{deviceInfo.name}</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div className="flex items-center gap-2">
                      <Wifi className="w-5 h-5 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{deviceInfo.platform}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <Shield className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <p className="text-[10px] font-bold text-emerald-700">Conexão Segura</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <Signal className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-[10px] font-bold text-blue-700">Sincronizado</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center">
                  <Link2 className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-[10px] font-bold text-purple-700">Ativo</p>
                </div>
              </div>
              <div className="space-y-2">
                <button onClick={onClose} className="w-full py-2.5 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Fechar
                </button>
                <button onClick={handleDisconnect} className="w-full py-2.5 bg-red-50 text-red-600 font-bold rounded-xl text-sm hover:bg-red-100 flex items-center justify-center gap-2">
                  <X className="w-4 h-4" /> Desconectar
                </button>
              </div>
            </div>
          )}

          {/* DISCONNECTED */}
          {uiStatus === 'disconnected' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">WhatsApp Business</h3>
              <p className="text-slate-500 text-sm mb-4 max-w-xs mx-auto">
                Conecte sua conta do WhatsApp Business para enviar mensagens diretamente pelo sistema.
              </p>
              
              <div className="mb-4">
                <input
                  type="tel"
                  placeholder="Celular com DDI (ex: 5511987654321)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-center"
                />
                <p className="text-xs text-slate-400 mt-1">Opcional: digite para usar código de pareamento</p>
              </div>
              
              <button onClick={() => initiate()} className="w-full px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 flex items-center gap-2 justify-center">
                <Link2 className="w-5 h-5" /> Conectar WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main WhatsApp Integration Component (Summary View)
// ============================================
export function WhatsAppIntegration({ clinicId = 'clinic-1', onStatusChange }: { clinicId?: string, onStatusChange?: (connected: boolean) => void }) {
  const [showModal, setShowModal] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{ name: string; platform: string; lastSync: string } | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Store for global status
  const setWhatsAppConnected = useClinicStore(s => s.setWhatsAppConnected);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/status/${clinicId}?t=${Date.now()}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await res.json();
      
      const connected = data.status === 'connected';
      setIsConnected(connected);
      setWhatsAppConnected(clinicId, connected);
      
      if (connected) {
        setDeviceInfo({
          name: data.phoneNumber || 'WhatsApp Web',
          platform: 'API Render',
          lastSync: new Date().toLocaleString('pt-BR'),
        });
      } else {
        setDeviceInfo(null);
      }
      
      if (onStatusChange) onStatusChange(connected);
    } catch (err) {
      console.error('[WhatsApp] Status check failed:', err);
    } finally {
      setIsChecking(false);
    }
  }, [clinicId, setWhatsAppConnected, onStatusChange]);

  useEffect(() => {
    checkStatus();
    // Poll status every 30 seconds to keep UI fresh
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleConnect = () => {
    checkStatus();
    setShowModal(false);
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`${API_BASE}/api/whatsapp/disconnect/${clinicId}`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      setIsConnected(false);
      setWhatsAppConnected(clinicId, false);
      setDeviceInfo(null);
      toast('WhatsApp desconectado.', 'info');
    } catch (err) {
      toast('Erro ao desconectar.', 'error');
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
        <span className="ml-3 text-slate-500 font-medium">Sincronizando com Render...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!isConnected ? (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Smartphone className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">WhatsApp Business API</h3>
          <p className="text-slate-500 text-sm mb-8 max-w-xs mx-auto">
            Conecte sua conta via API profissional para automação de mensagens e confirmações.
          </p>
          <button 
            onClick={() => setShowModal(true)} 
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-2xl hover:scale-105 transition-all flex items-center gap-3 mx-auto shadow-lg shadow-green-200"
          >
            <Link2 className="w-5 h-5" /> Conectar Agora
          </button>
        </div>
      ) : (
        <div className="py-4">
          <div className="flex items-center gap-5 mb-8 bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-md">
              <Smartphone className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-slate-900 text-lg">WhatsApp API</h3>
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white animate-pulse">
                  <Wifi className="w-3 h-3" /> ONLINE
                </span>
              </div>
              {deviceInfo && <p className="text-sm text-slate-600 font-medium">{deviceInfo.name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tipo de Conexão</p>
              <p className="text-sm font-bold text-slate-800">API Headless (Render)</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Segurança</p>
              <p className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Ponta-a-Ponta
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => setShowModal(true)} 
              className="w-full py-4 bg-white border-2 border-slate-100 text-slate-700 font-bold rounded-2xl text-sm hover:bg-slate-50 flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Alterar Aparelho
            </button>
            <button 
              onClick={handleDisconnect} 
              className="w-full py-4 text-red-500 font-bold rounded-2xl text-sm hover:bg-red-50 flex items-center justify-center gap-2 transition-all"
            >
              <X className="w-4 h-4" /> Desconectar Conta
            </button>
          </div>
        </div>
      )}
      <WhatsAppConnectionModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onConnect={handleConnect} 
        clinicId={clinicId}
        onStatusChange={onStatusChange}
      />
    </div>
  );
}
