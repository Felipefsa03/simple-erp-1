// ============================================
// LuminaFlow - WhatsApp Business Connection (Real QR Code)
// Polling-based architecture: call /connect once, then poll /status
// ============================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Smartphone, RefreshCw, CheckCircle2, AlertTriangle,
  X, Loader2, Wifi, Signal, Clock, Shield, Link2
} from 'lucide-react';
import { toast } from '@/hooks/useShared';
import { useClinicStore } from '@/stores/clinicStore';

const API_BASE = 'http://localhost:8787';

interface WhatsAppConnectionProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
  clinicId?: string;
  onStatusChange?: (connected: boolean) => void;
}

type UIStatus = 'loading' | 'qr' | 'connected' | 'error' | 'expired' | 'disconnected';

export function WhatsAppConnectionModal({ isOpen, onClose, onConnect, clinicId = 'clinic-1', onStatusChange }: WhatsAppConnectionProps) {
  const [uiStatus, setUiStatus] = useState<UIStatus>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(120);
  const [deviceInfo, setDeviceInfo] = useState<{ name: string; id: string; platform: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didInitRef = useRef(false);
  const connectedNotifiedRef = useRef(false);

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
          cache: 'no-store'
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
        if (data.status === 'waiting_scan' && data.qrCode) {
          setQrCode(data.qrCode);
          setUiStatus('qr');
          // Only start countdown if not already running
          if (!countdownRef.current) {
            startCountdown();
          }
          return;
        }

        // ERROR from backend
        if (data.status === 'error') {
          stopTimers();
          setUiStatus('error');
          setErrorMsg(data.errorMsg || 'Erro desconhecido no servidor');
          return;
        }

        // LOGGED OUT / NOT CONNECTED
        if (data.status === 'logged_out' || data.status === 'not_connected') {
          // Connection was removed server-side, we need to re-initiate
          stopTimers();
          setUiStatus('disconnected');
          return;
        }

        // CONNECTING / RECONNECTING → keep showing loading
        // (do nothing, let polling continue)

      } catch (err) {
        console.error('[WhatsApp] poll error:', err);
        // Network blip: don't change UI, just retry on next poll
      }
    };

    poll(); // first poll immediately
    pollingRef.current = setInterval(poll, 5000);
  }, [clinicId, stopTimers, startCountdown, onConnect]);

  // --- Initiate connection (fire-and-forget POST + start polling) ---
  const initiate = useCallback(async () => {
    setUiStatus('loading');
    setQrCode(null);
    setErrorMsg(null);
    connectedNotifiedRef.current = false;

    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId }),
      });
      const data = await res.json();

      if (data.ok === false || data.success === false) {
        setUiStatus('error');
        setErrorMsg(data.message || 'Falha ao iniciar conexão');
        return;
      }

      // If backend already has QR ready, show immediately
      if (data.qrCode) {
        setQrCode(data.qrCode);
        setUiStatus('qr');
        startCountdown();
      }

      // If already connected (aceita 'connected' ou 'conectado')
      if (data.status === 'connected' || data.status === 'conectado' || data.status === 'Connected') {
        setUiStatus('connected');
        onConnect();
        if (onStatusChange) onStatusChange(true);
        toast('WhatsApp Business já conectado!', 'success');
        return;
      }

      // Start polling for updates regardless
      startPolling();

    } catch (err: any) {
      console.error('[WhatsApp] initiate error:', err);
      setUiStatus('error');
      setErrorMsg('Não foi possível conectar ao backend. Verifique se está rodando na porta 8787.');
    }
  }, [clinicId, startPolling, startCountdown, onConnect]);

  // --- Auto-start ONCE when modal opens ---
  useEffect(() => {
    if (isOpen && !didInitRef.current) {
      didInitRef.current = true;
      initiate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // --- Reset when modal closes ---
  useEffect(() => {
    if (!isOpen) {
      stopTimers();
      didInitRef.current = false;
      connectedNotifiedRef.current = false;
      setUiStatus('loading');
      setQrCode(null);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId }),
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
  }, [clinicId, stopTimers]);

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
                <p className="text-sm text-white/80">Conectar conta real</p>
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
              <button onClick={handleRetry} className="w-full py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 flex items-center justify-center gap-2">
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
                <span>Expira em {countdown}s</span>
              </div>
              <button onClick={handleRetry} className="flex items-center justify-center gap-2 text-green-600 hover:text-green-700 font-medium mx-auto mb-4">
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

          {/* EXPIRED */}
          {uiStatus === 'expired' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">QR Code Expirado</h3>
              <p className="text-slate-500 text-sm mb-6">O código expirou. Gere um novo para tentar novamente.</p>
              <button onClick={handleRetry} className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 flex items-center gap-2 mx-auto">
                <RefreshCw className="w-4 h-4" /> Gerar Novo QR Code
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
              <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
                Conecte sua conta do WhatsApp Business para enviar mensagens diretamente pelo sistema.
              </p>
              <button onClick={handleRetry} className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 flex items-center gap-2 mx-auto">
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
// Main WhatsApp Integration Component
// ============================================
export function WhatsAppIntegration({ clinicId = 'clinic-1', onStatusChange }: { clinicId?: string, onStatusChange?: (connected: boolean) => void }) {
  const [showModal, setShowModal] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{ name: string; platform: string; lastSync: string } | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Usar o store multi-tenant para status por clínica
  // CORREÇÃO: Usar seletor estável para evitar loop infinito
  const whatsappIntegrations = useClinicStore(s => s.whatsappIntegrations);
  const setWhatsAppConnected = useClinicStore(s => s.setWhatsAppConnected);
  const isConnected = useMemo(() => {
    const status = whatsappIntegrations[clinicId];
    return status?.connected || false;
  }, [whatsappIntegrations, clinicId]);

  // Verifica status inicial e faz polling periódico
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let mounted = true;
    
    const checkStatus = async () => {
      if (!mounted) return;
      try {
        const res = await fetch(`${API_BASE}/api/whatsapp/status/${clinicId}?t=${Date.now()}`, {
          cache: 'no-store'
        });
        const data = await res.json();
        
        const isConnectedStatus = data.status === 'connected' || data.status === 'conectado' || data.status === 'Connected';
        
        if (isConnectedStatus && mounted) {
          setWhatsAppConnected(clinicId, true);
          setDeviceInfo({
            name: data.deviceInfo?.name || data.deviceInfo?.nome || 'WhatsApp Web',
            platform: data.deviceInfo?.platform || data.deviceInfo?.plataforma || 'Web',
            lastSync: new Date().toLocaleString('pt-BR'),
          });
          if (pollInterval) clearInterval(pollInterval);
        }
      } catch (e) {
        // Silenciar erros de rede
      }
      if (mounted) setIsChecking(false);
    };
    
    checkStatus();
    pollInterval = setInterval(checkStatus, 10000);
    
    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [clinicId]);

  const handleConnect = () => {
    setWhatsAppConnected(clinicId, true);
    if (onStatusChange) onStatusChange(true);
    setDeviceInfo({ name: 'WhatsApp Web', platform: 'Navegador', lastSync: new Date().toLocaleString('pt-BR') });
    setShowModal(false);
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/disconnect`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId }),
      });
      const data = await res.json();
      if (data.ok || data.success) { 
        setWhatsAppConnected(clinicId, false);
        if (onStatusChange) onStatusChange(false);
        setDeviceInfo(null); 
        toast('WhatsApp desconectado.', 'info'); 
      }
    } catch (e: any) { toast('Erro ao desconectar.', 'error'); }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        <span className="ml-2 text-slate-500">Verificando conexão...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!isConnected ? (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">WhatsApp Business</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
            Conecte sua conta do WhatsApp Business para enviar mensagens e campanhas diretamente pelo sistema.
          </p>
          <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 flex items-center gap-2 mx-auto">
            <Link2 className="w-5 h-5" /> Conectar WhatsApp
          </button>
          <p className="text-xs text-slate-400 mt-4">QR Code real do WhatsApp Web</p>
        </div>
      ) : (
        <div className="py-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center text-white">
              <Smartphone className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900">WhatsApp Business</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Conectado</span>
              </div>
              {deviceInfo && <p className="text-sm text-slate-500">{deviceInfo.name} • {deviceInfo.platform}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-medium">Última Sincronização</p>
              <p className="text-sm font-bold text-slate-900">{deviceInfo?.lastSync || '-'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-medium">Status</p>
              <p className="text-sm font-bold text-emerald-600">Online</p>
            </div>
          </div>
          <div className="space-y-2">
            <button onClick={() => setShowModal(true)} className="w-full py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" /> Reconectar
            </button>
            <button onClick={handleDisconnect} className="w-full py-2.5 bg-red-50 text-red-600 font-bold rounded-xl text-sm hover:bg-red-100 flex items-center justify-center gap-2">
              <X className="w-4 h-4" /> Desconectar
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
