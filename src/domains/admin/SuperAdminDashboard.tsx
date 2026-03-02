import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Search, 
  Filter, 
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const initialClinics = [
  { id: '1', name: 'Lumina Odontologia', owner: 'Dr. Lucas Silva', plan: 'Ultra', status: 'active', revenue: 'R$ 4.200,00', users: 12, lastActive: 'Hoje' },
  { id: '2', name: 'Estética Glow', owner: 'Dra. Ana Paula', plan: 'Pro', status: 'active', revenue: 'R$ 2.800,00', users: 5, lastActive: 'Hoje' },
  { id: '3', name: 'Smile Center', owner: 'Dr. Carlos Eduardo', plan: 'Basic', status: 'trial', revenue: 'R$ 0,00', users: 2, lastActive: 'Ontem' },
  { id: '4', name: 'Dental Care', owner: 'Dra. Juliana Mendes', plan: 'Pro', status: 'inactive', revenue: 'R$ 1.400,00', users: 8, lastActive: '5 dias atrás' },
];

export function SuperAdminDashboard() {
  const [clinics, setClinics] = useState(initialClinics);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClinic, setNewClinic] = useState({ name: '', owner: '', plan: 'Basic' });

  const handleAddClinic = (e: React.FormEvent) => {
    e.preventDefault();
    const id = (clinics.length + 1).toString();
    setClinics([
      { 
        id, 
        ...newClinic, 
        status: 'trial', 
        revenue: 'R$ 0,00', 
        users: 1, 
        lastActive: 'Agora' 
      }, 
      ...clinics
    ]);
    setIsModalOpen(false);
    setNewClinic({ name: '', owner: '', plan: 'Basic' });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Painel do Administrador</h1>
          <p className="text-slate-500">Gerencie sua base de clientes e acompanhe o crescimento da LuminaFlow.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
        >
          <Plus className="w-5 h-5" />
          Nova Clínica
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total de Clínicas', value: clinics.length.toString(), icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Usuários Ativos', value: '1.240', icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-50' },
          { label: 'MRR (Receita Mensal)', value: 'R$ 84.500', icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Crescimento', value: '+12.5%', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", stat.bg, stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Clinics Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900">Gerenciar Clínicas</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar clínica..." 
                className="pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 w-full md:w-64"
              />
            </div>
            <button className="p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Clínica</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plano</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Receita</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Último Acesso</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clinics.map((clinic) => (
                <tr key={clinic.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{clinic.name}</p>
                      <p className="text-xs text-slate-500">{clinic.owner}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-xs font-bold px-2 py-1 rounded-full",
                      clinic.plan === 'Ultra' ? "bg-purple-50 text-purple-600" :
                      clinic.plan === 'Pro' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-600"
                    )}>
                      {clinic.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {clinic.status === 'active' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {clinic.status === 'trial' && <Clock className="w-4 h-4 text-amber-500" />}
                      {clinic.status === 'inactive' && <AlertCircle className="w-4 h-4 text-red-500" />}
                      <span className="text-sm text-slate-600 capitalize">{clinic.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{clinic.revenue}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{clinic.lastActive}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Clinic Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Nova Clínica</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleAddClinic} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Nome da Clínica</label>
                  <input 
                    type="text" 
                    required
                    value={newClinic.name}
                    onChange={(e) => setNewClinic({ ...newClinic, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                    placeholder="Ex: Clínica Sorriso"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Proprietário (Email)</label>
                  <input 
                    type="email" 
                    required
                    value={newClinic.owner}
                    onChange={(e) => setNewClinic({ ...newClinic, owner: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                    placeholder="email@proprietario.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Plano</label>
                  <select 
                    value={newClinic.plan}
                    onChange={(e) => setNewClinic({ ...newClinic, plan: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                  >
                    <option value="Basic">Basic</option>
                    <option value="Pro">Pro</option>
                    <option value="Ultra">Ultra</option>
                  </select>
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 mt-4"
                >
                  Cadastrar Clínica
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
