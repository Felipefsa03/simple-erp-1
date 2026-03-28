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

const isDev = import.meta.env.DEV;
const API_BASE = import.meta.env.VITE_API_BASE_URL || (isDev ? 'http://localhost:8787' : '');

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
          <div className="w-full h-full bg-white relative">
            {iframeLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 text-green-500 animate-spin mb-3" />
                <p className="text-sm text-slate-600">Carregando WhatsApp...</p>
              </div>
            )}
            {iframeBlocked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-lg font-bold text-slate-800 text-center mb-2">
                  WhatsApp Web
                </p>
                <p className="text-sm text-slate-600 text-center mb-4">
                  O WhatsApp Web não pode ser carregado neste navegador.
                </p>
                
                {patientPhone ? (
                  <button
                    onClick={() => setShowMiniChat(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-200"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Abrir MiniChat
                  </button>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-slate-500 mb-4">
                      Selecione um paciente na Agenda para enviar mensagens.
                    </p>
                    <a
                      href="https://web.whatsapp.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-200"
                    >
                      <ExternalLink className="w-5 h-5" />
                      Abrir WhatsApp Web
                    </a>
                  </div>
                )}
              </div>
            )}
            <iframe
              ref={iframeRef}
              src="https://web.whatsapp.com"
              className={cn(
                "w-full h-full border-0 bg-white",
                iframeLoading || iframeBlocked ? "hidden" : ""
              )}
              title="WhatsApp Web"
              allow="microphone; camera; clipboard-write; display-capture; fullscreen; encrypted-media"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads allow-top-navigation"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          </div>
        )}
      </div>
    </div>
  );
});

export { WhatsAppEmbedded };
