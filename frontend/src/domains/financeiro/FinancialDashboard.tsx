import React, { useMemo } from 'react';
import { useClinicStore } from '@/stores/clinicStore';
import { formatCurrency } from '@/hooks/useShared';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';

export const FinancialDashboard: React.FC = () => {
    const { transactions, accounts } = useClinicStore();

    const metrics = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const currentMonthTransactions = transactions.filter(t => {
            const d = new Date(t.created_at);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.status === 'paid';
        });

        const income = currentMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = currentMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

        const pendingReceivables = accounts
            .filter(a => a.type === 'receivable' && a.status !== 'paid' && a.status !== 'cancelled')
            .reduce((acc, a) => acc + (a.value - (a.paid || 0)), 0);

        const pendingPayables = accounts
            .filter(a => a.type === 'payable' && a.status !== 'paid' && a.status !== 'cancelled')
            .reduce((acc, a) => acc + (a.value - (a.paid || 0)), 0);

        return {
            income,
            expense,
            balance: income - expense,
            pendingReceivables,
            pendingPayables
        };
    }, [transactions, accounts]);

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
                <p className="text-sm text-gray-600">
                    O dashboard integra automaticamente transações confirmadas com contas a pagar e receber. 
                    Utilize os painéis abaixo para gerenciar fluxos futuros e emissões de notas fiscais.
                </p>
            </div>
        </div>
    );
};
