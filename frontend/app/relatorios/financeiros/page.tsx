import React from 'react'
import { Card, Button, Badge, Input, ProgressBar } from '@/components/design-system'
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Download,
  Calendar,
  ArrowUpRight,
  PieChart,
  BarChart3
} from 'lucide-react'

export default function FinanceirosPage() {
  const transactions = [
    { id: '1', date: '12/03', description: 'Consulta - Maria Santos', amount: 250, type: 'income', status: 'paid' },
    { id: '2', date: '12/03', description: 'Exame - Pedro Oliveira', amount: 180, type: 'income', status: 'pending' },
    { id: '3', date: '11/03', description: 'Material médico', amount: -450, type: 'expense', status: 'paid' },
    { id: '4', date: '11/03', description: 'Retorno - Julia Martins', amount: 150, type: 'income', status: 'paid' },
    { id: '5', date: '10/03', description: 'Aluguel', amount: -2500, type: 'expense', status: 'paid' },
  ]

  const stats = [
    { label: 'Receita Total', value: 'R$ 45.230', change: '+12%', trend: 'up' as const, icon: TrendingUp },
    { label: 'Despesas', value: 'R$ 18.450', change: '+5%', trend: 'up' as const, icon: TrendingDown },
    { label: 'Lucro', value: 'R$ 26.780', change: '+18%', trend: 'up' as const, icon: DollarSign },
    { label: 'Faturas Pendentes', value: 'R$ 3.200', change: '-2%', trend: 'down' as const, icon: CreditCard },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios Financeiros</h1>
          <p className="text-slate-500 mt-1">Visão geral das finanças da clínica</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" icon={<Download className="w-4 h-4" />}>
            Exportar
          </Button>
          <Button variant="primary" icon={<BarChart3 className="w-4 h-4" />}>
            Gerar Relatório
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} variant="gradient" hover>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className={`text-xs mt-1 flex items-center gap-1 ${
                  stat.trend === 'up' ? 'text-accent-600' : 'text-danger-500'
                }`}>
                  {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {stat.change} vs último mês
                </p>
              </div>
              <div className={`p-3 rounded-xl ${
                stat.trend === 'up' ? 'bg-accent-100 text-accent-600' : 'bg-red-100 text-red-600'
              }`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transactions */}
        <div className="lg:col-span-2">
          <Card variant="elevated" padding="none">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Transações Recentes</h3>
              <Button variant="ghost" size="sm">Ver todas</Button>
            </div>
            <div className="divide-y divide-slate-50">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className={`p-2 rounded-lg ${
                    tx.type === 'income' ? 'bg-accent-100 text-accent-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{tx.description}</p>
                    <p className="text-sm text-slate-500">{tx.date}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      tx.type === 'income' ? 'text-accent-600' : 'text-red-600'
                    }`}>
                      {tx.type === 'income' ? '+' : ''}{tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <Badge variant={tx.status === 'paid' ? 'success' : 'warning'}>
                      {tx.status === 'paid' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1 space-y-4">
          <Card variant="elevated" padding="lg">
            <h4 className="font-semibold text-slate-900 mb-4">Resumo do Mês</h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Receita</span>
                  <span className="font-medium text-slate-900">R$ 45.230</span>
                </div>
                <ProgressBar value={100} color="success" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Despesas</span>
                  <span className="font-medium text-slate-900">R$ 18.450</span>
                </div>
                <ProgressBar value={41} color="danger" />
              </div>
              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-600">Lucro</span>
                  <span className="font-bold text-accent-600">R$ 26.780</span>
                </div>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <h4 className="font-semibold text-slate-900 mb-4">Por Categoria</h4>
            <div className="space-y-3">
              {[
                { label: 'Consultas', value: 65, color: 'bg-brand-500' },
                { label: 'Exames', value: 25, color: 'bg-accent-500' },
                { label: 'Procedimentos', value: 10, color: 'bg-amber-500' },
              ].map((cat) => (
                <div key={cat.label} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                  <span className="text-sm text-slate-600 flex-1">{cat.label}</span>
                  <span className="text-sm font-medium text-slate-900">{cat.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
