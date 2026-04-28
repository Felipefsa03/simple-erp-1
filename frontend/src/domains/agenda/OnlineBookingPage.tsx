import React, { useMemo, useState, useEffect } from 'react';
import { CalendarCheck2, Clock3, UserCircle2, Stethoscope, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/useShared';

interface OnlineBookingPageProps {
  clinicId?: string;
  onBack: () => void;
}

export function OnlineBookingPage({ clinicId = 'clinic-1', onBack }: OnlineBookingPageProps) {
  const [loading, setLoading] = useState(true);
  const [clinicName, setClinicName] = useState('');
  const [clinicServices, setServices] = useState<any[]>([]);
  const [clinicProfessionals, setProfessionals] = useState<any[]>([]);
  
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadInfo() {
      try {
        const res = await fetch(`/api/public/clinic/${clinicId}/booking-info`);
        const data = await res.json();
        if (data.ok) {
          setClinicName(data.clinic.name);
          setServices(data.services);
          setProfessionals(data.professionals);
        } else {
          toast(data.error || 'Erro ao carregar informações da clínica', 'error');
        }
      } catch (e) {
        toast('Erro de conexão com o servidor', 'error');
      } finally {
        setLoading(false);
      }
    }
    if (clinicId) loadInfo();
  }, [clinicId]);

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.email || !form.date || !form.time) {
      toast('Preencha todos os campos obrigatórios.', 'error');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/clinic/${clinicId}/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        setSubmitted(true);
        toast('Agendamento solicitado com sucesso!');
      } else {
        toast(data.error || 'Erro ao processar agendamento', 'error');
      }
    } catch (e) {
      toast('Erro ao enviar solicitação', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="mb-4 text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Início
        </button>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8">
          <h1 className="text-2xl font-bold text-slate-900">Agendamento Online</h1>
          <p className="text-slate-500 mt-1">{clinicName || 'Preencha os dados para solicitar seu horário.'}</p>

          {submitted ? (
            <div className="mt-6 p-6 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarCheck2 className="w-8 h-8" />
              </div>
              <p className="font-bold text-emerald-800 text-lg">Solicitação recebida!</p>
              <p className="text-emerald-700 mt-2">
                Seu agendamento foi registrado. Você receberá uma confirmação em breve via WhatsApp ou E-mail.
              </p>
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
                    placeholder="Seu nome completo"
                  />
                </label>
                <label className="text-sm font-medium text-slate-600">
                  Telefone *
                  <input
                    value={form.phone}
                    onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-1 w-full px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                    placeholder="(00) 00000-0000"
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
                  placeholder="seu@email.com"
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
                    <option value="">Selecione um procedimento</option>
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
                  placeholder="Alguma observação importante?"
                />
              </label>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : 'Confirmar Solicitação'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
