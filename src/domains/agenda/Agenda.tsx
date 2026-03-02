import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  User, 
  Stethoscope,
  MoreVertical,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

const initialAppointments = [
  { id: 1, patient: 'Ana Paula Souza', time: '09:00', duration: '60 min', type: 'Limpeza', status: 'confirmed' },
  { id: 2, patient: 'Carlos Eduardo Lima', time: '10:30', duration: '45 min', type: 'Avaliação', status: 'pending' },
  { id: 3, patient: 'Juliana Mendes', time: '14:00', duration: '120 min', type: 'Botox', status: 'confirmed' },
  { id: 4, patient: 'Ricardo Oliveira', time: '16:30', duration: '60 min', type: 'Implante', status: 'confirmed' },
];

export function Agenda() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [view, setView] = React.useState<'day' | 'week' | 'month'>('week');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [newAppointment, setNewAppointment] = React.useState({
    patient: '',
    time: '09:00',
    type: 'Consulta',
    professional: 'Dr. Lucas Silva'
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (view === 'day') {
      setCurrentDate(prev => direction === 'next' ? addDays(prev, 1) : addDays(prev, -1));
    } else if (view === 'week') {
      setCurrentDate(prev => direction === 'next' ? addDays(prev, 7) : addDays(prev, -7));
    } else {
      setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    }
  };

  const handleAddAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, we'd add to state/DB
    setIsModalOpen(false);
    setNewAppointment({ patient: '', time: '09:00', type: 'Consulta' });
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda</h1>
          <p className="text-slate-500">Organize seus atendimentos e otimize seu tempo.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 justify-center">
            {(['day', 'week', 'month'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  view === v ? "bg-cyan-50 text-cyan-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-all shadow-sm shadow-cyan-200"
          >
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">Novo Agendamento</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleAddAppointment} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paciente</label>
                  <input 
                    required
                    type="text" 
                    value={newAppointment.patient}
                    onChange={e => setNewAppointment({...newAppointment, patient: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" 
                    placeholder="Buscar paciente..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profissional</label>
                  <select 
                    value={newAppointment.professional}
                    onChange={e => setNewAppointment({...newAppointment, professional: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none"
                  >
                    <option>Dr. Lucas Silva (Dentista)</option>
                    <option>Dra. Julia Paiva (Ortodontista)</option>
                    <option>Mariana Costa (Esteticista)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Horário</label>
                    <input 
                      required
                      type="time" 
                      value={newAppointment.time}
                      onChange={e => setNewAppointment({...newAppointment, time: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</label>
                    <select 
                      value={newAppointment.type}
                      onChange={e => setNewAppointment({...newAppointment, type: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none"
                    >
                      <option>Consulta</option>
                      <option>Limpeza</option>
                      <option>Avaliação</option>
                      <option>Procedimento</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-200 mt-4">
                  Confirmar Agendamento
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <h2 className="text-lg font-bold text-slate-900 capitalize">
            {view === 'day' ? format(currentDate, "dd 'de' MMMM yyyy", { locale: ptBR }) : format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => handleNavigate('prev')}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-900"
            >
              HOJE
            </button>
            <button 
              onClick={() => handleNavigate('next')}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500" />
            <span className="text-xs text-slate-500 font-medium">Confirmado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs text-slate-500 font-medium">Pendente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-slate-500 font-medium">Faltou</span>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {/* Week/Month Header */}
        <div className="grid grid-cols-2 md:grid-cols-8 border-b border-slate-100">
          <div className="hidden md:block p-4 border-r border-slate-100" />
          {view === 'day' ? (
            <div className="col-span-1 md:col-span-7 p-4 text-center bg-cyan-50/30">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                {format(currentDate, 'eeee', { locale: ptBR })}
              </p>
              <p className="text-lg font-bold text-cyan-600">
                {format(currentDate, 'dd')}
              </p>
            </div>
          ) : view === 'week' ? (
            weekDays.map((day, idx) => (
              <div key={day.toString()} className={cn(
                "p-4 text-center border-r border-slate-100 last:border-r-0",
                isSameDay(day, new Date()) && "bg-cyan-50/30",
                idx > 1 && "hidden md:block"
              )}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  {format(day, 'eee', { locale: ptBR })}
                </p>
                <p className={cn(
                  "text-lg font-bold",
                  isSameDay(day, new Date()) ? "text-cyan-600" : "text-slate-900"
                )}>
                  {format(day, 'dd')}
                </p>
              </div>
            ))
          ) : (
            ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
              <div key={d} className="p-4 text-center border-r border-slate-100 last:border-r-0 hidden md:block">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d}</p>
              </div>
            ))
          )}
        </div>

        {/* Time/Month Grid */}
        <div className="flex-1 overflow-y-auto">
          {view === 'month' ? (
            <div className="grid grid-cols-7 h-full">
              {eachDayOfInterval({
                start: startOfMonth(currentDate),
                end: endOfMonth(currentDate)
              }).map((day, i) => (
                <div key={day.toString()} className={cn(
                  "min-h-[100px] p-2 border-r border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer",
                  !isSameDay(day, currentDate) && "text-slate-400",
                  isSameDay(day, new Date()) && "bg-cyan-50/20"
                )}>
                  <p className={cn(
                    "text-xs font-bold mb-2",
                    isSameDay(day, new Date()) ? "text-cyan-600" : "text-slate-900"
                  )}>
                    {format(day, 'd')}
                  </p>
                  {isSameDay(day, new Date()) && (
                    <div className="bg-cyan-500 text-white text-[8px] p-1 rounded mb-1 truncate font-bold">
                      4 Agendamentos
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            Array.from({ length: 12 }).map((_, hour) => (
              <div key={hour} className="grid grid-cols-2 md:grid-cols-8 border-b border-slate-50 group">
                <div className="hidden md:block p-4 border-r border-slate-100 text-right">
                  <span className="text-xs font-bold text-slate-400">{hour + 8}:00</span>
                </div>
                {view === 'day' ? (
                  <div className="col-span-1 md:col-span-7 border-r border-slate-100 last:border-r-0 relative min-h-[80px] hover:bg-slate-50/50 transition-colors cursor-pointer">
                    <div className="md:hidden absolute top-1 left-1 text-[8px] font-bold text-slate-300">{hour + 8}:00</div>
                    {isSameDay(currentDate, new Date()) && hour === 1 && (
                      <div className="absolute inset-1 bg-cyan-50 border-l-4 border-cyan-500 rounded-lg p-2 shadow-sm z-10 overflow-hidden">
                        <p className="text-[10px] font-bold text-cyan-700 truncate">ANA PAULA SOUZA</p>
                        <p className="text-[9px] text-cyan-600 truncate">Limpeza (Dr. Lucas Silva)</p>
                      </div>
                    )}
                  </div>
                ) : weekDays.map((day, i) => (
                  <div key={day.toString()} className={cn(
                    "border-r border-slate-100 last:border-r-0 relative min-h-[80px] hover:bg-slate-50/50 transition-colors cursor-pointer",
                    i > 1 && "hidden md:block"
                  )}>
                    {/* Mobile Hour Indicator */}
                    <div className="md:hidden absolute top-1 left-1 text-[8px] font-bold text-slate-300">{hour + 8}:00</div>
                    
                    {/* Mock Appointment */}
                    {isSameDay(day, new Date()) && hour === 1 && (
                      <div className="absolute inset-1 bg-cyan-50 border-l-4 border-cyan-500 rounded-lg p-2 shadow-sm z-10 overflow-hidden">
                        <p className="text-[10px] font-bold text-cyan-700 truncate">ANA PAULA SOUZA</p>
                        <p className="text-[9px] text-cyan-600 truncate">Limpeza</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-2 h-2 text-cyan-400" />
                          <span className="text-[8px] text-cyan-500 font-bold">09:00</span>
                        </div>
                      </div>
                    )}
                    {i === 3 && hour === 3 && (
                      <div className="absolute inset-1 bg-amber-50 border-l-4 border-amber-500 rounded-lg p-2 shadow-sm z-10 overflow-hidden">
                        <p className="text-[10px] font-bold text-amber-700 truncate">CARLOS EDUARDO</p>
                        <p className="text-[9px] text-amber-600 truncate">Avaliação</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
