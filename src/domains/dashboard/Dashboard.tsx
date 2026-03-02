import React from 'react';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  AlertCircle, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight,
  MessageSquare,
  CheckCircle2,
  Plus,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const kpis = [
  { label: 'Faturamento Mensal', value: 'R$ 42.500', change: '+12.5%', trend: 'up', icon: TrendingUp },
  { label: 'Novos Pacientes', value: '24', change: '+8.2%', trend: 'up', icon: Users },
  { label: 'Taxa de Comparecimento', value: '92%', change: '-2.1%', trend: 'down', icon: CheckCircle2 },
  { label: 'Tratamentos em Aberto', value: '38', change: '+5', trend: 'up', icon: Sparkles, color: 'text-cyan-600' },
];

const aiInsights = [
  {
    id: 1,
    title: '3 pacientes com alto risco de churn',
    description: 'Pacientes que não retornam há mais de 6 meses e tinham tratamentos recorrentes.',
    action: 'Gerar Mensagem de Retenção',
    type: 'warning'
  },
  {
    id: 2,
    title: 'Otimização de Agenda',
    description: 'Identificamos 2 buracos na agenda de amanhã. Sugerimos antecipar pacientes da próxima semana.',
    action: 'Ver Sugestões de Encaixe',
    type: 'info'
  },
  {
    id: 3,
    title: 'Previsão de Receita',
    description: 'Com base nos agendamentos atuais, a receita projetada para este mês é de R$ 58.000.',
    action: 'Ver Detalhes Financeiros',
    type: 'success'
  }
];

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState('');

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleExport = () => {
    triggerSuccess('Relatório consolidado exportado com sucesso!');
    // Simulate download
    const link = document.createElement('a');
    link.href = '#';
    link.download = 'relatorio-dashboard.pdf';
    link.click();
  };

  return (
    <div className="space-y-8 relative">
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Inteligente</h1>
          <p className="text-slate-500">Bem-vindo de volta, Dr. Lucas. Aqui está o resumo da sua clínica.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Exportar Relatório
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-all shadow-sm shadow-cyan-200"
          >
            <Plus className="w-4 h-4 mr-2 inline" />
            Novo Agendamento
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">Novo Agendamento</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-500">Funcionalidade de agendamento rápido via dashboard.</p>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paciente</label>
                    <input type="text" placeholder="Buscar paciente..." className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profissional</label>
                    <select className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none">
                      <option>Dr. Lucas Silva (Dentista)</option>
                      <option>Dra. Julia Paiva (Ortodontista)</option>
                      <option>Mariana Costa (Esteticista)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data</label>
                      <input type="date" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hora</label>
                      <input type="time" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    triggerSuccess('Agendamento confirmado com sucesso!');
                  }}
                  className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-200 mt-4"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={kpi.label}
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-slate-50 rounded-lg">
                <kpi.icon className={cn("w-5 h-5", kpi.color || "text-slate-600")} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                kpi.trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              )}>
                {kpi.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {kpi.change}
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AI Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-cyan-500" />
            <h2 className="text-lg font-semibold text-slate-900">Copiloto LuminaFlow</h2>
          </div>
          <div className="space-y-4">
            {aiInsights.map((insight, i) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + (i * 0.1) }}
                key={insight.id}
                className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4 group hover:border-cyan-200 transition-colors"
              >
                <div className={cn(
                  "p-3 rounded-xl",
                  insight.type === 'warning' ? "bg-amber-50 text-amber-600" :
                  insight.type === 'success' ? "bg-cyan-50 text-cyan-600" :
                  "bg-blue-50 text-blue-600"
                )}>
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">{insight.title}</h3>
                  <p className="text-sm text-slate-500 mb-4 leading-relaxed">{insight.description}</p>
                  <button 
                    onClick={() => {
                      if (insight.type === 'warning') onNavigate?.('pacientes');
                      if (insight.type === 'info') onNavigate?.('agenda');
                      if (insight.type === 'success') onNavigate?.('financeiro');
                    }}
                    className="flex items-center gap-2 text-sm font-semibold text-cyan-600 hover:text-cyan-700 transition-colors"
                  >
                    {insight.action}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Activity / Next Appointments */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-slate-900">Próximos Agendamentos</h2>
            <button 
              onClick={() => onNavigate?.('agenda')}
              className="text-sm text-emerald-600 font-medium hover:underline"
            >
              Ver todos
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {[1, 2, 3, 4].map((_, i) => (
              <div key={i} className={cn(
                "p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors",
                i !== 3 && "border-b border-slate-100"
              )}>
                <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">Ana Paula Souza</p>
                  <p className="text-xs text-slate-500 truncate">Limpeza e Profilaxia</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">14:30</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Hoje</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
