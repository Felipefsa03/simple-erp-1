import React from 'react';
import { Building2, Users, CreditCard, TrendingUp, Activity, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

export function SuperAdminDashboard() {
  const clinics = [
    { id: '1', name: 'Lumina Odontologia', plan: 'ultra', status: 'active', users: 4, patients: 156, mrr: 697 },
    { id: '2', name: 'Estética Premium SP', plan: 'pro', status: 'active', users: 3, patients: 89, mrr: 397 },
    { id: '3', name: 'OdontoVida Clínica', plan: 'basic', status: 'trial', users: 2, patients: 23, mrr: 0 },
  ];

  const totalMRR = clinics.reduce((s, c) => s + c.mrr, 0);
  const totalUsers = clinics.reduce((s, c) => s + c.users, 0);
  const totalPatients = clinics.reduce((s, c) => s + c.patients, 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Shield className="w-6 h-6 text-cyan-500" />Painel Super Admin</h1>
        <p className="text-slate-500">Visão geral de todas as clínicas da plataforma.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Clínicas Ativas', value: clinics.filter(c => c.status === 'active').length, icon: Building2, color: 'from-cyan-500 to-cyan-600' },
          { label: 'MRR Total', value: `R$ ${totalMRR}`, icon: TrendingUp, color: 'from-emerald-500 to-emerald-600' },
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

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100"><h2 className="text-lg font-bold text-slate-900">Clínicas Cadastradas</h2></div>
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
            {clinics.map(c => (
              <tr key={c.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-bold text-sm text-slate-900">{c.name}</td>
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
      </div>
    </div>
  );
}
