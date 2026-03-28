import React, { useState, useMemo } from 'react';
import {
  Building2, Users, CreditCard, TrendingUp, Activity, Shield, AlertTriangle, CheckCircle2,
  Eye, Ban, Edit2, Search, Clock, Globe, Smartphone, Monitor, Lock, Key, FileText,
  DollarSign, Calendar, MoreHorizontal, X, EyeOff, LogIn, UserCheck, ArrowLeft,
  Stethoscope, Phone, Mail, MapPin, CalendarDays, UserPlus,
  Settings, BarChart3, ClipboardList, FileSignature, Server, Database, HardDrive, Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Modal, ConfirmDialog } from '@/components/shared';
import { useAuth } from '@/hooks/useAuth';
import type { PlatformSubscription, SecurityLog, ActiveSession } from '@/types';
import { DEMO_PLATFORM_CLINICS } from '@/lib/platformData';

// Dados fictícios completos de cada clínica
const DEMO_CLINIC_TEAMS: Record<string, any[]> = {
  'clinic-1': [
    { id: 'admin-1', name: 'Dr. Lucas Silva', email: 'clinica@luminaflow.com.br', role: 'admin', phone: '(11) 98765-4321', cro: 'CRO-SP 12345', commission: 40, status: 'active', lastLogin: '2026-03-20T14:30:00' },
    { id: 'dentist-1', name: 'Dra. Julia Paiva', email: 'dentista@luminaflow.com.br', role: 'dentist', phone: '(11) 99876-5432', cro: 'CRO-SP 54321', commission: 35, status: 'active', lastLogin: '2026-03-20T09:15:00' },
    { id: 'recep-1', name: 'Fernanda Lima', email: 'recepcao@luminaflow.com.br', role: 'receptionist', phone: '(11) 98765-0001', commission: 0, status: 'active', lastLogin: '2026-03-20T08:00:00' },
    { id: 'dentist-2', name: 'Dr. Pedro Santos', email: 'pedro@lumina.com.br', role: 'dentist', phone: '(11) 98765-1111', cro: 'CRO-SP 98765', commission: 30, status: 'active', lastLogin: '2026-03-19T16:45:00' },
    { id: 'aesth-1', name: 'Dra. Amanda Costa', email: 'amanda@lumina.com.br', role: 'aesthetician', phone: '(11) 98765-2222', commission: 25, status: 'active', lastLogin: '2026-03-18T11:20:00' },
  ],
  'clinic-2': [
    { id: 'admin-2', name: 'Dra. Camila Neves', email: 'camila@esteticapremium.com.br', role: 'admin', phone: '(11) 98765-3333', commission: 50, status: 'active', lastLogin: '2026-03-20T10:00:00' },
    { id: 'recep-2', name: 'Bruna Oliveira', email: 'bruna@esteticapremium.com.br', role: 'receptionist', phone: '(11) 98765-4444', commission: 0, status: 'active', lastLogin: '2026-03-20T08:30:00' },
    { id: 'aesth-2', name: 'Dra. Priscila Mendes', email: 'priscila@esteticapremium.com.br', role: 'aesthetician', phone: '(11) 98765-5555', commission: 30, status: 'active', lastLogin: '2026-03-19T15:00:00' },
  ],
  'clinic-3': [
    { id: 'admin-3', name: 'Dr. Rafael Costa', email: 'rafael@odontovida.com.br', role: 'admin', phone: '(21) 98765-6666', cro: 'CRO-RJ 11223', commission: 45, status: 'active', lastLogin: '2026-03-20T11:30:00' },
    { id: 'recep-3', name: 'Ana Paula Souza', email: 'ana@odontovida.com.br', role: 'receptionist', phone: '(21) 98765-7777', commission: 0, status: 'active', lastLogin: '2026-03-20T08:00:00' },
  ],
  'clinic-4': [
    { id: 'admin-4', name: 'Dra. Amanda Reis', email: 'amanda@sorrisoperfeito.com.br', role: 'admin', phone: '(19) 98765-8888', cro: 'CRO-SP 33445', commission: 40, status: 'active', lastLogin: '2026-03-20T09:00:00' },
    { id: 'dentist-3', name: 'Dr. Bruno Ferreira', email: 'bruno@sorrisoperfeito.com.br', role: 'dentist', phone: '(19) 98765-9999', cro: 'CRO-SP 55667', commission: 32, status: 'active', lastLogin: '2026-03-20T10:45:00' },
    { id: 'dentist-4', name: 'Dra. Larissa Rocha', email: 'larissa@sorrisoperfeito.com.br', role: 'dentist', phone: '(19) 98765-1010', cro: 'CRO-SP 77889', commission: 28, status: 'active', lastLogin: '2026-03-19T14:20:00' },
    { id: 'recep-4', name: 'Carla Dias', email: 'carla@sorrisoperfeito.com.br', role: 'receptionist', phone: '(19) 98765-1212', commission: 0, status: 'active', lastLogin: '2026-03-20T08:15:00' },
    { id: 'fin-1', name: 'Roberto Lima', email: 'financeiro@sorrisoperfeito.com.br', role: 'financial', phone: '(19) 98765-1313', commission: 0, status: 'active', lastLogin: '2026-03-20T07:30:00' },
  ],
};

const DEMO_CLINIC_STATS: Record<string, any> = {
  'clinic-1': {
    patientsTotal: 156, patientsAtivos: 142, patientsInativos: 14,
    appointmentsTotal: 312, appointmentsMes: 48, taxaNoShow: 8,
    revenueTotal: 28500, revenueMes: 4750, ticketMedio: 237,
    appointmentStats: { agendados: 12, confirmados: 28, emAtendimento: 3, concluidos: 45, falta: 4 },
  },
  'clinic-2': {
    patientsTotal: 89, patientsAtivos: 82, patientsInativos: 7,
    appointmentsTotal: 178, appointmentsMes: 32, taxaNoShow: 5,
    revenueTotal: 12800, revenueMes: 2100, ticketMedio: 145,
    appointmentStats: { agendados: 8, confirmados: 15, emAtendimento: 2, concluidos: 25, falta: 2 },
  },
  'clinic-3': {
    patientsTotal: 23, patientsAtivos: 18, patientsInativos: 5,
    appointmentsTotal: 45, appointmentsMes: 15, taxaNoShow: 12,
    revenueTotal: 0, revenueMes: 0, ticketMedio: 0,
    appointmentStats: { agendados: 3, confirmados: 8, emAtendimento: 1, concluidos: 10, falta: 2 },
  },
  'clinic-4': {
    patientsTotal: 210, patientsAtivos: 195, patientsInativos: 15,
    appointmentsTotal: 456, appointmentsMes: 65, taxaNoShow: 7,
    revenueTotal: 18900, revenueMes: 3150, ticketMedio: 180,
    appointmentStats: { agendados: 18, confirmados: 35, emAtendimento: 4, concluidos: 52, falta: 6 },
  },
};

const DEMO_SUBSCRIPTIONS: PlatformSubscription[] = [
  {
    id: 'sub-1', clinic_id: 'clinic-1', clinic_name: 'Lumina Odontologia', plan: 'ultra', status: 'active', amount: 697, billing_cycle: 'monthly', next_billing_date: '2026-04-15', created_at: '2025-01-15', payment_history: [
      { id: 'pay-1', date: '2026-03-15', amount: 697, status: 'paid', method: 'Cartão' },
      { id: 'pay-2', date: '2026-02-15', amount: 697, status: 'paid', method: 'Cartão' },
      { id: 'pay-3', date: '2026-01-15', amount: 697, status: 'paid', method: 'PIX' },
    ]
  },
  {
    id: 'sub-2', clinic_id: 'clinic-2', clinic_name: 'Estética Premium SP', plan: 'pro', status: 'active', amount: 397, billing_cycle: 'monthly', next_billing_date: '2026-04-20', created_at: '2025-03-20', payment_history: [
      { id: 'pay-4', date: '2026-03-20', amount: 397, status: 'paid', method: 'PIX' },
      { id: 'pay-5', date: '2026-02-20', amount: 397, status: 'paid', method: 'PIX' },
    ]
  },
  { id: 'sub-3', clinic_id: 'clinic-3', clinic_name: 'OdontoVida Clínica', plan: 'basic', status: 'trial', amount: 0, billing_cycle: 'monthly', next_billing_date: '2026-04-10', created_at: '2025-05-10', payment_history: [] },
  {
    id: 'sub-4', clinic_id: 'clinic-4', clinic_name: 'Sorriso Perfeito', plan: 'pro', status: 'active', amount: 397, billing_cycle: 'monthly', next_billing_date: '2026-04-01', created_at: '2025-02-01', payment_history: [
      { id: 'pay-6', date: '2026-03-01', amount: 397, status: 'paid', method: 'Boleto' },
      { id: 'pay-7', date: '2026-02-01', amount: 397, status: 'failed', method: 'Boleto' },
    ]
  },
];

const DEMO_SECURITY_LOGS: SecurityLog[] = [
  { id: 'log-1', user_id: 'admin-1', user_name: 'Dr. Lucas Silva', action: 'LOGIN', ip_address: '189.50.23.105', details: 'Login bem-sucedido via Chrome', created_at: '2026-03-03T18:30:00' },
  { id: 'log-2', user_id: 'dentist-1', user_name: 'Dra. Julia Paiva', action: 'LOGIN', ip_address: '189.50.23.110', details: 'Login bem-sucedido via Safari', created_at: '2026-03-03T17:45:00' },
  { id: 'log-3', user_id: 'super-admin-1', user_name: 'Administrador Lumina', action: 'SETTINGS_CHANGE', ip_address: '177.38.12.50', details: 'Alterou configurações de notificação', created_at: '2026-03-03T16:20:00' },
  { id: 'log-4', user_id: 'recep-1', user_name: 'Fernanda Lima', action: 'PATIENT_CREATE', ip_address: '189.50.23.105', details: 'Cadastrou paciente: Maria Santos', created_at: '2026-03-03T15:00:00' },
  { id: 'log-5', user_id: 'admin-1', user_name: 'Dr. Lucas Silva', action: 'FINALIZE', ip_address: '189.50.23.105', details: 'Finalizou atendimento de Ana Paula Souza', created_at: '2026-03-03T14:30:00' },
  { id: 'log-6', user_id: 'unknown', user_name: 'Desconhecido', action: 'LOGIN_FAILED', ip_address: '45.227.89.12', details: 'Tentativa de login com email: admin@test.com', created_at: '2026-03-03T13:15:00' },
  { id: 'log-7', user_id: 'admin-2', user_name: 'Dra. Camila Neves', action: 'LOGIN', ip_address: '201.10.45.78', details: 'Login bem-sucedido via Firefox', created_at: '2026-03-03T12:00:00' },
  { id: 'log-8', user_id: 'super-admin-1', user_name: 'Administrador Lumina', action: 'PLAN_CHANGE', ip_address: '177.38.12.50', details: 'Alterou plano de OdontoVida para Basic', created_at: '2026-03-02T10:00:00' },
];

const DEMO_SESSIONS: ActiveSession[] = [
  { id: 'sess-1', user_id: 'super-admin-1', user_name: 'Administrador Lumina', clinic_name: 'Plataforma', ip_address: '177.38.12.50', device: 'Chrome / Windows', started_at: '2026-03-03T18:00:00', last_activity: '2026-03-03T19:30:00' },
  { id: 'sess-2', user_id: 'admin-1', user_name: 'Dr. Lucas Silva', clinic_name: 'Lumina Odontologia', ip_address: '189.50.23.105', device: 'Chrome / macOS', started_at: '2026-03-03T08:00:00', last_activity: '2026-03-03T19:25:00' },
  { id: 'sess-3', user_id: 'dentist-1', user_name: 'Dra. Julia Paiva', clinic_name: 'Lumina Odontologia', ip_address: '189.50.23.110', device: 'Safari / iOS', started_at: '2026-03-03T17:45:00', last_activity: '2026-03-03T19:20:00' },
  { id: 'sess-4', user_id: 'admin-2', user_name: 'Dra. Camila Neves', clinic_name: 'Estética Premium SP', ip_address: '200.12.34.56', device: 'Firefox / Windows', started_at: '2026-03-03T09:00:00', last_activity: '2026-03-03T18:50:00' },
];

const planPrices = { basic: 197, pro: 397, ultra: 697 };

const roleLabels: Record<string, string> = {
  admin: 'Admin/Dono', dentist: 'Dentista', receptionist: 'Recepcionista',
  aesthetician: 'Esteticista', financial: 'Financeiro', super_admin: 'Super Admin',
};

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  dentist: 'bg-blue-100 text-blue-700',
  receptionist: 'bg-emerald-100 text-emerald-700',
  aesthetician: 'bg-pink-100 text-pink-700',
  financial: 'bg-amber-100 text-amber-700',
  super_admin: 'bg-slate-100 text-slate-700',
};

interface SuperAdminDashboardProps {
  initialTab?: string;
}

export function SuperAdminDashboard({ initialTab = 'dashboard' }: SuperAdminDashboardProps) {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptions] = useState(DEMO_SUBSCRIPTIONS);
  const [selectedSub, setSelectedSub] = useState<PlatformSubscription | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ sub: PlatformSubscription; action: string } | null>(null);
  const [changePlanModal, setChangePlanModal] = useState<PlatformSubscription | null>(null);
  const [securityFilter, setSecurityFilter] = useState('all');
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Fetch system metrics
  React.useEffect(() => {
    if (activeTab === 'sistema') {
      setMetricsLoading(true);
      fetch('/api/health/extended')
        .then(r => r.json())
        .then(data => {
          setSystemMetrics(data);
          setMetricsLoading(false);
        })
        .catch(() => setMetricsLoading(false));
    }
  }, [activeTab]);

  // Inspetor de clínica
  const [inspectMode, setInspectMode] = useState(false);
  const [selectedClinicForInspect, setSelectedClinicForInspect] = useState<any>(null);
  const [inspectTab, setInspectTab] = useState<'overview' | 'team' | 'financial' | 'activity'>('overview');

  React.useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  const clinics = DEMO_PLATFORM_CLINICS;
  const totalMRR = clinics.reduce((s, c) => s + c.mrr, 0);
  const totalUsers = clinics.reduce((s, c) => s + c.users, 0);
  const totalPatients = clinics.reduce((s, c) => s + c.patients, 0);

  const filteredLogs = useMemo(() => {
    let logs = DEMO_SECURITY_LOGS;
    if (securityFilter !== 'all') logs = logs.filter(l => l.action === securityFilter);
    return logs;
  }, [securityFilter]);

  const handleSubAction = (sub: PlatformSubscription, action: string) => {
    setConfirmAction(null);
  };

  const handleChangePlan = (sub: PlatformSubscription, newPlan: 'basic' | 'pro' | 'ultra') => {
    setChangePlanModal(null);
  };

  const handleInspectClinic = (clinic: any) => {
    setSelectedClinicForInspect(clinic);
    setInspectMode(true);
    setInspectTab('overview');
  };

  const handleImpersonateClinic = (clinicId: string) => {
    const clinicPasswords: Record<string, { email: string; password: string }> = {
      'clinic-1': { email: 'clinica@luminaflow.com.br', password: 'clinica123' },
      'clinic-2': { email: 'camila@esteticapremium.com.br', password: 'premium123' },
      'clinic-3': { email: 'rafael@odontovida.com.br', password: 'odontovida123' },
      'clinic-4': { email: 'amanda@sorrisoperfeito.com.br', password: 'sorriso123' },
    };
    const credentials = clinicPasswords[clinicId];
    if (credentials) {
      login(credentials.email, credentials.password);
    }
  };

  const actionLabels: Record<string, string> = {
    LOGIN: 'Login', LOGIN_FAILED: 'Login Falhou', LOGOUT: 'Logout',
    SETTINGS_CHANGE: 'Config. Alterada', PATIENT_CREATE: 'Paciente Criado',
    FINALIZE: 'Atendimento Finalizado', PLAN_CHANGE: 'Plano Alterado',
  };

  const actionColors: Record<string, string> = {
    LOGIN: 'bg-emerald-50 text-emerald-700', LOGIN_FAILED: 'bg-red-50 text-red-700',
    LOGOUT: 'bg-slate-100 text-slate-700', SETTINGS_CHANGE: 'bg-blue-50 text-blue-700',
    PATIENT_CREATE: 'bg-cyan-50 text-cyan-700', FINALIZE: 'bg-purple-50 text-purple-700',
    PLAN_CHANGE: 'bg-amber-50 text-amber-700',
  };

  // ===== MODO INSPETOR =====
  if (inspectMode && selectedClinicForInspect) {
    const clinic = selectedClinicForInspect;
    const team = DEMO_CLINIC_TEAMS[clinic.id] || [];
    const stats = DEMO_CLINIC_STATS[clinic.id] || {};
    const admin = team.find((m: any) => m.role === 'admin');
    const sub = subscriptions.find(s => s.clinic_id === clinic.id);

    return (
      <div className="space-y-6">
        {/* Header do Inspetor */}
        <div className="flex items-center gap-4">
          <button onClick={() => { setInspectMode(false); setSelectedClinicForInspect(null); }} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
            <ArrowLeft className="w-4 h-4" />Voltar
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
              {clinic.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">{clinic.name}</h1>
              <p className="text-xs text-slate-500">Modo Inspetor — visualizando como a clínica</p>
            </div>
            <span className={cn("text-xs font-bold px-2 py-1 rounded-full uppercase", clinic.plan === 'ultra' ? 'bg-cyan-50 text-cyan-700' : clinic.plan === 'pro' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600')}>
              {clinic.plan}
            </span>
          </div>
          <button onClick={() => handleImpersonateClinic(clinic.id)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:opacity-90 text-sm">
            <LogIn className="w-4 h-4" />Impersonar Clínica
          </button>
        </div>

        {/* Tabs do Inspetor */}
        <div className="flex bg-white border border-slate-100 rounded-2xl p-1">
          {[
            { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
            { id: 'team', label: 'Equipe', icon: Users },
            { id: 'financial', label: 'Financeiro', icon: DollarSign },
            { id: 'activity', label: 'Atividades', icon: Activity },
          ].map(tab => (
            <button key={tab.id} onClick={() => setInspectTab(tab.id as any)}
              className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all",
                inspectTab === tab.id ? "bg-cyan-50 text-cyan-600" : "text-slate-500 hover:text-slate-900")}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {/* Visão Geral */}
        {inspectTab === 'overview' && (
          <div className="space-y-6">
            {/* Info da Clínica */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-cyan-500" />Dados da Empresa</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nome</p>
                  <p className="font-bold text-slate-900">{clinic.name}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CNPJ</p>
                  <p className="font-bold text-slate-900">{clinic.cnpj || 'Não informado'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Telefone</p>
                  <p className="font-bold text-slate-900">{clinic.phone || 'Não informado'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">E-mail</p>
                  <p className="font-bold text-slate-900">{clinic.email || 'Não informado'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Endereço</p>
                  <p className="font-bold text-slate-900">{clinic.address ? `${clinic.address.street}, ${clinic.address.city} - ${clinic.address.state}` : 'Não informado'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Criado em</p>
                  <p className="font-bold text-slate-900">{new Date(clinic.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                {clinic.specialties && clinic.specialties.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-4 md:col-span-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Especialidades</p>
                    <div className="flex flex-wrap gap-2">
                      {clinic.specialties.map((s: string) => (
                        <span key={s} className="text-xs font-bold px-2 py-1 bg-cyan-50 text-cyan-700 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Admin/Dono */}
            {admin && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-3xl border border-purple-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><UserCheck className="w-5 h-5 text-purple-500" />Admin / Dono da Empresa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl p-4 flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {admin.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{admin.name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" />{admin.email}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Telefone</p>
                    <p className="font-bold text-slate-900 flex items-center gap-1"><Phone className="w-3 h-3" />{admin.phone || 'Não informado'}</p>
                  </div>
                  {admin.cro && (
                    <div className="bg-white rounded-xl p-4">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CRO</p>
                      <p className="font-bold text-slate-900">{admin.cro}</p>
                    </div>
                  )}
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Comissão</p>
                    <p className="font-bold text-slate-900">{admin.commission}%</p>
                  </div>
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Último Login</p>
                    <p className="font-bold text-slate-900">{new Date(admin.lastLogin).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pacientes</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{stats.patientsTotal || 0}</p>
                <p className="text-xs text-emerald-600 font-medium">{stats.patientsAtivos || 0} ativos</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Atend. Mês</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{stats.appointmentsMes || 0}</p>
                <p className="text-xs text-slate-500 font-medium">{stats.appointmentsTotal || 0} total</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Faturamento</p>
                <p className="text-3xl font-black text-emerald-600 mt-1">R$ {(stats.revenueMes || 0).toLocaleString('pt-BR')}</p>
                <p className="text-xs text-slate-500 font-medium">Total: R$ {(stats.revenueTotal || 0).toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket Médio</p>
                <p className="text-3xl font-black text-cyan-600 mt-1">R$ {(stats.ticketMedio || 0).toLocaleString('pt-BR')}</p>
                <p className="text-xs text-red-500 font-medium">{stats.taxaNoShow || 0}% no-show</p>
              </div>
            </div>

            {/* Status dos Atendimentos de Hoje */}
            {stats.appointmentStats && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-cyan-500" />Status dos Atendimentos de Hoje</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: 'Agendados', value: stats.appointmentStats.agendados, color: 'bg-blue-50 text-blue-700', border: 'border-blue-200' },
                    { label: 'Confirmados', value: stats.appointmentStats.confirmados, color: 'bg-cyan-50 text-cyan-700', border: 'border-cyan-200' },
                    { label: 'Em Atendimento', value: stats.appointmentStats.emAtendimento, color: 'bg-amber-50 text-amber-700', border: 'border-amber-200' },
                    { label: 'Concluídos', value: stats.appointmentStats.concluidos, color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200' },
                    { label: 'Faltaram', value: stats.appointmentStats.falta, color: 'bg-red-50 text-red-700', border: 'border-red-200' },
                  ].map(item => (
                    <div key={item.label} className={cn("rounded-xl border p-4 text-center", item.border)}>
                      <p className="text-2xl font-black text-slate-900">{item.value}</p>
                      <p className={cn("text-xs font-bold mt-1", item.color.replace('bg-', 'text-').replace('-50', '-600'))}>{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Plano e Assinatura */}
            {sub && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-cyan-500" />Assinatura e Plano</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Plano</p>
                    <span className={cn("text-sm font-bold uppercase px-2 py-1 rounded-md", sub.plan === 'ultra' ? 'bg-cyan-50 text-cyan-700' : sub.plan === 'pro' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600')}>{sub.plan}</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Valor Mensal</p>
                    <p className="text-lg font-black text-slate-900">R$ {sub.amount}/mês</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Próxima Cobrança</p>
                    <p className="text-sm font-bold text-slate-900">{new Date(sub.next_billing_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                    <span className={cn("text-xs font-bold px-2 py-1 rounded-full", sub.status === 'active' ? 'bg-emerald-50 text-emerald-700' : sub.status === 'trial' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700')}>
                      {sub.status === 'active' ? 'Ativo' : sub.status === 'trial' ? 'Trial' : 'Inadimplente'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Equipe */}
        {inspectTab === 'team' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Users className="w-5 h-5 text-cyan-500" />Equipe ({team.length} membros)</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {team.map(member => (
                <div key={member.id} className="p-4 flex items-center gap-4 hover:bg-slate-50/50">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">{member.name}</p>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", roleColors[member.role] || 'bg-slate-100 text-slate-600')}>
                        {roleLabels[member.role] || member.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{member.email} {member.cro ? `• ${member.cro}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{member.phone}</p>
                    {member.commission > 0 && <p className="text-xs font-bold text-cyan-600">{member.commission}%</p>}
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", member.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                      {member.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financeiro */}
        {inspectTab === 'financial' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-3xl border border-emerald-100 p-6 text-center">
                <TrendingUp className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Faturamento Total</p>
                <p className="text-3xl font-black text-emerald-700 mt-1">R$ {(stats.revenueTotal || 0).toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-3xl border border-cyan-100 p-6 text-center">
                <DollarSign className="w-8 h-8 text-cyan-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-cyan-600 uppercase tracking-wider">Faturamento Mês</p>
                <p className="text-3xl font-black text-cyan-700 mt-1">R$ {(stats.revenueMes || 0).toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-100 p-6 text-center">
                <TrendingUp className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Ticket Médio</p>
                <p className="text-3xl font-black text-amber-700 mt-1">R$ {(stats.ticketMedio || 0).toLocaleString('pt-BR')}</p>
              </div>
            </div>
            {sub && sub.payment_history && sub.payment_history.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100"><h3 className="text-lg font-bold text-slate-900">Histórico de Pagamentos</h3></div>
                <div className="divide-y divide-slate-100">
                  {sub.payment_history.map(payment => (
                    <div key={payment.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{new Date(payment.date).toLocaleDateString('pt-BR')}</p>
                        <p className="text-xs text-slate-500">{payment.method}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-slate-900">R$ {payment.amount}</p>
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", payment.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : payment.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700')}>
                          {payment.status === 'paid' ? 'Pago' : payment.status === 'failed' ? 'Falhou' : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Atividades */}
        {inspectTab === 'activity' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100"><h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Activity className="w-5 h-5 text-cyan-500" />Atividades Recentes</h3></div>
            <div className="divide-y divide-slate-50">
              {DEMO_SECURITY_LOGS.filter(l => team.some((m: any) => m.id === l.user_id)).slice(0, 10).map(log => (
                <div key={log.id} className="p-4 flex items-center gap-4">
                  <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap", actionColors[log.action] || 'bg-slate-100 text-slate-600')}>
                    {actionLabels[log.action] || log.action}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">{log.details}</p>
                    <p className="text-xs text-slate-400">{log.user_name} • {log.ip_address}</p>
                  </div>
                  <p className="text-xs text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                </div>
              ))}
              {DEMO_SECURITY_LOGS.filter(l => team.some((m: any) => m.id === l.user_id)).length === 0 && (
                <div className="p-8 text-center text-slate-400">Nenhuma atividade recente.</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== PAINEL SUPER ADMIN PADRÃO =====
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Shield className="w-6 h-6 text-cyan-500" />Painel Super Admin</h1>
        <p className="text-slate-500">Visão geral de todas as clínicas da plataforma LuminaFlow.</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Clínicas Ativas', value: clinics.filter(c => c.status === 'active').length, icon: Building2, color: 'from-cyan-500 to-cyan-600' },
          { label: 'MRR Total', value: `R$ ${totalMRR.toLocaleString('pt-BR')}`, icon: TrendingUp, color: 'from-emerald-500 to-emerald-600' },
          { label: 'Usuários Totais', value: totalUsers, icon: Users, color: 'from-blue-500 to-blue-600' },
          { label: 'Pacientes Totais', value: totalPatients, icon: Activity, color: 'from-violet-500 to-violet-600' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br text-white flex items-center justify-center mb-4", kpi.color)}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <p className="text-sm text-slate-500">{kpi.label}</p>
            <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex bg-white border border-slate-100 rounded-2xl p-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'dashboard', label: 'Clínicas', icon: Building2 },
          { id: 'assinaturas', label: 'Assinaturas', icon: CreditCard },
          { id: 'sistema', label: 'Sistema', icon: Server },
          { id: 'seguranca', label: 'Segurança', icon: Lock },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
              activeTab === tab.id ? "bg-cyan-50 text-cyan-600 shadow-sm" : "text-slate-500 hover:text-slate-900")}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* === CLÍNICAS TAB === */}
      {(activeTab === 'dashboard' || activeTab === 'clinicas') && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Clínicas Cadastradas</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar clínica..." className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none w-64" />
            </div>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Clínica</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plano</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Usuários</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Pacientes</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">MRR</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clinics.filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <p className="font-bold text-sm text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.owner} • {c.email}</p>
                  </td>
                  <td className="px-6 py-4"><span className={cn("text-xs font-bold uppercase px-2 py-1 rounded-md", c.plan === 'ultra' ? "bg-cyan-50 text-cyan-700" : c.plan === 'pro' ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600")}>{c.plan}</span></td>
                  <td className="px-6 py-4 text-sm text-slate-600">{c.users}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{c.patients}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">R$ {c.mrr}</td>
                  <td className="px-6 py-4">
                    <span className={cn("inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full", c.status === 'active' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                      {c.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {c.status === 'active' ? 'Ativo' : 'Trial'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleInspectClinic(c)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors" title="Inspecionar clínica">
                        <Eye className="w-3.5 h-3.5" />Inspecionar
                      </button>
                      <button onClick={() => handleImpersonateClinic(c.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors" title="Impersonar como admin">
                        <LogIn className="w-3.5 h-3.5" />Impersonar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* === ASSINATURAS TAB === */}
      {activeTab === 'assinaturas' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Assinaturas Ativas', value: subscriptions.filter(s => s.status === 'active').length, color: 'text-emerald-600' },
              { label: 'Receita Mensal', value: `R$ ${subscriptions.filter(s => s.status === 'active').reduce((a, s) => a + s.amount, 0).toLocaleString('pt-BR')}`, color: 'text-cyan-600' },
              { label: 'Inadimplentes', value: subscriptions.filter(s => s.status === 'past_due').length, color: 'text-red-600' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                <p className={cn("text-2xl font-bold mt-1", card.color)}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100"><h2 className="text-lg font-bold text-slate-900">Gerenciar Assinaturas</h2></div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Clínica</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plano</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Próx. Cobrança</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{sub.clinic_name}</td>
                    <td className="px-6 py-4"><span className={cn("text-xs font-bold uppercase px-2 py-1 rounded-md", sub.plan === 'ultra' ? "bg-cyan-50 text-cyan-700" : sub.plan === 'pro' ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600")}>{sub.plan}</span></td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">R$ {sub.amount}/mês</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(sub.next_billing_date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4">
                      <span className={cn("text-xs font-bold px-2 py-1 rounded-full",
                        sub.status === 'active' ? "bg-emerald-50 text-emerald-700" :
                          sub.status === 'suspended' ? "bg-amber-50 text-amber-700" :
                            sub.status === 'cancelled' ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-700"
                      )}>{sub.status === 'active' ? 'Ativa' : sub.status === 'suspended' ? 'Suspensa' : sub.status === 'cancelled' ? 'Cancelada' : 'Inadimplente'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelectedSub(sub)} className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg" title="Ver detalhes"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => setChangePlanModal(sub)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Alterar plano"><Edit2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Modal isOpen={!!selectedSub} onClose={() => setSelectedSub(null)} title={`Assinatura — ${selectedSub?.clinic_name}`} maxWidth="max-w-lg">
            {selectedSub && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[10px] font-bold text-slate-400 uppercase">Plano</p><p className="text-sm font-bold text-slate-900 uppercase">{selectedSub.plan}</p></div>
                  <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[10px] font-bold text-slate-400 uppercase">Valor</p><p className="text-sm font-bold text-slate-900">R$ {selectedSub.amount}/mês</p></div>
                  <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[10px] font-bold text-slate-400 uppercase">Próx. Cobrança</p><p className="text-sm font-bold text-slate-900">{new Date(selectedSub.next_billing_date).toLocaleDateString('pt-BR')}</p></div>
                  <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[10px] font-bold text-slate-400 uppercase">Desde</p><p className="text-sm font-bold text-slate-900">{new Date(selectedSub.created_at).toLocaleDateString('pt-BR')}</p></div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Histórico de Pagamentos</h4>
                  {selectedSub.payment_history.length === 0 ? (
                    <p className="text-xs text-slate-400">Nenhum pagamento registrado.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedSub.payment_history.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{new Date(p.date).toLocaleDateString('pt-BR')}</p>
                            <p className="text-xs text-slate-500">{p.method}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">R$ {p.amount}</p>
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", p.status === 'paid' ? "bg-emerald-50 text-emerald-700" : p.status === 'failed' ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>{p.status === 'paid' ? 'Pago' : p.status === 'failed' ? 'Falhou' : 'Pendente'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Modal>

          <Modal isOpen={!!changePlanModal} onClose={() => setChangePlanModal(null)} title={`Alterar Plano — ${changePlanModal?.clinic_name}`}>
            {changePlanModal && (
              <div className="space-y-3">
                {(['basic', 'pro', 'ultra'] as const).map(plan => (
                  <button key={plan} onClick={() => handleChangePlan(changePlanModal, plan)}
                    disabled={changePlanModal.plan === plan}
                    className={cn("w-full p-4 rounded-2xl border-2 text-left transition-all",
                      changePlanModal.plan === plan ? "border-cyan-500 bg-cyan-50" : "border-slate-100 hover:border-slate-300"
                    )}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 uppercase">{plan}</p>
                        <p className="text-xs text-slate-500">{plan === 'basic' ? '5 profissionais, 500 pacientes' : plan === 'pro' ? '15 profissionais, ilimitado' : 'Tudo ilimitado + IA'}</p>
                      </div>
                      <p className="text-lg font-bold text-slate-900">R$ {planPrices[plan]}<span className="text-xs font-normal text-slate-400">/mês</span></p>
                    </div>
                    {changePlanModal.plan === plan && <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full mt-2 inline-block">PLANO ATUAL</span>}
                  </button>
                ))}
              </div>
            )}
          </Modal>

          <ConfirmDialog
            isOpen={!!confirmAction} onClose={() => setConfirmAction(null)}
            onConfirm={() => confirmAction && handleSubAction(confirmAction.sub, confirmAction.action)}
            title={confirmAction?.action === 'suspend' ? 'Suspender Assinatura?' : confirmAction?.action === 'cancel' ? 'Cancelar Assinatura?' : 'Reativar Assinatura?'}
            message={`Tem certeza que deseja ${confirmAction?.action === 'suspend' ? 'suspender' : confirmAction?.action === 'cancel' ? 'cancelar' : 'reativar'} a assinatura de ${confirmAction?.sub.clinic_name}?`}
            confirmLabel={confirmAction?.action === 'suspend' ? 'Suspender' : confirmAction?.action === 'cancel' ? 'Cancelar Assinatura' : 'Reativar'}
            variant={confirmAction?.action === 'cancel' ? 'danger' : undefined}
          />
        </motion.div>
      )}

      {/* === SISTEMA TAB === */}
      {activeTab === 'sistema' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Status Geral */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={cn("rounded-2xl border p-5", systemMetrics?.status === 'healthy' ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200")}>
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", systemMetrics?.status === 'healthy' ? "bg-emerald-100" : "bg-amber-100")}>
                  <Activity className={cn("w-5 h-5", systemMetrics?.status === 'healthy' ? "text-emerald-600" : "text-amber-600")} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className={cn("font-bold", systemMetrics?.status === 'healthy' ? "text-emerald-700" : "text-amber-700")}>
                    {metricsLoading ? 'Carregando...' : systemMetrics?.status === 'healthy' ? 'Online' : 'Atenção'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Uptime</p>
                  <p className="font-bold text-slate-700">{systemMetrics?.uptime || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Versão</p>
                  <p className="font-bold text-slate-700">{systemMetrics?.version || '1.2.0'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Ambiente</p>
                  <p className="font-bold text-slate-700">{systemMetrics?.environment || 'development'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Componentes */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
              <Server className="w-5 h-5 text-cyan-500" />Componentes do Sistema
            </h2>
            <div className="space-y-4">
              {Object.entries(systemMetrics?.components || {}).map(([key, value]: [string, any]) => (
                <div key={key} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    {key.includes('database') ? <Database className="w-5 h-5 text-blue-500" /> : 
                     key.includes('cache') ? <HardDrive className="w-5 h-5 text-purple-500" /> :
                     key.includes('queue') ? <Activity className="w-5 h-5 text-amber-500" /> :
                     <Server className="w-5 h-5 text-slate-400" />}
                    <div>
                      <p className="font-medium text-slate-900 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p className="text-xs text-slate-500">{value.database || value.status || 'Verificando...'}</p>
                    </div>
                  </div>
                  <span className={cn("px-3 py-1 rounded-full text-xs font-bold", 
                    value.status === 'healthy' || value.status === 'available' ? "bg-emerald-100 text-emerald-700" : 
                    value.status === 'unavailable' ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700")}>
                    {value.status === 'healthy' ? 'OK' : value.status === 'available' ? 'OK' : value.status === 'unavailable' ? 'Erro' : 'Pendente'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-cyan-500" />Métricas de Requisições
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Total Requests</p>
                  <p className="text-2xl font-bold text-slate-900">{systemMetrics?.metrics?.totalRequests || 0}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Erros</p>
                  <p className="text-2xl font-bold text-red-600">{systemMetrics?.metrics?.errors || 0}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Tempo Médio</p>
                  <p className="text-2xl font-bold text-slate-900">{systemMetrics?.metrics?.avgResponseTime || '0ms'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Por Minuto</p>
                  <p className="text-2xl font-bold text-slate-900">{systemMetrics?.metrics?.requestsPerMinute || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Database className="w-5 h-5 text-cyan-500" />Recursos do Sistema
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Memória</span>
                    <span className="font-medium">{systemMetrics?.memory?.usedPercent || '0%'}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: systemMetrics?.memory?.usedPercent || '0%' }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{systemMetrics?.memory?.used || '0'} / {systemMetrics?.memory?.total || '0'}</p>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">CPU</span>
                    <span className="font-medium">{systemMetrics?.cpu?.usedPercent || '0%'}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: systemMetrics?.cpu?.usedPercent || '0%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Link para Documentação API */}
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-3xl border border-cyan-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-cyan-900">Documentação API</h3>
                <p className="text-sm text-cyan-700">Acesse a documentação completa dos endpoints</p>
              </div>
              <a href={'/api-docs'} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 bg-cyan-600 text-white rounded-xl font-medium hover:bg-cyan-700 transition-colors">
                Ver Docs
              </a>
            </div>
          </div>
        </motion.div>
      )}

      {/* === SEGURANÇA TAB === */}
      {activeTab === 'seguranca' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sessões Ativas</p>
              <p className="text-2xl font-bold text-cyan-600 mt-1">{DEMO_SESSIONS.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tentativas Falhas (24h)</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{DEMO_SECURITY_LOGS.filter(l => l.action === 'LOGIN_FAILED').length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Política de Senhas</p>
              <p className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />Ativa — Mín. 8 caracteres</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Globe className="w-5 h-5 text-cyan-500" />Sessões Ativas</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {DEMO_SESSIONS.map(session => (
                <div key={session.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">{session.user_name.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{session.user_name}</p>
                      <p className="text-xs text-slate-500">{session.clinic_name} • {session.device}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="text-xs text-slate-500">{session.ip_address}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end"><Clock className="w-3 h-3" />{new Date(session.last_activity).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Encerrar sessão"><Ban className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><FileText className="w-5 h-5 text-cyan-500" />Logs de Auditoria</h2>
              <div className="flex gap-2">
                {['all', 'LOGIN', 'LOGIN_FAILED', 'SETTINGS_CHANGE', 'FINALIZE'].map(f => (
                  <button key={f} onClick={() => setSecurityFilter(f)} className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all", securityFilter === f ? "bg-cyan-50 text-cyan-600" : "text-slate-400 hover:text-slate-600")}>
                    {f === 'all' ? 'Todos' : actionLabels[f] || f}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {filteredLogs.map(log => (
                <div key={log.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap", actionColors[log.action] || 'bg-slate-100 text-slate-600')}>
                      {actionLabels[log.action] || log.action}
                    </span>
                    <div>
                      <p className="text-sm text-slate-700">{log.details}</p>
                      <p className="text-xs text-slate-400">{log.user_name} • {log.ip_address}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6"><Key className="w-5 h-5 text-cyan-500" />Política de Senhas</h2>
            <div className="space-y-4">
              {[
                { label: 'Comprimento mínimo', value: '8 caracteres', enabled: true },
                { label: 'Exigir letra maiúscula', value: 'Obrigatório', enabled: true },
                { label: 'Exigir número', value: 'Obrigatório', enabled: true },
                { label: 'Exigir caractere especial', value: 'Opcional', enabled: false },
                { label: 'Expiração de senha', value: '90 dias', enabled: true },
                { label: 'Bloqueio após tentativas', value: '5 tentativas', enabled: true },
              ].map(policy => (
                <div key={policy.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{policy.label}</p>
                    <p className="text-xs text-slate-500">{policy.value}</p>
                  </div>
                  <div className={cn("w-12 h-6 rounded-full transition-all relative", policy.enabled ? "bg-cyan-500" : "bg-slate-200")}>
                    <div className={cn("w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all", policy.enabled ? "left-6" : "left-0.5")} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
