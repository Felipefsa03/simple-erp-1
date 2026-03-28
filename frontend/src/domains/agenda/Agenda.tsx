import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Clock, User,
  X, MapPin, Link2, Repeat, Bell, CalendarPlus, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO, getHours, getMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { useClinicStore } from '@/stores/clinicStore';
import { useAuth } from '@/hooks/useAuth';
import { toast, formatCurrency, useSubmitOnce } from '@/hooks/useShared';
import { Modal, LoadingButton, EmptyState } from '@/components/shared';
import { WhatsAppEmbedded } from '@/components/WhatsAppEmbedded';
import type { Appointment } from '@/types';

interface AgendaProps {
  onNavigate?: (tab: string, ctx?: { patientId?: string; appointmentId?: string }) => void;
}


export function Agenda({ onNavigate }: AgendaProps) {
  const { user, hasPermission } = useAuth();

  // Atomic Selectors for ultra-stability (satisfies getSnapshot requirements)
  const appointments = useClinicStore(s => s.appointments);
  const patients = useClinicStore(s => s.patients);
  const professionals = useClinicStore(s => s.professionals);
  const services = useClinicStore(s => s.services);
  const waitingList = useClinicStore(s => s.waitingList);
  const navigationContext = useClinicStore(s => s.navigationContext);

  // Actions (getState to avoid reactivity on functions)
  const setNavigationContext = useClinicStore.getState().setNavigationContext;
  const clearNavigationContext = useClinicStore.getState().clearNavigationContext;
  const addAppointment = useClinicStore.getState().addAppointment;
  const createRecurringAppointments = useClinicStore.getState().createRecurringAppointments;
  const addToWaitingList = useClinicStore.getState().addToWaitingList;
  const fitWaitingListEntry = useClinicStore.getState().fitWaitingListEntry;
  const queueAppointmentConfirmation = useClinicStore.getState().queueAppointmentConfirmation;
  const startAppointment = useClinicStore.getState().startAppointment;
  const updateAppointmentStatus = useClinicStore.getState().updateAppointmentStatus;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWaitModalOpen, setIsWaitModalOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsappAppointment, setWhatsappAppointment] = useState<Appointment | null>(null);
  const [newApt, setNewApt] = useState({ patient_id: '', professional_id: '', service_id: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00' });
  const [recurrence, setRecurrence] = useState<{ enabled: boolean; frequency: 'weekly' | 'biweekly' | 'monthly'; occurrences: number }>({ enabled: false, frequency: 'weekly', occurrences: 4 });
  const [waitForm, setWaitForm] = useState({
    patient_id: '',
    service_id: '',
    preferred_days: [1, 3, 5] as number[],
    preferred_time_range: 'any' as 'morning' | 'afternoon' | 'evening' | 'any',
    notes: '',
  });
  const swipeStartX = useRef<number | null>(null);
  const clinicId = 'clinic-1';
  const canCreate = hasPermission('create_appointment');
  const canFinalize = hasPermission('finalize_appointment');

  const clinicAppointments = useMemo(
    () => (appointments || []).filter(a => a.clinic_id === clinicId),
    [appointments, clinicId]
  );
  const clinicPatients = useMemo(
    () => (patients || []).filter(p => p.clinic_id === clinicId),
    [patients, clinicId]
  );
  const clinicProfessionals = useMemo(
    () => (professionals || []).filter(p => p.clinic_id === clinicId && p.role !== 'receptionist'),
    [professionals, clinicId]
  );
  const clinicServices = useMemo(
    () => (services || []).filter(s => s.clinic_id === clinicId && s.active),
    [services, clinicId]
  );
  const clinicWaitingList = useMemo(
    () => (waitingList || []).filter(item => item.clinic_id === clinicId && item.status === 'waiting'),
    [waitingList, clinicId]
  );
  const onlineBookingLink = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/#book-online?clinic=${clinicId}`;
  }, [clinicId]);

  useEffect(() => {
    if (!newApt.professional_id && clinicProfessionals.length > 0) {
      setNewApt(prev => ({ ...prev, professional_id: clinicProfessionals[0].id }));
    }
  }, [clinicProfessionals, newApt.professional_id]);

  useEffect(() => {
    if (!navigationContext.patientId && !navigationContext.appointmentId) return;
    if (navigationContext.patientId) {
      setNewApt(prev => ({ ...prev, patient_id: navigationContext.patientId || '' }));
    }
    if (navigationContext.appointmentId) {
      const apt = clinicAppointments.find(a => a.id === navigationContext.appointmentId);
      if (apt) {
        setCurrentDate(new Date(apt.scheduled_at));
        setView('day');
        setSelectedApt(apt);
      }
    }
    clearNavigationContext();
  }, [navigationContext, clinicAppointments, clearNavigationContext]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const handleNavigate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      if (view === 'day') return addDays(prev, direction === 'next' ? 1 : -1);
      if (view === 'week') return addDays(prev, direction === 'next' ? 7 : -7);
      return direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1);
    });
  };

  const getAppointmentsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return clinicAppointments.filter(a => a.scheduled_at.startsWith(dayStr) && a.status !== 'cancelled');
  };

  const { submit: handleAddAppointment, loading: addLoading } = useSubmitOnce(async () => {
    if (!canCreate) {
      toast('Você não tem permissão para criar agendamentos.', 'error');
      return;
    }
    if (!newApt.patient_id || !newApt.professional_id || !newApt.date || !newApt.time) {
      toast('Preencha todos os campos obrigatórios', 'error');
      return;
    }
    const patient = clinicPatients.find(p => p.id === newApt.patient_id);
    const prof = clinicProfessionals.find(p => p.id === newApt.professional_id);
    const service = clinicServices.find(s => s.id === newApt.service_id);

    if (recurrence.enabled) {
      const created = createRecurringAppointments({
        base: {
          clinic_id: clinicId,
          patient_id: newApt.patient_id,
          patient_name: patient?.name || '',
          professional_id: newApt.professional_id,
          professional_name: prof?.name || '',
          service_id: newApt.service_id || undefined,
          service_name: service?.name || 'Consulta',
          duration_min: service?.avg_duration_min || 60,
          status: 'scheduled',
          base_value: service?.base_price || 0,
          source: 'internal',
        },
        startDateTime: `${newApt.date}T${newApt.time}:00`,
        frequency: recurrence.frequency,
        occurrences: recurrence.occurrences,
      });

      if (created.length === 0) {
        toast('Não foi possível criar a recorrência por conflito de horário.', 'error');
        return;
      }

      created.forEach((apt) => {
        queueAppointmentConfirmation(
          apt.id,
          'whatsapp',
          `Oi ${apt.patient_name}, seu retorno de ${apt.service_name || 'consulta'} foi agendado para ${new Date(apt.scheduled_at).toLocaleString('pt-BR')}.`
        );
      });
      toast(`${created.length} sessões recorrentes criadas com sucesso!`);
    } else {
      const created = addAppointment({
        clinic_id: clinicId,
        patient_id: newApt.patient_id,
        patient_name: patient?.name || '',
        professional_id: newApt.professional_id,
        professional_name: prof?.name || '',
        service_id: newApt.service_id || undefined,
        service_name: service?.name || 'Consulta',
        scheduled_at: `${newApt.date}T${newApt.time}:00`,
        duration_min: service?.avg_duration_min || 60,
        status: 'scheduled',
        base_value: service?.base_price || 0,
        source: 'internal',
      });

      if (!created) {
        toast('Conflito de horário para este profissional.', 'error');
        return;
      }

      queueAppointmentConfirmation(
        created.id,
        'whatsapp',
        `Oi ${created.patient_name}, seu agendamento de ${created.service_name || 'consulta'} foi confirmado para ${new Date(created.scheduled_at).toLocaleString('pt-BR')}.`
      );
      toast('Agendamento criado com sucesso!');
    }

    setIsModalOpen(false);
    setRecurrence({ enabled: false, frequency: 'weekly', occurrences: 4 });
    setNewApt({ patient_id: '', professional_id: clinicProfessionals[0]?.id || '', service_id: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00' });
  });

  const handleStartAppointment = (apt: Appointment) => {
    if (!canFinalize) {
      toast('Você não tem permissão para iniciar atendimentos.', 'error');
      return;
    }
    startAppointment(apt.id);
    toast(`Atendimento de ${apt.patient_name} iniciado!`);
    onNavigate?.('prontuarios', { patientId: apt.patient_id, appointmentId: apt.id });
  };

  const handleCopyOnlineLink = async () => {
    if (!onlineBookingLink) return;
    try {
      await navigator.clipboard.writeText(onlineBookingLink);
      toast('Link de agendamento online copiado!');
    } catch {
      toast('Não foi possível copiar o link.', 'error');
    }
  };

  const handleOpenWhatsApp = (apt: Appointment) => {
    // Se o WhatsApp já está aberto, apenas atualiza o paciente
    if (isWhatsAppOpen) {
      setWhatsappAppointment(apt);
    } else {
      // Se não está aberto, abre normalmente
      setWhatsappAppointment(apt);
      setIsWhatsAppOpen(true);
    }
  };

  const handleAddToWaitingList = () => {
    if (!waitForm.patient_id) {
      toast('Selecione um paciente para a fila de espera.', 'error');
      return;
    }
    const patient = clinicPatients.find(p => p.id === waitForm.patient_id);
    const service = clinicServices.find(s => s.id === waitForm.service_id);
    if (!patient) return;
    addToWaitingList({
      clinic_id: clinicId,
      patient_id: patient.id,
      patient_name: patient.name,
      service_id: service?.id,
      service_name: service?.name,
      preferred_days: waitForm.preferred_days,
      preferred_time_range: waitForm.preferred_time_range,
      channels: ['whatsapp', 'email'],
      notes: waitForm.notes || undefined,
    });
    setWaitForm({
      patient_id: '',
      service_id: '',
      preferred_days: [1, 3, 5],
      preferred_time_range: 'any',
      notes: '',
    });
    setIsWaitModalOpen(false);
    toast('Paciente adicionado na fila de espera.');
  };

  const openGoogleCalendar = (apt: Appointment) => {
    const date = new Date(apt.scheduled_at);
    const end = new Date(date.getTime() + (apt.duration_min || 60) * 60000);
    const fmt = (value: Date) => value.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${apt.service_name || 'Consulta'} - ${apt.patient_name}`,
      dates: `${fmt(date)}/${fmt(end)}`,
      details: `Profissional: ${apt.professional_name}`,
    });
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
  };

  const handlePointerDown = (e: React.PointerEvent) => {

    swipeStartX.current = e.clientX;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (swipeStartX.current === null) return;
    const delta = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(delta) < 60) return;
    handleNavigate(delta < 0 ? 'next' : 'prev');
  };

  const statusColors: Record<string, { bg: string; border: string; text: string }> = {
    scheduled: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700' },
    confirmed: { bg: 'bg-cyan-50', border: 'border-cyan-500', text: 'text-cyan-700' },
    in_progress: { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-700' },
    done: { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700' },
    no_show: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700' },
  };

  const statusLabels: Record<string, string> = {
    scheduled: 'Agendado',
    confirmed: 'Confirmado',
    in_progress: 'Em Atendimento',
    done: 'Concluído',
    no_show: 'Faltou',
    cancelled: 'Cancelado',
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 8);

  const renderAppointmentCard = (apt: Appointment, compact = false) => {
    const colors = statusColors[apt.status] || statusColors.scheduled;
    return (
      <div
        key={apt.id}
        onClick={() => setSelectedApt(apt)}
        className={cn(
          "rounded-lg p-2 shadow-sm cursor-pointer transition-all hover:shadow-md border-l-4 overflow-hidden",
          colors.bg, colors.border
        )}
      >
        <p className={cn("text-[10px] font-bold truncate", colors.text)}>{apt.patient_name.toUpperCase()}</p>
        <p className={cn("text-[9px] truncate", colors.text.replace('700', '600'))}>{apt.service_name}</p>
        {!compact && (
          <div className="flex items-center gap-1 mt-1">
            <Clock className="w-2 h-2 text-slate-400" />
            <span className="text-[8px] text-slate-500 font-bold">{format(parseISO(apt.scheduled_at), 'HH:mm')}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda</h1>
          <p className="text-slate-500">Organize seus atendimentos e otimize seu tempo.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={handleCopyOnlineLink}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Link2 className="w-4 h-4" />
            Link Agendamento Online
          </button>
          <button
            onClick={() => setIsWaitModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Bell className="w-4 h-4" />
            Fila de Espera ({clinicWaitingList.length})
          </button>
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 justify-center">
            {(['day', 'week', 'month'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  view === v ? "bg-cyan-50 text-cyan-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={!canCreate}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-all shadow-sm shadow-cyan-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </button>
        </div>
      </header>

      {/* New Appointment Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Agendamento">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paciente *</label>
            <select
              value={newApt.patient_id}
              onChange={e => setNewApt({ ...newApt, patient_id: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none"
            >
              <option value="">Selecione o paciente...</option>
              {clinicPatients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profissional *</label>
            <select
              value={newApt.professional_id}
              onChange={e => setNewApt({ ...newApt, professional_id: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none"
            >
              {clinicProfessionals.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.role === 'dentist' ? 'Dentista' : 'Esteticista'})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Procedimento</label>
            <select
              value={newApt.service_id}
              onChange={e => setNewApt({ ...newApt, service_id: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none"
            >
              <option value="">Consulta Geral</option>
              {clinicServices.map(s => (
                <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.base_price)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data *</label>
              <input
                type="date"
                value={newApt.date}
                onChange={e => setNewApt({ ...newApt, date: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Horário *</label>
              <input
                type="time"
                value={newApt.time}
                onChange={e => setNewApt({ ...newApt, time: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none"
              />
            </div>
          </div>
          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={recurrence.enabled}
                onChange={e => setRecurrence(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              <Repeat className="w-4 h-4 text-cyan-600" />
              Agendamento recorrente
            </label>
            {recurrence.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={recurrence.frequency}
                  onChange={e => setRecurrence(prev => ({ ...prev, frequency: e.target.value as 'weekly' | 'biweekly' | 'monthly' }))}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                >
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quinzenal</option>
                  <option value="monthly">Mensal</option>
                </select>
                <input
                  type="number"
                  min={2}
                  max={48}
                  value={recurrence.occurrences}
                  onChange={e => setRecurrence(prev => ({ ...prev, occurrences: Number(e.target.value || 1) }))}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                  placeholder="Qtd. de sessões"
                />
              </div>
            )}
          </div>
          <LoadingButton
            onClick={handleAddAppointment}
            loading={addLoading}
            disabled={!canCreate}
            className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-200 mt-4"
          >
            Confirmar Agendamento
          </LoadingButton>
        </div>
      </Modal>

      <Modal isOpen={isWaitModalOpen} onClose={() => setIsWaitModalOpen(false)} title="Fila de Espera">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paciente *</label>
            <select
              value={waitForm.patient_id}
              onChange={e => setWaitForm(prev => ({ ...prev, patient_id: e.target.value }))}
              className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none"
            >
              <option value="">Selecione o paciente...</option>
              {clinicPatients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Procedimento desejado</label>
            <select
              value={waitForm.service_id}
              onChange={e => setWaitForm(prev => ({ ...prev, service_id: e.target.value }))}
              className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none"
            >
              <option value="">Consulta Geral</option>
              {clinicServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Turno preferido</label>
            <select
              value={waitForm.preferred_time_range}
              onChange={e => setWaitForm(prev => ({ ...prev, preferred_time_range: e.target.value as 'morning' | 'afternoon' | 'evening' | 'any' }))}
              className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none"
            >
              <option value="any">Qualquer horário</option>
              <option value="morning">Manhã</option>
              <option value="afternoon">Tarde</option>
              <option value="evening">Noite</option>
            </select>
          </div>
          <textarea
            value={waitForm.notes}
            onChange={e => setWaitForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Observacoes adicionais..."
            className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none min-h-[80px]"
          />
          <button
            onClick={handleAddToWaitingList}
            className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700"
          >
            Adicionar na fila
          </button>

          {clinicWaitingList.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pendentes</p>
              {clinicWaitingList.slice(0, 6).map(item => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-sm font-bold text-slate-800">{item.patient_name}</p>
                  <p className="text-xs text-slate-500">{item.service_name || 'Consulta'} • {item.preferred_time_range}</p>
                  <button
                    onClick={() => {
                      const fit = fitWaitingListEntry(item.id, `${format(new Date(), 'yyyy-MM-dd')}T18:00:00`);
                      if (fit) toast('Paciente encaixado com sucesso!');
                      else toast('Não foi possível encaixar agora.', 'warning');
                    }}
                    className="mt-2 text-xs font-bold text-cyan-700 hover:underline"
                  >
                    Encaixar hoje 18:00
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Selected Appointment Detail */}
      <Modal isOpen={!!selectedApt} onClose={() => setSelectedApt(null)} title="Detalhes do Agendamento">
        {selectedApt && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
                {selectedApt.patient_name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{selectedApt.patient_name}</h4>
                <p className="text-xs text-slate-500">{selectedApt.service_name} • {selectedApt.professional_name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Horário</p>
                <p className="text-sm font-bold text-slate-900">{format(parseISO(selectedApt.scheduled_at), 'HH:mm')}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Valor</p>
                <p className="text-sm font-bold text-slate-900">{formatCurrency(selectedApt.base_value)}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Duração</p>
                <p className="text-sm font-bold text-slate-900">{selectedApt.duration_min} min</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                <p className={cn("text-sm font-bold", statusColors[selectedApt.status]?.text || 'text-slate-900')}>
                  {statusLabels[selectedApt.status]}
                </p>
              </div>
            </div>
            <button
              onClick={() => openGoogleCalendar(selectedApt)}
              className="w-full py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              <CalendarPlus className="w-4 h-4" />
              Enviar para Google Calendar
            </button>
            <button
              onClick={() => handleOpenWhatsApp(selectedApt)}
              className="w-full py-2.5 bg-green-50 text-green-700 font-bold rounded-xl text-sm hover:bg-green-100 transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Abrir WhatsApp com {selectedApt.patient_name.split(' ')[0]}
            </button>
            <div className="flex gap-2">
              {(selectedApt.status === 'scheduled' || selectedApt.status === 'confirmed') && (
                <>
                  <button
                    onClick={() => { updateAppointmentStatus(selectedApt.id, 'confirmed'); setSelectedApt({ ...selectedApt, status: 'confirmed' }); toast('Agendamento confirmado!'); }}
                    disabled={!canCreate}
                    className="flex-1 py-2.5 bg-cyan-50 text-cyan-600 font-bold rounded-xl text-sm hover:bg-cyan-100 transition-all"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => { handleStartAppointment(selectedApt); setSelectedApt(null); }}
                    disabled={!canFinalize}
                    className="flex-1 py-2.5 bg-cyan-600 text-white font-bold rounded-xl text-sm hover:bg-cyan-700 transition-all"
                  >
                    Iniciar Atendimento
                  </button>
                </>
              )}
              {selectedApt.status === 'in_progress' && (
                <button
                  onClick={() => { onNavigate?.('prontuarios', { patientId: selectedApt.patient_id, appointmentId: selectedApt.id }); setSelectedApt(null); }}
                  className="flex-1 py-2.5 bg-amber-600 text-white font-bold rounded-xl text-sm hover:bg-amber-700 transition-all"
                >
                  Continuar Atendimento
                </button>
              )}
              {selectedApt.status === 'done' && (
                <div className="flex w-full gap-2">
                  <button
                    onClick={() => { onNavigate?.('prontuarios', { patientId: selectedApt.patient_id, appointmentId: selectedApt.id }); setSelectedApt(null); }}
                    className="flex-1 py-2.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl text-sm hover:bg-emerald-100 transition-all"
                  >
                    Ver Prontuário
                  </button>
                  <button
                    onClick={() => { setNavigationContext({ appointmentId: selectedApt.id, fromModule: 'agenda' }); onNavigate?.('financeiro', { appointmentId: selectedApt.id }); setSelectedApt(null); }}
                    className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 transition-all"
                  >
                    Ver no Financeiro
                  </button>
                </div>
              )}
              {['scheduled', 'confirmed'].includes(selectedApt.status) && (
                <button
                  onClick={() => { updateAppointmentStatus(selectedApt.id, 'no_show'); setSelectedApt(null); toast('Paciente marcado como falta', 'warning'); }}
                  disabled={!canCreate}
                  className="py-2.5 px-4 bg-red-50 text-red-600 font-bold rounded-xl text-sm hover:bg-red-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Faltou
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Date Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <h2 className="text-lg font-bold text-slate-900 capitalize">
            {view === 'day' ? format(currentDate, "dd 'de' MMMM yyyy", { locale: ptBR }) : format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={() => handleNavigate('prev')} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-900">HOJE</button>
            <button onClick={() => handleNavigate('next')} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {Object.entries(statusLabels).filter(([k]) => k !== 'cancelled').map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", statusColors[key]?.border.replace('border', 'bg') || 'bg-slate-300')} />
              <span className="text-xs text-slate-500 font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div
        className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => { swipeStartX.current = null; }}
        onPointerCancel={() => { swipeStartX.current = null; }}
        style={{ touchAction: 'pan-y' }}
      >
        {view === 'month' ? (
          <>
            <div className="grid grid-cols-7 border-b border-slate-100">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                <div key={d} className="p-3 text-center border-r border-slate-100 last:border-r-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d}</p>
                </div>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-7">
                {/* Padding for start of month */}
                {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
                  <div key={`pad-${i}`} className="min-h-[100px] p-2 border-r border-b border-slate-50 bg-slate-50/30" />
                ))}
                {eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map((day) => {
                  const dayApts = getAppointmentsForDay(day);
                  return (
                    <div
                      key={day.toString()}
                      onClick={() => { setCurrentDate(day); setView('day'); }}
                      className={cn(
                        "min-h-[100px] p-2 border-r border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer",
                        isSameDay(day, new Date()) && "bg-cyan-50/20"
                      )}
                    >
                      <p className={cn("text-xs font-bold mb-2", isSameDay(day, new Date()) ? "text-cyan-600" : "text-slate-900")}>
                        {format(day, 'd')}
                      </p>
                      {dayApts.slice(0, 2).map(apt => (
                        <div key={apt.id} className={cn("text-[8px] p-1 rounded mb-1 truncate font-bold text-white", statusColors[apt.status]?.border.replace('border', 'bg') || 'bg-cyan-500')}>
                          {format(parseISO(apt.scheduled_at), 'HH:mm')} {apt.patient_name.split(' ')[0]}
                        </div>
                      ))}
                      {dayApts.length > 2 && (
                        <div className="text-[8px] text-slate-400 font-bold">+{dayApts.length - 2} mais</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : view === 'day' ? (
          <>
            <div className="border-b border-slate-100 p-4 text-center bg-cyan-50/30">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                {format(currentDate, 'eeee', { locale: ptBR })}
              </p>
              <p className="text-lg font-bold text-cyan-600">{format(currentDate, 'dd')}</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {hours.map(hour => {
                const hourApts = getAppointmentsForDay(currentDate).filter(a => getHours(parseISO(a.scheduled_at)) === hour);
                return (
                  <div key={hour} className="flex border-b border-slate-50 min-h-[80px]">
                    <div className="w-20 p-4 border-r border-slate-100 text-right flex-shrink-0">
                      <span className="text-xs font-bold text-slate-400">{hour}:00</span>
                    </div>
                    <div className="flex-1 p-2 space-y-1">
                      {hourApts.map(apt => renderAppointmentCard(apt))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-8 border-b border-slate-100">
              <div className="p-4 border-r border-slate-100" />
              {weekDays.map((day) => (
                <div key={day.toString()} className={cn("p-4 text-center border-r border-slate-100 last:border-r-0", isSameDay(day, new Date()) && "bg-cyan-50/30")}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{format(day, 'eee', { locale: ptBR })}</p>
                  <p className={cn("text-lg font-bold", isSameDay(day, new Date()) ? "text-cyan-600" : "text-slate-900")}>{format(day, 'dd')}</p>
                </div>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {hours.map(hour => (
                <div key={hour} className="grid grid-cols-8 border-b border-slate-50">
                  <div className="p-4 border-r border-slate-100 text-right">
                    <span className="text-xs font-bold text-slate-400">{hour}:00</span>
                  </div>
                  {weekDays.map(day => {
                    const hourApts = getAppointmentsForDay(day).filter(a => getHours(parseISO(a.scheduled_at)) === hour);
                    return (
                      <div key={day.toString()} className={cn("border-r border-slate-100 min-h-[80px] p-1 hover:bg-slate-50/50 transition-colors cursor-pointer space-y-1", isSameDay(day, new Date()) && "bg-cyan-50/10")}>
                        {hourApts.map(apt => renderAppointmentCard(apt, true))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* WhatsApp Embedded Component */}
      <WhatsAppEmbedded
        isOpen={isWhatsAppOpen}
        onClose={() => {
          setIsWhatsAppOpen(false);
          setWhatsappAppointment(null);
        }}
        patientPhone={whatsappAppointment ? clinicPatients.find(p => p.id === whatsappAppointment.patient_id)?.phone || '' : ''}
        patientName={whatsappAppointment?.patient_name || ''}
        appointmentId={whatsappAppointment?.id}
        appointmentDate={whatsappAppointment ? format(parseISO(whatsappAppointment.scheduled_at), 'dd/MM/yyyy') : ''}
        appointmentTime={whatsappAppointment ? format(parseISO(whatsappAppointment.scheduled_at), 'HH:mm') : ''}
        professionalName={whatsappAppointment?.professional_name || ''}
        clinicId={clinicId}
        autoOpenChat={true}
        onScheduleNew={() => {
          // Minimiza WhatsApp em vez de fechar
          setIsModalOpen(true);
          if (whatsappAppointment) {
            setNewApt(prev => ({
              ...prev,
              patient_id: whatsappAppointment.patient_id,
              professional_id: whatsappAppointment.professional_id,
              service_id: whatsappAppointment.service_id || '',
            }));
          }
        }}
        onConfirm={() => {
          if (whatsappAppointment) {
            updateAppointmentStatus(whatsappAppointment.id, 'confirmed');
            if (selectedApt?.id === whatsappAppointment.id) {
              setSelectedApt({ ...selectedApt, status: 'confirmed' });
            }
            toast('Agendamento confirmado via WhatsApp!');
          }
        }}
        onCancel={() => {
          if (whatsappAppointment) {
            updateAppointmentStatus(whatsappAppointment.id, 'cancelled');
            if (selectedApt?.id === whatsappAppointment.id) {
              setSelectedApt({ ...selectedApt, status: 'cancelled' });
            }
            toast('Agendamento cancelado via WhatsApp!', 'warning');
          }
        }}
        onReschedule={() => {
          // Minimiza WhatsApp em vez de fechar
          setIsModalOpen(true);
          if (whatsappAppointment) {
            setNewApt(prev => ({
              ...prev,
              patient_id: whatsappAppointment.patient_id,
              professional_id: whatsappAppointment.professional_id,
              service_id: whatsappAppointment.service_id || '',
            }));
          }
        }}
      />

      {/* Floating WhatsApp Button */}
      {!isWhatsAppOpen && (
        <button
          onClick={() => {
            if (selectedApt) {
              handleOpenWhatsApp(selectedApt);
            } else {
              setIsWhatsAppOpen(true);
              setWhatsappAppointment(null);
            }
          }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-all flex items-center justify-center z-40 hover:scale-110"
          title={selectedApt ? `WhatsApp com ${selectedApt.patient_name.split(' ')[0]}` : 'Abrir WhatsApp'}
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
