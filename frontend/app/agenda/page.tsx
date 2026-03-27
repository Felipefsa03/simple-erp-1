import React from 'react'
import { Card, Button, Badge, Avatar, Input } from '@/components/design-system'
import { 
  Calendar,
  Clock,
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Video,
  Phone,
  MapPin
} from 'lucide-react'

export default function AgendaPage() {
  const today = new Date()
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const currentMonth = today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  
  const appointments = [
    { id: '1', time: '09:00', patient: 'Maria Santos', service: 'Consulta Geral', professional: 'Dr. João Silva', status: 'scheduled', type: 'in_person' },
    { id: '2', time: '10:30', patient: 'Pedro Oliveira', service: 'Retorno', professional: 'Dra. Ana Costa', status: 'confirmed', type: 'video' },
    { id: '3', time: '14:00', patient: 'Julia Martins', service: 'Exame', professional: 'Dr. João Silva', status: 'scheduled', type: 'in_person' },
    { id: '4', time: '15:30', patient: 'Carlos Souza', service: 'Consulta', professional: 'Dra. Ana Costa', status: 'pending', type: 'phone' },
    { id: '5', time: '16:00', patient: 'Ana Pereira', service: 'Procedimento', professional: 'Dr. João Silva', status: 'scheduled', type: 'in_person' },
  ]

  const statusColors = {
    scheduled: 'info',
    confirmed: 'success',
    pending: 'warning',
    done: 'neutral',
    cancelled: 'danger',
  } as const

  const statusLabels = {
    scheduled: 'Agendado',
    confirmed: 'Confirmado',
    pending: 'Pendente',
    done: 'Concluído',
    cancelled: 'Cancelado',
  }

  const typeIcons = {
    in_person: MapPin,
    video: Video,
    phone: Phone,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda</h1>
          <p className="text-slate-500 mt-1">Gerencie seus agendamentos</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
          Novo Agendamento
        </Button>
      </div>

      {/* Filters */}
      <Card variant="elevated" padding="sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input 
              placeholder="Buscar paciente..." 
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" icon={<Filter className="w-4 h-4" />}>
              Filtrar
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-1">
          <Card variant="elevated" padding="none">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <button className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <h3 className="font-semibold text-slate-900">{currentMonth}</h3>
              <button className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-7 gap-1 text-center">
                {weekDays.map((day) => (
                  <div key={day} className="text-xs font-medium text-slate-500 py-2">
                    {day}
                  </div>
                ))}
                {Array.from({ length: 31 }, (_, i) => {
                  const day = i + 1
                  const isToday = day === today.getDate()
                  const hasAppointment = [1, 3, 5].includes(day)
                  return (
                    <button
                      key={day}
                      className={`
                        relative p-2 rounded-lg text-sm transition-all
                        ${isToday ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25' : 'hover:bg-slate-50 text-slate-700'}
                      `}
                    >
                      {day}
                      {hasAppointment && !isToday && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-500 rounded-full" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>

          {/* Quick Stats */}
          <div className="mt-4 space-y-3">
            <Card variant="gradient" padding="sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Hoje</p>
                  <p className="text-lg font-bold text-slate-900">{appointments.length}</p>
                </div>
                <div className="p-2 rounded-lg bg-brand-100 text-brand-600">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
            </Card>
            <Card variant="gradient" padding="sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Confirmados</p>
                  <p className="text-lg font-bold text-slate-900">
                    {appointments.filter(a => a.status === 'confirmed').length}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-accent-100 text-accent-600">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Appointments List */}
        <div className="lg:col-span-2">
          <Card variant="elevated" padding="none">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Horários de Hoje</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {appointments.map((apt) => {
                const TypeIcon = typeIcons[apt.type as keyof typeof typeIcons]
                return (
                  <div
                    key={apt.id}
                    className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="text-center min-w-[60px]">
                      <p className="text-lg font-bold text-slate-900">{apt.time}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{apt.patient}</p>
                        <TypeIcon className="w-4 h-4 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500">{apt.service} • {apt.professional}</p>
                    </div>
                    <Badge variant={statusColors[apt.status as keyof typeof statusColors]}>
                      {statusLabels[apt.status as keyof typeof statusLabels]}
                    </Badge>
                    <Button variant="ghost" size="icon">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
