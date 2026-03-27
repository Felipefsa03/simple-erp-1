import React, { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Activity, 
  ArrowUpRight, 
  Plus, 
  Zap, 
  Clock, 
  Sparkles,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Bell,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';
import { useClinicStore } from '@/stores/clinicStore';
import { useAuth } from '@/hooks/useAuth';
import { toast, formatCurrency } from '@/hooks/useShared';
import { Card, Button, Badge, Avatar, StatCard, Input, ProgressBar, LoadingSpinner } from '@/components/design-system';

interface DashboardProps {
  onNavigate?: (tab: string, ctx?: any) => void;
}

const getDayGreeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

const getWeatherEmoji = (code?: number | null, isDay = true) => {
  if (code === null || code === undefined || Number.isNaN(code)) {
    return isDay ? '☀️' : '🌙';
  }
  if (code === 0) return isDay ? '☀️' : '🌙';
  if (code >= 1 && code <= 3) return isDay ? '🌤️' : '☁️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌦️';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 95) return '⛈️';
  return isDay ? '🌤️' : '☁️';
};

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user, hasPermission } = useAuth();

  const appointments = useClinicStore(s => s.appointments);
  const patients = useClinicStore(s => s.patients);
  const transactions = useClinicStore(s => s.transactions);
  const professionals = useClinicStore(s => s.professionals);
  const services = useClinicStore(s => s.services);
  const stockItems = useClinicStore(s => s.stockItems);

  const addAppointment = useClinicStore.getState().addAppointment;
  const getMonthlyIncome = useClinicStore.getState().getMonthlyIncome;

  const [showQuickBook, setShowQuickBook] = useState(false);
  const [qb, setQb] = useState({ patient_id: '', professional_id: '', service_id: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00' });
  const [greeting, setGreeting] = useState(() => getDayGreeting());
  const [weatherEmoji, setWeatherEmoji] = useState(() => getWeatherEmoji(undefined, true));
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);

  const clinicId = user?.clinic_id || 'clinic-1';
  const canViewDashboard = hasPermission('view_dashboard');
  const canCreateAppointment = hasPermission('create_appointment');

  const clinicAppointments = useMemo(() => appointments.filter(a => a.clinic_id === clinicId), [appointments, clinicId]);
  const clinicPatients = useMemo(() => patients.filter(p => p.clinic_id === clinicId), [patients, clinicId]);
  const clinicTransactions = useMemo(() => transactions.filter(t => t.clinic_id === clinicId), [transactions, clinicId]);
  const clinicProfessionals = useMemo(() => professionals.filter(p => p.clinic_id === clinicId && p.role !== 'receptionist'), [professionals, clinicId]);
  const clinicServices = useMemo(() => services.filter(s => s.clinic_id === clinicId && s.active), [services, clinicId]);

  useEffect(() => {
    if (!qb.professional_id && clinicProfessionals.length > 0) {
      setQb(prev => ({ ...prev, professional_id: clinicProfessionals[0].id }));
    }
  }, [qb.professional_id, clinicProfessionals]);

  useEffect(() => {
    const updateGreeting = () => setGreeting(getDayGreeting());
    updateGreeting();
    const timer = setInterval(updateGreeting, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const setEmojiSafe = (emoji: string) => {
      if (!cancelled) setWeatherEmoji(emoji);
    };
    const fallbackEmoji = () => getWeatherEmoji(undefined, true);

    setIsLoadingWeather(true);
    if (!('geolocation' in navigator)) {
      setEmojiSafe(fallbackEmoji());
      setIsLoadingWeather(false);
      return () => { cancelled = true; };
    }

    try {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weather_code,is_day&timezone=auto`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('weather_fetch_failed');
            const data = await resp.json();
            const code = data?.current?.weather_code ?? data?.current_weather?.weathercode;
            const isDay = data?.current?.is_day ?? data?.current_weather?.is_day;
            setEmojiSafe(getWeatherEmoji(code, isDay ?? true));
          } catch {
            setEmojiSafe(fallbackEmoji());
          } finally {
            setIsLoadingWeather(false);
          }
        },
        () => {
          setEmojiSafe(fallbackEmoji());
          setIsLoadingWeather(false);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 30 * 60 * 1000 }
      );
    } catch {
      setEmojiSafe(fallbackEmoji());
      setIsLoadingWeather(false);
    }

    return () => { cancelled = true; };
  }, []);

  const monthlyIncome = getMonthlyIncome(clinicId);
  const today = new Date().toISOString().split('T')[0];
  const newPatientsThisMonth = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    return clinicPatients.filter(p => p.created_at.startsWith(thisMonth)).length;
  }, [clinicPatients]);

  const todayAppointments = useMemo(() =>
    clinicAppointments.filter(a => a.scheduled_at.startsWith(today) && a.status !== 'cancelled')
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    [clinicAppointments, today]
  );

  const attendanceRate = useMemo(() => {
    const total = clinicAppointments.filter(a => a.status === 'done' || a.status === 'no_show').length;
    if (total === 0) return 100;
    const attended = clinicAppointments.filter(a => a.status === 'done').length;
    return Math.round((attended / total) * 100);
  }, [clinicAppointments]);

  const openTreatments = useMemo(() =>
    clinicAppointments.filter(a => a.status === 'in_progress').length,
    [clinicAppointments]
  );

  const pendingPayments = useMemo(() =>
    clinicTransactions.filter(t => t.type === 'income' && (t.status === 'pending' || t.status === 'awaiting_payment')).reduce((s, t) => s + t.amount, 0),
    [clinicTransactions]
  );

  const handleQuickBook = () => {
    if (!hasPermission('create_appointment')) { toast('Você não tem permissão para criar agendamentos.', 'error'); return; }
    if (!qb.patient_id || !qb.professional_id || !qb.date || !qb.time) {
      toast('Preencha todos os campos', 'error'); return;
    }
    const patient = clinicPatients.find(p => p.id === qb.patient_id);
    const prof = clinicProfessionals.find(p => p.id === qb.professional_id);
    const service = clinicServices.find(s => s.id === qb.service_id);
    const created = addAppointment({
      clinic_id: clinicId,
      patient_id: qb.patient_id, patient_name: patient?.name || '',
      professional_id: qb.professional_id, professional_name: prof?.name || '',
      service_id: qb.service_id || undefined, service_name: service?.name || 'Consulta',
      scheduled_at: `${qb.date}T${qb.time}:00`, duration_min: service?.avg_duration_min || 60,
      status: 'scheduled', base_value: service?.base_price || 0,
    });
    if (!created) {
      toast('Conflito de horário para este profissional.', 'error');
      return;
    }
    setShowQuickBook(false);
    toast('Agendamento criado com sucesso!');
  };

  const insights = useMemo(() => {
    const results: { title: string; desc: string; action: string; tab: string; type: 'warning' | 'success' | 'info' }[] = [];
    if (pendingPayments > 0) results.push({ title: 'Cobranças Pendentes', desc: `${formatCurrency(pendingPayments)} aguardando pagamento`, action: 'Ver no Financeiro', tab: 'financeiro', type: 'warning' });
    const lowStock = stockItems.filter(i => i.quantity <= i.min_quantity && i.clinic_id === clinicId);
    if (lowStock.length > 0) results.push({ title: 'Estoque Baixo', desc: `${lowStock.length} itens precisam de reposição`, action: 'Ver Estoque', tab: 'estoque', type: 'warning' });
    const riskPatients = clinicPatients.filter(p => p.status === 'risk');
    if (riskPatients.length > 0) results.push({ title: 'Risco de Churn', desc: `${riskPatients.length} pacientes inativos há muito tempo`, action: 'Ver Pacientes', tab: 'pacientes', type: 'warning' });
    if (results.length === 0) results.push({ title: 'Tudo em Ordem!', desc: 'Seu sistema está funcionando perfeitamente. Continue assim!', action: 'Ver Agenda', tab: 'agenda', type: 'success' });
    return results;
  }, [pendingPayments, stockItems, clinicPatients, clinicId]);

  if (!canViewDashboard) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card variant="elevated" className="text-center p-8">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">Acesso Restrito</h3>
          <p className="text-slate-500">Você não tem permissão para acessar o dashboard.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}, {user?.name?.split(' ')[0] || 'Gestor'}!
          </h1>
          <p className="text-slate-500 mt-1">
            {isLoadingWeather ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                Carregando clima...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {weatherEmoji}
                <span className="text-sm">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" icon={<Bell className="w-5 h-5" />} />
          {canCreateAppointment && (
            <Button 
              variant="primary" 
              size="md" 
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowQuickBook(true)}
            >
              Novo Agendamento
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card variant="gradient" hover className="relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Receita Mensal</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(monthlyIncome)}</p>
                <p className="text-xs text-accent-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +12% vs último mês
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 text-white shadow-lg shadow-accent-500/25">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-gradient-to-br from-accent-400/20 to-accent-500/20 rounded-full blur-2xl" />
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card variant="gradient" hover className="relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Novos Pacientes</p>
                <p className="text-2xl font-bold text-slate-900">{newPatientsThisMonth}</p>
                <p className="text-xs text-slate-400 mt-1">{clinicPatients.length} pacientes total</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/25">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-gradient-to-br from-brand-400/20 to-brand-500/20 rounded-full blur-2xl" />
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="gradient" hover className="relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Comparecimento</p>
                <p className="text-2xl font-bold text-slate-900">{attendanceRate}%</p>
                <p className="text-xs text-slate-400 mt-1">{todayAppointments.length} agendamentos hoje</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/25">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <ProgressBar value={attendanceRate} color="success" />
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card variant="gradient" hover className="relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Em Atendimento</p>
                <p className="text-2xl font-bold text-slate-900">{openTreatments}</p>
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  ativos agora
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-full blur-2xl" />
          </Card>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2">
          <Card variant="elevated" padding="none">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Agenda de Hoje</h3>
              <Button variant="ghost" size="sm" onClick={() => onNavigate?.('agenda')}>
                Ver todos <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="divide-y divide-slate-50">
              {todayAppointments.length === 0 ? (
                <div className="p-8 text-center">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhum agendamento para hoje</p>
                </div>
              ) : (
                todayAppointments.slice(0, 5).map((apt, idx) => (
                  <motion.div 
                    key={apt.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="text-center min-w-[60px]">
                      <p className="text-lg font-bold text-slate-900">{apt.scheduled_at.split('T')[1].slice(0, 5)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{apt.patient_name}</p>
                      <p className="text-sm text-slate-500 truncate">{apt.professional_name} • {apt.service_name}</p>
                    </div>
                    <Badge variant={apt.status === 'scheduled' ? 'info' : apt.status === 'done' ? 'success' : apt.status === 'in_progress' ? 'warning' : 'neutral'}>
                      {apt.status === 'scheduled' ? 'Agendado' : apt.status === 'done' ? 'Concluído' : apt.status === 'in_progress' ? 'Em andamento' : apt.status}
                    </Badge>
                  </motion.div>
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
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={cn(
                    "p-4 rounded-xl cursor-pointer transition-all hover:shadow-md",
                    insight.type === 'success' ? "bg-accent-50 hover:bg-accent-100" : "bg-amber-50 hover:bg-amber-100"
                  )}
                  onClick={() => onNavigate?.(insight.tab)}
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
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Book Modal */}
      {showQuickBook && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowQuickBook(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900">Novo Agendamento</h3>
                <button
                  onClick={() => setShowQuickBook(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <Input
                  label="Paciente"
                  placeholder="Selecione o paciente"
                  value={qb.patient_id}
                  onChange={(e) => setQb({ ...qb, patient_id: e.target.value })}
                  icon={<Users className="w-4 h-4" />}
                />
                <Input
                  label="Profissional"
                  placeholder="Selecione o profissional"
                  value={qb.professional_id}
                  onChange={(e) => setQb({ ...qb, professional_id: e.target.value })}
                  icon={<Sparkles className="w-4 h-4" />}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Data"
                    type="date"
                    value={qb.date}
                    onChange={(e) => setQb({ ...qb, date: e.target.value })}
                    icon={<Calendar className="w-4 h-4" />}
                  />
                  <Input
                    label="Hora"
                    type="time"
                    value={qb.time}
                    onChange={(e) => setQb({ ...qb, time: e.target.value })}
                    icon={<Clock className="w-4 h-4" />}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setShowQuickBook(false)}>
                    Cancelar
                  </Button>
                  <Button variant="primary" className="flex-1" onClick={handleQuickBook}>
                    Criar Agendamento
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
