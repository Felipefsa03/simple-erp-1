import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, MessageSquare, Smartphone, RefreshCw, CheckCircle2, AlertTriangle, X, Loader2, Wifi, WifiOff, Clock, Shield, Link2, Eye, EyeOff, Phone, Key, Save, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClinicStore } from '@/stores/clinicStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/useShared';
import { useWhatsAppSync } from '@/hooks/useWhatsAppSync';

const isDev = import.meta.env.DEV;
const API_BASE = isDev ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://clinxia-backend.onrender.com');
const SYSTEM_CLINIC_ID = 'system-global';

type UIStatus = 'loading' | 'qr' | 'connected' | 'error' | 'expired' | 'disconnected';

export function SystemWhatsAppConfig() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  
  const systemWhatsApp = useClinicStore(s => s.systemWhatsApp);
  const setSystemWhatsApp = useClinicStore(s => s.setSystemWhatsApp);
  
  const [showModal, setShowModal] = useState(false);
  const [uiStatus, setUiStatus] = useState<UIStatus>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(120);
  const [deviceInfo, setDeviceInfo] = useState<{ name: string; id: string; platform: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didInitRef = useRef(false);

  // Auto-sync WhatsApp on mount
  useWhatsAppSync(SYSTEM_CLINIC_ID, (connected) => {
    if (connected && !didInitRef.current) {
      didInitRef.current = true;
      startPolling();
    }
  });
  const connectedNotifiedRef = useRef(false);

  // Só Super Admin pode configurar
  if (!isSuperAdmin) {
    return null;
  }

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

  // --- Poll backend status ---
  const initiateCheck = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/status/${SYSTEM_CLINIC_ID}?t=${Date.now()}`, { 
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await res.json();
      
      if (data.status === 'connected') {
        setSystemWhatsApp(true);
        setDeviceInfo({
          name: data.phoneNumber || 'WhatsApp Web',
          id: '',
          platform: 'API Render'
        });
      } else {
        setSystemWhatsApp(false);
      }
    } catch (err) {
      console.error('[WhatsApp] System config check failed:', err);
    }
  }, [setSystemWhatsApp]);

  // --- Poll backend status ---
  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/whatsapp/status/${SYSTEM_CLINIC_ID}?t=${Date.now()}`, { 
          cache: 'no-store',
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === 'connected') {
          stopTimers();
          setUiStatus('connected');
          setQrCode(null);
          setDeviceInfo({
            name: data.phoneNumber || 'WhatsApp Web',
            id: '',
            platform: 'API Render',
          });
          if (!connectedNotifiedRef.current) {
            connectedNotifiedRef.current = true;
            setSystemWhatsApp(true);
            toast('WhatsApp do Sistema conectado!', 'success');
          }
          return;
        }

        if ((data.status === 'qr' || data.status === 'waiting_scan')) {
          const imgSource = data.qrBase64 || (data.qrCode?.startsWith('data:image') ? data.qrCode : null);
          if (imgSource) {
            setQrCode(imgSource);
            setUiStatus('qr');
            if (!countdownRef.current) startCountdown();
          }
          return;
        }

        if (data.status === 'error') {
          stopTimers();
          setUiStatus('error');
          setErrorMsg(data.error || 'Erro no servidor');
          return;
        }
      } catch (err) {
        console.error('[WhatsApp Sistema] poll error:', err);
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 3000);
  }, [stopTimers, startCountdown, setSystemWhatsApp]);

  // --- Initiate connection ---
  const initiate = useCallback(async () => {
    setUiStatus('loading');
    setQrCode(null);
    setErrorMsg(null);
    connectedNotifiedRef.current = false;

    try {
      // Just check status - backend triggers auto-connect
      const res = await fetch(`${API_BASE}/api/whatsapp/status/${SYSTEM_CLINIC_ID}?t=${Date.now()}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await res.json();

      if (data.status === 'connected') {
        setUiStatus('connected');
        setSystemWhatsApp(true);
        return;
      }

      startPolling();
    } catch (err: any) {
      console.error('[WhatsApp Sistema] initiate error:', err);
      setUiStatus('error');
      setErrorMsg('Servidor offline ou erro de conexão.');
    }
  }, [startPolling, setSystemWhatsApp]);

  // --- Auto-start when modal opens ---
  useEffect(() => {
    if (showModal && !didInitRef.current) {
      didInitRef.current = true;
      initiate();
    }
  }, [showModal, initiate]);

  // --- Reset when modal closes ---
  useEffect(() => {
    if (!showModal) {
      stopTimers();
      didInitRef.current = false;
      connectedNotifiedRef.current = false;
      setUiStatus('loading');
      setQrCode(null);
      setErrorMsg(null);
      setCountdown(120);
      setDeviceInfo(null);
    }
  }, [showModal, stopTimers]);

  // --- Cleanup on unmount ---
  useEffect(() => () => stopTimers(), [stopTimers]);

  // --- Manual retry ---
  const handleRetry = useCallback(() => {
    stopTimers();
    didInitRef.current = false;
    setUiStatus('loading');
    setQrCode(null);
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
      await fetch(`${API_BASE}/api/whatsapp/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ clinicId: SYSTEM_CLINIC_ID }),
      });
      stopTimers();
      setUiStatus('disconnected');
      setQrCode(null);
      setDeviceInfo(null);
      didInitRef.current = false;
      setSystemWhatsApp(false, '', '');
      toast('WhatsApp do Sistema desconectado.', 'info');
    } catch (err: any) {
      toast('Erro ao desconectar: ' + err.message, 'error');
    }
  }, [stopTimers, setSystemWhatsApp]);

  const formatCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <>
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                WhatsApp do Sistema
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">GLOBAL</span>
              </h3>
              <p className="text-sm text-slate-500">Usado para funcionalidades globais (recuperação de senha, etc.)</p>
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
            systemWhatsApp.connected ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-700"
          )}>
            {systemWhatsApp.connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {systemWhatsApp.connected ? 'Conectado' : 'Desconectado'}
          </div>
        </div>

        <div className="bg-white/60 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <Shield className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-800">Acesso exclusivo do Super Admin</p>
              <p className="text-xs text-slate-500 mt-1">
                Esta integração é usada pelo SISTEMA para enviar mensagens automáticas como códigos de recuperação de senha.
                Não é compartilhada com nenhuma clínica.
              </p>
            </div>
          </div>
        </div>

        {systemWhatsApp.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <div className="flex-1">
                <p className="font-semibold text-emerald-800">WhatsApp do Sistema Conectado</p>
                <p className="text-xs text-emerald-600">O sistema pode enviar códigos de recuperação de senha.</p>
                {systemWhatsApp.lastSync && (
                  <p className="text-xs text-slate-400 mt-1">
                    Última sincronização: {new Date(systemWhatsApp.lastSync).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="w-full py-3 border-2 border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
            >
              <WifiOff className="w-5 h-5" />
              Desconectar WhatsApp do Sistema
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
          >
            <Smartphone className="w-5 h-5" />
            Conectar WhatsApp do Sistema (QR Code)
          </button>
        )}
      </div>

      {/* Modal de Conexão QR Code */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Globe className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">WhatsApp do Sistema</h2>
                    <p className="text-sm text-white/80">Conexão global para funcionalidades do sistema</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* LOADING */}
              {uiStatus === 'loading' && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Conectando ao WhatsApp...</h3>
                  <p className="text-slate-500 text-sm">Gerando QR Code de autenticação</p>
                </div>
              )}

              {/* ERROR */}
              {uiStatus === 'error' && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Erro de Conexão</h3>
                  <p className="text-slate-500 text-sm mb-4">{errorMsg || 'Não foi possível conectar'}</p>
                  <button onClick={handleRetry} className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Tentar novamente
                  </button>
                  <p className="text-xs text-slate-400 mt-2">Certifique-se de que o backend está rodando na porta 8787</p>
                </div>
              )}

              {/* QR CODE */}
              {uiStatus === 'qr' && qrCode && (
                <div className="text-center">
                  <p className="text-slate-600 mb-4">Escaneie o QR Code com o WhatsApp no seu celular</p>
                  <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 inline-block mb-4">
                    <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 mx-auto" />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-4">
                    <Clock className="w-4 h-4" />
                    <span>Expira em <strong className={countdown <= 30 ? 'text-red-500' : ''}>{formatCountdown(countdown)}</strong></span>
                  </div>
                  <div className="bg-indigo-50 rounded-xl p-3 text-xs text-indigo-700">
                    <p className="font-semibold mb-1">Como conectar:</p>
                    <p>1. Abra o WhatsApp no celular</p>
                    <p>2. Toque em Menu ou Configurações &gt; Aparelhos conectados</p>
                    <p>3. Toque em &quot;Conectar um aparelho&quot;</p>
                    <p>4. Aponte a câmera para este QR Code</p>
                  </div>
                </div>
              )}

              {/* EXPIRED */}
              {uiStatus === 'expired' && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">QR Code Expirado</h3>
                  <p className="text-slate-500 text-sm mb-4">O tempo para escaneamento acabou.</p>
                  <button onClick={handleRetry} className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Gerar novo QR Code
                  </button>
                </div>
              )}

              {/* CONNECTED */}
              {uiStatus === 'connected' && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">WhatsApp do Sistema Conectado!</h3>
                  <p className="text-slate-500 text-sm mb-4">O sistema agora pode enviar códigos de recuperação de senha.</p>
                  {deviceInfo && (
                    <div className="bg-slate-50 rounded-xl p-3 mb-4">
                      <p className="text-xs text-slate-500">
                        <strong>Dispositivo:</strong> {deviceInfo.name} ({deviceInfo.platform})
                      </p>
                    </div>
                  )}
                  <button onClick={() => setShowModal(false)} className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">
                    Fechar
                  </button>
                </div>
              )}

              {/* DISCONNECTED */}
              {uiStatus === 'disconnected' && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <WifiOff className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Desconectado</h3>
                  <p className="text-slate-500 text-sm mb-4">O WhatsApp do Sistema não está conectado.</p>
                  <button onClick={handleRetry} className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2">
                    <Smartphone className="w-4 h-4" /> Conectar novamente
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
