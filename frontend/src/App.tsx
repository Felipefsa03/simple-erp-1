import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './domains/dashboard/Dashboard';
import { PatientList } from './domains/pacientes/PatientList';
import { Agenda } from './domains/agenda/Agenda';
import { OnlineBookingPage } from './domains/agenda/OnlineBookingPage';
import { Prontuario } from './domains/prontuarios/Prontuario';
import { PublicAnamneseForm } from './domains/prontuarios/PublicAnamneseForm';
import { Financeiro } from './domains/financeiro/Financeiro';
import { Estoque } from './domains/estoque/Estoque';
import { Marketing } from './domains/marketing/Marketing';
import { Integrations } from './domains/integrations/Integrations';
import { Configuracoes } from './domains/configuracoes/Configuracoes';
import { SuperAdminDashboard } from './domains/admin/SuperAdminDashboard';
import { LandingPage } from './domains/marketing/LandingPage';
import { InsurancePanel } from './domains/insurance/InsurancePanel';
import { BranchPanel } from './domains/branches/BranchPanel';
import { ToastProvider, ErrorBoundary } from './components/shared';
import { useAuth } from './hooks/useAuth';
import { toast } from './hooks/useShared';
import { usePWAInstall } from './hooks/usePWA';
import { useClinicStore } from './stores/clinicStore';
import { useEventBus } from './stores/eventBus';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { integrationsApi } from './lib/integrationsApi';
import { PasswordResetFlow } from './components/auth/PasswordResetFlow';

export default function App() {
  const { user, clinic, login, logout, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [authView, setAuthView] = useState<'landing' | 'login' | 'signup' | 'forgot-password'>('landing');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [publicRoute, setPublicRoute] = useState<'landing' | 'book-online' | 'anamnese-form'>(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash.startsWith('#book-online')) return 'book-online';
    if (hash.startsWith('#anamnese-form')) return 'anamnese-form';
    return 'landing';
  });
  const [publicClinicId, setPublicClinicId] = useState<string>(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash.startsWith('#book-online')) {
      const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      return params.get('clinic') || 'clinic-1';
    }
    return 'clinic-1';
  });
  const [publicAnamneseToken, setPublicAnamneseToken] = useState<string>(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash.startsWith('#anamnese-form')) {
      const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      return params.get('token') || '';
    }
    return '';
  });
  const [publicRouteLoaded, setPublicRouteLoaded] = useState(true);
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

  useEffect(() => {
    const syncPublicRoute = () => {
      const hash = window.location.hash || '';
      if (hash.startsWith('#book-online')) {
        setPublicRoute('book-online');
        const parsed = hash.includes('?') ? hash.split('?')[1] : '';
        const params = new URLSearchParams(parsed);
        setPublicClinicId(params.get('clinic') || 'clinic-1');
        setPublicAnamneseToken('');
        setAuthView('landing');
      } else if (hash.startsWith('#anamnese-form')) {
        setPublicRoute('anamnese-form');
        const parsed = hash.includes('?') ? hash.split('?')[1] : '';
        const params = new URLSearchParams(parsed);
        setPublicAnamneseToken(params.get('token') || '');
        setAuthView('landing');
      } else {
        setPublicRoute('landing');
        setPublicAnamneseToken('');
      }
      setPublicRouteLoaded(true);
    };
    syncPublicRoute();
    window.addEventListener('hashchange', syncPublicRoute);
    return () => window.removeEventListener('hashchange', syncPublicRoute);
  }, []);

  useEffect(() => {
    if (publicRoute === 'anamnese-form' && publicAnamneseToken) {
      useClinicStore.persist.hasHydrated();
    }
  }, [publicRoute, publicAnamneseToken]);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      setActiveTab(prev => prev.startsWith('admin-') ? prev : 'admin-dashboard');
    } else if (user) {
      setActiveTab(prev => prev === 'admin-dashboard' || prev.startsWith('admin-') ? 'dashboard' : (prev || 'dashboard'));
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const sync = () => useClinicStore.getState().syncAnamneseWithServer();
    sync();
    const interval = setInterval(sync, 15000);
    return () => clearInterval(interval);
  }, [user?.id]);

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
        } catch (error) {
          useClinicStore.getState().markAppointmentConfirmation(item.id, 'failed', error instanceof Error ? error.message : 'notification_error');
        }
      }
    };
    processQueue();
    return () => { cancelled = true; };
  }, [confirmationsCount]);

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
      const count = event.payload?.count ?? 0;
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
  }, [activeTab, hasPermission]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} />;
      case 'pacientes': return <PatientList onNavigate={handleNavigate} />;
      case 'agenda': return <Agenda onNavigate={handleNavigate} />;
      case 'prontuarios': return <Prontuario onNavigate={handleNavigate} />;
      case 'financeiro': return <Financeiro onNavigate={handleNavigate} />;
      case 'insurance': return <InsurancePanel clinicId={clinic?.id} />;
      case 'branches': return <BranchPanel clinicId={clinic?.id} />;
      case 'estoque': return <Estoque />;
      case 'marketing': return <Marketing />;
      case 'configuracoes': return <Configuracoes onNavigate={handleNavigate} />;
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    const success = await login(email, password);
    setLoginLoading(false);

    if (!success) {
      setLoginError('Email ou senha incorretos. Verifique os dados e tente novamente.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) {
      toast('Por favor, insira seu email.', 'warning');
      return;
    }
    setRecoveryLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setRecoveryLoading(false);
    setRecoverySent(true);
    toast('Email de recuperação enviado!', 'success');
  };

  if (!publicRouteLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (publicRoute === 'book-online') {
    return (
      <ToastProvider>
        <ErrorBoundary key="guest-online-booking">
          <OnlineBookingPage clinicId={publicClinicId} onBack={() => { window.location.hash = ''; setPublicRoute('landing'); }} />
        </ErrorBoundary>
      </ToastProvider>
    );
  }
  if (publicRoute === 'anamnese-form') {
    return (
      <ToastProvider>
        <ErrorBoundary key="guest-anamnese-form">
          <PublicAnamneseForm token={publicAnamneseToken} onBack={() => { window.location.hash = ''; setPublicRoute('landing'); }} />
        </ErrorBoundary>
      </ToastProvider>
    );
  }

  if (!user) {
    if (authView === 'signup') {
      setAuthView('login');
      return null;
    }

    if (authView === 'forgot-password') {
      return (
        <ToastProvider>
          <PasswordResetFlow
            onBack={() => { setAuthView('login'); setRecoverySent(false); setRecoveryEmail(''); }}
            onSuccess={() => { setAuthView('login'); setRecoverySent(false); setRecoveryEmail(''); }}
          />
        </ToastProvider>
      );
    }

    if (authView === 'login') {
      const LoginPanel = () => (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-xl shadow-cyan-200/50">
                <span className="text-2xl font-black">L</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">LuminaFlow</h1>
              <p className="text-slate-500 mt-1">A inteligência que sua clínica precisa para brilhar.</p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setLoginError(''); }}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setLoginError(''); }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all outline-none pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {loginError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{loginError}</div>
                )}
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loginLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : null}
                  {loginLoading ? 'Entrando...' : 'Entrar no Sistema'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs text-center text-slate-500 mb-4 font-medium">Acesso de Demonstração</p>
                <div className="space-y-2 bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-600">
                    <span className="font-bold text-slate-700">Admin/Dono:</span>
                    <span className="ml-1 font-mono text-slate-500">clinica@luminaflow.com.br</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    <span className="font-bold text-slate-700">Recepcionista:</span>
                    <span className="ml-1 font-mono text-slate-500">recepcao@luminaflow.com.br</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    <span className="font-bold text-slate-700">Dentista:</span>
                    <span className="ml-1 font-mono text-slate-500">dentista@luminaflow.com.br</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    <span className="font-bold text-slate-700">Super Admin:</span>
                    <span className="ml-1 font-mono text-slate-500">admin@luminaflow.com.br</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-center">
                <button onClick={() => setAuthView('forgot-password')} className="text-sm text-cyan-600 font-medium hover:underline">
                  Esqueceu sua senha?
                </button>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button onClick={() => setAuthView('signup')} className="text-sm text-cyan-600 font-bold hover:underline">
                  Criar conta
                </button>
                <button onClick={() => setAuthView('landing')} className="text-sm text-slate-500 font-medium hover:text-slate-700">
                  Voltar para o site
                </button>
              </div>
            </div>
          </div>
        </div>
      );

      return (
        <ToastProvider>
          <ErrorBoundary key="guest-login">
            <LoginPanel />
          </ErrorBoundary>
        </ToastProvider>
      );
    }

    return (
      <ToastProvider>
        <ErrorBoundary key="guest-landing">
          <LandingPage onLoginClick={() => setAuthView('login')} onSignupClick={() => setAuthView('signup')} />
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
                  Instale o LuminaFlow no celular para acesso rápido e experiência de app.
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
                  <span className="font-bold text-lg tracking-tight text-slate-900">LuminaFlow</span>
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
                    {renderContent()}
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
