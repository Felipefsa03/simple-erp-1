import React, { useState, useMemo } from 'react';
import { Package, Plus, Search, Filter, ArrowUpRight, ArrowDownRight, AlertTriangle, Edit2, Trash2, CheckCircle2, History, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useClinicStore } from '@/stores/clinicStore';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce, toast, formatCurrency } from '@/hooks/useShared';
import { Modal, EmptyState, ConfirmDialog } from '@/components/shared';

export function Estoque() {
  const { user, hasPermission } = useAuth();
  const { stockItems, stockMovements, addStockItem, updateStockItem, deleteStockItem, addStockMovement } = useClinicStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [form, setForm] = useState({ name: '', category: 'Consumíveis', quantity: '', min_quantity: '', unit: 'un', price: '' });
  const clinicId = user?.clinic_id || 'clinic-1';
  const canManageStock = hasPermission('manage_stock');

  const clinicStockItems = useMemo(
    () => stockItems.filter(item => item.clinic_id === clinicId),
    [stockItems, clinicId]
  );
  const clinicStockMovements = useMemo(
    () => stockMovements.filter(m => m.clinic_id === clinicId),
    [stockMovements, clinicId]
  );

  if (!canManageStock) {
    return (
      <EmptyState
        title="Acesso restrito"
        description="Você não tem permissão para gerenciar o estoque."
      />
    );
  }

  const filteredItems = useMemo(() => {
    let result = clinicStockItems;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    if (categoryFilter !== 'all') result = result.filter(i => i.category === categoryFilter);
    return result;
  }, [clinicStockItems, debouncedSearch, categoryFilter]);

  const totalValue = useMemo(() => clinicStockItems.reduce((s, i) => s + (i.quantity * i.unit_cost), 0), [clinicStockItems]);
  const lowStockCount = useMemo(() => clinicStockItems.filter(i => i.quantity <= i.min_quantity).length, [clinicStockItems]);
  const categories = useMemo(() => [...new Set(clinicStockItems.map(i => i.category))], [clinicStockItems]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageStock) { toast('Você não tem permissão para gerenciar estoque.', 'error'); return; }
    if (editingItem) {
      updateStockItem(editingItem, {
        name: form.name, category: form.category, quantity: Number(form.quantity),
        min_quantity: Number(form.min_quantity), unit: form.unit, unit_cost: parseFloat(form.price.replace(',', '.')),
      });
      toast('Item atualizado com sucesso!');
    } else {
      addStockItem({
        clinic_id: clinicId, name: form.name, category: form.category,
        quantity: Number(form.quantity), min_quantity: Number(form.min_quantity),
        unit: form.unit, unit_cost: parseFloat(form.price.replace(',', '.')),
      });
      toast('Item adicionado ao estoque!');
    }
    setIsModalOpen(false);
    setEditingItem(null);
    setForm({ name: '', category: 'Consumíveis', quantity: '', min_quantity: '', unit: 'un', price: '' });
  };

  const handleEdit = (id: string) => {
    const item = clinicStockItems.find(i => i.id === id);
    if (!item) return;
    setEditingItem(id);
    setForm({ name: item.name, category: item.category, quantity: String(item.quantity), min_quantity: String(item.min_quantity), unit: item.unit, price: String(item.unit_cost) });
    setIsModalOpen(true);
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    deleteStockItem(deleteConfirm);
    setDeleteConfirm(null);
    toast('Item excluído com sucesso!');
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Estoque</h1>
          <p className="text-slate-500">Controle seus insumos, materiais e medicamentos.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowHistory(true)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
            <History className="w-4 h-4 inline mr-2" />Movimentações
          </button>
          <button onClick={() => { setEditingItem(null); setForm({ name: '', category: 'Consumíveis', quantity: '', min_quantity: '', unit: 'un', price: '' }); setIsModalOpen(true); }} className="px-4 py-2 bg-cyan-600 rounded-xl text-sm font-medium text-white hover:bg-cyan-700 shadow-sm shadow-cyan-200">
            <Plus className="w-4 h-4 inline mr-2" />Novo Item
          </button>
        </div>
      </header>

      {/* Stock Item Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingItem(null); }} title={editingItem ? 'Editar Item' : 'Novo Item no Estoque'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome do Produto *</label>
            <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none" placeholder="Ex: Resina A3" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categoria</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none">
                <option>Consumíveis</option><option>EPI</option><option>Medicamentos</option><option>Instrumental</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unidade</label>
              <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none">
                <option>un</option><option>caixas</option><option>pacotes</option><option>ml</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Qtd. Atual *</label>
              <input required type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Qtd. Mín *</label>
              <input required type="number" value={form.min_quantity} onChange={e => setForm({ ...form, min_quantity: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custo (R$) *</label>
              <input required type="text" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none" placeholder="0,00" />
            </div>
          </div>
          <button type="submit" className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 shadow-lg shadow-cyan-200 mt-4">Salvar</button>
        </form>
      </Modal>

      {/* Movement History Drawer */}
      <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title="Histórico de Movimentações" maxWidth="max-w-lg">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {clinicStockMovements.length === 0 ? (
            <EmptyState title="Nenhuma movimentação" description="Movimentações serão registradas automaticamente ao finalizar atendimentos." />
          ) : clinicStockMovements.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", m.type === 'in' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                {m.type === 'in' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{m.stock_item_name}</p>
                <p className="text-xs text-slate-500">{m.note} • {new Date(m.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <span className={cn("text-sm font-bold", m.type === 'in' ? "text-emerald-600" : "text-red-600")}>
                {m.type === 'in' ? '+' : '-'}{m.qty}
              </span>
            </div>
          ))}
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={handleDelete} title="Excluir Item?" message="Tem certeza que deseja excluir este item do estoque? Esta ação não pode ser desfeita." confirmLabel="Excluir" variant="danger" />

      {/* Low Stock Alert Banner */}
      {lowStockCount > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-amber-800">Alerta de Estoque Baixo</p>
              <p className="text-sm text-amber-700">{lowStockCount} item(s) estão com estoque abaixo do mínimo</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {clinicStockItems.filter(i => i.quantity <= i.min_quantity).slice(0, 5).map(item => (
              <span key={item.id} className="text-xs font-medium px-3 py-1.5 bg-white border border-amber-200 rounded-full text-amber-700">
                {item.name} ({item.quantity}/{item.min_quantity})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4"><div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl"><Package className="w-6 h-6" /></div></div>
          <p className="text-sm text-slate-500 mb-1">Total de Itens</p>
          <p className="text-2xl font-bold text-slate-900">{clinicStockItems.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4"><div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><AlertTriangle className="w-6 h-6" /></div>
            {lowStockCount > 0 && <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full animate-pulse">Atenção</span>}
          </div>
          <p className="text-sm text-slate-500 mb-1">Itens em Baixa</p>
          <p className="text-2xl font-bold text-slate-900">{lowStockCount}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4"><div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><ArrowUpRight className="w-6 h-6" /></div></div>
          <p className="text-sm text-slate-500 mb-1">Valor Total em Estoque</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalValue)}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar item..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none" />
          </div>
          <div className="flex gap-1">
            <button onClick={() => setCategoryFilter('all')} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold", categoryFilter === 'all' ? "bg-cyan-50 text-cyan-600" : "text-slate-400")}>Todos</button>
            {categories.map(c => (
              <button key={c} onClick={() => setCategoryFilter(c)} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold", categoryFilter === c ? "bg-cyan-50 text-cyan-600" : "text-slate-400")}>{c}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Item</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Qtd. Atual</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(item.unit_cost)} / {item.unit}</p>
                  </td>
                  <td className="px-6 py-4"><span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{item.category}</span></td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{item.quantity} {item.unit}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Mín: {item.min_quantity}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold", item.quantity <= item.min_quantity ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>
                      {item.quantity <= item.min_quantity ? 'Reposição Necessária' : 'Em Estoque'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(item.id)} className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteConfirm(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
