import React, { useMemo } from 'react';
import { useClinicStore } from '@/stores/clinicStore';
import { formatCurrency } from '@/hooks/useShared';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';

interface FinancialDashboardProps {
    clinicId?: string;
}

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ clinicId }) => {
    const { transactions, accounts } = useClinicStore();

    const metrics = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const currentMonthTransactions = transactions.filter(t => {
            const d = new Date(t.paid_at || t.created_at);
            return (!clinicId || t.clinic_id === clinicId) &&
                d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.status === 'paid';
        });

        const paidAccounts = accounts.filter(a => {
            const d = new Date(a.updated_at || a.created_at);
            return (!clinicId || a.clinic_id === clinicId) && !a.transaction_id && a.status === 'paid' &&
                d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        const income = currentMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0) +
            paidAccounts.filter(a => a.type === 'receivable').reduce((acc, a) => acc + (a.paid || 0), 0);
        const expense = currentMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0) +
            paidAccounts.filter(a => a.type === 'payable').reduce((acc, a) => acc + (a.paid || 0), 0);

        const linkedTransactionIds = new Set(accounts.map(a => a.transaction_id).filter(Boolean));
        const openTransactionIncome = transactions
            .filter(t => (!clinicId || t.clinic_id === clinicId) && t.type === 'income' &&
                t.status !== 'paid' && t.status !== 'cancelled' && t.status !== 'refunded' &&
                !linkedTransactionIds.has(t.id))
            .reduce((acc, t) => acc + (t.amount || 0), 0);
        const pendingReceivables = accounts
            .filter(a => (!clinicId || a.clinic_id === clinicId) && a.type === 'receivable' && a.status !== 'paid' && a.status !== 'cancelled')
            .reduce((acc, a) => acc + (a.value - (a.paid || 0)), openTransactionIncome);

        const pendingPayables = accounts
            .filter(a => (!clinicId || a.clinic_id === clinicId) && a.type === 'payable' && a.status !== 'paid' && a.status !== 'cancelled')
            .reduce((acc, a) => acc + (a.value - (a.paid || 0)), 0);

        return {
            income,
            expense,
            balance: income - expense,
            pendingReceivables,
            pendingPayables,
            incomeCount: currentMonthTransactions.filter(t => t.type === 'income').length,
            expenseCount: currentMonthTransactions.filter(t => t.type === 'expense').length,
        };
    }, [transactions, accounts, clinicId]);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">Dashboard Financeiro (Mês Atual)</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Receitas (Pagas)</p>
                        <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.income)}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-red-100 rounded-lg">
                        <TrendingDown className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Despesas (Pagas)</p>
                        <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.expense)}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                        <Wallet className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Saldo do Mês</p>
                        <h3 className={`text-2xl font-bold ${metrics.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(metrics.balance)}
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 font-medium">A Receber (Aberto)</p>
                        <span className="text-sm font-bold text-green-600">{formatCurrency(metrics.pendingReceivables)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 font-medium">A Pagar (Aberto)</p>
                        <span className="text-sm font-bold text-red-600">{formatCurrency(metrics.pendingPayables)}</span>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumo Geral</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Receitas Pagas (mês)</p>
                        <p className="text-xl font-black text-green-600">{formatCurrency(metrics.income)}</p>
                        <p className="text-xs text-gray-400 mt-1">{metrics.incomeCount} transação(ões)</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Despesas Pagas (mês)</p>
                        <p className="text-xl font-black text-red-600">{formatCurrency(metrics.expense)}</p>
                        <p className="text-xs text-gray-400 mt-1">{metrics.expenseCount} transação(ões)</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Saldo Líquido</p>
                        <p className={`text-xl font-black ${metrics.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(metrics.balance)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{metrics.pendingReceivables > 0 ? `${formatCurrency(metrics.pendingReceivables)} a receber` : 'Tudo em dia'}</p>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    {metrics.pendingReceivables > 0 && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                            📌 {formatCurrency(metrics.pendingReceivables)} pendente de receber
                        </span>
                    )}
                    {metrics.pendingPayables > 0 && (
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full">
                            📌 {formatCurrency(metrics.pendingPayables)} pendente de pagar
                        </span>
                    )}
                    {metrics.pendingReceivables === 0 && metrics.pendingPayables === 0 && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
                            ✅ Tudo em dia — sem contas pendentes
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
