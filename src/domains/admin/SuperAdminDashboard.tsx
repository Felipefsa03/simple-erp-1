import React, { useState, useMemo } from 'react';
import {
  Building2, Users, CreditCard, TrendingUp, Activity, Shield, AlertTriangle, CheckCircle2,
  Eye, Ban, Edit2, Search, Clock, Globe, Smartphone, Monitor, Lock, Key, FileText,
  DollarSign, Calendar, MoreHorizontal, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { Modal, ConfirmDialog } from '@/components/shared';
import type { PlatformSubscription, SecurityLog, ActiveSession } from '@/types';

// Demo data
const DEMO_CLINICS = [
  { id: '1', name: 'Lumina Odontologia', plan: 'ultra' as const, status: 'active' as const, users: 4, patients: 156, mrr: 697, owner: 'Dr. Lucas Silva', email: 'lucas@lumina.com.br', created_at: '2025-01-15' },
  { id: '2', name: 'Estética Premium SP', plan: 'pro' as const, status: 'active' as const, users: 3, patients: 89, mrr: 397, owner: 'Dra. Camila  Neves', email: 'camila@estetica.com.br', created_at: '2025-03-20' },
  { id: '3', name: 'OdontoVida Clínica', plan: 'basic' as const, status: 'trial' as const, users: 2, patients: 23, mrr: 0, owner: 'Dr. Rafael Costa', email: 'rafael@odontovida.com.br', created_at: '2025-05-10' },
  { id: '4', name: 'Sorriso Perfeito', plan: 'pro' as const, status: 'active' as const, users: 5, patients: 210, mrr: 397, owner: 'Dra. Amanda Reis', email: 'amanda@sorriso.com.br', created_at: '2025-02-01' },
];

const DEMO_SUBSCRIPTIONS: PlatformSubscription[] = [
  {
    id: 'sub-1', clinic_id: '1', clinic_name: 'Lumina Odontologia', plan: 'ultra', status: 'active', amount: 697, billing_cycle: 'monthly', next_billing_date: '2026-04-15', created_at: '2025-01-15', payment_history: [
      { id: 'pay-1', date: '2026-03-15', amount: 697, status: 'paid', method: 'Cartão' },
      { id: 'pay-2', date: '2026-02-15', amount: 697, status: 'paid', method: 'Cartão' },
      { id: 'pay-3', date: '2026-01-15', amount: 697, status: 'paid', method: 'PIX' },
    ]
  },
  {
    id: 'sub-2', clinic_id: '2', clinic_name: 'Estética Premium SP', plan: 'pro', status: 'active', amount: 397, billing_cycle: 'monthly', next_billing_date: '2026-04-20', created_at: '2025-03-20', payment_history: [
      { id: 'pay-4', date: '2026-03-20', amount: 397, status: 'paid', method: 'PIX' },
      { id: 'pay-5', date: '2026-02-20', amount: 397, status: 'paid', method: 'PIX' },
    ]
  },
  { id: 'sub-3', clinic_id: '3', clinic_name: 'OdontoVida Clínica', plan: 'basic', status: 'active', amount: 0, billing_cycle: 'monthly', next_billing_date: '2026-04-10', created_at: '2025-05-10', payment_history: [] },
  {
    id: 'sub-4', clinic_id: '4', clinic_name: 'Sorriso Perfeito', plan: 'pro', status: 'active', amount: 397, billing_cycle: 'monthly', next_billing_date: '2026-04-01', created_at: '2025-02-01', payment_history: [
      { id: 'pay-6', date: '2026-03-01', amount: 397, status: 'paid', method: 'Boleto' },
      { id: 'pay-7', date: '2026-02-01', amount: 397, status: 'failed', method: 'Boleto' },
    ]
  },
];

const DEMO_SECURITY_LOGS: SecurityLog[] = [
  { id: 'log-1', user_id: 'prof-1', user_name: 'Dr. Lucas Silva', action: 'LOGIN', ip_address: '189.50.23.105', details: 'Login bem-sucedido via Chrome', created_at: '2026-03-03T18:30:00' },
  { id: 'log-2', user_id: 'prof-2', user_name: 'Dra. Julia Paiva', action: 'LOGIN', ip_address: '189.50.23.110', details: 'Login bem-sucedido via Safari', created_at: '2026-03-03T17:45:00' },
  { id: 'log-3', user_id: 'super-admin', user_name: 'Administrador Lumina', action: 'SETTINGS_CHANGE', ip_address: '177.38.12.50', details: 'Alterou configurações de notificação', created_at: '2026-03-03T16:20:00' },
  { id: 'log-4', user_id: 'prof-4', user_name: 'Fernanda Lima', action: 'PATIENT_CREATE', ip_address: '189.50.23.105', details: 'Cadastrou paciente: Maria Santos', created_at: '2026-03-03T15:00:00' },
  { id: 'log-5', user_id: 'prof-1', user_name: 'Dr. Lucas Silva', action: 'FINALIZE', ip_address: '189.50.23.105', details: 'Finalizou atendimento de Ana Paula Souza', created_at: '2026-03-03T14:30:00' },
  { id: 'log-6', user_id: 'unknown', user_name: 'Desconhecido', action: 'LOGIN_FAILED', ip_address: '45.227.89.12', details: 'Tentativa de login com email: admin@test.com', created_at: '2026-03-03T13:15:00' },
  { id: 'log-7', user_id: 'prof-3', user_name: 'Mariana Costa', action: 'LOGIN', ip_address: '201.10.45.78', details: 'Login bem-sucedido via Firefox', created_at: '2026-03-03T12:00:00' },
  { id: 'log-8', user_id: 'super-admin', user_name: 'Administrador Lumina', action: 'PLAN_CHANGE', ip_address: '177.38.12.50', details: 'Alterou plano de OdontoVida para Basic', created_at: '2026-03-02T10:00:00' },
];

const DEMO_SESSIONS: ActiveSession[] = [
  { id: 'sess-1', user_id: 'super-admin', user_name: 'Administrador Lumina', clinic_name: 'Plataforma', ip_address: '177.38.12.50', device: 'Chrome / Windows', started_at: '2026-03-03T18:00:00', last_activity: '2026-03-03T19:30:00' },
  { id: 'sess-2', user_id: 'prof-1', user_name: 'Dr. Lucas Silva', clinic_name: 'Lumina Odontologia', ip_address: '189.50.23.105', device: 'Chrome / macOS', started_at: '2026-03-03T08:00:00', last_activity: '2026-03-03T19:25:00' },
  { id: 'sess-3', user_id: 'prof-2', user_name: 'Dra. Julia Paiva', clinic_name: 'Lumina Odontologia', ip_address: '189.50.23.110', device: 'Safari / iOS', started_at: '2026-03-03T17:45:00', last_activity: '2026-03-03T19:20:00' },
  { id: 'sess-4', user_id: 'prof-5', user_name: 'Dra. Camila Neves', clinic_name: 'Estética Premium SP', ip_address: '200.12.34.56', device: 'Firefox / Windows', started_at: '2026-03-03T09:00:00', last_activity: '2026-03-03T18:50:00' },
];

const planPrices = { basic: 197, pro: 397, ultra: 697 };

interface SuperAdminDashboardProps {
  initialTab?: string;
}

export function SuperAdminDashboard({ initialTab = 'dashboard' }: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptions, setSubscriptions] = useState(DEMO_SUBSCRIPTIONS);
  const [selectedSub, setSelectedSub] = useState<PlatformSubscription | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ sub: PlatformSubscription; action: string } | null>(null);
  const [changePlanModal, setChangePlanModal] = useState<PlatformSubscription | null>(null);
  const [securityFilter, setSecurityFilter] = useState('all');

  // Update tab when initialTab changes (from sidebar navigation)
  React.useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  const clinics = DEMO_CLINICS;
  const totalMRR = clinics.reduce((s, c) => s + c.mrr, 0);
  const totalUsers = clinics.reduce((s, c) => s + c.users, 0);
  const totalPatients = clinics.reduce((s, c) => s + c.patients, 0);

  const filteredLogs = useMemo(() => {
    let logs = DEMO_SECURITY_LOGS;
    if (securityFilter !== 'all') {
      logs = logs.filter(l => l.action === securityFilter);
    }
    return logs;
  }, [securityFilter]);

  const handleSubAction = (sub: PlatformSubscription, action: string) => {
    if (action === 'suspend') {
      setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, status: 'suspended' } : s));
    } else if (action === 'cancel') {
      setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, status: 'cancelled' } : s));
    } else if (action === 'reactivate') {
      setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, status: 'active' } : s));
    }
    setConfirmAction(null);
  };

  const handleChangePlan = (sub: PlatformSubscription, newPlan: 'basic' | 'pro' | 'ultra') => {
    setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, plan: newPlan, amount: planPrices[newPlan] } : s));
    setChangePlanModal(null);
  };

  const actionLabels: Record<string, string> = {
    LOGIN: 'Login', LOGIN_FAILED: 'Login Falhou', LOGOUT: 'Logout',
    SETTINGS_CHANGE: 'Config. Alterada', PATIENT_CREATE: 'Paciente Criado',
    FINALIZE: 'Atendimento Finalizado', PLAN_CHANGE: 'Plano Alterado',
  };

  const actionColors: Record<string, string> = {
    LOGIN: 'bg-emerald-50 text-emerald-700', LOGIN_FAILED: 'bg-red-50 text-red-700',
    LOGOUT: 'bg-slate-100 text-slate-700', SETTINGS_CHANGE: 'bg-blue-50 text-blue-700',
    PATIENT_CREATE: 'bg-cyan-50 text-cyan-700', FINALIZE: 'bg-purple-50 text-purple-700',
    PLAN_CHANGE: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Shield className="w-6 h-6 text-cyan-500" />Painel Super Admin</h1>
        <p className="text-slate-500">Visão geral de todas as clínicas da plataforma.</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Clínicas Ativas', value: clinics.filter(c => c.status === 'active').length, icon: Building2, color: 'from-cyan-500 to-cyan-600' },
          { label: 'MRR Total', value: `R$ ${totalMRR.toLocaleString('pt-BR')}`, icon: TrendingUp, color: 'from-emerald-500 to-emerald-600' },
          { label: 'Usuários Totais', value: totalUsers, icon: Users, color: 'from-blue-500 to-blue-600' },
          { label: 'Pacientes Totais', value: totalPatients, icon: Activity, color: 'from-violet-500 to-violet-600' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br text-white flex items-center justify-center mb-4", kpi.color)}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <p className="text-sm text-slate-500">{kpi.label}</p>
            <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex bg-white border border-slate-100 rounded-2xl p-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'dashboard', label: 'Clínicas', icon: Building2 },
          { id: 'assinaturas', label: 'Assinaturas', icon: CreditCard },
          { id: 'seguranca', label: 'Segurança', icon: Lock },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
              activeTab === tab.id ? "bg-cyan-50 text-cyan-600 shadow-sm" : "text-slate-500 hover:text-slate-900")}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* === CLÍNICAS TAB === */}
      {(activeTab === 'dashboard' || activeTab === 'clinicas') && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Clínicas Cadastradas</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar clínica..." className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none w-64" />
            </div>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Clínica</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plano</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Usuários</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Pacientes</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">MRR</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clinics.filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <p className="font-bold text-sm text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.owner} • {c.email}</p>
                  </td>
                  <td className="px-6 py-4"><span className={cn("text-xs font-bold uppercase px-2 py-1 rounded-md", c.plan === 'ultra' ? "bg-cyan-50 text-cyan-700" : c.plan === 'pro' ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600")}>{c.plan}</span></td>
                  <td className="px-6 py-4 text-sm text-slate-600">{c.users}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{c.patients}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">R$ {c.mrr}</td>
                  <td className="px-6 py-4">
                    <span className={cn("inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full", c.status === 'active' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                      {c.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {c.status === 'active' ? 'Ativo' : 'Trial'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* === ASSINATURAS TAB === */}
      {activeTab === 'assinaturas' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Assinaturas Ativas', value: subscriptions.filter(s => s.status === 'active').length, color: 'text-emerald-600' },
              { label: 'Receita Mensal', value: `R$ ${subscriptions.filter(s => s.status === 'active').reduce((a, s) => a + s.amount, 0).toLocaleString('pt-BR')}`, color: 'text-cyan-600' },
              { label: 'Inadimplentes', value: subscriptions.filter(s => s.status === 'past_due').length, color: 'text-red-600' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                <p className={cn("text-2xl font-bold mt-1", card.color)}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Subscriptions Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100"><h2 className="text-lg font-bold text-slate-900">Gerenciar Assinaturas</h2></div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Clínica</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plano</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Próx. Cobrança</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{sub.clinic_name}</td>
                    <td className="px-6 py-4"><span className={cn("text-xs font-bold uppercase px-2 py-1 rounded-md", sub.plan === 'ultra' ? "bg-cyan-50 text-cyan-700" : sub.plan === 'pro' ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600")}>{sub.plan}</span></td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">R$ {sub.amount}/mês</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(sub.next_billing_date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4">
                      <span className={cn("text-xs font-bold px-2 py-1 rounded-full",
                        sub.status === 'active' ? "bg-emerald-50 text-emerald-700" :
                          sub.status === 'suspended' ? "bg-amber-50 text-amber-700" :
                            sub.status === 'cancelled' ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-700"
                      )}>{sub.status === 'active' ? 'Ativa' : sub.status === 'suspended' ? 'Suspensa' : sub.status === 'cancelled' ? 'Cancelada' : 'Inadimplente'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelectedSub(sub)} className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg" title="Ver detalhes"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => setChangePlanModal(sub)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Alterar plano"><Edit2 className="w-4 h-4" /></button>
                        {sub.status === 'active' ? (
                          <button onClick={() => setConfirmAction({ sub, action: 'suspend' })} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg" title="Suspender"><Ban className="w-4 h-4" /></button>
                        ) : sub.status !== 'cancelled' && (
                          <button onClick={() => setConfirmAction({ sub, action: 'reactivate' })} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Reativar"><CheckCircle2 className="w-4 h-4" /></button>
                        )}
                        {sub.status !== 'cancelled' && (
                          <button onClick={() => setConfirmAction({ sub, action: 'cancel' })} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Cancelar"><X className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subscription Detail Modal */}
          <Modal isOpen={!!selectedSub} onClose={() => setSelectedSub(null)} title={`Assinatura — ${selectedSub?.clinic_name}`} maxWidth="max-w-lg">
            {selectedSub && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[10px] font-bold text-slate-400 uppercase">Plano</p><p className="text-sm font-bold text-slate-900 uppercase">{selectedSub.plan}</p></div>
                  <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[10px] font-bold text-slate-400 uppercase">Valor</p><p className="text-sm font-bold text-slate-900">R$ {selectedSub.amount}/mês</p></div>
                  <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[10px] font-bold text-slate-400 uppercase">Próx. Cobrança</p><p className="text-sm font-bold text-slate-900">{new Date(selectedSub.next_billing_date).toLocaleDateString('pt-BR')}</p></div>
                  <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[10px] font-bold text-slate-400 uppercase">Desde</p><p className="text-sm font-bold text-slate-900">{new Date(selectedSub.created_at).toLocaleDateString('pt-BR')}</p></div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Histórico de Pagamentos</h4>
                  {selectedSub.payment_history.length === 0 ? (
                    <p className="text-xs text-slate-400">Nenhum pagamento registrado (período trial).</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedSub.payment_history.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{new Date(p.date).toLocaleDateString('pt-BR')}</p>
                            <p className="text-xs text-slate-500">{p.method}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">R$ {p.amount}</p>
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", p.status === 'paid' ? "bg-emerald-50 text-emerald-700" : p.status === 'failed' ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>{p.status === 'paid' ? 'Pago' : p.status === 'failed' ? 'Falhou' : 'Pendente'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Modal>

          {/* Change Plan Modal */}
          <Modal isOpen={!!changePlanModal} onClose={() => setChangePlanModal(null)} title={`Alterar Plano — ${changePlanModal?.clinic_name}`}>
            {changePlanModal && (
              <div className="space-y-3">
                {(['basic', 'pro', 'ultra'] as const).map(plan => (
                  <button key={plan} onClick={() => handleChangePlan(changePlanModal, plan)}
                    disabled={changePlanModal.plan === plan}
                    className={cn("w-full p-4 rounded-2xl border-2 text-left transition-all",
                      changePlanModal.plan === plan ? "border-cyan-500 bg-cyan-50" : "border-slate-100 hover:border-slate-300"
                    )}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 uppercase">{plan}</p>
                        <p className="text-xs text-slate-500">{plan === 'basic' ? '5 profissionais, 500 pacientes' : plan === 'pro' ? '15 profissionais, ilimitado' : 'Tudo ilimitado + IA'}</p>
                      </div>
                      <p className="text-lg font-bold text-slate-900">R$ {planPrices[plan]}<span className="text-xs font-normal text-slate-400">/mês</span></p>
                    </div>
                    {changePlanModal.plan === plan && <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full mt-2 inline-block">PLANO ATUAL</span>}
                  </button>
                ))}
              </div>
            )}
          </Modal>

          {/* Confirm Action */}
          <ConfirmDialog
            isOpen={!!confirmAction} onClose={() => setConfirmAction(null)}
            onConfirm={() => confirmAction && handleSubAction(confirmAction.sub, confirmAction.action)}
            title={confirmAction?.action === 'suspend' ? 'Suspender Assinatura?' : confirmAction?.action === 'cancel' ? 'Cancelar Assinatura?' : 'Reativar Assinatura?'}
            message={`Tem certeza que deseja ${confirmAction?.action === 'suspend' ? 'suspender' : confirmAction?.action === 'cancel' ? 'cancelar' : 'reativar'} a assinatura de ${confirmAction?.sub.clinic_name}?`}
            confirmLabel={confirmAction?.action === 'suspend' ? 'Suspender' : confirmAction?.action === 'cancel' ? 'Cancelar Assinatura' : 'Reativar'}
            variant={confirmAction?.action === 'cancel' ? 'danger' : undefined}
          />
        </motion.div>
      )}

      {/* === SEGURANÇA TAB === */}
      {activeTab === 'seguranca' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Security Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sessões Ativas</p>
              <p className="text-2xl font-bold text-cyan-600 mt-1">{DEMO_SESSIONS.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tentativas Falhas (24h)</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{DEMO_SECURITY_LOGS.filter(l => l.action === 'LOGIN_FAILED').length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Política de Senhas</p>
              <p className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />Ativa — Mín. 8 caracteres</p>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Globe className="w-5 h-5 text-cyan-500" />Sessões Ativas</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {DEMO_SESSIONS.map(session => (
                <div key={session.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">{session.user_name.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{session.user_name}</p>
                      <p className="text-xs text-slate-500">{session.clinic_name} • {session.device}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="text-xs text-slate-500">{session.ip_address}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end"><Clock className="w-3 h-3" />{new Date(session.last_activity).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Encerrar sessão"><Ban className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Logs */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><FileText className="w-5 h-5 text-cyan-500" />Logs de Auditoria</h2>
              <div className="flex gap-2">
                {['all', 'LOGIN', 'LOGIN_FAILED', 'SETTINGS_CHANGE', 'FINALIZE'].map(f => (
                  <button key={f} onClick={() => setSecurityFilter(f)} className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all", securityFilter === f ? "bg-cyan-50 text-cyan-600" : "text-slate-400 hover:text-slate-600")}>
                    {f === 'all' ? 'Todos' : actionLabels[f] || f}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {filteredLogs.map(log => (
                <div key={log.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap", actionColors[log.action] || 'bg-slate-100 text-slate-600')}>
                      {actionLabels[log.action] || log.action}
                    </span>
                    <div>
                      <p className="text-sm text-slate-700">{log.details}</p>
                      <p className="text-xs text-slate-400">{log.user_name} • {log.ip_address}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Password Policy */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6"><Key className="w-5 h-5 text-cyan-500" />Política de Senhas</h2>
            <div className="space-y-4">
              {[
                { label: 'Comprimento mínimo', value: '8 caracteres', enabled: true },
                { label: 'Exigir letra maiúscula', value: 'Obrigatório', enabled: true },
                { label: 'Exigir número', value: 'Obrigatório', enabled: true },
                { label: 'Exigir caractere especial', value: 'Opcional', enabled: false },
                { label: 'Expiração de senha', value: '90 dias', enabled: true },
                { label: 'Bloqueio após tentativas', value: '5 tentativas', enabled: true },
              ].map(policy => (
                <div key={policy.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{policy.label}</p>
                    <p className="text-xs text-slate-500">{policy.value}</p>
                  </div>
                  <div className={cn("w-12 h-6 rounded-full transition-all relative", policy.enabled ? "bg-cyan-500" : "bg-slate-200")}>
                    <div className={cn("w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all", policy.enabled ? "left-6" : "left-0.5")} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
