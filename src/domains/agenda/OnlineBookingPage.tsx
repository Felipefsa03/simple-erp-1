import React, { useMemo, useState } from 'react';
import { CalendarCheck2, Clock3, UserCircle2, Stethoscope, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useClinicStore } from '@/stores/clinicStore';
import { toast } from '@/hooks/useShared';

interface OnlineBookingPageProps {
  clinicId?: string;
  onBack: () => void;
}

export function OnlineBookingPage({ clinicId = 'clinic-1', onBack }: OnlineBookingPageProps) {
  const { patients, professionals, services, addPatient, addAppointment, queueAppointmentConfirmation } = useClinicStore();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    service_id: '',
    professional_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const clinicServices = useMemo(
    () => services.filter(item => item.clinic_id === clinicId && item.active),
    [services, clinicId]
  );
  const clinicProfessionals = useMemo(
    () => professionals.filter(item => item.clinic_id === clinicId && item.role !== 'receptionist'),
    [professionals, clinicId]
  );

  const selectedService = clinicServices.find(item => item.id === form.service_id);
  const selectedProfessional = clinicProfessionals.find(item => item.id === form.professional_id);

  const handleSubmit = () => {
    if (!form.name || !form.phone || !form.email || !form.date || !form.time) {
      toast('Preencha todos os campos obrigatórios.', 'error');
      return;
    }
    const existing = patients.find(
      p => p.clinic_id === clinicId && (p.email.toLowerCase() === form.email.toLowerCase() || p.phone === form.phone)
    );
    const patient = existing || addPatient({
      clinic_id: clinicId,
      name: form.name,
      phone: form.phone,
      email: form.email,
      status: 'active',
      tags: ['Agendamento Online'],
      allergies: [],
    });
    const professional = selectedProfessional || clinicProfessionals[0];
    if (!professional) {
      toast('Sem profissionais disponíveis para este agendamento.', 'error');
      return;
    }

    const appointment = addAppointment({
      clinic_id: clinicId,
      patient_id: patient.id,
      patient_name: patient.name,
      professional_id: professional.id,
      professional_name: professional.name,
      service_id: selectedService?.id,
      service_name: selectedService?.name || 'Consulta',
      scheduled_at: `${form.date}T${form.time}:00`,
      duration_min: selectedService?.avg_duration_min || 60,
      status: 'scheduled',
      base_value: selectedService?.base_price || 0,
      notes: form.notes || undefined,
      source: 'online',
    });
    if (!appointment) {
      toast('Horário indisponível. Escolha outro horário.', 'error');
      return;
    }
    queueAppointmentConfirmation(
      appointment.id,
      'whatsapp',
      `Olá ${appointment.patient_name}, recebemos seu agendamento online para ${new Date(appointment.scheduled_at).toLocaleString('pt-BR')}.`
    );
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="mb-4 text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8">
          <h1 className="text-2xl font-bold text-slate-900">Agendamento Online</h1>
          <p className="text-slate-500 mt-1">Preencha os dados para solicitar seu horário.</p>

          {submitted ? (
            <div className="mt-6 p-6 bg-emerald-50 border border-emerald-100 rounded-2xl">
              <p className="font-bold text-emerald-800">Solicitação recebida!</p>
              <p className="text-sm text-emerald-700 mt-1">Nosso time já enviou a confirmação e entrará em contato se houver ajuste de horário.</p>
            </div>
          ) : (
            <div className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm font-medium text-slate-600">
                  Nome completo *
                  <input
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 w-full px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                  />
                </label>
                <label className="text-sm font-medium text-slate-600">
                  Telefone *
                  <input
                    value={form.phone}
                    onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-1 w-full px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                  />
                </label>
              </div>
              <label className="text-sm font-medium text-slate-600 block">
                E-mail *
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 w-full px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                />
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm font-medium text-slate-600">
                  Procedimento
                  <select
                    value={form.service_id}
                    onChange={e => setForm(prev => ({ ...prev, service_id: e.target.value }))}
                    className="mt-1 w-full px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                  >
                    <option value="">Consulta Geral</option>
                    {clinicServices.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-600">
                  Profissional
                  <select
                    value={form.professional_id}
                    onChange={e => setForm(prev => ({ ...prev, professional_id: e.target.value }))}
                    className="mt-1 w-full px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                  >
                    <option value="">Primeiro disponível</option>
                    {clinicProfessionals.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm font-medium text-slate-600">
                  Data *
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                    className="mt-1 w-full px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                  />
                </label>
                <label className="text-sm font-medium text-slate-600">
                  Horário *
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm(prev => ({ ...prev, time: e.target.value }))}
                    className="mt-1 w-full px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                  />
                </label>
              </div>
              <label className="text-sm font-medium text-slate-600 block">
                Observações
                <textarea
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="mt-1 w-full px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none min-h-[90px]"
                />
              </label>
              <button
                onClick={handleSubmit}
                className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700"
              >
                Confirmar Solicitação
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
