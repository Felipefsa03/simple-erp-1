import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './domains/dashboard/Dashboard';
import { PatientList } from './domains/pacientes/PatientList';
import { Agenda } from './domains/agenda/Agenda';
import { Prontuario } from './domains/prontuarios/Prontuario';
import { Financeiro } from './domains/financeiro/Financeiro';
import { Estoque } from './domains/estoque/Estoque';
import { Marketing } from './domains/marketing/Marketing';
import { Configuracoes } from './domains/configuracoes/Configuracoes';
import { SuperAdminDashboard } from './domains/admin/SuperAdminDashboard';
import { LandingPage } from './domains/marketing/LandingPage';
import { ToastProvider, ErrorBoundary } from './components/shared';
import { useAuth } from './hooks/useAuth';
import { toast } from './hooks/useShared';
import { useClinicStore } from './stores/clinicStore';
import { useEventBus } from './stores/eventBus';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Sparkles, Menu, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function App() {
  const { user, login, logout, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const navigationContext = useClinicStore(s => s.navigationContext);

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
    if (user?.role === 'super_admin') {
      setActiveTab(prev => prev.startsWith('admin-') ? prev : 'admin-dashboard');
    } else if (user) {
      setActiveTab(prev => prev === 'admin-dashboard' || prev.startsWith('admin-') ? 'dashboard' : (prev || 'dashboard'));
    }
  }, [user?.id]);

  useEffect(() => {
    const offFinished = useEventBus.getState().on('APPOINTMENT_FINISHED', () => {
      if (activeTab !== 'financeiro') {
        toast('Atendimento finalizado e lançado no financeiro.', 'info');
      }
    });
    const offPayment = useEventBus.getState().on('PAYMENT_RECEIVED', () => {
      toast('Pagamento recebido com sucesso.', 'success');
    });
    const offImported = useEventBus.getState().on('PATIENTS_IMPORTED', (event) => {
      const count = event.payload?.count ?? 0;
      toast(`${count} pacientes importados.`, 'success');
    });
    return () => {
      offFinished();
      offPayment();
      offImported();
    };
  }, [activeTab]);

  const tabPermissions: Record<string, string | null> = {
    dashboard: 'view_dashboard',
    agenda: 'create_appointment',
    pacientes: 'view_patients',
    prontuarios: 'view_patients',
    financeiro: 'view_financial',
    estoque: 'manage_stock',
    marketing: 'view_dashboard',
    configuracoes: 'manage_settings',
  };

  const handleNavigate = (tab: string, ctx?: { patientId?: string; appointmentId?: string }) => {
    const required = tabPermissions[tab];
    if (required && !hasPermission(required)) {
      toast('Acesso restrito para este módulo.', 'error');
      return;
    }
    if (ctx) {
      useClinicStore.getState().setNavigationContext({ ...ctx, fromModule: activeTab });
    }
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} />;
      case 'pacientes': return <PatientList onNavigate={handleNavigate} />;
      case 'agenda': return <Agenda onNavigate={handleNavigate} />;
      case 'prontuarios': return <Prontuario onNavigate={handleNavigate} />;
      case 'financeiro': return <Financeiro onNavigate={handleNavigate} />;
      case 'estoque': return <Estoque />;
      case 'marketing': return <Marketing />;
      case 'configuracoes': return <Configuracoes onNavigate={handleNavigate} />;
      case 'admin-dashboard': return <SuperAdminDashboard initialTab="dashboard" />;
      case 'admin-clinicas': return <SuperAdminDashboard initialTab="clinicas" />;
      case 'admin-assinaturas': return <SuperAdminDashboard initialTab="assinaturas" />;
      case 'admin-seguranca': return <SuperAdminDashboard initialTab="seguranca" />;
      default: return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
          <AlertCircle className="w-12 h-12 opacity-20" />
          <p className="text-lg font-medium">Módulo em desenvolvimento</p>
          <button
            onClick={() => setActiveTab(user?.role === 'super_admin' ? 'admin-dashboard' : 'dashboard')}
            className="text-cyan-600 font-bold hover:underline"
          >
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

    // Simulate network delay
    await new Promise(r => setTimeout(r, 600));

    const success = login(email, password);
    setLoginLoading(false);

    if (!success) {
      setLoginError('Email ou senha incorretos. Verifique os dados e tente novamente.');
    }
  };

  if (!user) {
    if (!showLogin) {
      return (
        <ToastProvider>
          <ErrorBoundary key="guest-landing">
            <LandingPage onLoginClick={() => setShowLogin(true)} />
          </ErrorBoundary>
        </ToastProvider>
      );
    }

    return (
      <ToastProvider>
        <ErrorBoundary key="guest-login">
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8"
          >
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center text-white mb-6 shadow-2xl shadow-cyan-200 relative overflow-hidden group">
                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] animate-pulse" />
                <Sparkles className="w-10 h-10 relative z-10" />
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter">LuminaFlow</h1>
              <p className="text-slate-500 mt-3 text-center font-medium">A inteligência que sua clínica precisa para brilhar.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setLoginError(''); }}
                  placeholder="seu@email.com"
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
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-600 bg-red-50 p-3 rounded-xl font-medium"
                >
                  {loginError}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-cyan-200/50 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loginLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Entrar no Sistema
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Acesso de Demonstração</p>
                <div className="space-y-2">
                  {[
                    { label: 'Admin/Dono', email: 'clinica@luminaflow.com.br', pw: 'clinica123' },
                    { label: 'Recepcionista', email: 'recepcao@luminaflow.com.br', pw: 'recepcao123' },
                    { label: 'Dentista', email: 'dentista@luminaflow.com.br', pw: 'dentista123' },
                    { label: 'Super Admin', email: 'admin@luminaflow.com.br', pw: 'admin123' },
                  ].map(demo => (
                    <button
                      key={demo.email}
                      type="button"
                      onClick={() => { setEmail(demo.email); setPassword(demo.pw); setLoginError(''); }}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white transition-colors group"
                    >
                      <span className="text-xs font-medium text-slate-500">{demo.label}:</span>
                      <code className="text-xs font-bold text-cyan-600 group-hover:underline">{demo.email}</code>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowLogin(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                Voltar para o site
              </button>
            </div>
          </motion.div>
        </div>
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
          {isMobile && (
            <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between z-30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">L</div>
                <span className="font-bold text-lg tracking-tight text-slate-900">LuminaFlow</span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
              >
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
