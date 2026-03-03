import React, { useMemo, useState } from 'react';
import { TrendingUp, Users, Calendar, Activity, ArrowUpRight, Plus, Zap, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';
import { useClinicStore } from '@/stores/clinicStore';
import { useAuth } from '@/hooks/useAuth';
import { toast, formatCurrency, useSubmitOnce } from '@/hooks/useShared';
import { Modal } from '@/components/shared';

interface DashboardProps {
  onNavigate?: (tab: string, ctx?: any) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const store = useClinicStore();
  const { appointments, patients, transactions, addAppointment, professionals, services } = store;
  const [showQuickBook, setShowQuickBook] = useState(false);
  const [qb, setQb] = useState({ patient_id: '', professional_id: professionals[0]?.id || '', service_id: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00' });

  const monthlyIncome = store.getMonthlyIncome();
  const today = new Date().toISOString().split('T')[0];
  const newPatientsThisMonth = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    return patients.filter(p => p.created_at.startsWith(thisMonth)).length;
  }, [patients]);

  const todayAppointments = useMemo(() =>
    appointments.filter(a => a.scheduled_at.startsWith(today) && a.status !== 'cancelled')
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    [appointments, today]
  );

  const attendanceRate = useMemo(() => {
    const total = appointments.filter(a => a.status === 'done' || a.status === 'no_show').length;
    if (total === 0) return 100;
    const attended = appointments.filter(a => a.status === 'done').length;
    return Math.round((attended / total) * 100);
  }, [appointments]);

  const openTreatments = useMemo(() =>
    appointments.filter(a => a.status === 'in_progress').length,
    [appointments]
  );

  const pendingPayments = useMemo(() =>
    transactions.filter(t => t.type === 'income' && (t.status === 'pending' || t.status === 'awaiting_payment')).reduce((s, t) => s + t.amount, 0),
    [transactions]
  );

  const handleQuickBook = () => {
    if (!qb.patient_id || !qb.professional_id || !qb.date || !qb.time) {
      toast('Preencha todos os campos', 'error'); return;
    }
    const patient = patients.find(p => p.id === qb.patient_id);
    const prof = professionals.find(p => p.id === qb.professional_id);
    const service = services.find(s => s.id === qb.service_id);
    addAppointment({
      clinic_id: user?.clinic_id || 'clinic-1',
      patient_id: qb.patient_id, patient_name: patient?.name || '',
      professional_id: qb.professional_id, professional_name: prof?.name || '',
      service_id: qb.service_id || undefined, service_name: service?.name || 'Consulta',
      scheduled_at: `${qb.date}T${qb.time}:00`, duration_min: service?.avg_duration_min || 60,
      status: 'scheduled', base_value: service?.base_price || 0,
    });
    setShowQuickBook(false);
    toast('Agendamento criado com sucesso!');
  };

  const kpis = [
    { label: 'Receita Mensal', value: formatCurrency(monthlyIncome), icon: TrendingUp, color: 'from-emerald-500 to-emerald-600', change: '+12%' },
    { label: 'Novos Pacientes', value: String(newPatientsThisMonth), icon: Users, color: 'from-blue-500 to-blue-600', change: `${patients.length} total` },
    { label: 'Taxa de Comparecimento', value: `${attendanceRate}%`, icon: Calendar, color: 'from-cyan-500 to-cyan-600', change: `${todayAppointments.length} hoje` },
    { label: 'Em Atendimento', value: String(openTreatments), icon: Activity, color: 'from-amber-500 to-amber-600', change: 'ativos agora' },
  ];

  const insights = useMemo(() => {
    const results: { title: string; desc: string; action: string; tab: string }[] = [];
    if (pendingPayments > 0) results.push({ title: 'Cobranças Pendentes', desc: `${formatCurrency(pendingPayments)} aguardando pagamento`, action: 'Ver no Financeiro', tab: 'financeiro' });
    const lowStock = store.stockItems.filter(i => i.quantity <= i.min_quantity);
    if (lowStock.length > 0) results.push({ title: 'Estoque Baixo', desc: `${lowStock.length} itens precisam de reposição`, action: 'Ver Estoque', tab: 'estoque' });
    const riskPatients = patients.filter(p => p.status === 'risk');
    if (riskPatients.length > 0) results.push({ title: 'Risco de Churn', desc: `${riskPatients.length} pacientes inativos há muito tempo`, action: 'Ver Pacientes', tab: 'pacientes' });
    if (results.length === 0) results.push({ title: 'Tudo em Ordem!', desc: 'Seu sistema está funcionando perfeitamente. Continue assim!', action: 'Ver Agenda', tab: 'agenda' });
    return results;
  }, [pendingPayments, store.stockItems, patients]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Bom dia, {user?.name?.split(' ')[0] || 'Doutor'}! 👋
          </h1>
          <p className="text-slate-500">{format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>
        <button onClick={() => setShowQuickBook(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-sm font-medium text-white shadow-sm shadow-cyan-200 hover:opacity-90">
          <Plus className="w-4 h-4 inline mr-2" />Agendamento Rápido
        </button>
      </header>

      {/* Quick Book Modal */}
      <Modal isOpen={showQuickBook} onClose={() => setShowQuickBook(false)} title="Agendamento Rápido">
        <div className="space-y-4">
          <select value={qb.patient_id} onChange={e => setQb({ ...qb, patient_id: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none">
            <option value="">Selecione paciente...</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={qb.professional_id} onChange={e => setQb({ ...qb, professional_id: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none">
            {professionals.filter(p => p.role !== 'receptionist').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={qb.service_id} onChange={e => setQb({ ...qb, service_id: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none">
            <option value="">Consulta Geral</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.base_price)}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-4">
            <input type="date" value={qb.date} onChange={e => setQb({ ...qb, date: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none" />
            <input type="time" value={qb.time} onChange={e => setQb({ ...qb, time: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none" />
          </div>
          <button onClick={handleQuickBook} className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 shadow-lg shadow-cyan-200">Confirmar</button>
        </div>
      </Modal>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2.5 rounded-xl bg-gradient-to-br text-white", kpi.color)}>
                <kpi.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-400">{kpi.change}</span>
            </div>
            <p className="text-sm text-slate-500 mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-500" />Agenda de Hoje
            </h2>
            <button onClick={() => onNavigate?.('agenda')} className="text-xs text-cyan-600 font-bold hover:underline">Ver Completa</button>
          </div>
          {todayAppointments.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold">Sem agendamentos para hoje</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map((apt, i) => (
                <motion.div key={apt.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => onNavigate?.('agenda')}
                  className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className="flex-shrink-0 text-center w-14">
                    <p className="text-lg font-bold text-slate-900">{format(parseISO(apt.scheduled_at), 'HH:mm')}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{apt.duration_min}min</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{apt.patient_name}</p>
                    <p className="text-xs text-slate-500 truncate">{apt.service_name} • {apt.professional_name}</p>
                  </div>
                  <span className={cn("text-[9px] px-2.5 py-1 rounded-full font-bold",
                    apt.status === 'confirmed' ? "bg-cyan-50 text-cyan-700" :
                      apt.status === 'in_progress' ? "bg-amber-50 text-amber-700" :
                        apt.status === 'done' ? "bg-emerald-50 text-emerald-700" :
                          "bg-blue-50 text-blue-700"
                  )}>
                    {apt.status === 'confirmed' ? 'Confirmado' : apt.status === 'in_progress' ? 'Atendendo' : apt.status === 'done' ? 'Concluído' : 'Agendado'}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl shadow-slate-300/30">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-bold">IA Copilot</h3>
            </div>
            <div className="space-y-4">
              {insights.map((insight, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.15 }}
                  className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <p className="text-sm font-bold">{insight.title}</p>
                  </div>
                  <p className="text-xs text-slate-400 ml-5 mb-2">{insight.desc}</p>
                  <button onClick={() => onNavigate?.(insight.tab)} className="text-[10px] font-bold text-cyan-400 ml-5 hover:underline">{insight.action} →</button>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4">Métricas Rápidas</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Pacientes Totais</span>
                <span className="text-sm font-bold text-slate-900">{patients.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Agendamentos Hoje</span>
                <span className="text-sm font-bold text-slate-900">{todayAppointments.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Pagamentos Pendentes</span>
                <span className="text-sm font-bold text-amber-600">{formatCurrency(pendingPayments)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
