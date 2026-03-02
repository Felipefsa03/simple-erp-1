import React from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle,
  MoreHorizontal,
  X,
  CheckCircle2,
  Trash2,
  Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const initialStock = [
  { id: 1, name: 'Resina Composta A2', category: 'Consumíveis', quantity: 45, minQuantity: 10, unit: 'un', price: 'R$ 85,00' },
  { id: 2, name: 'Luvas de Procedimento (M)', category: 'EPI', quantity: 12, minQuantity: 20, unit: 'caixas', price: 'R$ 45,00' },
  { id: 3, name: 'Anestésico Lidocaína', category: 'Medicamentos', quantity: 8, minQuantity: 15, unit: 'caixas', price: 'R$ 120,00' },
  { id: 4, name: 'Máscara Descartável', category: 'EPI', quantity: 150, minQuantity: 50, unit: 'un', price: 'R$ 1,50' },
  { id: 5, name: 'Sugador Descartável', category: 'Consumíveis', quantity: 500, minQuantity: 100, unit: 'un', price: 'R$ 0,25' },
];

export function Estoque() {
  const [items, setItems] = React.useState(initialStock);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any>(null);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState('');
  const [newItem, setNewItem] = React.useState({
    name: '',
    category: 'Consumíveis',
    quantity: '',
    minQuantity: '',
    unit: 'un',
    price: ''
  });

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      setItems(items.map(i => i.id === editingItem.id ? {
        ...i,
        name: newItem.name,
        category: newItem.category,
        quantity: Number(newItem.quantity),
        minQuantity: Number(newItem.minQuantity),
        unit: newItem.unit,
        price: newItem.price.startsWith('R$') ? newItem.price : `R$ ${newItem.price}`
      } : i));
      triggerSuccess('Item atualizado com sucesso!');
    } else {
      const item = {
        id: items.length + 1,
        name: newItem.name,
        category: newItem.category,
        quantity: Number(newItem.quantity),
        minQuantity: Number(newItem.minQuantity),
        unit: newItem.unit,
        price: `R$ ${newItem.price}`
      };
      setItems([item, ...items]);
      triggerSuccess('Item adicionado ao estoque!');
    }
    setIsModalOpen(false);
    setEditingItem(null);
    setNewItem({ name: '', category: 'Consumíveis', quantity: '', minQuantity: '', unit: 'un', price: '' });
  };

  const handleDeleteItem = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este item?')) {
      setItems(items.filter(i => i.id !== id));
      triggerSuccess('Item excluído com sucesso!');
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      category: item.category,
      quantity: item.quantity.toString(),
      minQuantity: item.minQuantity.toString(),
      unit: item.unit,
      price: item.price.replace('R$ ', '')
    });
    setIsModalOpen(true);
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
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Estoque</h1>
          <p className="text-slate-500">Controle seus insumos, materiais e medicamentos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 rounded-xl text-sm font-medium text-white hover:bg-cyan-700 transition-colors shadow-sm shadow-cyan-200"
        >
          <Plus className="w-4 h-4" />
          Novo Item
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
                <h3 className="text-lg font-bold text-slate-900">{editingItem ? 'Editar Item' : 'Novo Item no Estoque'}</h3>
                <button onClick={() => { setIsModalOpen(false); setEditingItem(null); }} className="p-2 hover:bg-white rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleAddItem} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome do Produto</label>
                  <input 
                    required
                    type="text" 
                    value={newItem.name}
                    onChange={e => setNewItem({...newItem, name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" 
                    placeholder="Ex: Resina A3"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categoria</label>
                    <select 
                      value={newItem.category}
                      onChange={e => setNewItem({...newItem, category: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none"
                    >
                      <option>Consumíveis</option>
                      <option>EPI</option>
                      <option>Medicamentos</option>
                      <option>Instrumental</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unidade</label>
                    <select 
                      value={newItem.unit}
                      onChange={e => setNewItem({...newItem, unit: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none"
                    >
                      <option>un</option>
                      <option>caixas</option>
                      <option>pacotes</option>
                      <option>ml</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Qtd. Atual</label>
                    <input 
                      required
                      type="number" 
                      value={newItem.quantity}
                      onChange={e => setNewItem({...newItem, quantity: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Qtd. Mínima</label>
                    <input 
                      required
                      type="number" 
                      value={newItem.minQuantity}
                      onChange={e => setNewItem({...newItem, minQuantity: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preço Unitário (R$)</label>
                  <input 
                    required
                    type="text" 
                    value={newItem.price}
                    onChange={e => setNewItem({...newItem, price: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" 
                    placeholder="0,00"
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-200 mt-4">
                  Salvar no Estoque
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-1">Total de Itens</p>
          <p className="text-2xl font-bold text-slate-900">{items.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Atenção</span>
          </div>
          <p className="text-sm text-slate-500 mb-1">Itens em Baixa</p>
          <p className="text-2xl font-bold text-slate-900">{items.filter(i => i.quantity <= i.minQuantity).length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-1">Valor Total em Estoque</p>
          <p className="text-2xl font-bold text-slate-900">R$ 12.450,00</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar item..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none"
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>
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
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.price} / {item.unit}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{item.quantity} {item.unit}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Mín: {item.minQuantity}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                      item.quantity <= item.minQuantity 
                        ? "bg-red-50 text-red-700" 
                        : "bg-emerald-50 text-emerald-700"
                    )}>
                      {item.quantity <= item.minQuantity ? 'Reposição Necessária' : 'Em Estoque'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleEditItem(item)}
                        className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
