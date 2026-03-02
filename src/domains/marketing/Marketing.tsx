import React from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  Send, 
  Users, 
  Target, 
  Zap,
  ChevronRight,
  Plus,
  BarChart3,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const campaigns = [
  { id: 1, title: 'Retorno Semestral', status: 'active', reach: '124 pacientes', conversion: '12%', type: 'WhatsApp' },
  { id: 2, title: 'Promoção Clareamento', status: 'draft', reach: '450 contatos', conversion: '-', type: 'Email' },
  { id: 3, title: 'Follow-up Pós-Cirúrgico', status: 'active', reach: '15 pacientes', conversion: '100%', type: 'WhatsApp' },
];

export function Marketing() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState('');
  const [automations, setAutomations] = React.useState([
    { title: 'Lembrete de Consulta', desc: 'Envia mensagem 24h antes.', icon: Zap, active: true },
    { title: 'Cobrança Automática', desc: 'IA negocia débitos pendentes.', icon: Target, active: true },
    { title: 'Aniversariantes', desc: 'Mensagem e cupom de desconto.', icon: Sparkles, active: false },
    { title: 'Pesquisa NPS', desc: 'Coleta feedback após consulta.', icon: BarChart3, active: true },
    { title: 'Lembrete de Retorno', desc: 'IA envia e-mail automático após 6 meses.', icon: Users, active: false },
  ]);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const toggleAutomation = (title: string) => {
    setAutomations(prev => prev.map(a => {
      if (a.title === title) {
        const newState = !a.active;
        if (title === 'Lembrete de Retorno' && newState) {
          triggerSuccess('Automação de Lembrete de Retorno via E-mail ativada!');
        } else {
          triggerSuccess(`${title} ${newState ? 'ativado' : 'desativado'}`);
        }
        return { ...a, active: newState };
      }
      return a;
    }));
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
            <Sparkles className="w-5 h-5" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marketing & IA</h1>
          <p className="text-slate-500">Automatize sua comunicação e atraia mais pacientes com inteligência.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 rounded-xl text-sm font-medium text-white hover:bg-cyan-700 transition-colors shadow-sm shadow-cyan-200"
        >
          <Plus className="w-4 h-4" />
          Nova Campanha
        </button>
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
                <h3 className="text-lg font-bold text-slate-900">Nova Campanha IA</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Objetivo</label>
                  <select className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none">
                    <option>Recuperar Pacientes (Churn)</option>
                    <option>Promover Novo Procedimento</option>
                    <option>Lembrete de Retorno</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Canal</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="py-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-200 text-xs">WhatsApp</button>
                    <button className="py-2 bg-slate-50 text-slate-400 font-bold rounded-xl border border-transparent text-xs">E-mail</button>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    triggerSuccess('Campanha gerada e enviada com sucesso!');
                  }}
                  className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-200 mt-4"
                >
                  Gerar e Enviar Campanha
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">Campanhas Ativas</h2>
              <button className="text-sm text-cyan-600 font-bold hover:underline">Ver todas</button>
            </div>
            <div className="space-y-4">
              {campaigns.map((c) => (
                <div key={c.id} className="p-4 bg-slate-50 rounded-2xl flex items-center gap-4 hover:bg-slate-100 transition-colors cursor-pointer group">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    c.type === 'WhatsApp' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                  )}>
                    {c.type === 'WhatsApp' ? <MessageSquare className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
                    <p className="text-xs text-slate-500">{c.reach} • {c.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{c.conversion}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Conversão</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-cyan-500 transition-colors" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Automações Inteligentes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {automations.map((a) => (
                <div key={a.title} className="p-4 border border-slate-100 rounded-2xl hover:border-cyan-200 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                      <a.icon className="w-4 h-4" />
                    </div>
                    <div 
                      onClick={() => toggleAutomation(a.title)}
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-colors cursor-pointer",
                        a.active ? "bg-cyan-500" : "bg-slate-200"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                        a.active ? "right-1" : "left-1"
                      )} />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{a.title}</h3>
                  <p className="text-xs text-slate-500">{a.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl">
            <Sparkles className="w-8 h-8 text-cyan-400 mb-4" />
            <h3 className="font-bold text-lg mb-2">Gerador de Conteúdo IA</h3>
            <p className="text-sm text-slate-400 mb-6">Crie textos persuasivos para WhatsApp e Redes Sociais em segundos.</p>
            <div className="space-y-3">
              <button className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-colors text-left px-4 flex items-center justify-between">
                Campanha de Clareamento
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
              <button className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-colors text-left px-4 flex items-center justify-between">
                Recuperação de Churn
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-500" />
              Público Alvo
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Total de Pacientes</span>
                <span className="font-bold text-slate-900">1.240</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Opt-in WhatsApp</span>
                <span className="font-bold text-emerald-600">85%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
