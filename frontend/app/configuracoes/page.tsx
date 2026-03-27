import React from 'react'
import { Card, Button, Badge, Input, Toggle } from '@/components/design-system'
import { 
  Settings,
  User,
  Building2,
  Bell,
  Shield,
  Palette,
  Save,
  CreditCard,
  Mail,
  Phone,
  Globe,
  Moon,
  Sun
} from 'lucide-react'

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 mt-1">Gerencie as configurações do sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card variant="elevated" padding="sm">
            <nav className="space-y-1">
              {[
                { id: 'perfil', label: 'Perfil', icon: User },
                { id: 'clinica', label: 'Clínica', icon: Building2 },
                { id: 'notificacoes', label: 'Notificações', icon: Bell },
                { id: 'seguranca', label: 'Segurança', icon: Shield },
                { id: 'aparencia', label: 'Aparência', icon: Palette },
                { id: 'cobranca', label: 'Cobrança', icon: CreditCard },
              ].map((item) => (
                <button
                  key={item.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Perfil */}
          <Card variant="elevated" padding="lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Perfil do Usuário</h3>
            <div className="flex items-start gap-6 mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-brand-500/25">
                JS
              </div>
              <div className="flex-1">
                <Button variant="outline" size="sm">Alterar Foto</Button>
                <p className="text-xs text-slate-500 mt-2">JPG, PNG ou GIF. Máximo 2MB.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nome Completo" defaultValue="João Silva" icon={<User className="w-4 h-4" />} />
              <Input label="Email" defaultValue="joao@clinia.com" type="email" icon={<Mail className="w-4 h-4" />} />
              <Input label="Telefone" defaultValue="(11) 99999-9999" icon={<Phone className="w-4 h-4" />} />
              <Input label="Website" defaultValue="https://clinia.com" icon={<Globe className="w-4 h-4" />} />
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="primary" icon={<Save className="w-4 h-4" />}>
                Salvar Alterações
              </Button>
            </div>
          </Card>

          {/* Notificações */}
          <Card variant="elevated" padding="lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Notificações</h3>
            <div className="space-y-4">
              {[
                { label: 'Email sobre novos agendamentos', description: 'Receba um email quando um novo paciente agendar' },
                { label: 'Lembretes de consulta', description: 'Notificação 24h antes da consulta' },
                { label: 'Alertas de pagamento', description: 'Receba alertas sobre cobranças pendentes' },
                { label: 'Relatórios semanais', description: 'Resumo semanal do desempenho' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                  <div>
                    <p className="font-medium text-slate-900">{item.label}</p>
                    <p className="text-sm text-slate-500">{item.description}</p>
                  </div>
                  <Toggle checked={idx < 2} onChange={() => {}} />
                </div>
              ))}
            </div>
          </Card>

          {/* Aparência */}
          <Card variant="elevated" padding="lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Aparência</h3>
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-white shadow-sm">
                  <Sun className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Tema Claro</p>
                  <p className="text-sm text-slate-500">Interface clara e tradicional</p>
                </div>
              </div>
              <div className="w-5 h-5 rounded-full bg-brand-500 border-2 border-white shadow-sm" />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 mt-3">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-slate-800 shadow-sm">
                  <Moon className="w-5 h-5 text-slate-300" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Tema Escuro</p>
                  <p className="text-sm text-slate-500">Interface escura para redução de fadiga visual</p>
                </div>
              </div>
              <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
