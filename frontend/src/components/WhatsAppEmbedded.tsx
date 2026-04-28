import React, { useState, useEffect, useCallback, memo } from 'react';
import { X, Minimize2, Maximize2, MessageSquare, Search, Users, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/useShared';
import { MiniWhatsAppChat } from './MiniWhatsAppChat';
import { useClinicStore } from '@/stores/clinicStore';
import { format } from 'date-fns';

const isDev = import.meta.env.DEV;
const API_BASE = isDev ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://clinxia-backend.onrender.com');

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
  const [selectedPatient, setSelectedPatient] = useState<{ phone: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recent' | 'patients'>('recent');
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const patients = useClinicStore(s => s.patients);
  const clinicPatients = patients.filter(p => 
    p.clinic_id === clinicId || 
    p.clinic_id === 'clinic-1' || 
    p.clinic_id === '00000000-0000-0000-0000-000000000001'
  );
  const filteredPatients = clinicPatients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone?.includes(searchQuery)
  );

  useEffect(() => {
    if (!isOpen) {
      setIsMinimized(false);
      setSelectedPatient(null);
      setSearchQuery('');
    } else {
      if (activeTab === 'recent') {
        fetchRecent();
      }
    }
  }, [isOpen]);

  const fetchRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/recent/${clinicId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setRecentChats(data.data || []);
        }
      }
    } catch (e) {
      console.error('[WhatsAppEmbedded] Erro ao buscar conversas recentes:', e);
    }
    setLoadingRecent(false);
  }, [clinicId]);

  useEffect(() => {
    if (isOpen && activeTab === 'recent') {
      fetchRecent();
    }
  }, [activeTab, isOpen, fetchRecent]);

  useEffect(() => {
    if (patientPhone && patientName) {
      setSelectedPatient({ phone: patientPhone, name: patientName });
    }
  }, [patientPhone, patientName]);

  if (!isOpen) return null;

  const handlePatientSelect = (patient: { phone: string; name: string }) => {
    setSelectedPatient(patient);
  };

  const handleBackToList = () => {
    setSelectedPatient(null);
  };

  if (selectedPatient) {
    return (
      <MiniWhatsAppChat
        isOpen={true}
        onClose={onClose}
        onBack={handleBackToList}
        clinicId={clinicId}
        patientPhone={selectedPatient.phone}
        patientName={selectedPatient.name}
        appointmentId={appointmentId}
        onScheduleNew={onScheduleNew}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onReschedule={onReschedule}
      />
    );
  }

  const formatPhoneDisplay = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      if (cleaned.length === 11 && cleaned.startsWith('55')) {
        return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
      }
      return `+${cleaned}`;
    }
    return phone;
  };

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
              {selectedPatient?.name ? `Chat: ${selectedPatient.name.split(' ')[0]}` : 'WhatsApp'}
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
        <div className="absolute inset-0 flex flex-col bg-gradient-to-br from-green-50 to-emerald-50">
          {/* Header da lista & Tabs */}
          <div className="pt-2 border-b border-green-100 bg-white">
            <div className="flex px-4 mb-2">
              <button
                onClick={() => setActiveTab('recent')}
                className={cn(
                  "flex-1 py-2 text-sm font-bold border-b-2 transition-colors",
                  activeTab === 'recent' ? "border-green-600 text-green-700" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                Conversas
              </button>
              <button
                onClick={() => setActiveTab('patients')}
                className={cn(
                  "flex-1 py-2 text-sm font-bold border-b-2 transition-colors",
                  activeTab === 'patients' ? "border-green-600 text-green-700" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                Pacientes
              </button>
            </div>
            
            {/* Busca */}
            {activeTab === 'patients' && (
              <div className="relative px-4 pb-3">
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar paciente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100 transition-all"
                />
              </div>
            )}
          </div>

          {/* Lista Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'recent' ? (
              // Conversas Recentes
              loadingRecent ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-sm text-slate-500">Carregando conversas...</p>
                </div>
              ) : recentChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">Nenhuma conversa recente</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentChats.map((chat) => {
                    const cleanPhone = chat.phone.replace(/\D/g, '');
                    // Tenta achar o paciente que tenha esse telefone ou similar
                    const matchedPatient = patients.find(p => {
                      if (!p.phone) return false;
                      let pPhone = p.phone.replace(/\D/g, '');
                      let cPhone = cleanPhone;
                      
                      // Normalize patient phone (get DDD + last 8 digits)
                      if (pPhone.startsWith('55') && pPhone.length >= 12) {
                        pPhone = pPhone.slice(2, 4) + pPhone.slice(-8);
                      } else if (pPhone.length >= 10) {
                        pPhone = pPhone.slice(0, 2) + pPhone.slice(-8);
                      }
                      
                      // Normalize chat phone (get DDD + last 8 digits)
                      if (cPhone.startsWith('55') && cPhone.length >= 12) {
                        cPhone = cPhone.slice(2, 4) + cPhone.slice(-8);
                      } else if (cPhone.length >= 10) {
                        cPhone = cPhone.slice(0, 2) + cPhone.slice(-8);
                      }
                      
                      return pPhone === cPhone;
                    });
                    
                    const name = matchedPatient ? matchedPatient.name : chat.pushName || formatPhoneDisplay(chat.phone);
                    
                    // Format message text snippet
                    let snippet = chat.message || '';
                    if (chat.media_type) {
                      snippet = `[${chat.media_type === 'image' ? '📷 Foto' : chat.media_type === 'audio' ? '🎵 Áudio' : chat.media_type === 'video' ? '🎥 Vídeo' : 'Mídia'}] ${snippet}`;
                    }
                    
                    return (
                      <button
                        key={chat.id}
                        onClick={() => handlePatientSelect({ phone: chat.phone, name })}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-green-50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 relative">
                          <span className="text-green-700 font-bold text-sm">
                            {name.charAt(0).toUpperCase()}
                          </span>
                          {!chat.from_me && chat.status !== 'read' && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <p className="font-semibold text-slate-800 text-sm truncate">{name}</p>
                            <p className="text-[10px] text-slate-400 flex-shrink-0">
                              {format(new Date(chat.timestamp), 'HH:mm')}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                            {chat.from_me && (
                              <span className={chat.status === 'read' ? 'text-blue-500' : 'text-slate-400'}>
                                {chat.status === 'read' || chat.status === 'delivered' ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                              </span>
                            )}
                            <span className="truncate">{snippet}</span>
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              // Lista de Pacientes
              filteredPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <Users className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">Nenhum paciente encontrado</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredPatients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => handlePatientSelect({ phone: patient.phone || '', name: patient.name })}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-green-50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-green-700 font-bold text-sm">
                          {patient.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{patient.name}</p>
                        <p className="text-xs text-slate-500">{formatPhoneDisplay(patient.phone || '')}</p>
                      </div>
                      <MessageSquare className="w-4 h-4 text-green-500 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export { WhatsAppEmbedded };