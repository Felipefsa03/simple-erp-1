import React, { useState, useMemo } from 'react';
import { Settings, Users, Shield, Bell, CreditCard, Stethoscope, Plus, Save, Edit2, Trash2, X, Package, DollarSign, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useClinicStore } from '@/stores/clinicStore';
import { useAuth } from '@/hooks/useAuth';
import { toast, formatCurrency } from '@/hooks/useShared';
import { Modal, EmptyState, ConfirmDialog } from '@/components/shared';
import type { Service, ServiceMaterial } from '@/types';

interface ConfiguracoesProps {
  onNavigate?: (tab: string, ctx?: any) => void;
}

const configTabs = [
  { id: 'clinica', label: 'Clínica', icon: Settings },
  { id: 'equipe', label: 'Equipe', icon: Users },
  { id: 'servicos', label: 'Serviços', icon: Stethoscope },
  { id: 'permissoes', label: 'Permissões', icon: Shield },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'assinatura', label: 'Assinatura', icon: CreditCard },
];

export function Configuracoes({ onNavigate }: ConfiguracoesProps) {
  const { user, clinic } = useAuth();
  const store = useClinicStore();
  const { professionals, services, stockItems, updateProfessional, addService, updateService, deleteService, getProfessionalStats } = store;

  const [activeSubTab, setActiveSubTab] = useState('clinica');
  const [clinicForm, setClinicForm] = useState({ name: clinic?.name || '', cnpj: clinic?.cnpj || '', phone: clinic?.phone || '', email: clinic?.email || '' });
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [svcForm, setSvcForm] = useState({ name: '', category: 'Consulta', base_price: '', avg_duration_min: '60', estimated_cost: '0' });
  const [svcMaterials, setSvcMaterials] = useState<ServiceMaterial[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [editingCommission, setEditingCommission] = useState<{ id: string; pct: string } | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState({
    agendaConfirmation: true, patientReminder: true, stockAlert: true, paymentReceived: true,
    newPatient: true, noShow: false, dailySummary: true,
  });

  const handleSaveClinic = () => {
    toast('Configurações da clínica salvas com sucesso!');
  };

  const handleSaveService = () => {
    const data = {
      clinic_id: user?.clinic_id || 'clinic-1',
      name: svcForm.name,
      category: svcForm.category,
      base_price: parseFloat(svcForm.base_price.replace(',', '.')),
      avg_duration_min: parseInt(svcForm.avg_duration_min),
      estimated_cost: parseFloat(svcForm.estimated_cost.replace(',', '.') || '0'),
      materials: svcMaterials,
      active: true,
    };
    if (editingService) {
      updateService(editingService.id, data);
      toast('Serviço atualizado!');
    } else {
      addService(data);
      toast('Serviço cadastrado!');
    }
    setShowServiceModal(false);
    setEditingService(null);
    setSvcForm({ name: '', category: 'Consulta', base_price: '', avg_duration_min: '60', estimated_cost: '0' });
    setSvcMaterials([]);
  };

  const handleEditService = (svc: Service) => {
    setEditingService(svc);
    setSvcForm({ name: svc.name, category: svc.category, base_price: String(svc.base_price), avg_duration_min: String(svc.avg_duration_min), estimated_cost: String(svc.estimated_cost) });
    setSvcMaterials(svc.materials || []);
    setShowServiceModal(true);
  };

  const handleSaveCommission = () => {
    if (!editingCommission) return;
    updateProfessional(editingCommission.id, { commission_pct: parseFloat(editingCommission.pct) });
    toast('Comissão atualizada!');
    setEditingCommission(null);
  };

  const profStats = useMemo(() => {
    if (!selectedProfessional) return null;
    return getProfessionalStats(selectedProfessional);
  }, [selectedProfessional, store.appointments, store.transactions]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500">Gerencie sua clínica, equipe, serviços e permissões.</p>
      </header>

      {/* Tabs */}
      <div className="flex bg-white border border-slate-100 rounded-2xl p-1 overflow-x-auto no-scrollbar">
        {configTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} className={cn("flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap", activeSubTab === tab.id ? "bg-cyan-50 text-cyan-600 shadow-sm" : "text-slate-500 hover:text-slate-900")}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Clinic Settings */}
      {activeSubTab === 'clinica' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-bold text-slate-900">Dados da Clínica</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'name', label: 'Nome da Clínica', ph: 'Lumina Odontologia' },
              { key: 'cnpj', label: 'CNPJ', ph: '12.345.678/0001-90' },
              { key: 'phone', label: 'Telefone', ph: '(11) 99999-9999' },
              { key: 'email', label: 'Email', ph: 'contato@clinica.com' },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{f.label}</label>
                <input type="text" value={(clinicForm as any)[f.key]} onChange={e => setClinicForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.ph} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none" />
              </div>
            ))}
          </div>
          <button onClick={handleSaveClinic} className="px-6 py-2 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700">
            <Save className="w-4 h-4 inline mr-2" />Salvar Alterações
          </button>
        </motion.div>
      )}

      {/* Team */}
      {activeSubTab === 'equipe' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Equipe</h2>
            <div className="space-y-3">
              {professionals.map(prof => (
                <div key={prof.id} onClick={() => setSelectedProfessional(prof.id)} className={cn("flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer", selectedProfessional === prof.id ? "bg-cyan-50 border border-cyan-200" : "border border-transparent hover:bg-slate-50")}>
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">{prof.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900">{prof.name}</p>
                    <p className="text-xs text-slate-500">{prof.role === 'dentist' ? 'Dentista' : prof.role === 'aesthetician' ? 'Esteticista' : prof.role === 'admin' ? 'Administrador' : 'Recepcionista'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Comissão</p>
                      {editingCommission?.id === prof.id ? (
                        <div className="flex items-center gap-1">
                          <input type="number" value={editingCommission.pct} onChange={e => setEditingCommission({ ...editingCommission, pct: e.target.value })} className="w-14 px-2 py-0.5 bg-white border border-slate-200 rounded text-sm text-right outline-none" />
                          <span className="text-xs">%</span>
                          <button onClick={handleSaveCommission} className="text-cyan-600"><Save className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <button onClick={() => setEditingCommission({ id: prof.id, pct: String(prof.commission_pct) })} className="text-sm font-bold text-cyan-600 hover:underline">{prof.commission_pct}%</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Professional Stats */}
          <div className="space-y-6">
            {selectedProfessional && profStats ? (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-cyan-500" />Estatísticas</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Atendimentos</p>
                    <p className="text-lg font-bold text-slate-900">{profStats.appointments}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Receita</p>
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(profStats.revenue)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Ticket Médio</p>
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(profStats.ticketMedio)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Comparecimento</p>
                    <p className="text-lg font-bold text-slate-900">{profStats.attendanceRate.toFixed(0)}%</p>
                  </div>
                </div>
                {profStats.topProcedures.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Top Procedimentos</p>
                    {profStats.topProcedures.map(p => (
                      <div key={p.name} className="flex items-center justify-between text-sm py-1">
                        <span className="text-slate-600">{p.name}</span>
                        <span className="font-bold text-slate-900">{p.count}x</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Selecione um profissional para ver estatísticas</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Services */}
      {activeSubTab === 'servicos' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Serviços e Procedimentos</h2>
            <button onClick={() => { setEditingService(null); setSvcForm({ name: '', category: 'Consulta', base_price: '', avg_duration_min: '60', estimated_cost: '0' }); setSvcMaterials([]); setShowServiceModal(true); }} className="px-4 py-2 bg-cyan-600 text-white text-sm font-bold rounded-xl hover:bg-cyan-700">
              <Plus className="w-4 h-4 inline mr-2" />Novo Serviço
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Serviço</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Duração</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Preço</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map(svc => (
                  <tr key={svc.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{svc.name}</p>
                      {svc.materials.length > 0 && <p className="text-[10px] text-slate-400">{svc.materials.length} material(is) vinculado(s)</p>}
                    </td>
                    <td className="px-6 py-4"><span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">{svc.category}</span></td>
                    <td className="px-6 py-4 text-sm text-slate-600">{svc.avg_duration_min} min</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatCurrency(svc.base_price)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleEditService(svc)} className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteConfirm(svc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Service Modal */}
          <Modal isOpen={showServiceModal} onClose={() => { setShowServiceModal(false); setEditingService(null); }} title={editingService ? 'Editar Serviço' : 'Novo Serviço'} maxWidth="max-w-lg">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome do Serviço *</label>
                <input type="text" value={svcForm.name} onChange={e => setSvcForm({ ...svcForm, name: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none" placeholder="Ex: Restauração em Resina" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categoria</label>
                  <select value={svcForm.category} onChange={e => setSvcForm({ ...svcForm, category: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none">
                    {['Consulta', 'Preventivo', 'Restaurador', 'Cirúrgico', 'Ortodontia', 'Estética', 'Implante', 'Outro'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duração (min)</label>
                  <input type="number" value={svcForm.avg_duration_min} onChange={e => setSvcForm({ ...svcForm, avg_duration_min: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preço (R$) *</label>
                  <input type="text" value={svcForm.base_price} onChange={e => setSvcForm({ ...svcForm, base_price: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none" placeholder="250,00" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custo Estimado (R$)</label>
                  <input type="text" value={svcForm.estimated_cost} onChange={e => setSvcForm({ ...svcForm, estimated_cost: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none" placeholder="50,00" />
                </div>
              </div>

              {/* Materials Linking */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Materiais Vinculados</label>
                  <button onClick={() => setSvcMaterials(prev => [...prev, { stock_item_id: stockItems[0]?.id || '', stock_item_name: stockItems[0]?.name || '', qty_per_use: 1 }])} className="text-xs text-cyan-600 font-bold hover:underline">+ Adicionar</button>
                </div>
                {svcMaterials.map((m, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select value={m.stock_item_id} onChange={e => { const items = [...svcMaterials]; const item = stockItems.find(s => s.id === e.target.value); items[i] = { stock_item_id: e.target.value, stock_item_name: item?.name || '', qty_per_use: items[i].qty_per_use }; setSvcMaterials(items); }} className="flex-1 px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none">
                      {stockItems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input type="number" value={m.qty_per_use} onChange={e => { const items = [...svcMaterials]; items[i].qty_per_use = Number(e.target.value); setSvcMaterials(items); }} className="w-16 px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none text-center" />
                    <button onClick={() => setSvcMaterials(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>

              <button onClick={handleSaveService} disabled={!svcForm.name || !svcForm.base_price} className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 disabled:opacity-50 mt-4">Salvar Serviço</button>
            </div>
          </Modal>

          <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => { if (deleteConfirm) { deleteService(deleteConfirm); setDeleteConfirm(null); toast('Serviço excluído!'); } }} title="Excluir Serviço?" message="Tem certeza? Agendamentos existentes não serão afetados." confirmLabel="Excluir" variant="danger" />
        </motion.div>
      )}

      {/* Permissions */}
      {activeSubTab === 'permissoes' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Matriz de Permissões</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase">Ação</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase text-center">Recepção</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase text-center">Dentista</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase text-center">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  { action: 'Criar Agendamento', rec: true, den: true, adm: true },
                  { action: 'Editar Prontuário', rec: false, den: true, adm: true },
                  { action: 'Finalizar Atendimento', rec: false, den: true, adm: true },
                  { action: 'Ver Financeiro', rec: true, den: false, adm: true },
                  { action: 'Gerenciar Financeiro', rec: false, den: false, adm: true },
                  { action: 'Excluir Paciente', rec: false, den: false, adm: true },
                  { action: 'Configurar Comissões', rec: false, den: false, adm: true },
                  { action: 'Gerenciar Estoque', rec: true, den: false, adm: true },
                ].map(row => (
                  <tr key={row.action}>
                    <td className="py-3 px-4 text-slate-700 font-medium">{row.action}</td>
                    {['rec', 'den', 'adm'].map(role => (
                      <td key={role} className="py-3 px-4 text-center">
                        <span className={cn("inline-block w-5 h-5 rounded-full text-white text-xs flex items-center justify-center mx-auto", (row as any)[role] ? "bg-emerald-500" : "bg-slate-200")}>
                          {(row as any)[role] ? '✓' : ''}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Notifications */}
      {activeSubTab === 'notificacoes' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Preferências de Notificação</h2>
          {[
            { key: 'agendaConfirmation', label: 'Confirmação de Agendamento', desc: 'Enviar confirmação via WhatsApp para o paciente' },
            { key: 'patientReminder', label: 'Lembrete de Consulta', desc: 'Lembrar paciente 24h antes da consulta' },
            { key: 'stockAlert', label: 'Alerta de Estoque Baixo', desc: 'Notificar quando um item atingir o mínimo' },
            { key: 'paymentReceived', label: 'Pagamento Recebido', desc: 'Notificar ao receber um pagamento' },
            { key: 'newPatient', label: 'Novo Paciente Cadastrado', desc: 'Notificar quando um novo paciente é cadastrado' },
            { key: 'noShow', label: 'Paciente Faltou', desc: 'Notificar quando um paciente não compareceu' },
            { key: 'dailySummary', label: 'Resumo Diário', desc: 'Enviar resumo do dia ao final do expediente' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-bold text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <button onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }))} className={cn("w-12 h-6 rounded-full transition-all relative", (notifications as any)[item.key] ? "bg-cyan-500" : "bg-slate-200")}>
                <div className={cn("w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all", (notifications as any)[item.key] ? "left-6" : "left-0.5")} />
              </button>
            </div>
          ))}
          <button onClick={() => toast('Preferências de notificação salvas!')} className="px-6 py-2 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700">Salvar Preferências</button>
        </motion.div>
      )}

      {/* Subscription */}
      {activeSubTab === 'assinatura' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Basic', price: 'R$ 197', desc: 'Ideal para clínicas iniciantes', features: ['5 profissionais', '500 pacientes', 'Suporte email'], current: clinic?.plan === 'basic' },
            { name: 'Pro', price: 'R$ 397', desc: 'Para clínicas em crescimento', features: ['15 profissionais', 'Pacientes ilimitados', 'Suporte prioritário', 'Integração Asaas', 'Relatórios avançados'], current: clinic?.plan === 'pro' },
            { name: 'Ultra', price: 'R$ 697', desc: 'Máximo desempenho e IA', features: ['Profissionais ilimitados', 'Pacientes ilimitados', 'IA Copilot', 'API completa', 'Multi-clínica', 'SLA 99.9%'], current: clinic?.plan === 'ultra' },
          ].map(plan => (
            <div key={plan.name} className={cn("p-6 rounded-3xl border-2 transition-all", plan.current ? "bg-white border-cyan-500 shadow-lg shadow-cyan-100" : "bg-white border-slate-100")}>
              {plan.current && <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2 py-1 rounded-full mb-4 inline-block">PLANO ATUAL</span>}
              <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
              <p className="text-3xl font-black text-slate-900 mt-2">{plan.price}<span className="text-sm font-normal text-slate-400">/mês</span></p>
              <p className="text-xs text-slate-500 mt-1 mb-6">{plan.desc}</p>
              <ul className="space-y-2 text-sm">
                {plan.features.map(f => <li key={f} className="text-slate-600 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />{f}</li>)}
              </ul>
              {!plan.current && (
                <button onClick={() => toast('Upgrade de plano em breve!', 'info')} className="w-full mt-6 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800">Fazer Upgrade</button>
              )}
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
