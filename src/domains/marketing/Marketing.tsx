import React, { useState } from 'react';
import { Sparkles, Send, Target, TrendingUp, Users, MessageSquare, Zap, Star, BarChart3, ArrowRight, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { useClinicStore } from '@/stores/clinicStore';
import { toast, formatCurrency } from '@/hooks/useShared';

export function Marketing() {
  const { patients, appointments, transactions } = useClinicStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'insights'>('overview');

  const atRiskPatients = patients.filter(p => p.status === 'risk' || p.status === 'inactive');
  const totalRevenue = transactions.filter(t => t.type === 'income' && t.status === 'paid').reduce((s, t) => s + t.amount, 0);
  const avgTicket = appointments.filter(a => a.status === 'done').length > 0
    ? totalRevenue / appointments.filter(a => a.status === 'done').length : 0;

  const campaigns = [
    { id: 1, name: 'Lembrete de Retorno', status: 'active', sent: 45, opened: 38, converted: 12 },
    { id: 2, name: 'Promoção Limpeza', status: 'draft', sent: 0, opened: 0, converted: 0 },
    { id: 3, name: 'Aniversariantes do Mês', status: 'active', sent: 8, opened: 7, converted: 3 },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-yellow-500" />Marketing & IA
        </h1>
        <p className="text-slate-500">Engajamento inteligente e retenção de pacientes.</p>
      </header>

      <div className="flex bg-white border border-slate-100 rounded-2xl p-1">
        {[
          { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
          { id: 'campaigns', label: 'Campanhas', icon: Send },
          { id: 'insights', label: 'IA Insights', icon: Zap },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all", activeTab === tab.id ? "bg-cyan-50 text-cyan-600" : "text-slate-500 hover:text-slate-900")}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <Target className="w-8 h-8 text-cyan-500 mb-4" />
            <p className="text-sm text-slate-500">Pacientes em Risco</p>
            <p className="text-3xl font-bold text-slate-900">{atRiskPatients.length}</p>
            <p className="text-xs text-amber-600 mt-1">Precisam de atenção</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <TrendingUp className="w-8 h-8 text-emerald-500 mb-4" />
            <p className="text-sm text-slate-500">Ticket Médio</p>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(avgTicket)}</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <Users className="w-8 h-8 text-blue-500 mb-4" />
            <p className="text-sm text-slate-500">Base Total</p>
            <p className="text-3xl font-bold text-slate-900">{patients.length}</p>
            <p className="text-xs text-slate-400 mt-1">{patients.filter(p => p.status === 'active').length} ativos</p>
          </div>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {campaigns.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-4">
              <div className={cn("w-3 h-3 rounded-full", c.status === 'active' ? "bg-emerald-500" : "bg-slate-300")} />
              <div className="flex-1">
                <p className="font-bold text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500">{c.status === 'active' ? 'Ativa' : 'Rascunho'}</p>
              </div>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div><p className="text-lg font-bold text-slate-900">{c.sent}</p><p className="text-[10px] text-slate-400 uppercase font-bold">Enviados</p></div>
                <div><p className="text-lg font-bold text-cyan-600">{c.opened}</p><p className="text-[10px] text-slate-400 uppercase font-bold">Abertos</p></div>
                <div><p className="text-lg font-bold text-emerald-600">{c.converted}</p><p className="text-[10px] text-slate-400 uppercase font-bold">Convertidos</p></div>
              </div>
            </div>
          ))}
          <button onClick={() => toast('Criação de campanhas em breve!', 'info')} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-400 hover:border-cyan-300 hover:text-cyan-500 transition-all">+ Nova Campanha</button>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold">Insights da IA</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: '📊', title: 'Horários de Pico', desc: 'Terças e Quintas às 10h são os horários mais demandados. Considere horários estendidos.' },
              { icon: '🔄', title: 'Retorno de Pacientes', desc: `${atRiskPatients.length} pacientes não retornaram nos últimos 90 dias. Uma campanha de retorno pode recuperar até 30%.` },
              { icon: '💰', title: 'Upselling', desc: 'Pacientes de limpeza têm 45% de chance de aceitar clareamento. Sugira no pós-atendimento.' },
              { icon: '⭐', title: 'Satisfação', desc: 'Implemente NPS após cada consulta para medir a satisfação e identificar promotores.' },
            ].map((insight, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-2xl mb-2">{insight.icon}</p>
                <p className="font-bold mb-1">{insight.title}</p>
                <p className="text-xs text-slate-400">{insight.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
