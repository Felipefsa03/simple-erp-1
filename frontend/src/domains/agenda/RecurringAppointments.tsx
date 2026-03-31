import { useState } from 'react';
import { Repeat, Calendar, Clock, User, Play, Pause, StopCircle, Trash2, Edit } from 'lucide-react';

interface RecurringAppointmentsProps {
  clinicId?: string;
}

export function RecurringAppointments({ clinicId }: RecurringAppointmentsProps) {
  const [activeTab, setActiveTab] = useState('list');

  const recurringAppointments = [
    {
      id: '1',
      patient: 'João Silva',
      professional: 'Dr. Pedro',
      procedure: 'Limpeza',
      frequency: 'monthly',
      startDate: '2026-01-15',
      nextDate: '2026-04-15',
      time: '14:00',
      duration: 30,
      status: 'active',
      occurrences: 3,
      totalOccurrences: 12
    },
    {
      id: '2',
      patient: 'Maria Santos',
      professional: 'Dra. Ana',
      procedure: 'Manutenção Aparelho',
      frequency: 'monthly',
      startDate: '2025-11-10',
      nextDate: '2026-04-10',
      time: '10:00',
      duration: 20,
      status: 'active',
      occurrences: 5,
      totalOccurrences: 12
    },
    {
      id: '3',
      patient: 'Pedro Costa',
      professional: 'Dr. Pedro',
      procedure: 'Revisão Implantes',
      frequency: 'biweekly',
      startDate: '2026-02-01',
      nextDate: '2026-04-04',
      time: '15:30',
      duration: 15,
      status: 'paused',
      occurrences: 4,
      totalOccurrences: 26
    },
    {
      id: '4',
      patient: 'Ana Lima',
      professional: 'Dra. Julia',
      procedure: ' Clareamento',
      frequency: 'weekly',
      startDate: '2026-03-01',
      nextDate: '2026-03-29',
      time: '09:00',
      duration: 45,
      status: 'active',
      occurrences: 4,
      totalOccurrences: 8
    },
  ];

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Diário';
      case 'weekly': return 'Semanal';
      case 'biweekly': return 'Quinzenal';
      case 'monthly': return 'Mensal';
      case 'yearly': return 'Anual';
      default: return frequency;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'paused': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'paused': return 'Pausado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agendamentos Recorrentes</h1>
          <p className="text-gray-600">Gerencie agendamentos que se repetem</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Repeat size={18} />
          Novo Agendamento
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600 mb-1">Total Recorrências</p>
          <p className="text-2xl font-bold text-blue-600">{recurringAppointments.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600 mb-1">Ativos</p>
          <p className="text-2xl font-bold text-green-600">
            {recurringAppointments.filter(a => a.status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600 mb-1">Pausados</p>
          <p className="text-2xl font-bold text-yellow-600">
            {recurringAppointments.filter(a => a.status === 'paused').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600 mb-1">Próximos 7 dias</p>
          <p className="text-2xl font-bold text-purple-600">12</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Lista de Agendamentos Recorrentes</h2>
        </div>
        
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Paciente</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Procedimento</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600">Profissional</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600">Frequência</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600">Próxima Data</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600">Horário</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600">Progresso</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {recurringAppointments.map((apt) => (
              <tr key={apt.id} className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400" />
                    {apt.patient}
                  </div>
                </td>
                <td className="py-3 px-4">{apt.procedure}</td>
                <td className="py-3 px-4 text-center">{apt.professional}</td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {getFrequencyLabel(apt.frequency)}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Calendar size={14} className="text-gray-400" />
                    {apt.nextDate}
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock size={14} className="text-gray-400" />
                    {apt.time}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(apt.occurrences / apt.totalOccurrences) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">
                      {apt.occurrences}/{apt.totalOccurrences}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(apt.status)}`}>
                    {getStatusLabel(apt.status)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1">
                    {apt.status === 'active' && (
                      <button className="p-1 text-yellow-600 hover:bg-yellow-50 rounded" title="Pausar">
                        <Pause size={16} />
                      </button>
                    )}
                    {apt.status === 'paused' && (
                      <button className="p-1 text-green-600 hover:bg-green-50 rounded" title="Ativar">
                        <Play size={16} />
                      </button>
                    )}
                    <button className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Editar">
                      <Edit size={16} />
                    </button>
                    <button className="p-1 text-red-600 hover:bg-red-50 rounded" title="Cancelar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
