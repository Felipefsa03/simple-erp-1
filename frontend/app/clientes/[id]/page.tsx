import React from 'react'
import { Card, Button, Badge, Avatar, Input } from '@/components/design-system'
import { 
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  CreditCard,
  Activity,
  Edit,
  Trash2,
  ArrowLeft,
  MessageSquare,
  Clock
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ClientePage({ params }: { params: { id: string } }) {
  const patient = {
    id: params.id,
    name: 'Maria Santos',
    email: 'maria.santos@email.com',
    phone: '(11) 99999-9999',
    address: 'Rua Example, 123 - São Paulo, SP',
    birthDate: '15/03/1985',
    cpf: '123.456.789-00',
    since: '01/01/2023',
    plan: 'Premium',
  }

  const appointments = [
    { id: '1', date: '12/03/2024', service: 'Consulta Geral', professional: 'Dr. João Silva', status: 'done' },
    { id: '2', date: '28/02/2024', service: 'Retorno', professional: 'Dr. João Silva', status: 'done' },
    { id: '3', date: '15/02/2024', service: 'Exame', professional: 'Dra. Ana Costa', status: 'done' },
  ]

  const statusColors = {
    done: 'success',
    scheduled: 'info',
    pending: 'warning',
    cancelled: 'danger',
  } as const

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/clientes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Detalhes do Paciente</h1>
          <p className="text-slate-500">Visualize e gerencie informações do paciente</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<Edit className="w-4 h-4" />}>
            Editar
          </Button>
          <Button variant="ghost" icon={<MessageSquare className="w-4 h-4" />}>
            Mensagem
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="lg:col-span-1">
          <Card variant="elevated" padding="lg">
            <div className="text-center mb-6">
              <Avatar size="xl" fallback={patient.name} className="mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900">{patient.name}</h2>
              <Badge variant="brand" className="mt-2">{patient.plan}</Badge>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">{patient.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">{patient.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">{patient.address}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">Nascimento: {patient.birthDate}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">Cliente desde: {patient.since}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <Button variant="danger" className="w-full" icon={<Trash2 className="w-4 h-4" />}>
                Excluir Paciente
              </Button>
            </div>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="gradient" padding="md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-100 text-brand-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Consultas</p>
                  <p className="text-xl font-bold text-slate-900">{appointments.length}</p>
                </div>
              </div>
            </Card>
            <Card variant="gradient" padding="md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent-100 text-accent-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Gasto</p>
                  <p className="text-xl font-bold text-slate-900">R$ 2.450</p>
                </div>
              </div>
            </Card>
            <Card variant="gradient" padding="md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Última Visita</p>
                  <p className="text-xl font-bold text-slate-900">12/03</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Appointments History */}
          <Card variant="elevated" padding="none">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Histórico de Consultas</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {appointments.map((apt) => (
                <div key={apt.id} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="p-2 rounded-lg bg-slate-100">
                    <FileText className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{apt.service}</p>
                    <p className="text-sm text-slate-500">{apt.professional}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">{apt.date}</p>
                    <Badge variant={statusColors[apt.status as keyof typeof statusColors]}>
                      {apt.status === 'done' ? 'Concluído' : apt.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Notes */}
          <Card variant="elevated" padding="lg">
            <h3 className="font-semibold text-slate-900 mb-4">Observações</h3>
            <textarea 
              className="input min-h-[100px]" 
              placeholder="Adicione observações sobre o paciente..."
              defaultValue="Paciente Prefere atendimentos pela manhã. Alérgico a dipirona."
            />
            <div className="mt-4 flex justify-end">
              <Button variant="primary">Salvar Observações</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
