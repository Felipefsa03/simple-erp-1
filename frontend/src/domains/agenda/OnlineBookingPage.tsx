import React, { useMemo, useState, useEffect } from 'react';
import { CalendarCheck2, Clock3, UserCircle2, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/useShared';

// API Base configuration
const isDev = import.meta.env.DEV;
const API_BASE = isDev ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://clinxia-backend.onrender.com');

interface OnlineBookingPageProps {
  clinicId?: string;
}

export function OnlineBookingPage({ clinicId = 'clinic-1' }: OnlineBookingPageProps) {
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
        console.log(`[Booking] Fetching info from: ${API_BASE}/api/public/clinic/${clinicId}/booking-info`);
        const res = await fetch(`${API_BASE}/api/public/clinic/${clinicId}/booking-info`);
        const data = await res.json();
        if (data.ok) {
          setClinicName(data.clinic.name);
          setServices(data.services);
          setProfessionals(data.professionals);
        } else {
          toast(data.error || 'Erro ao carregar informações da clínica', 'error');
        }
      } catch (e) {
        console.error("[Booking] Error loading info:", e);
        toast('Erro de conexão com o servidor. Por favor, tente novamente mais tarde.', 'error');
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
      const res = await fetch(`${API_BASE}/api/public/clinic/${clinicId}/booking`, {
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
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Carregando formulário...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-cyan-900/5 overflow-hidden">
          <div className="bg-gradient-to-br from-cyan-600 to-cyan-800 p-8 text-white">
             <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                   <CalendarCheck2 className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold">Agendamento Online</h1>
             </div>
             <p className="text-cyan-100 font-medium">{clinicName || 'Solicite seu horário agora.'}</p>
          </div>

          <div className="p-8 md:p-10">
            {submitted ? (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CalendarCheck2 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Solicitação recebida!</h2>
                <p className="text-slate-600 max-w-sm mx-auto">
                  Seu agendamento foi registrado com sucesso. Enviamos uma confirmação para seu contato.
                </p>
                <div className="mt-8 pt-8 border-t border-slate-100">
                   <p className="text-sm text-slate-400">Você já pode fechar esta aba.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Nome completo *</label>
                    <input
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-5 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 ml-1">WhatsApp/Telefone *</label>
                    <input
                      value={form.phone}
                      onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-5 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 ml-1">E-mail *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-5 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                    placeholder="seu@email.com"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Procedimento</label>
                    <div className="relative">
                       <select
                        value={form.service_id}
                        onChange={e => setForm(prev => ({ ...prev, service_id: e.target.value }))}
                        className="w-full px-5 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all appearance-none"
                      >
                        <option value="">Consulta Geral</option>
                        {clinicServices.map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Profissional</label>
                    <select
                      value={form.professional_id}
                      onChange={e => setForm(prev => ({ ...prev, professional_id: e.target.value }))}
                      className="w-full px-5 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all appearance-none"
                    >
                      <option value="">Primeiro disponível</option>
                      {clinicProfessionals.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Data *</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-5 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Horário *</label>
                    <input
                      type="time"
                      value={form.time}
                      onChange={e => setForm(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full px-5 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Observações (opcional)</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-5 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all min-h-[100px] resize-none"
                    placeholder="Conte-nos o motivo da consulta ou alguma necessidade especial."
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-4 bg-cyan-600 text-white font-bold rounded-2xl hover:bg-cyan-700 shadow-lg shadow-cyan-600/20 transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      Processando...
                    </>
                  ) : 'Confirmar Agendamento'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
