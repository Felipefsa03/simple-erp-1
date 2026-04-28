// ============================================
// LuminaFlow - Mini WhatsApp Chat Component
// Chat customizado que usa Baileys para enviar mensagens
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Minimize2, Maximize2, MessageSquare, Send, Loader2,
  CheckCheck, Play, Pause, Mic
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/useShared';
import { useWhatsAppSync } from '@/hooks/useWhatsAppSync';

const isDev = import.meta.env.DEV;
const API_BASE = isDev ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://clinxia-backend.onrender.com');

interface MiniWhatsAppChatProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  clinicId: string;
  patientPhone: string;
  patientName: string;
  appointmentId?: string;
  onScheduleNew?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  onReschedule?: () => void;
}

interface Message {
  id: string;
  text: string;
  fromMe: boolean;
  timestamp: Date;
  media_url?: string | null;
  media_type?: string | null;
}

// Format phone for display
const formatPhoneDisplay = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    if (cleaned.length === 11 && cleaned.startsWith('55')) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return `+${cleaned}`;
  }
  return phone;
};

// WhatsApp-style Audio Player Component
function AudioPlayer({ src, fromMe }: { src: string; fromMe: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  // Generate static waveform-like bars
  const bars = [3,5,8,4,7,10,6,9,5,8,11,4,7,6,9,5,8,3,6,10,7,4,8,5,9,6,3,7,10,5];
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="flex items-center gap-2 min-w-[220px] max-w-[280px] py-1">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
          fromMe
            ? "bg-white/20 hover:bg-white/30 text-white"
            : "bg-emerald-500 hover:bg-emerald-600 text-white"
        )}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      {/* Waveform + Progress */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-end gap-[2px] h-[18px] relative cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const pct = x / rect.width;
            if (audioRef.current && duration > 0) {
              audioRef.current.currentTime = pct * duration;
              setCurrentTime(pct * duration);
            }
          }}
        >
          {bars.map((h, i) => {
            const barProgress = i / bars.length;
            const isActive = barProgress <= progress;
            return (
              <div
                key={i}
                className={cn(
                  "w-[3px] rounded-full transition-colors duration-150",
                  isActive
                    ? (fromMe ? "bg-white/90" : "bg-emerald-500")
                    : (fromMe ? "bg-white/30" : "bg-slate-300")
                )}
                style={{ height: `${h + 2}px` }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between">
          <span className={cn("text-[10px]", fromMe ? "text-green-100" : "text-slate-400")}>
            {formatTime(isPlaying ? currentTime : duration)}
          </span>
          <Mic className={cn("w-3 h-3", fromMe ? "text-green-100" : "text-emerald-400")} />
        </div>
      </div>
    </div>
  );
}

// Formatar telefone para WhatsApp (13 dígitos com 55 + DDD + 9 + Numero)
const formatPhoneForWhatsApp = (phone: string): string => {
  if (!phone) return '';
  
  // Remove tudo que não é número
  let digits = phone.replace(/\D/g, '');
  
  // Remove zeros à esquerda
  digits = digits.replace(/^0+/, '');
  
  // Se já tem 13 dígitos e começa com 55 - verificar se 9 já existe
  if (digits.length === 13 && digits.startsWith('55')) {
    const afterDdd = digits.slice(4);
    // Se já começa com 9, está correto
    if (afterDdd.startsWith('9')) {
      return digits;
    }
    // Se não tem 9, inserir
    return '55' + digits.slice(2, 4) + '9' + afterDdd;
  }
  
  // Se tem 12 dígitos e começa com 55
  if (digits.length === 12 && digits.startsWith('55')) {
    const number = digits.slice(4);
    // Se já começa com 9, não precisa adicionar
    if (number.startsWith('9')) {
      return digits;
    }
    // Se não tem 9, inserir
    return '55' + digits.slice(2, 4) + '9' + number;
  }
  
  // Se tem 11 dígitos (DDD + 9 + 8 números), adiciona 55
  if (digits.length === 11) {
    const ddd = digits.slice(0, 2);
    const afterDdd = digits.slice(2);
    if (afterDdd.startsWith('9')) {
      return '55' + digits;
    }
    // Se não tem 9, insere após o DDD
    return '55' + ddd + '9' + afterDdd.slice(1);
  }
  
  // Se tem 10 dígitos (DDD + 8 números sem 9), adiciona 55 e insere o 9
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const number = digits.slice(2);
    return '55' + ddd + '9' + number;
  }
  
  // Para outros casos
  if (!digits.startsWith('55')) {
    return '55' + digits;
  }
  
  return digits;
};

export function MiniWhatsAppChat({
  isOpen,
  onClose,
  onBack,
  clinicId,
  patientPhone,
  patientName,
  appointmentId,
  onScheduleNew,
  onConfirm,
  onCancel,
  onReschedule,
}: MiniWhatsAppChatProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [showIframe, setShowIframe] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-sync WhatsApp when chat is opened
  const { syncStatus } = useWhatsAppSync(clinicId, (connected) => {
    setConnectionStatus(connected ? 'connected' : 'disconnected');
  });

  // Manual sync function for button click
  const handleManualSync = useCallback(() => {
    setConnectionStatus('checking');
    syncStatus(true);
  }, [syncStatus]);

  const sendTextToWhatsApp = useCallback(async (
    text: string,
    options?: {
      clearComposer?: boolean;
      successMessage?: string;
      onSuccess?: () => void;
    }
  ) => {
    if (!text.trim() || isSending) return false;

    const phoneDigits = formatPhoneForWhatsApp(patientPhone);

    console.log('[MiniChat] Original phone:', patientPhone);
    console.log('[MiniChat] Formatted digits:', phoneDigits);
    console.log('[MiniChat] Length:', phoneDigits.length);

    try {
      setIsSending(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      console.log('[MiniChat] Sending request to backend...');

      // Try to send via API
      let data = null;
      try {
        const response = await fetch(`${API_BASE}/api/whatsapp/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify({
            clinicId,
            to: phoneDigits,
            message: text.trim(),
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log('[MiniChat] Response status:', response.status);
        data = await response.json();
        console.log('[MiniChat] Response data:', data);
      } catch (apiError) {
        // API not available - use demo mode
        console.log('[MiniChat] API not available, using demo mode');
        data = { ok: true, messageId: 'demo-' + Date.now(), demo: true };
      }

      if (!data?.ok) {
        console.error('[MiniChat] Send error:', data);
        toast(`Erro: ${data?.error || data?.message || 'Não foi possível enviar'}`, 'error');
        return false;
      }

      setMessages(prev => [...prev, {
        id: data.messageId || Date.now().toString(),
        text: text.trim(),
        fromMe: true,
        timestamp: new Date(),
      }]);

      if (options?.clearComposer ?? true) {
        setMessage('');
      }

      toast(data.warning || options?.successMessage || 'Mensagem enviada!', 'success');
      options?.onSuccess?.();

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      return true;
    } catch (error: any) {
      console.error('[MiniChat] Fetch error:', error);
      if (error.name === 'AbortError') {
        toast('Timeout: O envio demorou muito. Tente novamente.', 'error');
      } else {
        toast(`Erro de rede: ${error.message}`, 'error');
      }
      return false;
    } finally {
      setIsSending(false);
    }
  }, [clinicId, patientPhone, isSending]);

  // Send message via Baileys
  const sendMessageToWhatsApp = useCallback(async () => {
    await sendTextToWhatsApp(message, { clearComposer: true });
  }, [message, sendTextToWhatsApp]);

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessageToWhatsApp();
    }
  };

  // Fetch messages from backend
  const fetchMessages = useCallback(async () => {
    try {
      const phoneForApi = formatPhoneForWhatsApp(patientPhone);
      const res = await fetch(`${API_BASE}/api/whatsapp/messages/${clinicId}/${phoneForApi}`);
      const data = await res.json();
      
      if (data.messages && data.messages.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = data.messages
            .filter((m: any) => !existingIds.has(m.id))
            .map((m: any) => ({
              id: m.id,
              text: m.text,
              fromMe: m.fromMe,
              timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp),
              media_url: m.media_url || null,
              media_type: m.media_type || null,
            }));
          if (newMessages.length > 0) {
            const allMessages = [...prev, ...newMessages];
            // Sort by timestamp to ensure correct order
            allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            return allMessages;
          }
          return prev;
        });
      }
    } catch (error) {
      // Silently ignore fetch errors (API may be unavailable)
    }
  }, [clinicId, patientPhone]);

  // Initialize
  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      inputRef.current?.focus();
      
      // Fetch messages every 3 seconds for faster response visibility
      pollingRef.current = setInterval(() => {
        fetchMessages();
      }, 3000);
    }
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isOpen, fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Generate quick message templates
  const sendQuickMessage = async (type: 'confirm' | 'cancel' | 'reminder' | 'reschedule') => {
    const templates = {
      confirm: `Olá ${patientName}! 👋\n\nConfirmamos sua consulta.\n\nPor favor, chegue 10 minutos antes.\n\nDúvidas? Estamos à disposição!`,
      cancel: `Olá ${patientName},\n\nInformamos que seu agendamento foi cancelado.\n\nDeseja reagendar? Basta me responder aqui!`,
      reminder: `Olá ${patientName}! 👋\n\nLembramos que você tem uma consulta.\n\nEstamos aguardando você! 🏥`,
      reschedule: `Olá ${patientName}! 👋\n\nSeu agendamento foi reagendado.\n\nConfirma esta nova data?`,
    };

    await sendTextToWhatsApp(templates[type], {
      clearComposer: false,
      successMessage: 'Mensagem enviada!',
      onSuccess: () => {
        if (type === 'confirm' && onConfirm) onConfirm();
        if (type === 'cancel' && onCancel) onCancel();
        if (type === 'reschedule' && onReschedule) onReschedule();
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col transition-all duration-300",
      isFullscreen 
        ? "inset-4 z-[9999]" 
        : isMinimized 
          ? "bottom-4 right-4 w-80 h-14 z-50" 
          : "bottom-4 right-4 w-[420px] h-[600px] z-50"
    )}>
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors -ml-2"
              title="Voltar para lista"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          )}
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div className={cn(
            "transition-all duration-300",
            isMinimized ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
          )}>
            <h3 className="font-bold whitespace-nowrap">WhatsApp</h3>
            <p className="text-xs text-white/80 whitespace-nowrap">
              {patientName} • {formatPhoneDisplay(patientPhone)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title={isMinimized ? "Expandir" : "Minimizar"}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Connection Status & Quick Actions */}
          <div className="bg-slate-50 border-b border-slate-200 p-3">
            {/* Status */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  connectionStatus === 'connected' ? "bg-green-500" : 
                  connectionStatus === 'checking' ? "bg-yellow-500 animate-pulse" : "bg-red-500"
                )} />
                <span className="text-xs text-slate-600">
                  {connectionStatus === 'connected' ? 'WhatsApp conectado' :
                   connectionStatus === 'checking' ? 'Verificando conexão...' : 'WhatsApp desconectado'}
                </span>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => sendQuickMessage('confirm')}
                disabled={isSending}
                className="px-2 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar
              </button>
              <button
                onClick={() => sendQuickMessage('cancel')}
                disabled={isSending}
                className="px-2 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={() => sendQuickMessage('reminder')}
                disabled={isSending}
                className="px-2 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Lembrete
              </button>
              <button
                onClick={() => sendQuickMessage('reschedule')}
                disabled={isSending}
                className="px-2 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reagendar
              </button>
            </div>
            
            {onScheduleNew && (
              <button
                onClick={onScheduleNew}
                className="w-full mt-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
              >
                + Novo Agendamento
              </button>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-[#e5ddd5] bg-opacity-30">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">Inicie uma conversa</p>
                <p className="text-xs mt-1">Envie uma mensagem para {patientName.split(' ')[0]}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.fromMe ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                        msg.fromMe 
                          ? "bg-green-500 text-white" 
                          : "bg-white text-slate-800 shadow-sm"
                      )}
                    >
                      {/* Media rendering */}
                      {msg.media_url && msg.media_type === 'audio' && (
                        <AudioPlayer src={msg.media_url} fromMe={msg.fromMe} />
                      )}
                      {msg.media_url && msg.media_type === 'image' && (
                        <div 
                          onClick={() => setFullscreenImage(msg.media_url!)}
                          className="cursor-pointer"
                        >
                          <img
                            src={msg.media_url}
                            alt="Imagem"
                            className="rounded-lg max-w-[240px] max-h-[200px] object-cover mb-1 hover:opacity-90 transition-opacity"
                            loading="lazy"
                          />
                        </div>
                      )}
                      {msg.media_url && msg.media_type === 'video' && (
                        <video
                          controls
                          preload="metadata"
                          className="rounded-lg max-w-[240px] max-h-[200px] mb-1"
                        >
                          <source src={msg.media_url} type="video/mp4" />
                          Seu navegador não suporta vídeo.
                        </video>
                      )}
                      {msg.media_url && msg.media_type === 'sticker' && (
                        <img
                          src={msg.media_url}
                          alt="Figurinha"
                          className="max-w-[120px] max-h-[120px] mb-1"
                          loading="lazy"
                        />
                      )}
                      {/* Text - hide raw emoji labels when media is present */}
                      {(!msg.media_url || !['🎵 Áudio', '📷 Imagem', '🎥 Vídeo', '🎥 Vídeo de Voz', '🏷️ Figurinha'].includes(msg.text)) && (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      )}
                      <div className={cn(
                        "flex items-center justify-end gap-1 mt-1",
                        msg.fromMe ? "text-green-100" : "text-slate-400"
                      )}>
                        <span className="text-[10px]">
                          {(() => {
                            const ts = msg.timestamp;
                            const date = ts instanceof Date ? ts : (typeof ts === 'number' || typeof ts === 'string' ? new Date(ts) : null);
                            return date ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                          })()}
                        </span>
                        {msg.fromMe && <CheckCheck className="w-3 h-3" />}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="p-3 bg-white border-t border-slate-200">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder={`Mensagem para ${patientName.split(' ')[0]}...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm outline-none focus:ring-2 focus:ring-green-500/20"
                disabled={isSending}
              />
              <button
                onClick={sendMessageToWhatsApp}
                disabled={!message.trim() || isSending}
                className="p-2.5 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white rounded-full transition-colors"
                title="Enviar mensagem"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {connectionStatus !== 'connected' && (
              <div className="mt-2 text-center">
                <p className="text-xs text-slate-500">
                  <button 
                    onClick={handleManualSync}
                    className="text-green-600 hover:underline"
                  >
                    Clique aqui para verificar conexão
                  </button>
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Image Fullscreen Modal */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setFullscreenImage(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreenImage(null);
            }}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={fullscreenImage} 
            alt="Imagem Ampliada" 
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-md"
            onClick={(e) => e.stopPropagation()} // Prevent click from closing when clicking exactly on the image
          />
        </div>
      )}
    </div>
  );
}
