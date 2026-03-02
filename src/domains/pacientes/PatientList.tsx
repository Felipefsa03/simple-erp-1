import React from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  Phone, 
  Mail, 
  Calendar as CalendarIcon,
  Tag,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const initialPatients = [
  { id: 1, name: 'Ana Paula Souza', phone: '(11) 98765-4321', email: 'ana.paula@email.com', lastVisit: '12/02/2026', status: 'active', tags: ['Ortodontia', 'Premium'] },
  { id: 2, name: 'Carlos Eduardo Lima', phone: '(11) 91234-5678', email: 'carlos.edu@email.com', lastVisit: '28/01/2026', status: 'inactive', tags: ['Limpeza'] },
  { id: 3, name: 'Juliana Mendes', phone: '(11) 99887-7665', email: 'ju.mendes@email.com', lastVisit: '05/02/2026', status: 'active', tags: ['Estética', 'Botox'] },
  { id: 4, name: 'Ricardo Oliveira', phone: '(11) 97766-5544', email: 'ricardo.o@email.com', lastVisit: '15/12/2025', status: 'risk', tags: ['Implante'] },
  { id: 5, name: 'Beatriz Santos', phone: '(11) 96655-4433', email: 'beatriz.s@email.com', lastVisit: '20/02/2026', status: 'active', tags: ['Ortodontia'] },
];

interface PatientListProps {
  onNavigate?: (tab: string) => void;
}

export function PatientList({ onNavigate }: PatientListProps) {
  const [patients, setPatients] = React.useState(initialPatients);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [newPatient, setNewPatient] = React.useState({
    name: '',
    phone: '',
    email: '',
    tags: ''
  });

  const handleAddPatient = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = {
      id: patients.length + 1,
      name: newPatient.name,
      phone: newPatient.phone,
      email: newPatient.email,
      lastVisit: 'Hoje',
      status: 'active',
      tags: newPatient.tags.split(',').map(t => t.trim()).filter(t => t !== '')
    };
    setPatients([patient, ...patients]);
    setIsModalOpen(false);
    setNewPatient({ name: '', phone: '', email: '', tags: '' });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
          <p className="text-slate-500">Gerencie sua base de pacientes e histórico clínico.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-all shadow-sm shadow-cyan-200"
        >
          <Plus className="w-4 h-4" />
          Novo Paciente
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
                <h3 className="text-lg font-bold text-slate-900">Novo Paciente</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleAddPatient} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome Completo</label>
                  <input 
                    required
                    type="text" 
                    value={newPatient.name}
                    onChange={e => setNewPatient({...newPatient, name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" 
                    placeholder="Ex: Maria Silva"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telefone</label>
                  <input 
                    required
                    type="text" 
                    value={newPatient.phone}
                    onChange={e => setNewPatient({...newPatient, phone: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" 
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</label>
                  <input 
                    required
                    type="email" 
                    value={newPatient.email}
                    onChange={e => setNewPatient({...newPatient, email: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" 
                    placeholder="maria@email.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tags (separadas por vírgula)</label>
                  <input 
                    type="text" 
                    value={newPatient.tags}
                    onChange={e => setNewPatient({...newPatient, tags: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" 
                    placeholder="Ex: Ortodontia, Estética"
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-200 mt-4">
                  Cadastrar Paciente
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold">Ou</span></div>
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  className="w-full py-3 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all border border-slate-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  Cadastro em Massa (CSV/Excel)
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setIsModalOpen(false);
                      alert(`Arquivo "${e.target.files[0].name}" selecionado. Iniciando processamento de dados...`);
                    }
                  }}
                />
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nome, CPF ou telefone..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <Filter className="w-4 h-4" />
          Filtros
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px] md:min-w-0">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Paciente</th>
                <th className="hidden md:table-cell px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Contato</th>
                <th className="hidden lg:table-cell px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Última Visita</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((patient, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={patient.id} 
                  onClick={() => onNavigate?.('prontuarios')}
                  className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold flex-shrink-0">
                        {patient.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{patient.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {patient.tags.map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                        {/* Mobile contact info */}
                        <div className="md:hidden mt-1 text-[10px] text-slate-400">
                          {patient.phone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Phone className="w-3 h-3" />
                        {patient.phone}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Mail className="w-3 h-3" />
                        {patient.email}
                      </div>
                    </div>
                  </td>
                  <td className="hidden lg:table-cell px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <CalendarIcon className="w-4 h-4 text-slate-400" />
                      {patient.lastVisit}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      patient.status === 'active' ? "bg-cyan-50 text-cyan-700" :
                      patient.status === 'risk' ? "bg-amber-50 text-amber-700" :
                      "bg-slate-100 text-slate-700"
                    )}>
                      {patient.status === 'active' ? 'Ativo' : 
                       patient.status === 'risk' ? 'Risco Churn' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
