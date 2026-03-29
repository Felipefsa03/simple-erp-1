// ============================================
// LuminaFlow - WhatsApp Embedded Component
// ============================================

import React, { useState, useEffect, useCallback, memo } from 'react';
import { X, Minimize2, Maximize2, MessageSquare, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/useShared';
import { MiniWhatsAppChat } from './MiniWhatsAppChat';

interface WhatsAppEmbeddedProps {
  isOpen: boolean;
  onClose: () => void;
  patientPhone?: string;
  patientName?: string;
  appointmentId?: string;
  clinicId?: string;
  autoOpenChat?: boolean;
  onScheduleNew?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  onReschedule?: () => void;
}

const WhatsAppEmbedded = memo(function WhatsAppEmbedded({
  isOpen,
  onClose,
  patientPhone = '',
  patientName = '',
  appointmentId = '',
  clinicId = 'clinic-1',
  onScheduleNew,
  onConfirm,
  onCancel,
  onReschedule,
}: WhatsAppEmbeddedProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsMinimized(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col z-50 transition-all duration-300",
      isMinimized 
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
            <p className="text-[10px] text-white/70">Status: Conectado</p>
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

      {/* Content */}
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
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-6 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <MessageSquare className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Selecione um Paciente</h3>
            <p className="text-sm text-slate-600 mb-6 max-w-xs">
              Escolha um paciente na agenda para iniciar uma conversa.
            </p>
            <a
              href="https://web.whatsapp.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-white border-2 border-green-500 text-green-600 rounded-xl font-bold hover:bg-green-50 transition-all shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir WhatsApp Web
            </a>
          </div>
        )}
      </div>
    </div>
  );
});

export { WhatsAppEmbedded };
