import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { ToastProvider, ErrorBoundary } from '@/components/shared';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/useShared';
import { usePWAInstall } from '@/hooks/usePWA';
import { useClinicStore } from '@/stores/clinicStore';
import { useEventBus } from '@/stores/eventBus';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, AlertCircle } from 'lucide-react';
import { integrationsApi } from '@/lib/integrationsApi';
import { SubscriptionBlockPage } from './SubscriptionBlockPage';

// Lazy-loaded domain pages for code splitting
const Dashboard = lazy(() => import('@/domains/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const PatientList = lazy(() => import('@/domains/pacientes/PatientList').then(m => ({ default: m.PatientList })));
const Agenda = lazy(() => import('@/domains/agenda/Agenda').then(m => ({ default: m.Agenda })));
const Prontuario = lazy(() => import('@/domains/prontuarios/Prontuario').then(m => ({ default: m.Prontuario })));
const Financeiro = lazy(() => import('@/domains/financeiro/Financeiro').then(m => ({ default: m.Financeiro })));
const Estoque = lazy(() => import('@/domains/estoque/Estoque').then(m => ({ default: m.Estoque })));
const Marketing = lazy(() => import('@/domains/marketing/Marketing').then(m => ({ default: m.Marketing })));
const Integrations = lazy(() => import('@/domains/integrations/Integrations').then(m => ({ default: m.Integrations })));
const Configuracoes = lazy(() => import('@/domains/configuracoes/Configuracoes').then(m => ({ default: m.Configuracoes })));
const SuperAdminDashboard = lazy(() => import('@/domains/admin/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const InsurancePanel = lazy(() => import('@/domains/insurance/InsurancePanel').then(m => ({ default: m.InsurancePanel })));
const BranchPanel = lazy(() => import('@/domains/branches/BranchPanel').then(m => ({ default: m.BranchPanel })));
const WhatsAppTest = lazy(() => import('@/domains/testes/WhatsAppTest').then(m => ({ default: m.WhatsAppTest })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );
}

export function AuthenticatedApp() {
  const { user, clinic, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && location.pathname !== '/login') {
      navigate(`/login?callbackUrl=${encodeURIComponent(location.pathname)}`, { replace: true });
    }
  }, [user, location.pathname, navigate]);
  
  const [activeTab, setActiveTab] = useState(() => {
    // Initialize from URL path on first load
    const path = location.pathname.replace('/', '');
    return path || 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{ plan: string; amount: number; dueDate: string; qrCode: string; pixLink: string } | null>(null);
  const confirmationsCount = useClinicStore(s => s.appointmentConfirmations.length);
  const { canInstall, isInstalled, isIos, promptInstall } = usePWAInstall();

  const handleInstallPwa = async () => {
    if (canInstall) {
      const accepted = await promptInstall();
      if (accepted) toast('App instalado com sucesso!', 'success');
      return;
    }
    if (isIos && !isInstalled) {
      toast('No iPhone, toque em Compartilhar e depois "Adicionar a Tela de Início".', 'info');
    }
  };

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set default tab based on role
  useEffect(() => {
    if (user?.role === 'super_admin') {
      setActiveTab(prev => prev.startsWith('admin-') ? prev : 'admin-dashboard');
    } else if (user) {
      setActiveTab(prev => prev === 'admin-dashboard' || prev.startsWith('admin-') ? 'dashboard' : (prev || 'dashboard'));
    }
  }, [user?.id, user?.role]);

  // Check subscription status
  useEffect(() => {
    if (!user || user?.role === 'super_admin') return;
    (async () => {
      try {
        const { supabase, isSupabaseConfigured } = await import('@/lib/supabase');
        if (!isSupabaseConfigured()) return;
        const clinicId = user?.clinic_id;
        if (!clinicId) return;
        const { data: payments } = await supabase!.from('payments').select('*').eq('clinic_id', clinicId).eq('status', 'approved').order('created_at', { ascending: false }).limit(1);
        if (!payments || payments.length === 0) {
          const { data: clinics } = await supabase!.from('clinics').select('plan').eq('id', clinicId).single();
          let plan = (clinics as Record<string, string>)?.plan || 'basico';
          // Normalizar plano: enterprise -> basico, profissional, premium
          if (plan === 'enterprise') plan = 'basico';
          const { data: config } = await supabase!.from('integration_config').select('plan_price_basico,plan_price_profissional,plan_price_premium').eq('clinic_id', '00000000-0000-0000-0000-000000000001').single();
          const prices = config as Record<string, number> || {};
          const defaultPrices: Record<string, number> = { basico: 97, profissional: 197, premium: 397 };
          const amount = prices[`plan_price_${plan}`] || defaultPrices[plan] || 97;
          const isDev = import.meta.env.DEV;
          const API_BASE = isDev ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://clinxia-backend.onrender.com');
          const res = await fetch(`${API_BASE}/api/mercadopago/create-preference`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clinicName: clinic?.name || 'Minha Clínica', email: user.email, name: user.name, phone: user.phone || '', plan, amount, clinicId }),
          });
          const data = await res.json();
          if (data.ok) {
            setSubscriptionBlocked(true);
            setSubscriptionInfo({ plan, amount, dueDate: new Date().toLocaleDateString('pt-BR'), qrCode: data.qr_code || '', pixLink: data.init_point || '' });
          }
        }
      } catch (e: unknown) { console.error('[Subscription] Error:', e); }
    })();
  }, [user?.id, clinic?.name, user?.email, user?.name, user?.phone, user?.clinic_id, user?.role, clinic]);

  // Anamnese sync
  useEffect(() => {
    if (!user) return;
    const sync = () => useClinicStore.getState().syncAnamneseWithServer();
    sync();
    const interval = setInterval(sync, 60000);
    return () => clearInterval(interval);
  }, [user?.id, user]);

  // Process appointment confirmations queue
  useEffect(() => {
    let cancelled = false;
    const state = useClinicStore.getState();
    const queued = state.appointmentConfirmations.filter(item => item.status === 'queued').slice(0, 3);
    if (queued.length === 0) return;

    const processQueue = async () => {
      await new Promise(r => setTimeout(r, 200));
      if (cancelled) return;
      for (const item of queued) {
        if (cancelled) return;
        try {
          const result = await integrationsApi.sendNotification({
            channel: item.channel,
            recipients: [item.patient_id],
            message: item.message,
            metadata: { appointment_id: item.appointment_id },
          });
          useClinicStore.getState().markAppointmentConfirmation(item.id, result.delivered ? 'sent' : 'failed', JSON.stringify(result.details || {}));
        } catch (error: unknown) {
          useClinicStore.getState().markAppointmentConfirmation(item.id, 'failed', error instanceof Error ? error.message : 'notification_error');
        }
      }
    };
    processQueue();
    return () => { cancelled = true; };
  }, [confirmationsCount]);

  // Domain event listeners
  useEffect(() => {
    const offFinished = useEventBus.getState().on('APPOINTMENT_FINISHED', () => {
      if (activeTab !== 'financeiro') {
        toast('Atendimento finalizado e lançado no financeiro.', 'info');
        setTimeout(() => { setActiveTab('financeiro'); }, 1500);
      }
    });
    const offPayment = useEventBus.getState().on('PAYMENT_RECEIVED', () => {
      toast('Pagamento recebido com sucesso.', 'success');
    });
    const offImported = useEventBus.getState().on('PATIENTS_IMPORTED', (event) => {
      const count = (event.payload as Record<string, number>)?.count ?? 0;
      toast(`${count} pacientes importados.`, 'success');
    });
    return () => { offFinished(); offPayment(); offImported(); };
  }, [activeTab]);

  const tabPermissions: Record<string, string | null> = {
    dashboard: 'view_dashboard',
    agenda: 'create_appointment',
    pacientes: 'view_patients',
    prontuarios: 'view_patients',
    financeiro: 'view_financial',
    insurance: 'view_patients',
    branches: 'manage_settings',
    estoque: 'manage_stock',
    marketing: 'view_dashboard',
    configuracoes: 'manage_settings',
  };

  const handleNavigate = useCallback((tab: string, ctx?: { patientId?: string; appointmentId?: string }) => {
    const required = tabPermissions[tab];
    if (required && !hasPermission(required)) {
      toast('Acesso restrito para este módulo.', 'error');
      return;
    }
    if (ctx) {
      useClinicStore.getState().setNavigationContext({ ...ctx, fromModule: activeTab });
    }
    setActiveTab(tab);
    // Navigate to URL
    navigate(`/${tab === 'dashboard' ? '' : tab}`);
  }, [activeTab, hasPermission, tabPermissions, navigate]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} />;
      case 'pacientes': return <PatientList onNavigate={handleNavigate} />;
      case 'agenda': return <Agenda onNavigate={handleNavigate} />;
      case 'prontuarios': return <Prontuario onNavigate={handleNavigate} />;
      case 'anamnese': return <Prontuario onNavigate={handleNavigate} initialTab="anamnese" />;
      case 'financeiro': return <Financeiro onNavigate={handleNavigate} />;
      case 'insurance': return <InsurancePanel clinicId={clinic?.id} />;
      case 'branches': return <BranchPanel clinicId={clinic?.id} />;
      case 'estoque': return <Estoque />;
      case 'marketing': return <Marketing />;
      case 'configuracoes': return <Configuracoes onNavigate={handleNavigate} />;
      case 'testes-whatsapp': return <WhatsAppTest />;
      case 'admin-dashboard': return <SuperAdminDashboard initialTab="dashboard" />;
      case 'admin-clinicas': return <SuperAdminDashboard initialTab="clinicas" />;
      case 'admin-assinaturas': return <SuperAdminDashboard initialTab="assinaturas" />;
      case 'admin-sistema': return <SuperAdminDashboard initialTab="sistema" />;
      case 'admin-seguranca': return <SuperAdminDashboard initialTab="seguranca" />;
      default: return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
          <AlertCircle className="w-12 h-12 opacity-20" />
          <p className="text-lg font-medium">Módulo em desenvolvimento</p>
          <button onClick={() => setActiveTab(user?.role === 'super_admin' ? 'admin-dashboard' : 'dashboard')} className="text-cyan-600 font-bold hover:underline">
            Voltar ao Início
          </button>
        </div>
      );
    }
  };

  if (subscriptionBlocked && subscriptionInfo && user) {
    return (
      <ToastProvider>
        <ErrorBoundary key={`sub-block-${user.id}`}>
          <SubscriptionBlockPage
            user={user}
            clinic={clinic}
            subscriptionInfo={subscriptionInfo}
            onPaymentConfirmed={() => { setSubscriptionBlocked(false); setSubscriptionInfo(null); }}
          />
        </ErrorBoundary>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <ErrorBoundary key={`auth-${user?.id || 'anon'}`}>
        <div className="flex h-screen bg-slate-50 overflow-hidden relative">
          <Sidebar
            activeTab={activeTab}
            onTabChange={(tab) => handleNavigate(tab)}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            isMobile={isMobile}
          />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {!isInstalled && (canInstall || isIos) && (
              <div className="bg-cyan-50 border-b border-cyan-100 px-4 py-2 flex items-center justify-between gap-3">
                <p className="text-xs text-cyan-800 font-medium">
                  Instale o Clinxia no celular para acesso rápido e experiência de app.
                </p>
                <button onClick={handleInstallPwa} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 whitespace-nowrap">
                  Instalar
                </button>
              </div>
            )}
            {isMobile && (
              <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between z-30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">L</div>
                  <span className="font-bold text-lg tracking-tight text-slate-900">Clinxia</span>
                </div>
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">
                  <Menu className="w-6 h-6" />
                </button>
              </header>
            )}

            <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-0">
              <ErrorBoundary key={`${activeTab}-${user?.id || 'anon'}`}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${activeTab}-${user?.id || 'anon'}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-7xl mx-auto h-full"
                  >
                    <Suspense fallback={<PageLoader />}>
                      {renderContent()}
                    </Suspense>
                  </motion.div>
                </AnimatePresence>
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </ErrorBoundary>
    </ToastProvider>
  );
}
