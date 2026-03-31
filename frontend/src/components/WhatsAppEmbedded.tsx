import React, { useState, useEffect, useCallback, memo } from 'react';
import { X, Minimize2, Maximize2, MessageSquare, Search, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/useShared';
import { MiniWhatsAppChat } from './MiniWhatsAppChat';
import { useClinicStore } from '@/stores/clinicStore';

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
    }
  }, [isOpen]);

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
        {selectedPatient ? (
          <div className="absolute inset-0">
            <MiniWhatsAppChat
              isOpen={true}
              onClose={onClose}
              clinicId={'clinic-1'}
              patientPhone={selectedPatient.phone}
              patientName={selectedPatient.name}
              appointmentId={appointmentId}
              onScheduleNew={onScheduleNew}
              onConfirm={onConfirm}
              onCancel={onCancel}
              onReschedule={onReschedule}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col bg-gradient-to-br from-green-50 to-emerald-50">
            {/* Header da lista */}
            <div className="p-4 border-b border-green-100 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-slate-800">Pacientes</h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {filteredPatients.length}
                </span>
              </div>
              
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar paciente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100 transition-all"
                />
              </div>
            </div>

            {/* Lista de pacientes */}
            <div className="flex-1 overflow-y-auto">
              {filteredPatients.length === 0 ? (
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export { WhatsAppEmbedded };