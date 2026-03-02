import React from 'react';
import { 
  Settings, 
  User, 
  Shield, 
  Building2, 
  Bell, 
  CreditCard, 
  Database,
  ChevronRight,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const tabs = [
  { id: 'clinica', label: 'Clínica', icon: Building2 },
  { id: 'usuarios', label: 'Usuários', icon: User },
  { id: 'permissoes', label: 'Permissões', icon: Shield },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'assinatura', label: 'Assinatura', icon: CreditCard },
];

export function Configuracoes() {
  const [activeSubTab, setActiveSubTab] = React.useState('clinica');
  const [selectedUser, setSelectedUser] = React.useState<any>(null);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState('');
  const [notificacoes, setNotificacoes] = React.useState([
    { id: 1, title: 'Lembretes de Agenda', desc: 'Notificar profissionais sobre novos agendamentos.', active: true, category: 'Profissional' },
    { id: 2, title: 'Alertas Financeiros', desc: 'Notificar sobre pagamentos pendentes ou atrasados.', active: false, category: 'Profissional' },
    { id: 3, title: 'Confirmação Automática', desc: 'Envia mensagem 24h antes da consulta.', active: true, category: 'Paciente' },
    { id: 4, title: 'Pós-Consulta', desc: 'Coleta feedback e envia orientações.', active: true, category: 'Paciente' },
  ]);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const toggleNotificacao = (id: number) => {
    setNotificacoes(prev => prev.map(n => {
      if (n.id === id) {
        const newState = !n.active;
        triggerSuccess(`${n.title} ${newState ? 'ativado' : 'desativado'}`);
        return { ...n, active: newState };
      }
      return n;
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
            <Save className="w-5 h-5" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500">Gerencie as preferências da sua clínica e equipe.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all",
                activeSubTab === tab.id 
                  ? "bg-cyan-50 text-cyan-600 shadow-sm" 
                  : "text-slate-500 hover:bg-white hover:text-slate-900"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3">
          <motion.div 
            key={activeSubTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-8"
          >
            {activeSubTab === 'clinica' && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">Dados da Clínica</h2>
                  <button 
                    onClick={() => triggerSuccess('Alterações da clínica salvas com sucesso!')}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white text-sm font-bold rounded-xl hover:bg-cyan-700 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome Fantasia</label>
                    <input type="text" defaultValue="Lumina Odontologia" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">CNPJ</label>
                    <input type="text" defaultValue="12.345.678/0001-90" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telefone</label>
                    <input type="text" defaultValue="(11) 99999-9999" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email de Contato</label>
                    <input type="email" defaultValue="contato@lumina.com.br" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" />
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100">
                  <h3 className="font-bold text-slate-900 mb-4">Identidade Visual</h3>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-200">
                      Logo
                    </div>
                    <div className="space-y-2">
                      <button className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors">Alterar Logo</button>
                      <p className="text-xs text-slate-400">PNG ou JPG. Máximo 2MB.</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeSubTab === 'usuarios' && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">Equipe</h2>
                  <button className="px-4 py-2 bg-cyan-600 text-white text-sm font-bold rounded-xl hover:bg-cyan-700 transition-all">
                    Convidar Membro
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    {[
                      { name: 'Dr. Lucas Silva', role: 'Dentista / Admin', email: 'lucas@lumina.com.br', appointments: 145, revenue: 'R$ 28.450' },
                      { name: 'Mariana Costa', role: 'Recepcionista', email: 'mariana@lumina.com.br', appointments: 0, revenue: 'R$ 0' },
                      { name: 'Dra. Julia Paiva', role: 'Ortodontista', email: 'julia@lumina.com.br', appointments: 92, revenue: 'R$ 15.200' },
                    ].map((u) => (
                      <button 
                        key={u.email} 
                        onClick={() => setSelectedUser(u)}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-2xl transition-all border",
                          selectedUser?.email === u.email 
                            ? "bg-cyan-50 border-cyan-200 shadow-sm" 
                            : "bg-slate-50 border-slate-100 hover:bg-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200" />
                          <div className="text-left">
                            <p className="text-sm font-bold text-slate-900">{u.name}</p>
                            <p className="text-xs text-slate-500">{u.role}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {selectedUser ? (
                      <motion.div 
                        key={selectedUser.email}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-6"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xl">
                            {selectedUser.name.charAt(4)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{selectedUser.name}</h4>
                            <p className="text-xs text-slate-500">{selectedUser.role}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white p-4 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Atendimentos</p>
                            <p className="text-xl font-bold text-slate-900">{selectedUser.appointments}</p>
                            <p className="text-[10px] text-emerald-600 font-bold mt-1">+12% este mês</p>
                          </div>
                          <div className="bg-white p-4 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Receita Gerada</p>
                            <p className="text-xl font-bold text-slate-900">{selectedUser.revenue}</p>
                            <p className="text-[10px] text-emerald-600 font-bold mt-1">+8% este mês</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ações Rápidas</h5>
                          <button className="w-full py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">Editar Perfil</button>
                          <button className="w-full py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">Ver Agenda</button>
                          <button className="w-full py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all">Remover da Equipe</button>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 border-2 border-dashed border-slate-100 rounded-3xl p-8">
                        <User className="w-12 h-12 opacity-20" />
                        <p className="text-sm font-medium text-center">Selecione um profissional para ver estatísticas e detalhes.</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}

            {activeSubTab === 'permissoes' && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">Permissões de Acesso</h2>
                  <button className="text-sm font-bold text-cyan-600 hover:underline">Novo Perfil</button>
                </div>
                <div className="space-y-6">
                  {[
                    { role: 'Administrador', desc: 'Acesso total a todas as funcionalidades e configurações.', users: 1 },
                    { role: 'Dentista', desc: 'Acesso a agenda, prontuários e evolução de pacientes.', users: 2 },
                    { role: 'Recepcionista', desc: 'Acesso a agenda, cadastro de pacientes e financeiro básico.', users: 1 },
                  ].map((p) => (
                    <div key={p.role} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-cyan-200 transition-all">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">{p.role}</p>
                          <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-500 rounded-full font-bold">{p.users} usuários</span>
                        </div>
                        <p className="text-sm text-slate-500 max-w-md">{p.desc}</p>
                      </div>
                      <button className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-white rounded-xl transition-all">
                        <Settings className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeSubTab === 'notificacoes' && (
              <>
                <h2 className="text-xl font-bold text-slate-900">Notificações e Alertas</h2>
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Profissional</h3>
                    {notificacoes.filter(n => n.category === 'Profissional').map((n) => (
                      <div key={n.title} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 text-sm">{n.title}</p>
                          <p className="text-xs text-slate-500">{n.desc}</p>
                        </div>
                        <div 
                          onClick={() => toggleNotificacao(n.id)}
                          className={cn(
                            "w-10 h-5 rounded-full relative transition-colors cursor-pointer",
                            n.active ? "bg-cyan-500" : "bg-slate-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                            n.active ? "right-1" : "left-1"
                          )} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Paciente (WhatsApp)</h3>
                    {notificacoes.filter(n => n.category === 'Paciente').map((n) => (
                      <div key={n.title} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 text-sm">{n.title}</p>
                          <p className="text-xs text-slate-500">{n.desc}</p>
                        </div>
                        <div 
                          onClick={() => toggleNotificacao(n.id)}
                          className={cn(
                            "w-10 h-5 rounded-full relative transition-colors cursor-pointer",
                            n.active ? "bg-cyan-500" : "bg-slate-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                            n.active ? "right-1" : "left-1"
                          )} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeSubTab === 'assinatura' && (
              <>
                <h2 className="text-xl font-bold text-slate-900">Plano e Faturamento</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Plano Atual</p>
                        <h3 className="text-xl font-bold">LuminaFlow Pro</h3>
                      </div>
                      <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-[10px] font-bold border border-cyan-500/30">ATIVO</span>
                    </div>
                    <div className="space-y-2 mb-8">
                      <p className="text-xs text-slate-300 flex items-center gap-2">
                        <div className="w-1 h-1 bg-cyan-400 rounded-full" />
                        Até 5 profissionais inclusos
                      </p>
                      <p className="text-xs text-slate-300 flex items-center gap-2">
                        <div className="w-1 h-1 bg-cyan-400 rounded-full" />
                        IA de Cobrança e Marketing
                      </p>
                    </div>
                    <button className="w-full py-2.5 bg-white text-slate-900 text-sm font-bold rounded-xl hover:bg-slate-100 transition-all">
                      Gerenciar Assinatura
                    </button>
                  </div>

                  <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 mb-4">Próxima Fatura</h4>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-2xl font-bold text-slate-900">R$ 297</span>
                        <span className="text-sm text-slate-500">/mês</span>
                      </div>
                      <p className="text-xs text-slate-500">Vence em 15 de Março, 2026</p>
                    </div>
                    <div className="pt-4 border-t border-slate-200 mt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <CreditCard className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Visa final 4242</p>
                          <p className="text-[10px] text-slate-500">Expira em 12/28</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
