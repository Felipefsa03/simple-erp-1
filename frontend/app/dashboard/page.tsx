import React from 'react'
import { Card, Button, Badge, Avatar, StatCard, ProgressBar } from '@/components/design-system'
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Activity, 
  DollarSign,
  ArrowUpRight,
  ArrowRight,
  Bell,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react'

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  
  const kpis = [
    { label: 'Receita Mensal', value: 'R$ 45.230', change: '+12%', trend: 'up' as const, icon: DollarSign },
    { label: 'Novos Pacientes', value: '23', change: '+5%', trend: 'up' as const, icon: Users },
    { label: 'Agendamentos', value: '156', change: '+8%', trend: 'up' as const, icon: Calendar },
    { label: 'Taxa de Ocupação', value: '87%', change: '+3%', trend: 'up' as const, icon: Activity },
  ]

  const appointments = [
    { id: '1', time: '09:00', patient: 'Maria Santos', service: 'Consulta Geral', status: 'scheduled' },
    { id: '2', time: '10:30', patient: 'Pedro Oliveira', service: 'Retorno', status: 'confirmed' },
    { id: '3', time: '14:00', patient: 'Julia Martins', service: 'Exame', status: 'scheduled' },
    { id: '4', time: '15:30', patient: 'Carlos Souza', service: 'Consulta', status: 'pending' },
  ]

  const insights = [
    { type: 'warning', title: '3 pacientes sem retorno', desc: 'Verificar histórico', action: 'Ver pacientes' },
    { type: 'success', title: 'Meta do mês atingida', desc: '110% da meta de receita', action: null },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1 capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" icon={<Bell className="w-5 h-5" />} />
          <Button variant="primary" icon={<Sparkles className="w-4 h-4" />}>
            Relatório IA
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} variant="gradient" hover className="relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
                <p className="text-xs text-accent-600 mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  {kpi.change} vs último mês
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/25">
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-gradient-to-br from-brand-400/20 to-brand-500/20 rounded-full blur-2xl" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2">
          <Card variant="elevated" padding="none">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Agenda de Hoje</h3>
              <Button variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
                Ver todos
              </Button>
            </div>
            <div className="divide-y divide-slate-50">
              {appointments.length === 0 ? (
                <div className="p-8 text-center">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhum agendamento para hoje</p>
                </div>
              ) : (
                appointments.map((apt) => (
                  <div key={apt.id} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="text-center min-w-[60px]">
                      <p className="text-lg font-bold text-slate-900">{apt.time}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{apt.patient}</p>
                      <p className="text-sm text-slate-500 truncate">{apt.service}</p>
                    </div>
                    <Badge variant={apt.status === 'confirmed' ? 'success' : apt.status === 'pending' ? 'warning' : 'info'}>
                      {apt.status === 'scheduled' ? 'Agendado' : apt.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Insights */}
        <div className="lg:col-span-1">
          <Card variant="elevated" padding="none">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Insights</h3>
            </div>
            <div className="p-4 space-y-3">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl ${
                    insight.type === 'success' ? 'bg-accent-50' : 'bg-amber-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {insight.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">{insight.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{insight.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Progress */}
          <Card variant="elevated" padding="md" className="mt-4">
            <h4 className="font-semibold text-slate-900 mb-4">Meta Mensal</h4>
            <ProgressBar value={78} color="brand" showLabel />
            <p className="text-sm text-slate-500 mt-2">R$ 38.500 de R$ 50.000</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
