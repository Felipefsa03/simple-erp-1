import React, { useMemo } from 'react';
import { useClinicStore } from '@/stores/clinicStore';
import { formatCurrency } from '@/hooks/useShared';

export const CashFlowProjection: React.FC = () => {
    const { accounts, getBalance } = useClinicStore();

    const projections = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const currentBalance = getBalance();

        const periods = [
            { label: 'Próximos 7 dias', days: 7, date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) },
            { label: 'Próximos 15 dias', days: 15, date: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000) },
            { label: 'Próximos 30 dias', days: 30, date: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) },
        ];

        return periods.map(period => {
            const periodAccounts = accounts.filter(a => {
                if (a.status === 'paid' || a.status === 'cancelled') return false;
                if (!a.due_date) return false;
                const dueDate = new Date(a.due_date);
                return dueDate >= today && dueDate <= period.date;
            });

            const expectedIncome = periodAccounts
                .filter(a => a.type === 'receivable')
                .reduce((acc, a) => acc + (a.value - (a.paid || 0)), 0);

            const expectedExpense = periodAccounts
                .filter(a => a.type === 'payable')
                .reduce((acc, a) => acc + (a.value - (a.paid || 0)), 0);

            return {
                ...period,
                expectedIncome,
                expectedExpense,
                projectedBalance: currentBalance + expectedIncome - expectedExpense
            };
        });
    }, [accounts, getBalance]);

    return (
        <div className="space-y-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-800">Projeção de Fluxo de Caixa</h2>
            
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                            <tr>
                                <th className="px-6 py-4 font-medium">Período</th>
                                <th className="px-6 py-4 font-medium text-right">Receitas Previstas</th>
                                <th className="px-6 py-4 font-medium text-right">Despesas Previstas</th>
                                <th className="px-6 py-4 font-medium text-right">Saldo Projetado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {projections.map((proj, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{proj.label}</td>
                                    <td className="px-6 py-4 text-right text-green-600 font-medium">
                                        +{formatCurrency(proj.expectedIncome)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-red-600 font-medium">
                                        -{formatCurrency(proj.expectedExpense)}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-bold ${proj.projectedBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(proj.projectedBalance)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <p className="text-xs text-gray-500">
                * As projeções baseiam-se nas contas a pagar e receber em aberto com vencimento dentro do período selecionado e o saldo atual do caixa.
            </p>
        </div>
    );
};
