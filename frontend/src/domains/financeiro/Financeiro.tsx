import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Plus, Filter, Download, CreditCard, PieChart, Calendar, CheckCircle2, X, FileText, ExternalLink, AlertTriangle, History, Receipt, BookOpen, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useClinicStore } from '@/stores/clinicStore';
import { useAuth } from '@/hooks/useAuth';
import { toast, formatCurrency } from '@/hooks/useShared';
import { Modal, LoadingButton, EmptyState, ConfirmDialog } from '@/components/shared';
import type { FinancialTransaction } from '@/types';
import { integrationsApi } from '@/lib/integrationsApi';
import { NFePanel } from './NFePanel';
import { DREReport } from './DREReport';
import { AccountsPayableReceivable } from './AccountsPayableReceivable';

interface FinanceiroProps {
  onNavigate?: (tab: string, ctx?: any) => void;
}

export const Financeiro = React.memo(({ onNavigate }: FinanceiroProps) => {
  const { user, hasPermission } = useAuth();
  const colors = ['bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-slate-300'];

  // Triple Shielded Stable Selectors - Atomic Primitives
  const rawTransactions = useClinicStore(s => s.transactions);
  const rawProfessionals = useClinicStore(s => s.professionals);
  const navId = useClinicStore(s => s.navigationContext?.appointmentId || null);
  const fromMod = useClinicStore(s => s.navigationContext?.fromModule || null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txnType, setTxnType] = useState<'income' | 'expense'>('income');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [newTxn, setNewTxn] = useState({ description: '', amount: '', category: 'Procedimento', patient_name: '' });
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [chargeTarget, setChargeTarget] = useState<FinancialTransaction | null>(null);
  const [chargeMethod, setChargeMethod] = useState<'pix' | 'card' | 'manual'>('pix');
  const [chargeInstallments, setChargeInstallments] = useState('1');
  const [highlightedTxnId, setHighlightedTxnId] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'dre' | 'commissions' | 'nfe' | 'accounts'>('transactions');
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  
  // NFe State
  const [nfeModalOpen, setNfeModalOpen] = useState(false);
  const [selectedTxnForNfe, setSelectedTxnForNfe] = useState<FinancialTransaction | null>(null);
  const [nfeData, setNfeData] = useState({
    customerName: '',
    customerCpf: '',
    description: '',
    value: 0
  });

  const highlightRef = useRef<HTMLTableRowElement>(null);
  const clinicId = useAuth(s => s.getClinicId()) || '00000000-0000-0000-0000-000000000001';

  // ---- Data retrieval via getState() or stable dependencies ----
  const patients = useClinicStore(s => s.patients);
  const clinicPatients = useMemo(() => (patients || []).filter(p => p.clinic_id === clinicId || p.clinic_id === 'clinic-1'), [patients, clinicId]);
  const transactions = useMemo(() => {
    return (rawTransactions || []).filter(t => t.clinic_id === clinicId);
  }, [clinicId, rawTransactions]);

  const stats = useMemo(() => {
    const store = useClinicStore.getState();
    return {
      income: store.getMonthlyIncome(clinicId),
      expenses: store.getMonthlyExpenses(clinicId),
      balance: store.getBalance(clinicId)
    };
  }, [clinicId, rawTransactions]);

  const dre = useMemo(() => {
    return useClinicStore.getState().getClinicDRE(clinicId, reportMonth);
  }, [clinicId, reportMonth, rawTransactions]);

  const professionalStats = useMemo(() => {
    const store = useClinicStore.getState();
    const pros = rawProfessionals.filter(p => p.clinic_id === clinicId && p.role !== 'receptionist');
    return pros.map(p => ({
      ...p,
      stats: store.getProfessionalCommissions(p.id, reportMonth)
    }));
  }, [clinicId, rawProfessionals, reportMonth, rawTransactions]);

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];
    if (filterStatus !== 'all') result = result.filter(t => t.status === filterStatus);
    if (dateFilter) result = result.filter(t => t.created_at.startsWith(dateFilter));
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [transactions, filterStatus, dateFilter]);

  const expenseCategories = useMemo(() => {
    const cats: Record<string, number> = {};
    const list = (transactions || []).filter(t => t.type === 'expense' && t.status === 'paid');
    list.forEach(t => { cats[t.category] = (cats[t.category] || 0) + t.amount; });
    const total = Object.values(cats).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(cats).map(([label, value]) => ({
      label, value, pct: Math.round((value / total) * 100),
    })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [transactions]);

  // ---- Handlers ----
  const handleAddTransaction = useCallback(() => {
    const amount = parseFloat(newTxn.amount.replace(',', '.'));
    if (!newTxn.description || isNaN(amount)) { toast('Verifique os dados', 'warning'); return; }
    useClinicStore.getState().addTransaction({
      clinic_id: clinicId,
      type: txnType,
      category: newTxn.category,
      description: newTxn.description,
      amount,
      status: txnType === 'expense' ? 'paid' : 'pending',
      patient_name: newTxn.patient_name || undefined,
      idempotency_key: `manual:${Date.now()}`
    });
    setIsModalOpen(false);
    setNewTxn({ description: '', amount: '', category: 'Procedimento', patient_name: '' });
    toast('Transação registrada!');
  }, [clinicId, newTxn, txnType]);

  const handleProcessPayment = useCallback(async (id: string) => {
    const txn = useClinicStore.getState().transactions.find(t => t.id === id);
    if (!txn) return;
    if (txn.asaas_payment_id) {
      setReconciling(true);
      try {
        const res = await integrationsApi.reconcileAsaas({ items: [{ transaction_id: txn.id, payment_id: txn.asaas_payment_id }] });
        const upd = res?.updates?.[0];
        if (upd) {
          useClinicStore.getState().reconcileTransaction(txn.id, upd.next_status, { asaas_status: upd.asaas_status, paid_at: upd.paid_at });
          toast('Atualizado via Asaas!');
          return;
        }
      } catch (e) {
        console.error(e);
      } finally {
        setReconciling(false);
      }
    }
    useClinicStore.getState().processPayment(id, 'manual');
    toast('Pago!');
  }, []);

  const handleConfirmCharge = useCallback(async () => {
    if (!chargeTarget) return;
    const installments = parseInt(chargeInstallments, 10) || 1;
    useClinicStore.getState().generatePayment(chargeTarget.id, chargeMethod, chargeMethod === 'card' ? installments : 1);
    try {
      const result = await integrationsApi.createAsaasCharge({
        patient: { 
          id: chargeTarget.patient_id || 'manual', 
          name: chargeTarget.patient_name || 'Paciente', 
          phone: clinicPatients.find(p => p.id === chargeTarget.patient_id)?.phone || '', 
          email: clinicPatients.find(p => p.id === chargeTarget.patient_id)?.email || '' 
        },
        transaction: { ...chargeTarget, method: chargeMethod, installments: chargeMethod === 'card' ? installments : 1 },
        config: { environment: 'sandbox' }
      });
      useClinicStore.getState().setTransactionAsaasData(chargeTarget.id, {
        asaas_payment_id: result.payment?.id,
        asaas_status: result.payment?.status,
        pix_code: result.payment?.pixCopyPaste
      });
      toast('Cobrança Asaas gerada!');
    } catch (e) { toast('Erro Asaas. Usando manual.', 'info'); }
    setChargeModalOpen(false);
  }, [chargeTarget, chargeInstallments, chargeMethod]);

  const handleOpenNfeModal = useCallback((txn: FinancialTransaction) => {
    setSelectedTxnForNfe(txn);
    setNfeData({
      customerName: txn.patient_name || '',
      customerCpf: '',
      description: txn.description,
      value: txn.amount
    });
    setNfeModalOpen(true);
  }, []);

  const handleGenerateNfe = useCallback(() => {
    if (!nfeData.customerName || !nfeData.value) {
      toast('Preencha os dados obrigatórios', 'warning');
      return;
    }
    toast(`NFe gerada para ${nfeData.customerName} - ${formatCurrency(nfeData.value)}`);
    setNfeModalOpen(false);
    setSelectedTxnForNfe(null);
  }, [nfeData]);

  const handleExportCSV = useCallback(() => {
    const headers = ['DATA', 'TIPO', 'CATEGORIA', 'DESCRIÇÃO', 'VALOR', 'STATUS', 'PACIENTE', 'FORMA_PAGAMENTO', 'ID_TRANSAÇÃO'];
    const rows = transactions.map(t => {
      const date = new Date(t.created_at);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const dateStr = `${day}/${month}/${year}`;
      const typeStr = t.type === 'income' ? 'RECEITA' : 'DESPESA';
      const statusStr = t.status === 'paid' ? 'PAGO' : t.status === 'pending' ? 'PENDENTE' : 'AGUARDANDO';
      const amountStr = String(t.amount).replace('.', ',');
      return [
        dateStr,
        typeStr,
        t.category.toUpperCase(),
        `"${t.description.replace(/"/g, '""')}"`,
        amountStr,
        statusStr,
        `"${t.patient_name || '-'}"`,
        t.payment_method || '-',
        t.id
      ].join(';');
    });
    const csv = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `financeiro_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    toast('Exportado!');
  }, [transactions]);

  // ---- Navigation Sync ----
  useEffect(() => {
    if (navId && fromMod === 'prontuarios') {
      const txn = useClinicStore.getState().transactions.find(t => t.appointment_id === navId && t.type === 'income');
      if (txn) {
        setHighlightedTxnId(txn.id);
        setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
        setTimeout(() => setHighlightedTxnId(null), 5000);
      }
      const timer = setTimeout(() => useClinicStore.getState().clearNavigationContext(), 1000);
      return () => clearTimeout(timer);
    }
  }, [navId, fromMod]);

  if (!hasPermission('view_financial')) {
    return <EmptyState title="Acesso Restrito" description="Consulte o administrador para acesso financeiro." />;
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
          <p className="text-slate-500">Gestão de fluxo de caixa, DRE, comissões, NFe e contas.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4 inline mr-2" />Exportar
          </button>
          <button
            onClick={() => { setTxnType('income'); setIsModalOpen(true); }}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4 inline mr-2" />Nova Receita
          </button>
          <button
            onClick={() => { setTxnType('expense'); setIsModalOpen(true); }}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-200 hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4 inline mr-2" />Nova Despesa
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Receita Mensal', value: stats.income, icon: TrendingUp, color: 'emerald' },
          { label: 'Despesas Mensais', value: stats.expenses, icon: TrendingDown, color: 'red' },
          { label: 'Saldo em Caixa', value: stats.balance, icon: DollarSign, color: 'blue' }
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                item.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
                  item.color === 'red' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
              )}>
                <item.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{item.label}</p>
                <p className="text-2xl font-black text-slate-900">{formatCurrency(item.value)}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-white border border-slate-100 rounded-2xl p-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'transactions', label: 'Transações', icon: History },
          { id: 'dre', label: 'DRE (Resultados)', icon: FileText },
          { id: 'commissions', label: 'Comissões Profissionais', icon: PieChart },
          { id: 'nfe', label: 'NFe', icon: Receipt },
          { id: 'accounts', label: 'Contas', icon: BookOpen }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === tab.id ? "bg-cyan-50 text-cyan-700 shadow-sm" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'transactions' && (
          <motion.div key="txns" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="font-bold text-slate-900">Histórico de Movimentações</h2>
              <div className="flex gap-2">
                <input type="month" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-cyan-500/20" />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-cyan-500/20">
                  <option value="all">Todos os Status</option>
                  <option value="paid">Pago / Concluído</option>
                  <option value="pending">Aguardando Pagamento</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descrição</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categoria</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Valor</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center text-slate-400">Nenhuma transação encontrada.</td>
                      </tr>
                    ) : filteredTransactions.map(t => (
                      <tr
                        key={t.id}
                        ref={highlightedTxnId === t.id ? highlightRef : null}
                        className={cn(
                          "border-b border-slate-50 hover:bg-slate-50/50 transition-colors group",
                          highlightedTxnId === t.id && "bg-cyan-50 animate-pulse ring-2 ring-cyan-200 ring-inset"
                        )}
                      >
                        <td className="px-6 py-4 text-xs text-slate-500">{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900">{t.description}</p>
                          {t.patient_name && <p className="text-[10px] font-medium text-slate-400">Paciente: {t.patient_name}</p>}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold">{t.category}</span>
                        </td>
                        <td className={cn("px-6 py-4 text-sm font-black text-right", t.type === 'income' ? 'text-emerald-600' : 'text-red-500')}>
                          {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <div className={cn("w-1.5 h-1.5 rounded-full",
                              t.status === 'paid' ? 'bg-emerald-500' :
                                t.status === 'pending' ? 'bg-amber-500' : 'bg-blue-500'
                            )} />
                            <span className="text-xs font-bold text-slate-600">
                              {t.status === 'paid' ? 'Pago' : t.status === 'pending' ? 'Pendente' : 'Aguardando'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {t.status !== 'paid' && (
                              <button
                                onClick={() => handleProcessPayment(t.id)}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                                title="Confirmar Pagamento"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            {t.status === 'pending' && t.type === 'income' && (
                              <button
                                onClick={() => { setChargeTarget(t); setChargeModalOpen(true); }}
                                className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-xl transition-colors"
                                title="Gerar Cobrança"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                            )}
                            {t.status === 'paid' && t.type === 'income' && (
                              <button
                                onClick={() => handleOpenNfeModal(t)}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                                title="Emitir NFe"
                              >
                                <Receipt className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'dre' && (
          <motion.div key="dre" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <DREReport clinicId={clinicId} />
          </motion.div>
        )}

        {activeTab === 'commissions' && (
          <motion.div key="comm" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Comissões de Profissionais</h2>
              <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {professionalStats.map((p, i) => (
                <div key={p.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold", colors[i % colors.length])}>
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{p.role === 'dentist' ? 'Dentista' : 'Esteticista'} • {p.commission_pct || 0}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Produzido</p>
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(p.stats.total_produced)}</p>
                    </div>
                    <div className="bg-cyan-50/50 p-3 rounded-2xl">
                      <p className="text-[9px] font-bold text-cyan-600 uppercase mb-1">A Receber</p>
                      <p className="text-sm font-bold text-cyan-700">{formatCurrency(p.stats.commission_amount)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
                    <span>Atendimentos</span>
                    <span className="font-bold text-slate-700">{p.stats.appointment_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'nfe' && (
          <motion.div key="nfe" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <NFePanel clinicId={clinicId} />
          </motion.div>
        )}

        {activeTab === 'accounts' && (
          <motion.div key="accounts" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <AccountsPayableReceivable clinicId={clinicId} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals for Add / Charge */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Lançar ${txnType === 'income' ? 'Receita' : 'Despesa'}`}>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Descrição</label>
            <input type="text" value={newTxn.description} onChange={e => setNewTxn({ ...newTxn, description: e.target.value })} className="w-full px-4 py-2 bg-slate-50 rounded-xl outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Valor</label>
              <input type="text" value={newTxn.amount} onChange={e => setNewTxn({ ...newTxn, amount: e.target.value })} placeholder="0,00" className="w-full px-4 py-2 bg-slate-50 rounded-xl outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Categoria</label>
              <select value={newTxn.category} onChange={e => setNewTxn({ ...newTxn, category: e.target.value })} className="w-full px-4 py-2 bg-slate-50 rounded-xl outline-none">
                {txnType === 'income' ? (
                  ['Procedimento', 'Venda Produto', 'Outros'].map(c => <option key={c} value={c}>{c}</option>)
                ) : (
                  ['Aluguel', 'Salários', 'Material', 'Marketing', 'Energia', 'Outros'].map(c => <option key={c} value={c}>{c}</option>)
                )}
              </select>
            </div>
          </div>
          {txnType === 'income' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Paciente (Opcional)</label>
              <input type="text" value={newTxn.patient_name} onChange={e => setNewTxn({ ...newTxn, patient_name: e.target.value })} className="w-full px-4 py-2 bg-slate-50 rounded-xl outline-none" />
            </div>
          )}
          <button onClick={handleAddTransaction} className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl shadow-lg mt-2">Confirmar Lançamento</button>
        </div>
      </Modal>

      <Modal isOpen={chargeModalOpen} onClose={() => setChargeModalOpen(false)} title="Gerar Cobrança Asaas">
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-2xl mb-4">
            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Destino</p>
            <p className="font-bold text-slate-900">{chargeTarget?.patient_name || 'Paciente Manual'}</p>
            <p className="text-lg font-black text-cyan-600">{formatCurrency(chargeTarget?.amount || 0)}</p>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase">Método de Pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'pix', label: 'Pix' },
                { id: 'card', label: 'Cartão' },
                { id: 'manual', label: 'Manual' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setChargeMethod(m.id as any)}
                  className={cn(
                    "py-3 rounded-xl border text-sm font-bold transition-all",
                    chargeMethod === m.id ? "bg-cyan-50 border-cyan-500 text-cyan-700" : "bg-white border-slate-100 text-slate-500"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {chargeMethod === 'card' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Parcelas</label>
              <select value={chargeInstallments} onChange={e => setChargeInstallments(e.target.value)} className="w-full px-4 py-2 bg-slate-50 rounded-xl outline-none font-bold">
                {[1, 2, 3, 4, 5, 6, 10, 12].map(i => <option key={i} value={i}>{i}x sem juros</option>)}
              </select>
            </div>
          )}
          <button onClick={handleConfirmCharge} className="w-full py-4 bg-cyan-600 text-white font-bold rounded-2xl shadow-xl shadow-cyan-100 hover:bg-cyan-700 transition-all flex items-center justify-center gap-2">
            <CreditCard className="w-5 h-5" /> Confirmar e Enviar Cobrança
          </button>
        </div>
      </Modal>

      {/* NFe Modal */}
      <Modal isOpen={nfeModalOpen} onClose={() => setNfeModalOpen(false)} title="Emitir Nota Fiscal Eletrônica">
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-2xl mb-4">
            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Sobre a transação</p>
            <p className="font-bold text-slate-900">{selectedTxnForNfe?.description}</p>
            <p className="text-lg font-black text-cyan-600">{formatCurrency(selectedTxnForNfe?.amount || 0)}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Nome do Cliente *</label>
              <input type="text" value={nfeData.customerName} onChange={e => setNfeData({ ...nfeData, customerName: e.target.value })} className="w-full px-4 py-2 bg-slate-50 rounded-xl outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">CPF/CNPJ</label>
              <input type="text" value={nfeData.customerCpf} onChange={e => setNfeData({ ...nfeData, customerCpf: e.target.value })} placeholder="000.000.000-00" className="w-full px-4 py-2 bg-slate-50 rounded-xl outline-none" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Descrição do Serviço</label>
            <input type="text" value={nfeData.description} onChange={e => setNfeData({ ...nfeData, description: e.target.value })} className="w-full px-4 py-2 bg-slate-50 rounded-xl outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Valor *</label>
            <input type="number" value={nfeData.value} onChange={e => setNfeData({ ...nfeData, value: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-2 bg-slate-50 rounded-xl outline-none font-bold" />
          </div>
          <button onClick={handleGenerateNfe} className="w-full py-4 bg-purple-600 text-white font-bold rounded-2xl shadow-xl shadow-purple-100 hover:bg-purple-700 transition-all flex items-center justify-center gap-2">
            <Receipt className="w-5 h-5" /> Gerar NFe
          </button>
        </div>
      </Modal>

      {reconciling && (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-[100] flex items-center justify-center">
          <div className="bg-white p-6 rounded-3xl shadow-2xl flex items-center gap-4 border border-slate-100">
            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
            <p className="font-bold text-slate-800">Sincronizando com Asaas...</p>
          </div>
        </div>
      )}
    </div>
  );
});
