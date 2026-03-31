import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useClinicStore } from '@/stores/clinicStore';

interface DREReportProps {
  clinicId?: string;
}

export function DREReport({ clinicId }: DREReportProps) {
  const [period, setPeriod] = useState('month');
  const transactions = useClinicStore(s => s.transactions);

  const dreData = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'quarter') {
      startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const periodTransactions = (transactions || []).filter(t => {
      const tDate = new Date(t.created_at || t.due_date || '');
      return tDate >= startDate && tDate <= now;
    });

    const income = periodTransactions.filter(t => t.type === 'income');
    const expense = periodTransactions.filter(t => t.type === 'expense');

    const totalRevenue = income.reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpenses = expense.reduce((s, t) => s + (t.amount || 0), 0);
    
    // CPV: calcular baseado em despesas de custo/material (não percentual fixo)
    const costExpenses = expense.filter(t => 
      t.category === 'custo' || 
      t.category === 'material' || 
      t.category === 'custo_servico' ||
      t.category === 'supplies'
    );
    const cogs = costExpenses.reduce((s, t) => s + (t.amount || 0), 0);
    
    const grossProfit = totalRevenue - cogs;
    const operatingExpenses = totalExpenses - cogs; // Despesas operacionais = total - custos
    const operatingProfit = grossProfit - operatingExpenses;
    
    // Impostos: usar categoria "imposto" se existir, senão 0
    const taxExpenses = expense.filter(t => t.category === 'imposto' || t.category === 'tax');
    const taxes = taxExpenses.reduce((s, t) => s + (t.amount || 0), 0);
    
    const netProfit = operatingProfit - taxes;

    const revenueByCategory: Record<string, number> = {};
    income.forEach(t => {
      const cat = t.category || 'outros';
      revenueByCategory[cat] = (revenueByCategory[cat] || 0) + (t.amount || 0);
    });

    return {
      revenue: { total: totalRevenue, byCategory: revenueByCategory },
      cogs: { total: cogs },
      grossProfit: { value: grossProfit, margin: totalRevenue > 0 ? (grossProfit / totalRevenue * 100) : 0 },
      operatingExpenses: { total: totalExpenses },
      operatingProfit: { value: operatingProfit, margin: totalRevenue > 0 ? (operatingProfit / totalRevenue * 100) : 0 },
      netProfit: { value: netProfit, margin: totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0 },
      taxes: { total: taxes },
    };
  }, [transactions, period]);

  const metrics = [
    { label: 'Receita Bruta', value: dreData.revenue.total, type: 'positive', icon: ArrowUpRight },
    { label: 'CPV', value: dreData.cogs.total, type: 'negative', icon: ArrowDownRight },
    { label: 'Lucro Bruto', value: dreData.grossProfit.value, type: 'positive', margin: dreData.grossProfit.margin },
    { label: 'Despesas Operacionais', value: dreData.operatingExpenses.total, type: 'negative' },
    { label: 'Lucro Operacional', value: dreData.operatingProfit.value, type: 'positive', margin: dreData.operatingProfit.margin },
    { label: 'Lucro Líquido', value: dreData.netProfit.value, type: 'positive', margin: dreData.netProfit.margin },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-cyan-600" />
            DRE - Demonstração do Resultado
          </h1>
          <p className="text-sm text-slate-500 mt-1">Demonstração do Resultado do Exercício</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none">
          <option value="month">Este Mês</option>
          <option value="quarter">Este Trimestre</option>
          <option value="year">Este Ano</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {metrics.map((metric, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">{metric.label}</p>
            <p className={`text-xl font-bold ${metric.type === 'positive' ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(metric.value)}
            </p>
            {metric.margin !== undefined && (
              <p className={`text-xs mt-1 ${metric.margin > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                Margem: {metric.margin.toFixed(1)}%
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Resumo do Período</h2>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="p-4 flex justify-between">
            <span className="text-slate-600">Receita Bruta</span>
            <span className="font-semibold text-emerald-600">{formatCurrency(dreData.revenue.total)}</span>
          </div>
          <div className="p-4 flex justify-between">
            <span className="text-slate-600">(-) CPV/CMSO</span>
            <span className="font-semibold text-red-600">({formatCurrency(dreData.cogs.total)})</span>
          </div>
          <div className="p-4 flex justify-between bg-emerald-50">
            <span className="font-semibold text-emerald-800">Lucro Bruto</span>
            <span className="font-bold text-emerald-700">{formatCurrency(dreData.grossProfit.value)} ({dreData.grossProfit.margin.toFixed(1)}%)</span>
          </div>
          <div className="p-4 flex justify-between">
            <span className="text-slate-600">(-) Despesas Operacionais</span>
            <span className="font-semibold text-red-600">({formatCurrency(dreData.operatingExpenses.total)})</span>
          </div>
          <div className="p-4 flex justify-between bg-blue-50">
            <span className="font-semibold text-blue-800">Lucro Operacional</span>
            <span className="font-bold text-blue-700">{formatCurrency(dreData.operatingProfit.value)} ({dreData.operatingProfit.margin.toFixed(1)}%)</span>
          </div>
          <div className="p-4 flex justify-between">
            <span className="text-slate-600">(-) Impostos</span>
            <span className="font-semibold text-red-600">({formatCurrency(dreData.taxes.total)})</span>
          </div>
          <div className="p-4 flex justify-between bg-gradient-to-r from-cyan-50 to-blue-50">
            <span className="font-bold text-slate-900">LUCRO LÍQUIDO</span>
            <span className="font-bold text-lg text-cyan-700">{formatCurrency(dreData.netProfit.value)} ({dreData.netProfit.margin.toFixed(1)}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
