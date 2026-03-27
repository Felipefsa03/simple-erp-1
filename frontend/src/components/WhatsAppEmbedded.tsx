// ============================================
// LuminaFlow - WhatsApp Embedded Component
// Mostra MiniChat quando tem paciente, iframe quando não tem
// ============================================

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  X, Minimize2, Maximize2, MessageSquare, Zap, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/useShared';
import { MiniWhatsAppChat } from './MiniWhatsAppChat';

const API_BASE = typeof window !== 'undefined' 
  ? (window as any).__API_BASE__ || `${window.location.protocol}//${window.location.hostname}:8787`
  : 'http://localhost:8787';

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
              {showMiniChat ? `Chat com ${patientName}` : 'WhatsApp Business'}
            </h3>
            {showMiniChat && patientPhone && (
              <p className="text-xs text-white/80 whitespace-nowrap">
                {patientPhone}
              </p>
            )}
            {!showMiniChat && patientName && (
              <p className="text-xs text-white/80 whitespace-nowrap">
                Clique em "Abrir chat" para conversar com {patientName}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Botão para abrir MiniChat quando tem paciente */}
          {patientPhone && !showMiniChat && !isMinimized && (
            <button
              onClick={() => setShowMiniChat(true)}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Abrir chat com {patientName.split(' ')[0]}
            </button>
          )}
          
          {/* Botão para voltar ao WhatsApp quando está no MiniChat */}
          {showMiniChat && !isMinimized && (
            <button
              onClick={() => setShowMiniChat(false)}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Ver WhatsApp Web
            </button>
          )}
          
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
            <ExternalLink className="w-4 h-4" />
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

      {/* Content Area - MiniChat e Iframe */}
      <div className={cn(
        "flex-1 relative transition-all duration-300 bg-white",
        isMinimized ? "h-0 overflow-hidden" : ""
      )}>
        {/* Iframe do WhatsApp Web - fica escondido quando MiniChat está visível */}
        {showMiniChat ? (
          /* MiniChat quando tem paciente selecionado */
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
        ) : (
          /* Iframe do WhatsApp Web quando não tem MiniChat */
          <iframe
            src={`${API_BASE}/api/whatsapp-web-proxy`}
            className="w-full h-full border-0 bg-white"
            title="WhatsApp Web"
            allow="microphone; camera; clipboard-write; display-capture; fullscreen; encrypted-media"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads allow-top-navigation"
          />
        )}
      </div>
    </div>
  );
});

export { WhatsAppEmbedded };
