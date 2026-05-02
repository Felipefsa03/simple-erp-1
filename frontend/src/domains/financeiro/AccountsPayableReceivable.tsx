import { useState, useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Filter, Plus, Check, X, Calendar, DollarSign, Trash2, Save, Edit3 } from 'lucide-react';
import { cn, uid, formatCurrency } from '@/lib/utils';
import { useClinicStore } from '@/stores/clinicStore';
import { toast } from '@/hooks/useShared';
import { Modal, ConfirmDialog } from '@/components/shared';
import type { Account, AccountStatus } from '@/types/index';

interface AccountsPayableReceivableProps {
  clinicId?: string;
}

export function AccountsPayableReceivable({ clinicId }: AccountsPayableReceivableProps) {
  const { accounts, addAccount, updateAccount, deleteAccount, markAccountPaid } = useClinicStore();
  const [activeTab, setActiveTab] = useState<'receivable' | 'payable'>('receivable');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Account>>({});
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return accounts.map(a => ({
      ...a,
      status: a.status !== 'paid' && a.due_date < today && a.paid < a.value ? 'overdue' as AccountStatus : a.status
    })).filter(a => {
      if (clinicId && a.clinic_id !== clinicId) return false;
      if (a.type !== activeTab) return false;
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      return true;
    });
  }, [accounts, activeTab, filterStatus, clinicId]);

  const summary = useMemo(() => {
    const items = accounts.filter(a => a.type === activeTab && (!clinicId || a.clinic_id === clinicId));
    const total = items.reduce((s, a) => s + a.value, 0);
    const paid = items.filter(a => a.status === 'paid').reduce((s, a) => s + a.paid, 0);
    const pending = items.filter(a => a.status === 'pending').reduce((s, a) => s + (a.value - a.paid), 0);
    const partial = items.filter(a => a.status === 'partial').reduce((s, a) => s + (a.value - a.paid), 0);
    const overdue = items.filter(a => a.status === 'overdue').reduce((s, a) => s + (a.value - a.paid), 0);
    return { total, paid, pending, partial, overdue };
  }, [accounts, activeTab, clinicId]);

  const openNew = () => {
    setEditing(null);
    setForm({ type: activeTab, description: '', counterparty: '', value: 0, paid: 0, due_date: '', status: 'pending', category: activeTab === 'receivable' ? 'consultation' : 'rent' });
    setShowModal(true);
  };

  const openEdit = (acc: Account) => {
    setEditing(acc);
    setForm({ ...acc });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.description?.trim()) { toast('Descrição é obrigatória.', 'error'); return; }
    if (!form.value || form.value <= 0) { toast('Valor deve ser maior que zero.', 'error'); return; }
    if (!form.due_date) { toast('Data de vencimento é obrigatória.', 'error'); return; }

    const paid = form.paid || 0;
    const status: AccountStatus = paid >= (form.value || 0) ? 'paid' : paid > 0 ? 'partial' : 'pending';

    if (editing) {
      updateAccount(editing.id, { ...form, status });
      toast('Conta atualizada!', 'success');
    } else {
      addAccount({
        type: form.type || activeTab,
        description: form.description!,
        counterparty: form.counterparty || '',
        value: form.value!,
        paid: paid,
        due_date: form.due_date!,
        status,
        category: form.category || 'other',
        clinic_id: clinicId || '',
      });
      toast('Conta cadastrada!', 'success');
    }
    setShowModal(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteAccount(deleteId);
      toast('Conta removida.', 'success');
      setDeleteId(null);
    }
  };

  const markAsPaid = (id: string) => {
    markAccountPaid(id);
    toast('Conta marcada como paga!', 'success');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'partial': return 'bg-brand-100 text-brand-700';
      case 'paid': return 'bg-green-100 text-green-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'partial': return 'Parcial';
      case 'paid': return 'Pago';
      case 'overdue': return 'Vencido';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-brand-600" />
            Contas a Pagar/Receber
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie suas contas a pagar e receber</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium text-sm">
          <Plus className="w-4 h-4" /> Nova Conta
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setActiveTab('receivable')} className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
          activeTab === 'receivable' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        )}>
          <ArrowUpRight className="w-4 h-4" /> A Receber
        </button>
        <button onClick={() => setActiveTab('payable')} className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
          activeTab === 'payable' ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        )}>
          <ArrowDownRight className="w-4 h-4" /> A Pagar
        </button>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="ml-auto px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none">
          <option value="all">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="partial">Parcial</option>
          <option value="paid">Pago</option>
          <option value="overdue">Vencido</option>
        </select>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500 mb-1">Total</p>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(summary.total)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500 mb-1">Pendente</p>
          <p className="text-xl font-bold text-yellow-600">{formatCurrency(summary.pending)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500 mb-1">Vencido</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(summary.overdue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500 mb-1">{activeTab === 'receivable' ? 'Recebido' : 'Pago'}</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(summary.paid)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">{activeTab === 'receivable' ? 'Paciente' : 'Fornecedor'}</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(acc => (
              <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{acc.description}</td>
                <td className="px-4 py-3 text-slate-600">{acc.counterparty}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{formatCurrency(acc.value)}</div>
                  {acc.paid > 0 && acc.paid < acc.value && (
                    <div className="text-xs text-brand-600">Pago: {formatCurrency(acc.paid)}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{acc.due_date.split('-').reverse().join('/')}</td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold", getStatusColor(acc.status))}>
                    {getStatusLabel(acc.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {acc.status !== 'paid' && (
                      <button onClick={() => markAsPaid(acc.id)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Marcar como pago">
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => openEdit(acc)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(acc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400">Nenhuma conta encontrada.</div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Conta' : 'Nova Conta'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição *</label>
            <input type="text" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" placeholder="Ex: Consulta - João Silva" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">{activeTab === 'receivable' ? 'Paciente/Cliente' : 'Fornecedor'}</label>
            <input type="text" value={form.counterparty || ''} onChange={e => setForm(f => ({ ...f, counterparty: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" placeholder="Nome" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Valor *</label>
              <input type="number" step="0.01" min="0" value={form.value || ''} onChange={e => setForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" placeholder="0,00" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Vencimento *</label>
              <input type="date" value={form.due_date || ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Valor Pago</label>
            <input type="number" step="0.01" min="0" value={form.paid || ''} onChange={e => setForm(f => ({ ...f, paid: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" placeholder="0,00" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Categoria</label>
            <select value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm">
              {activeTab === 'receivable' ? (
                <>
                  <option value="consultation">Consulta</option>
                  <option value="procedure">Procedimento</option>
                  <option value="exam">Exame</option>
                  <option value="material">Material</option>
                  <option value="other">Outro</option>
                </>
              ) : (
                <>
                  <option value="rent">Aluguel</option>
                  <option value="salary">Salário</option>
                  <option value="supplies">Fornecimento</option>
                  <option value="software">Software</option>
                  <option value="utilities">Utilidades</option>
                  <option value="other">Outro</option>
                </>
              )}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors text-sm font-medium">
              <Save className="w-4 h-4" /> {editing ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Remover Conta" message="Tem certeza que deseja remover esta conta?" confirmLabel="Remover" variant="danger" />
    </div>
  );
}
