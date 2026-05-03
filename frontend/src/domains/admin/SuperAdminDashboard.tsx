import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, CreditCard, TrendingUp, Activity, Shield, AlertTriangle, CheckCircle2,
  Eye, Ban, Edit2, Search, Clock, Globe, Smartphone, Monitor, Lock, Key, FileText,
  DollarSign, Calendar, MoreHorizontal, X, EyeOff, LogIn, UserCheck, ArrowLeft,
  Stethoscope, Phone, Mail, MapPin, CalendarDays, UserPlus,
  Settings, BarChart3, ClipboardList, FileSignature, Server, Database, HardDrive, Cpu,
  CheckSquare, RefreshCw, Loader2, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Modal, ConfirmDialog } from '@/components/shared';
import { useAuth } from '@/hooks/useAuth';
import type { PlatformSubscription, SecurityLog, ActiveSession } from '@/types';
import { DEMO_PLATFORM_CLINICS } from '@/lib/platformData';
import { SupabaseSync } from '@/lib/supabaseSync';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/supabaseConfig';
import { getSupabaseSession } from '@/lib/supabase';

// Dados fictícios completos de cada clínica
const DEMO_CLINIC_TEAMS: Record<string, any[]> = {
  'clinic-1': [
    { id: 'admin-1', name: 'Dr. Lucas Silva', email: 'clinica@clinxia.com.br', role: 'admin', phone: '(11) 98765-4321', cro: 'CRO-SP 12345', commission: 40, status: 'active', lastLogin: '2026-03-20T14:30:00' },
    { id: 'dentist-1', name: 'Dra. Julia Paiva', email: 'dentista@clinxia.com.br', role: 'dentist', phone: '(11) 99876-5432', cro: 'CRO-SP 54321', commission: 35, status: 'active', lastLogin: '2026-03-20T09:15:00' },
    { id: 'recep-1', name: 'Fernanda Lima', email: 'recepcao@clinxia.com.br', role: 'receptionist', phone: '(11) 98765-0001', commission: 0, status: 'active', lastLogin: '2026-03-20T08:00:00' },
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
  dentist: 'bg-brand-100 text-brand-700',
  receptionist: 'bg-emerald-100 text-emerald-700',
  aesthetician: 'bg-pink-100 text-pink-700',
  financial: 'bg-amber-100 text-amber-700',
  super_admin: 'bg-slate-100 text-slate-700',
};

interface SuperAdminDashboardProps {
  initialTab?: string;
}

export function SuperAdminDashboard({ initialTab = 'dashboard' }: SuperAdminDashboardProps) {
  const navigate = useNavigate();
  const { user, login, impersonateClinic } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSub, setSelectedSub] = useState<PlatformSubscription | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ sub: PlatformSubscription; action: string } | null>(null);
  const [changePlanModal, setChangePlanModal] = useState<PlatformSubscription | null>(null);
  // Real clinic data from Supabase
  const [realClinics, setRealClinics] = useState<any[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState(false);
  const [confirmPaymentClinic, setConfirmPaymentClinic] = useState<any | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [securityFilter, setSecurityFilter] = useState('all');
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [bannedIPs, setBannedIPs] = useState<any[]>([]);
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [securityDataLoading, setSecurityDataLoading] = useState(false);

  // Fetch real clinics directly from Supabase
  const fetchRealClinics = React.useCallback(async () => {
    setClinicsLoading(true);
    try {
      const token = SupabaseSync.getAuthToken();
      const apiKey = SUPABASE_PUBLISHABLE_KEY;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'Authorization': `Bearer ${token || apiKey}`,
      };
      const baseUrl = `${SUPABASE_URL}/rest/v1`;

      // Fetch all clinics
      const clinicsRes = await fetch(`${baseUrl}/clinics?select=*&order=created_at.desc`, { headers });
      if (!clinicsRes.ok) {
        console.error('[SuperAdmin] Failed to fetch clinics:', clinicsRes.status);
        setClinicsLoading(false);
        return;
      }
      const clinics = await clinicsRes.json();

      if (!clinics || clinics.length === 0) {
        setRealClinics([]);
        setClinicsLoading(false);
        return;
      }

      // Fetch admin users
      const clinicIds = clinics.map((c: any) => c.id);
      const adminsRes = await fetch(
        `${baseUrl}/users?role=eq.admin&clinic_id=in.(${clinicIds.join(',')})&select=clinic_id,name,email,phone`,
        { headers }
      );
      const admins = adminsRes.ok ? await adminsRes.json() : [];

      const adminMap: Record<string, any> = {};
      for (const a of admins) {
        if (!adminMap[a.clinic_id]) adminMap[a.clinic_id] = a;
      }

      // Count active users per clinic
      const usersRes = await fetch(
        `${baseUrl}/users?active=eq.true&clinic_id=in.(${clinicIds.join(',')})&select=clinic_id`,
        { headers }
      );
      const usersList = usersRes.ok ? await usersRes.json() : [];
      const userCountMap: Record<string, number> = {};
      for (const u of usersList) {
        userCountMap[u.clinic_id] = (userCountMap[u.clinic_id] || 0) + 1;
      }

      // Build enriched data
      const planPricesMap: Record<string, number> = { basico: 197, profissional: 397, premium: 697 };
      const enriched = clinics.map((clinic: any) => {
        const admin = adminMap[clinic.id];
        const planName = String(clinic.plan || 'basico').toLowerCase();
        return {
          id: clinic.id,
          name: clinic.name || 'Sem nome',
          plan: clinic.plan || 'basico',
          status: clinic.status || 'trial',
          amount: planPricesMap[planName] || 0,
          email: clinic.email || admin?.email || '',
          phone: clinic.phone || admin?.phone || '',
          cnpj: clinic.cnpj || '',
          users_count: userCountMap[clinic.id] || 0,
          created_at: clinic.created_at,
          expires_at: clinic.expires_at || null,
          last_payment_at: clinic.last_payment_at || null,
          admin_name: admin?.name || '',
          admin_email: admin?.email || '',
        };
      });

      setRealClinics(enriched);
    } catch (e) {
      console.error('[SuperAdmin] Failed to fetch clinics:', e);
    } finally {
      setClinicsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (activeTab === 'assinaturas' || activeTab === 'dashboard' || activeTab === 'clinicas') {
      fetchRealClinics();
    }
  }, [activeTab, fetchRealClinics]);

  const fetchSecurityData = React.useCallback(async () => {
    setSecurityDataLoading(true);
    try {
      const token = SupabaseSync.getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${token || SUPABASE_PUBLISHABLE_KEY}`,
      };
      const baseUrl = `${SUPABASE_URL}/rest/v1`;

      // Fetch banned IPs
      const bannedRes = await fetch(`${baseUrl}/banned_ips?select=*`, { headers });
      if (bannedRes.ok) setBannedIPs(await bannedRes.json());

      // Fetch security logs
      const logsRes = await fetch(`${baseUrl}/security_logs?select=*&order=created_at.desc&limit=50`, { headers });
      if (logsRes.ok) setSecurityLogs(await logsRes.json());
    } catch (e) {
      console.error('[SuperAdmin] Failed to fetch security data:', e);
    } finally {
      setSecurityDataLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (activeTab === 'seguranca') {
      fetchSecurityData();
      const interval = setInterval(fetchSecurityData, 15000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchSecurityData]);

  // Fetch system metrics
  React.useEffect(() => {
    let intervalId: any;

    const fetchMetrics = () => {
      const token = SupabaseSync.getAuthToken();
      fetch('/api/health/extended', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(r => r.json())
        .then(data => {
          if (data && data.status && data.status !== 'error') {
            setSystemMetrics(data);
          }
          setMetricsLoading(false);
        })
        .catch((err) => {
          console.error('[System Health] Erro ao buscar métricas', err);
          setMetricsLoading(false);
        });
    };

    if (activeTab === 'sistema') {
      setMetricsLoading(true);
      fetchMetrics(); // Fetch initial
      intervalId = setInterval(fetchMetrics, 10000); // Polling every 10 segundos
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeTab]);

  // Handle confirm payment — update Supabase directly
  const handleConfirmPayment = async (clinic: any) => {
    setPaymentProcessing(true);
    try {
      const now = new Date();
      const nextBilling = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const token = SupabaseSync.getAuthToken();
      const apiKey = SUPABASE_PUBLISHABLE_KEY;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'Authorization': `Bearer ${token || apiKey}`,
        'Prefer': 'return=representation',
      };

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/clinics?id=eq.${clinic.id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            status: 'active',
            expires_at: nextBilling.toISOString(),
            last_payment_at: now.toISOString(),
          }),
        }
      );

      if (res.ok) {
        setRealClinics(prev => prev.map(c => c.id === clinic.id ? {
          ...c,
          status: 'active',
          expires_at: nextBilling.toISOString(),
          last_payment_at: now.toISOString(),
        } : c));
        setConfirmPaymentClinic(null);
      } else {
        const errText = await res.text();
        console.error('[SuperAdmin] Failed to confirm payment:', errText);
        alert('Erro ao confirmar pagamento. Verifique as permissões RLS.');
      }
    } catch (e: any) {
      alert('Erro de conexão: ' + e.message);
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleUnbanIP = async (ip: string) => {
    try {
      const token = SupabaseSync.getAuthToken();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/banned_ips?ip_address=eq.${ip}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${token || SUPABASE_PUBLISHABLE_KEY}`,
        }
      });
      if (res.ok) {
        setBannedIPs(prev => prev.filter(b => b.ip_address !== ip));
      } else {
        alert('Falha ao desbanir IP.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Inspetor de clínica
  const [inspectMode, setInspectMode] = useState(false);
  const [selectedClinicForInspect, setSelectedClinicForInspect] = useState<any>(null);
  const [inspectTab, setInspectTab] = useState<'overview' | 'team' | 'financial' | 'activity'>('overview');

  React.useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  const clinics = DEMO_PLATFORM_CLINICS;
  // KPIs baseados nos dados reais do Supabase
  const planPricesKpi: Record<string, number> = { basico: 197, profissional: 397, premium: 697 };
  const totalMRR = realClinics.length > 0 
    ? realClinics.filter(c => c.status === 'active').reduce((s, c) => s + (c.amount || 0), 0)
    : clinics.reduce((s, c) => s + c.mrr, 0);
  const totalUsers = realClinics.length > 0 
    ? realClinics.reduce((s, c) => s + (c.users_count || 0), 0)
    : clinics.reduce((s, c) => s + c.users, 0);
  const totalClinicsActive = realClinics.length > 0
    ? realClinics.filter(c => c.status === 'active').length
    : clinics.filter(c => c.status === 'active').length;
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

  const handleImpersonateClinic = async (clinicId: string) => {
    // Para clínicas reais, a impersonação agora utiliza o método robusto do store
    const clinicPasswords: Record<string, { email: string; password: string }> = {
      'clinic-1': { email: 'clinica@clinxia.com.br', password: 'clinica123' },
      'clinic-2': { email: 'camila@esteticapremium.com.br', password: 'premium123' },
      'clinic-3': { email: 'rafael@odontovida.com.br', password: 'odontovida123' },
      'clinic-4': { email: 'amanda@sorrisoperfeito.com.br', password: 'sorriso123' },
    };
    
    const credentials = clinicPasswords[clinicId];
    if (credentials) {
      login(credentials.email, credentials.password);
    } else {
      const success = await impersonateClinic(clinicId);
      if (success) {
        navigate('/dashboard');
      } else {
        alert('Falha na impersonação: Verifique se o ID da clínica é válido ou se você possui permissões de super-admin.');
      }
    }
  };

  const actionLabels: Record<string, string> = {
    LOGIN: 'Login', LOGIN_FAILED: 'Login Falhou', LOGOUT: 'Logout',
    SETTINGS_CHANGE: 'Config. Alterada', PATIENT_CREATE: 'Paciente Criado',
    FINALIZE: 'Atendimento Finalizado', PLAN_CHANGE: 'Plano Alterado',
  };

  const actionColors: Record<string, string> = {
    LOGIN: 'bg-emerald-50 text-emerald-700', LOGIN_FAILED: 'bg-red-50 text-red-700',
    LOGOUT: 'bg-slate-100 text-slate-700', SETTINGS_CHANGE: 'bg-brand-50 text-brand-700',
    PATIENT_CREATE: 'bg-brand-50 text-brand-700', FINALIZE: 'bg-purple-50 text-purple-700',
    PLAN_CHANGE: 'bg-amber-50 text-amber-700',
  };

  // ===== MODO INSPETOR =====
  if (inspectMode && selectedClinicForInspect) {
    const clinic = selectedClinicForInspect;
    const team = DEMO_CLINIC_TEAMS[clinic.id] || [];
    const stats = DEMO_CLINIC_STATS[clinic.id] || {};
    const admin = team.find((m: any) => m.role === 'admin');
    const sub = {
      plan: clinic.plan || 'basico',
      amount: clinic.amount || 0,
      next_billing_date: clinic.expires_at || new Date().toISOString(),
      status: clinic.status || 'trial'
    };

    return (
      <div className="space-y-6">
        {/* Header do Inspetor */}
        <div className="flex items-center gap-4">
          <button onClick={() => { setInspectMode(false); setSelectedClinicForInspect(null); }} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
            <ArrowLeft className="w-4 h-4" />Voltar
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center text-white font-bold">
              {clinic.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">{clinic.name}</h1>
              <p className="text-xs text-slate-500">Modo Inspetor — visualizando como a clínica</p>
            </div>
            <span className={cn("text-xs font-bold px-2 py-1 rounded-full uppercase", clinic.plan === 'premium' ? 'bg-brand-50 text-brand-700' : clinic.plan === 'profissional' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600')}>
              {clinic.plan}
            </span>
          </div>
          <button onClick={() => handleImpersonateClinic(clinic.id)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-brand-600 text-white font-bold rounded-xl hover:opacity-90 text-sm">
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
                inspectTab === tab.id ? "bg-brand-50 text-brand-600" : "text-slate-500 hover:text-slate-900")}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {/* Visão Geral */}
        {inspectTab === 'overview' && (
          <div className="space-y-6">
            {/* Info da Clínica */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-brand-500" />Dados da Empresa</h3>
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
                        <span key={s} className="text-xs font-bold px-2 py-1 bg-brand-50 text-brand-700 rounded-full">{s}</span>
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
                <p className="text-3xl font-black text-brand-600 mt-1">R$ {(stats.ticketMedio || 0).toLocaleString('pt-BR')}</p>
                <p className="text-xs text-red-500 font-medium">{stats.taxaNoShow || 0}% no-show</p>
              </div>
            </div>

            {/* Status dos Atendimentos de Hoje */}
            {stats.appointmentStats && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-brand-500" />Status dos Atendimentos de Hoje</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: 'Agendados', value: stats.appointmentStats.agendados, color: 'bg-brand-50 text-brand-700', border: 'border-brand-200' },
                    { label: 'Confirmados', value: stats.appointmentStats.confirmados, color: 'bg-brand-50 text-brand-700', border: 'border-brand-200' },
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
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-brand-500" />Assinatura e Plano</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Plano</p>
                    <span className={cn("text-sm font-bold uppercase px-2 py-1 rounded-md", sub.plan === 'ultra' ? 'bg-brand-50 text-brand-700' : sub.plan === 'pro' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600')}>{sub.plan}</span>
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
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Users className="w-5 h-5 text-brand-500" />Equipe ({team.length} membros)</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {team.map(member => (
                <div key={member.id} className="p-4 flex items-center gap-4 hover:bg-slate-50/50">
                  <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
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
                    {member.commission > 0 && <p className="text-xs font-bold text-brand-600">{member.commission}%</p>}
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
              <div className="bg-gradient-to-br from-brand-50 to-brand-50 rounded-3xl border border-brand-100 p-6 text-center">
                <DollarSign className="w-8 h-8 text-brand-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-brand-600 uppercase tracking-wider">Faturamento Mês</p>
                <p className="text-3xl font-black text-brand-700 mt-1">R$ {(stats.revenueMes || 0).toLocaleString('pt-BR')}</p>
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
            <div className="p-6 border-b border-slate-100"><h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Activity className="w-5 h-5 text-brand-500" />Atividades Recentes</h3></div>
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
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Shield className="w-6 h-6 text-brand-500" />Painel Super Admin</h1>
        <p className="text-slate-500">Visão geral de todas as clínicas da plataforma Clinxia.</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Clínicas Cadastradas', value: realClinics.length > 0 ? realClinics.length : clinics.length, icon: Building2, color: 'from-brand-500 to-brand-600' },
          { label: 'MRR Total', value: `R$ ${totalMRR.toLocaleString('pt-BR')}`, icon: TrendingUp, color: 'from-emerald-500 to-emerald-600' },
          { label: 'Usuários Totais', value: totalUsers, icon: Users, color: 'from-brand-500 to-brand-600' },
          { label: 'Clínicas Ativas', value: totalClinicsActive, icon: Activity, color: 'from-violet-500 to-violet-600' },
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
              activeTab === tab.id ? "bg-brand-50 text-brand-600 shadow-sm" : "text-slate-500 hover:text-slate-900")}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* === CLÍNICAS TAB === */}
      {(activeTab === 'dashboard' || activeTab === 'clinicas') && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Clínicas Cadastradas ({realClinics.length > 0 ? realClinics.length : clinics.length})</h2>
            <div className="flex items-center gap-3">
              <button onClick={fetchRealClinics} disabled={clinicsLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors">
                <RefreshCw className={cn("w-3.5 h-3.5", clinicsLoading && "animate-spin")} />
                {clinicsLoading ? 'Carregando...' : 'Atualizar'}
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar clínica..." className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none w-64" />
              </div>
            </div>
          </div>
          {clinicsLoading && realClinics.length === 0 ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Carregando clínicas do banco de dados...</p>
            </div>
          ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Clínica</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plano</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Usuários</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">MRR</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(realClinics.length > 0 ? realClinics : clinics.map(c => ({
                id: c.id, name: c.name, plan: c.plan, status: c.status,
                email: c.email, admin_name: c.owner, admin_email: c.email,
                users_count: c.users, amount: c.mrr,
              }))).filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <p className="font-bold text-sm text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.admin_name || c.admin_email || c.email}</p>
                  </td>
                  <td className="px-6 py-4"><span className={cn("text-xs font-bold uppercase px-2 py-1 rounded-md",
                    c.plan === 'premium' || c.plan === 'ultra' ? "bg-brand-50 text-brand-700" :
                    c.plan === 'profissional' || c.plan === 'pro' ? "bg-brand-50 text-brand-700" :
                    "bg-slate-100 text-slate-600")}>{c.plan}</span></td>
                  <td className="px-6 py-4 text-sm text-slate-600">{c.users_count || 0}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">R$ {(c.amount || 0).toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4">
                    <span className={cn("inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                      c.status === 'active' ? "bg-emerald-50 text-emerald-700" :
                      c.status === 'trial' ? "bg-amber-50 text-amber-700" :
                      "bg-red-50 text-red-700")}>
                      {c.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {c.status === 'active' ? 'Ativo' : c.status === 'trial' ? 'Trial' : 'Expirado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleInspectClinic(c)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors" title="Inspecionar clínica">
                        <Eye className="w-3.5 h-3.5" />Inspecionar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </motion.div>
      )}

      {/* === ASSINATURAS TAB === */}
      {activeTab === 'assinaturas' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total de Clínicas', value: realClinics.length, color: 'text-brand-600' },
              { label: 'Ativas', value: realClinics.filter(c => c.status === 'active').length, color: 'text-emerald-600' },
              { label: 'Receita Mensal', value: `R$ ${realClinics.filter(c => c.status === 'active').reduce((a, c) => a + (c.amount || 0), 0).toLocaleString('pt-BR')}`, color: 'text-brand-600' },
              { label: 'Trial / Expiradas', value: realClinics.filter(c => c.status === 'trial' || c.status === 'expired').length, color: 'text-amber-600' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                <p className={cn("text-2xl font-bold mt-1", card.color)}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Gerenciar Assinaturas</h2>
              <button onClick={fetchRealClinics} disabled={clinicsLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors">
                <RefreshCw className={cn("w-3.5 h-3.5", clinicsLoading && "animate-spin")} />
                {clinicsLoading ? 'Carregando...' : 'Atualizar'}
              </button>
            </div>
            {clinicsLoading && realClinics.length === 0 ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">Carregando clínicas do banco de dados...</p>
              </div>
            ) : realClinics.length === 0 ? (
              <div className="p-12 text-center">
                <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Nenhuma clínica cadastrada.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Clínica</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plano</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Valor</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Próx. Cobrança</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Últ. Pagamento</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {realClinics.map(clinic => {
                      const isExpired = clinic.expires_at && new Date(clinic.expires_at) < new Date();
                      const effectiveStatus = isExpired && clinic.status !== 'active' ? 'expired' : clinic.status;
                      return (
                        <tr key={clinic.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-900">{clinic.name}</p>
                            <p className="text-xs text-slate-500">{clinic.admin_name || clinic.admin_email || clinic.email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn("text-xs font-bold uppercase px-2 py-1 rounded-md",
                              clinic.plan === 'premium' ? "bg-brand-50 text-brand-700" :
                              clinic.plan === 'profissional' ? "bg-brand-50 text-brand-700" :
                              "bg-slate-100 text-slate-600"
                            )}>{clinic.plan}</span>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-900">
                            R$ {(clinic.amount || 0).toLocaleString('pt-BR')}/mês
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {clinic.expires_at ? new Date(clinic.expires_at).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {clinic.last_payment_at ? new Date(clinic.last_payment_at).toLocaleDateString('pt-BR') : 'Nunca'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn("text-xs font-bold px-2 py-1 rounded-full",
                              effectiveStatus === 'active' ? "bg-emerald-50 text-emerald-700" :
                              effectiveStatus === 'trial' ? "bg-amber-50 text-amber-700" :
                              effectiveStatus === 'expired' ? "bg-red-50 text-red-700" :
                              "bg-orange-50 text-orange-700"
                            )}>
                              {effectiveStatus === 'active' ? 'Ativa' :
                               effectiveStatus === 'trial' ? 'Trial' :
                               effectiveStatus === 'expired' ? 'Expirada' : effectiveStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setConfirmPaymentClinic(clinic)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                                title="Confirmar pagamento manual">
                                <CheckSquare className="w-3.5 h-3.5" />Confirmar Pgto
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Confirm Payment Dialog */}
          <ConfirmDialog
            isOpen={!!confirmPaymentClinic}
            onClose={() => setConfirmPaymentClinic(null)}
            onConfirm={() => confirmPaymentClinic && handleConfirmPayment(confirmPaymentClinic)}
            title="Confirmar Pagamento Manual"
            message={`Confirmar o pagamento mensal de ${confirmPaymentClinic?.name}? A próxima cobrança será adiada em 30 dias e o status será atualizado para "Ativa".`}
            confirmLabel={paymentProcessing ? 'Processando...' : 'Confirmar Pagamento'}
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
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-brand-600" />
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
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-brand-600" />
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
              <Server className="w-5 h-5 text-brand-500" />Componentes do Sistema
            </h2>
            <div className="space-y-4">
              {Object.entries(systemMetrics?.components || {}).map(([key, value]: [string, any]) => (
                <div key={key} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    {key.includes('database') ? <Database className="w-5 h-5 text-brand-500" /> : 
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
                <BarChart3 className="w-5 h-5 text-brand-500" />Métricas de Requisições
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
                <Database className="w-5 h-5 text-brand-500" />Recursos do Sistema
              </h2>
              <div className="space-y-6">
                
                {/* === App Metrics === */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 border-b pb-1">Uso do Aplicativo (Node.js)</h3>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Memória (App)</span>
                      <span className="font-medium">{systemMetrics?.memory?.usedPercent || '0%'}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: systemMetrics?.memory?.usedPercent || '0%' }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{systemMetrics?.memory?.used || '0'} / {systemMetrics?.memory?.total || '0'}</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">CPU (App)</span>
                      <span className="font-medium">{systemMetrics?.cpu?.usedPercent || '0%'}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: systemMetrics?.cpu?.usedPercent || '0%' }} />
                    </div>
                  </div>
                </div>

                {/* === Server Host Metrics === */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 border-b pb-1">Uso Global (Servidor Host)</h3>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Memória (Host)</span>
                      <span className="font-medium">{systemMetrics?.memory?.serverPercent || '0%'}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: systemMetrics?.memory?.serverPercent || '0%' }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{systemMetrics?.memory?.serverUsed || '0'} / {systemMetrics?.memory?.serverTotal || '0'}</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">CPU (Host)</span>
                      <span className="font-medium">{systemMetrics?.cpu?.serverPercent || '0%'}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: systemMetrics?.cpu?.serverPercent || '0%' }} />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Database className="w-5 h-5 text-emerald-500" />Banco de Dados (Supabase)
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Clínicas</p>
                  <p className="text-2xl font-bold text-slate-900">{systemMetrics?.supabase?.clinics || 0}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Usuários</p>
                  <p className="text-2xl font-bold text-slate-900">{systemMetrics?.supabase?.users || 0}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Agendamentos</p>
                  <p className="text-2xl font-bold text-slate-900">{systemMetrics?.supabase?.appointments || 0}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Pacientes</p>
                  <p className="text-2xl font-bold text-slate-900">{systemMetrics?.supabase?.patients || 0}</p>
                </div>
              </div>

              <div className="p-4 border border-emerald-100 bg-emerald-50/30 rounded-2xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-emerald-800 uppercase">Uso de Armazenamento (DB)</span>
                  <span className="text-xs font-bold text-emerald-800">{systemMetrics?.supabase?.dbPercent || 0}%</span>
                </div>
                <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                    style={{ width: `${systemMetrics?.supabase?.dbPercent || 0}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <p className="text-[10px] text-emerald-600 font-medium">{systemMetrics?.supabase?.dbSizeMB || 0} MB consumidos</p>
                  <p className="text-[10px] text-emerald-600 font-medium">Limite 500 MB</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-sky-500" />WhatsApp & Mensageria
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-2xl p-4 text-center">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Sessões Ativas</p>
                    <p className="text-2xl font-bold text-slate-900">{systemMetrics?.metrics?.waSessions || 0}</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 text-center">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Fila Pendente</p>
                    <p className={cn("text-2xl font-bold", (systemMetrics?.supabase?.pendingMessages || 0) > 10 ? "text-amber-600" : "text-slate-900")}>
                      {systemMetrics?.supabase?.pendingMessages || 0}
                    </p>
                  </div>
                </div>
                
                <div className="p-4 border border-slate-100 rounded-2xl">
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-sm font-medium text-slate-600">Health Check WhatsApp</span>
                     <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">ESTÁVEL</span>
                   </div>
                   <p className="text-xs text-slate-400">O sistema monitora automaticamente falhas de conexão (DisconnectReason) em tempo real.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-brand-500" />Saúde Financeira (Sistema)
                </h2>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-full">REAL TIME</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-slate-100 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 font-bold uppercase">Pagamentos Pendentes</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{systemMetrics?.supabase?.pendingPayments || 0}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Aguardando confirmação do gateway</p>
                </div>
                <div className="border border-slate-100 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 font-bold uppercase">Taxa de Conversão</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">84%</p>
                  <p className="text-[10px] text-slate-400 mt-1">Média de checkout bem-sucedido</p>
                </div>
                <div className="border border-slate-100 rounded-2xl p-4 bg-brand-50/50 border-brand-100">
                  <p className="text-xs text-brand-600 font-bold uppercase">Status Gateway</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-lg font-bold text-brand-900">Mercado Pago</p>
                  </div>
                  <p className="text-[10px] text-brand-600 mt-1">Operando sem instabilidades</p>
                </div>
              </div>
            </div>
          </div>

          {/* Link para Documentação API */}
          <div className="bg-gradient-to-r from-brand-50 to-brand-50 rounded-3xl border border-brand-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-brand-900">Documentação API</h3>
                <p className="text-sm text-brand-700">Acesse a documentação completa dos endpoints</p>
              </div>
              <a href={'/api-docs'} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors">
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
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ataques Mitigados</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{securityLogs.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">IPs Banidos (Defesa Ativa)</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{bannedIPs.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status do Escudo</p>
              <p className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1"><Shield className="w-4 h-4" />Ativo e Monitorando</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Ban className="w-5 h-5 text-red-500" />IPs Banidos Automaticamente</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {bannedIPs.map(b => (
                <div key={b.ip_address} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold text-sm"><Shield className="w-4 h-4" /></div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{b.ip_address}</p>
                      <p className="text-xs text-slate-500">Motivo: {b.reason}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="text-[10px] text-slate-400">Expira em: {new Date(b.expires_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <button onClick={() => handleUnbanIP(b.ip_address)} className="px-3 py-1 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg">Desbanir</button>
                  </div>
                </div>
              ))}
              {bannedIPs.length === 0 && (
                <div className="p-6 text-center text-slate-500 text-sm">Nenhum IP banido no momento.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><FileText className="w-5 h-5 text-brand-500" />Logs de Segurança e Ataques</h2>
              <button onClick={fetchSecurityData} className="text-sm font-bold text-brand-600 flex items-center gap-1">
                <RefreshCw className={cn("w-3.5 h-3.5", securityDataLoading && "animate-spin")} /> Atualizar
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {securityLogs.map(log => (
                <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50">
                  <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap self-start", log.severity === 'high' || log.severity === 'critical' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700')}>
                    {log.event_type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 font-medium">{log.action_taken ? `Ação: ${log.action_taken}` : log.endpoint || 'Desconhecido'}</p>
                    <p className="text-[10px] text-slate-400">IP: {log.ip_address} • Payload: {JSON.stringify(log.payload)}</p>
                  </div>
                  <p className="text-xs text-slate-400 whitespace-nowrap sm:self-center">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                </div>
              ))}
              {securityLogs.length === 0 && (
                <div className="p-8 text-center text-slate-400">Nenhum evento de segurança registrado recentemente.</div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

