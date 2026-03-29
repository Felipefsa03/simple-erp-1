// ============================================
// LuminaFlow - WhatsApp Embedded Component
// Mostra MiniChat quando tem paciente, iframe quando não tem
// ============================================

import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import {
  X, Minimize2, Maximize2, MessageSquare, Zap, ExternalLink, AlertCircle, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/useShared';
import { MiniWhatsAppChat } from './MiniWhatsAppChat';

// Proxy handles routing: Vite dev proxy in dev, Vercel rewrites in production
const API_BASE = '';

interface WhatsAppEmbeddedProps {
  isOpen: boolean;
  onClose: () => void;
  patientPhone?: string;
  patientName?: string;
  appointmentId?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  professionalName?: string;
  clinicId?: string;
  autoOpenChat?: boolean;
  onScheduleNew?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  onReschedule?: () => void;
}

// Format phone number to WhatsApp format (+5511987654321)
const formatPhoneForWhatsApp = (phone: string): string => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('55')) return cleaned;
  if (cleaned.length === 11) return '55' + cleaned;
  if (cleaned.length === 10) {
    const ddd = cleaned.substring(0, 2);
    const number = cleaned.substring(2);
    return '55' + ddd + '9' + number;
  }
  return '55' + cleaned;
};

// Componente memoizado para evitar re-renderizações
const WhatsAppEmbedded = memo(function WhatsAppEmbedded({
  isOpen,
  onClose,
  patientPhone = '',
  patientName = '',
  appointmentId = '',
  professionalName = '',
  clinicId = 'clinic-1',
  autoOpenChat = false,
  onScheduleNew,
  onConfirm,
  onCancel,
  onReschedule,
}: WhatsAppEmbeddedProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMiniChat, setShowMiniChat] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleIframeLoad = useCallback(() => {
    setIframeLoading(false);
    setIframeBlocked(false);
  }, []);

  // Detectar se o WhatsApp Web bloqueia o iframe
  const handleIframeError = useCallback(() => {
    // WhatsApp Web bloqueia iframes - mostrar diretamente o MiniChat ou mensagem
    setIframeBlocked(true);
    setIframeLoading(false);
    // Auto-open MiniChat if there's a patient
    if (patientPhone) {
      setShowMiniChat(true);
    }
  }, [patientPhone]);

  // Quando patientPhone muda, mostrar MiniChat
  useEffect(() => {
    if (patientPhone && autoOpenChat) {
      console.log('[WhatsApp] Opening MiniChat for patient:', patientPhone);
      setShowMiniChat(true);
    }
  }, [patientPhone, autoOpenChat]);

  // Reset quando fecha
  useEffect(() => {
    if (!isOpen) {
      setShowMiniChat(false);
      setIframeLoading(true);
      setIframeBlocked(false);
    }
  }, [isOpen]);

  // Abrir MiniChat com paciente
  const openMiniChat = useCallback(() => {
    if (patientPhone) {
      setShowMiniChat(true);
    } else {
      toast('Selecione um paciente primeiro', 'error');
    }
  }, [patientPhone]);

  // Fechar MiniChat e voltar para iframe
  const closeMiniChat = useCallback(() => {
    setShowMiniChat(false);
  }, []);

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col z-50 transition-all duration-300",
      isFullscreen 
        ? "inset-4" 
        : isMinimized 
          ? "bottom-4 right-4 w-80 h-14" 
          : "bottom-4 right-4 w-[1000px] h-[700px]"
    )}>
      {/* Header - SEMPRE VISÍVEL */}
  // WhatsApp Web removed as iframe, focusing on API-based MiniChat
  const renderConnectionPanel = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-6 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
        <MessageSquare className="w-10 h-10 text-green-600" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">Conectividade API</h3>
      <p className="text-sm text-slate-600 mb-8 max-w-xs">
        Selecione um paciente na agenda para iniciar uma conversa via API segura.
      </p>
      
      <div className="space-y-4 w-full max-w-xs">
        <a
          href="https://web.whatsapp.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-white border-2 border-green-500 text-green-600 rounded-xl font-bold hover:bg-green-50 transition-all shadow-sm"
        >
          <ExternalLink className="w-4 h-4" />
          Abrir WhatsApp Web
        </a>
        <p className="text-[10px] text-slate-400">
          Recomendado para uso em aba separada por segurança.
        </p>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col z-50 transition-all duration-300",
      isFullscreen 
        ? "inset-4" 
        : isMinimized 
          ? "bottom-4 right-4 w-80 h-14" 
          : "bottom-4 right-4 w-[450px] h-[650px]"
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
            <h3 className="font-bold whitespace-nowrap">
              {patientName ? `Chat: ${patientName.split(' ')[0]}` : 'WhatsApp API'}
            </h3>
            <p className="text-[10px] text-white/70">Status: Conectado via Render</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={cn(
        "flex-1 relative bg-white",
        isMinimized ? "h-0 overflow-hidden" : ""
      )}>
        {patientPhone ? (
          <div className="absolute inset-0">
            <MiniWhatsAppChat
              isOpen={true}
              onClose={onClose}
              clinicId={clinicId}
              patientPhone={patientPhone}
              patientName={patientName}
              appointmentId={appointmentId}
              onScheduleNew={onScheduleNew}
              onConfirm={onConfirm}
              onCancel={onCancel}
              onReschedule={onReschedule}
            />
          </div>
        ) : renderConnectionPanel()}
      </div>
    </div>
  );
});

export { WhatsAppEmbedded };
