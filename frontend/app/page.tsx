import React from 'react'
import { Link } from 'react-router-dom'
import { Card, Button, Badge } from '@/components/design-system'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  FileText, 
  DollarSign, 
  Sparkles, 
  Settings,
  Package,
  ArrowRight,
  CheckCircle2
} from 'lucide-react'

const features = [
  { 
    title: 'Dashboard Inteligente', 
    description: 'Visão completa do desempenho da clínica com métricas em tempo real',
    icon: LayoutDashboard,
    href: '/dashboard',
    color: 'from-brand-500 to-brand-600'
  },
  { 
    title: 'Agenda Online', 
    description: 'Gerencie agendamentos com IA e reduza faltas automaticamente',
    icon: Calendar,
    href: '/agenda',
    color: 'from-accent-500 to-accent-600'
  },
  { 
    title: 'Gestão de Pacientes', 
    description: 'Prontuários eletrônicos e histórico completo de atendimentos',
    icon: Users,
    href: '/pacientes',
    color: 'from-cyan-500 to-cyan-600'
  },
  { 
    title: 'Financeiro', 
    description: 'Controle total de receitas, despesas e fluxo de caixa',
    icon: DollarSign,
    href: '/financeiro',
    color: 'from-emerald-500 to-emerald-600'
  },
  { 
    title: 'Estoque', 
    description: 'Controle de inventário com alertas automáticos de reposição',
    icon: Package,
    href: '/estoque',
    color: 'from-amber-500 to-amber-600'
  },
  { 
    title: 'Marketing & IA', 
    description: 'Automação de marketing e análises preditivas para crescimento',
    icon: Sparkles,
    href: '/marketing',
    color: 'from-violet-500 to-violet-600'
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-100" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-brand-500/10 to-transparent blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Sistema de Gestão para Clínicas
            </div>
            
            <h1 className="text-5xl font-extrabold text-slate-900 leading-tight mb-6">
              Simplifique a gestão da sua{' '}
              <span className="text-gradient">clínica médica</span>
            </h1>
            
            <p className="text-xl text-slate-600 mb-8">
              Uma plataforma completa para otimizar agendamentos, financeiro, 
              pacientes e muito mais com inteligência artificial.
            </p>
            
            <div className="flex items-center justify-center gap-4">
              <Link to="/dashboard">
                <Button variant="primary" size="lg" icon={<ArrowRight className="w-5 h-5" />}>
                  Começar Agora
                </Button>
              </Link>
              <Button variant="outline" size="lg">
                Ver Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Tudo o que você precisa
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Ferramentas poderosas para transformar a gestão da sua clínica 
            e proporcionar a melhor experiência para seus pacientes.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Link key={feature.title} to={feature.href}>
              <Card variant="gradient" hover padding="lg" className="h-full">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white shadow-lg mb-4`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm">{feature.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10K+', label: 'Clínicas Atendidas' },
              { value: '500K+', label: 'Agendamentos/Mês' },
              { value: '98%', label: 'Satisfação' },
              { value: '24/7', label: 'Suporte' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl font-bold text-gradient mb-2">{stat.value}</p>
                <p className="text-slate-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <Card variant="elevated" padding="lg" className="text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-50 to-accent-50 opacity-50" />
          <div className="relative">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Pronto para transformar sua clínica?
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto mb-8">
              Junte-se a milhares de profissionais que já otimizaram 
              a gestão de suas clínicas com o Clinxia.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/dashboard">
                <Button variant="primary" size="lg">
                  Começar Gratuitamente
                </Button>
              </Link>
              <Button variant="ghost" size="lg" icon={<Settings className="w-5 h-5" />}>
                Falar com Especialista
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-500" />
                Sem cartão de crédito
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-500" />
                Cancelamento anytime
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-500" />
                Suporte prioritário
              </span>
            </div>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg">Clinxia</span>
                <p className="text-xs text-slate-400">Gestão Inteligente</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm">
              © 2026 Clinxia. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
