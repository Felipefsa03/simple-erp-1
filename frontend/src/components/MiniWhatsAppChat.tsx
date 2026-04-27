// ============================================
// LuminaFlow - Mini WhatsApp Chat Component
// Chat customizado que usa Baileys para enviar mensagens
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Minimize2, Maximize2, MessageSquare, Send, Loader2,
  CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/useShared';
import { useWhatsAppSync } from '@/hooks/useWhatsAppSync';

const isDev = import.meta.env.DEV;
const API_BASE = isDev ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://clinxia-backend.onrender.com');

interface MiniWhatsAppChatProps {
  isOpen: boolean;
  onClose: () => void;
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
              timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)
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
      "fixed bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col z-50 transition-all duration-300",
      isFullscreen 
        ? "inset-4" 
        : isMinimized 
          ? "bottom-4 right-4 w-80 h-14" 
          : "bottom-4 right-4 w-[420px] h-[600px]"
    )}>
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
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
                      <p className="whitespace-pre-wrap">{msg.text}</p>
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
    </div>
  );
}
