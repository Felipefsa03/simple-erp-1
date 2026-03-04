import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Plus, Filter, Download, CreditCard, PieChart, Calendar, CheckCircle2, X, FileText, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useClinicStore } from '@/stores/clinicStore';
import { useAuth } from '@/hooks/useAuth';
import { toast, formatCurrency, useSubmitOnce } from '@/hooks/useShared';
import { Modal, LoadingButton, EmptyState, ConfirmDialog } from '@/components/shared';
import type { FinancialTransaction } from '@/types';

interface FinanceiroProps {
  onNavigate?: (tab: string, ctx?: any) => void;
}

export function Financeiro({ onNavigate }: FinanceiroProps) {
  const { user, hasPermission } = useAuth();
  const {
    transactions,
    addTransaction,
    processPayment,
    generatePayment,
    getMonthlyIncome,
    getMonthlyExpenses,
    getBalance,
    navigationContext,
    clearNavigationContext,
  } = useClinicStore();
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
  const highlightRef = useRef<HTMLDivElement>(null);

  // Handle navigation context — highlight appointment transaction
  useEffect(() => {
    if (navigationContext.appointmentId && navigationContext.fromModule === 'prontuarios') {
      const txn = transactions.find(t => t.appointment_id === navigationContext.appointmentId && t.type === 'income');
      if (txn) {
        setHighlightedTxnId(txn.id);
        // Scroll to highlighted after a brief delay for DOM update
        setTimeout(() => {
          highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
        // Clear highlight after 5 seconds
        setTimeout(() => setHighlightedTxnId(null), 5000);
      }
      clearNavigationContext();
    }
  }, [navigationContext, transactions, clearNavigationContext]);

  const clinicId = user?.clinic_id || 'clinic-1';
  const canView = hasPermission('view_financial');
  const canManage = hasPermission('manage_financial');

  const monthlyIncome = getMonthlyIncome(clinicId);
  const monthlyExpenses = getMonthlyExpenses(clinicId);
  const balance = getBalance(clinicId);

  if (!canView) {
    return (
      <EmptyState
        title="Acesso restrito"
        description="Você não tem permissão para visualizar o financeiro."
      />
    );
  }

  const filteredTransactions = useMemo(() => {
    let result = transactions.filter(t => t.clinic_id === clinicId);
    if (filterStatus !== 'all') result = result.filter(t => t.status === filterStatus);
    if (dateFilter) result = result.filter(t => t.created_at.startsWith(dateFilter));
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [transactions, filterStatus, dateFilter, clinicId]);

  const expenseCategories = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense' && t.status === 'paid' && t.clinic_id === clinicId)
      .forEach(t => {
        cats[t.category] = (cats[t.category] || 0) + t.amount;
      });
    const total = Object.values(cats).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(cats).map(([label, value]) => ({
      label, value, pct: Math.round((value / total) * 100),
    })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [transactions]);

  const handleAddTransaction = () => {
    if (!canManage) { toast('Você não tem permissão para lançar transações.', 'error'); return; }
    if (!newTxn.description || !newTxn.amount) { toast('Preencha descrição e valor', 'error'); return; }
    addTransaction({
      clinic_id: clinicId,
      type: txnType,
      category: newTxn.category,
      description: newTxn.description,
      amount: parseFloat(newTxn.amount.replace(',', '.')),
      status: txnType === 'expense' ? 'paid' : 'pending',
      patient_name: newTxn.patient_name || undefined,
      idempotency_key: `manual:${Date.now()}`,
    });
    setIsModalOpen(false);
    setNewTxn({ description: '', amount: '', category: 'Procedimento', patient_name: '' });
    toast(`${txnType === 'income' ? 'Receita' : 'Despesa'} registrada com sucesso!`);
  };

  const { submit: handleProcessPayment, loading: paymentLoading } = useSubmitOnce(async (id: string) => {
    if (!canManage) { toast('Você não tem permissão para processar pagamentos.', 'error'); return; }
    await new Promise(r => setTimeout(r, 400));
    processPayment(id, 'manual');
    toast('Pagamento processado com sucesso!');
  });

  const handleOpenCharge = (txn: FinancialTransaction) => {
    if (!canManage) {
      toast('Você não tem permissão para gerar cobranças.', 'error');
      return;
    }
    setChargeTarget(txn);
    setChargeMethod('pix');
    setChargeInstallments('1');
    setChargeModalOpen(true);
  };

  const handleConfirmCharge = () => {
    if (!chargeTarget) return;
    const installments = Math.max(1, parseInt(chargeInstallments, 10) || 1);
    generatePayment(chargeTarget.id, chargeMethod, chargeMethod === 'card' ? installments : 1);
    toast('Cobrança gerada com sucesso!');
    setChargeModalOpen(false);
    setChargeTarget(null);
  };

  const handleExportDRE = () => {
    const income = transactions
      .filter(t => t.type === 'income' && t.status === 'paid' && t.clinic_id === clinicId)
      .reduce((s, t) => s + t.amount, 0);
    const expenses = transactions
      .filter(t => t.type === 'expense' && t.status === 'paid' && t.clinic_id === clinicId)
      .reduce((s, t) => s + t.amount, 0);
    const csv = [
      'Tipo,Categoria,Descrição,Valor,Status,Data',
      ...transactions
        .filter(t => t.clinic_id === clinicId)
        .map(t => `${t.type},${t.category},"${t.description}",${t.amount},${t.status},${t.created_at}`),
      '',
      `RECEITA TOTAL,,, ${income},,`,
      `DESPESA TOTAL,,, ${expenses},,`,
      `RESULTADO,,, ${income - expenses},,`,
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'DRE-LuminaFlow.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('Relatório DRE exportado!');
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    paid: 'Pago',
    awaiting_payment: 'Aguardando',
    cancelled: 'Cancelado',
    refunded: 'Estornado',
  };

  const colors = ['bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-slate-300'];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
          <p className="text-slate-500">Controle seu fluxo de caixa e faturamento em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportDRE} className="flex-1 md:flex-none px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Download className="w-4 h-4 inline mr-2" />Exportar DRE
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={!canManage}
            className="flex-1 md:flex-none px-4 py-2 bg-cyan-600 rounded-xl text-sm font-medium text-white hover:bg-cyan-700 shadow-sm shadow-cyan-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 inline mr-2" />Novo Lançamento
          </button>
        </div>
      </header>

      {/* New Transaction Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Lançamento">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setTxnType('income')} className={cn("py-3 font-bold rounded-xl border-2 transition-all", txnType === 'income' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-400 border-slate-100")}>Receita</button>
            <button onClick={() => setTxnType('expense')} className={cn("py-3 font-bold rounded-xl border-2 transition-all", txnType === 'expense' ? "bg-red-50 text-red-700 border-red-200" : "bg-white text-slate-400 border-slate-100")}>Despesa</button>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição *</label>
            <input type="text" value={newTxn.description} onChange={e => setNewTxn({ ...newTxn, description: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" placeholder="Ex: Pagamento Ana Paula" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor (R$) *</label>
              <input type="text" value={newTxn.amount} onChange={e => setNewTxn({ ...newTxn, amount: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" placeholder="0,00" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categoria</label>
              <select value={newTxn.category} onChange={e => setNewTxn({ ...newTxn, category: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none">
                {txnType === 'income' ? (
                  <>{['Procedimento', 'Consulta', 'Atendimento', 'Outro'].map(c => <option key={c}>{c}</option>)}</>
                ) : (
                  <>{['Material', 'Aluguel', 'Marketing', 'Equipamento', 'Folha', 'Outro'].map(c => <option key={c}>{c}</option>)}</>
                )}
              </select>
            </div>
          </div>
          {txnType === 'income' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paciente (Opcional)</label>
              <input type="text" value={newTxn.patient_name} onChange={e => setNewTxn({ ...newTxn, patient_name: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none" placeholder="Nome do paciente" />
            </div>
          )}
          <button
            onClick={handleAddTransaction}
            disabled={!canManage}
            className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 shadow-lg shadow-cyan-200 mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Confirmar Lançamento
          </button>
        </div>
      </Modal>

      <Modal isOpen={chargeModalOpen} onClose={() => setChargeModalOpen(false)} title="Gerar Cobrança">
        <div className="space-y-4">
          {chargeTarget && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500">Paciente</p>
              <p className="text-sm font-bold text-slate-900">{chargeTarget.patient_name || 'Paciente não informado'}</p>
              <p className="text-xs text-slate-500 mt-2">Valor</p>
              <p className="text-sm font-bold text-slate-900">{formatCurrency(chargeTarget.amount)}</p>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Método</label>
            <select value={chargeMethod} onChange={e => setChargeMethod(e.target.value as 'pix' | 'card' | 'manual')} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none">
              <option value="pix">Pix</option>
              <option value="card">Cartão</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          {chargeMethod === 'card' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parcelas</label>
              <input
                type="number"
                min={1}
                max={12}
                value={chargeInstallments}
                onChange={e => setChargeInstallments(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none"
              />
            </div>
          )}
          <button
            onClick={handleConfirmCharge}
            disabled={!chargeTarget}
            className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Gerar Cobrança
          </button>
        </div>
      </Modal>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp className="w-6 h-6" /></div>
          </div>
          <p className="text-sm text-slate-500 mb-1">Receita Mensal</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(monthlyIncome)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl"><TrendingDown className="w-6 h-6" /></div>
          </div>
          <p className="text-sm text-slate-500 mb-1">Despesas Mensais</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(monthlyExpenses)}</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-white/10 text-white rounded-xl"><DollarSign className="w-6 h-6" /></div>
          </div>
          <p className="text-sm text-slate-400 mb-1">Saldo em Caixa</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(balance)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Filters */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Transações</h2>
            <div className="flex items-center gap-2">
              <input type="month" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none" />
              <div className="flex gap-1">
                {['all', 'paid', 'pending', 'awaiting_payment'].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)} className={cn("px-2 py-1 rounded-lg text-[10px] font-bold transition-all", filterStatus === s ? "bg-cyan-50 text-cyan-600" : "text-slate-400 hover:text-slate-600")}>
                    {s === 'all' ? 'Todos' : statusLabels[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-50">
              {filteredTransactions.length === 0 ? (
                <EmptyState title="Nenhuma transação" description="Adicione lançamentos para acompanhar suas finanças." />
              ) : filteredTransactions.map(t => (
                <React.Fragment key={t.id}>
                  <div
                    ref={t.id === highlightedTxnId ? highlightRef : undefined}
                    className={cn("p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors", t.id === highlightedTxnId && "bg-cyan-50 ring-2 ring-cyan-400 ring-inset rounded-xl")}
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                      {t.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{t.description}</p>
                      <p className="text-xs text-slate-500">{t.category} • {new Date(t.created_at).toLocaleDateString('pt-BR')}{t.professional_name ? ` • ${t.professional_name}` : ''}</p>
                      {t.type === 'income' && typeof t.material_cost === 'number' && (
                        <p className="text-[10px] text-slate-400">
                          Custo material {formatCurrency(t.material_cost)} · Margem {formatCurrency(t.amount - t.material_cost)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {t.appointment_id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onNavigate?.('prontuarios', { patientId: t.patient_id, appointmentId: t.appointment_id }); }}
                          className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all" title="Ver Prontuário"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                      <div className="text-right">
                        <p className={cn("text-sm font-bold", t.type === 'income' ? "text-emerald-600" : "text-red-600")}>
                          {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                        </p>
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md",
                          t.status === 'paid' ? "bg-emerald-50 text-emerald-600" :
                            t.status === 'awaiting_payment' ? "bg-cyan-50 text-cyan-600" :
                              t.status === 'pending' ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
                        )}>
                          {statusLabels[t.status] || t.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  {t.type === 'income' && t.status === 'pending' && (
                    <div className="px-4 pb-4 pt-0 flex items-center gap-2 flex-wrap">
                      {t.items && t.items.map(item => (
                        <span key={item} className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">{item}</span>
                      ))}
                      <button
                        onClick={() => handleOpenCharge(t)}
                        disabled={!canManage}
                        className="ml-auto text-[10px] font-bold text-white bg-slate-900 px-3 py-1 rounded-lg hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Gerar Cobrança
                      </button>
                    </div>
                  )}
                  {t.type === 'income' && t.status === 'awaiting_payment' && (
                    <div className="px-4 pb-4 pt-0 flex items-center gap-2 flex-wrap">
                      {t.items && t.items.map(item => (
                        <span key={item} className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">{item}</span>
                      ))}
                      {t.payment_reference && (
                        <span className="text-[9px] bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full border border-cyan-100">
                          Ref: {t.payment_reference}
                        </span>
                      )}
                      {t.pix_code && (
                        <span className="text-[9px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">
                          Pix: {t.pix_code}
                        </span>
                      )}
                      <LoadingButton
                        loading={paymentLoading}
                        onClick={() => handleProcessPayment(t.id)}
                        disabled={!canManage}
                        className="ml-auto text-[10px] font-bold text-white bg-cyan-600 px-3 py-1 rounded-lg hover:bg-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Receber Agora
                      </LoadingButton>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Expense Distribution */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2"><PieChart className="w-5 h-5 text-cyan-500" />Distribuição de Gastos</h3>
            <div className="space-y-4">
              {expenseCategories.length === 0 ? (
                <p className="text-xs text-slate-400 text-center">Nenhuma despesa registrada</p>
              ) : expenseCategories.map((item, i) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-500 uppercase">{item.label}</span>
                    <span className="text-slate-900">{item.pct}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", colors[i] || colors[4])} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Asaas Integration */}
          <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl shadow-cyan-200/50">
            <CreditCard className="w-8 h-8 mb-4 opacity-80" />
            <h3 className="font-bold text-lg mb-1">Integração Asaas</h3>
            <p className="text-sm text-cyan-100 mb-4">Gere cobranças automáticas via Pix e Cartão com um clique.</p>
            <button onClick={() => onNavigate?.('configuracoes')} className="w-full py-2 bg-white text-cyan-700 font-bold rounded-xl hover:bg-cyan-50 transition-colors">
              Configurar Gateway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
