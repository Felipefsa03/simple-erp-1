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
import { WhatsAppTest } from './domains/testes/WhatsAppTest';

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
  const [signupStep, setSignupStep] = useState(1);
  const [signupForm, setSignupForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    clinicName: '', clinicDoc: '', docType: 'cpf',
    modality: 'odonto',
    plan: 'basico',
  });
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [pixGenerated, setPixGenerated] = useState(false);
  const [mpPreference, setMpPreference] = useState<{ init_point: string; qr_code: string } | null>(null);
  const [pendingClinicId, setPendingClinicId] = useState('');
  const [pollingPayment, setPollingPayment] = useState(false);
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
      const [dynamicPlans, setDynamicPlans] = useState<{ id: string; name: string; price: number; features: string[]; popular?: boolean }[]>([]);
      
      useEffect(() => {
        (async () => {
          try {
            const { supabase, isConfigured } = await import('@/lib/supabase');
            if (isConfigured) {
              const { data } = await supabase
                .from('integration_config')
                .select('plan_price_basico, plan_price_profissional, plan_price_premium')
                .eq('clinic_id', '00000000-0000-0000-0000-000000000001')
                .single();
              if (data) {
                setDynamicPlans([
                  { id: 'basico', name: 'Básico', price: data.plan_price_basico || 97, features: ['1 profissional', 'Agenda completa', 'Prontuário digital', 'WhatsApp integrado', 'Suporte por email'] },
                  { id: 'profissional', name: 'Profissional', price: data.plan_price_profissional || 197, features: ['Até 5 profissionais', 'Tudo do Básico', 'Financeiro completo', 'Estoque', 'Marketing', 'Relatórios avançados'], popular: true },
                  { id: 'premium', name: 'Premium', price: data.plan_price_premium || 397, features: ['Profissionais ilimitados', 'Tudo do Profissional', 'Multi-unidades', 'API integrada', 'Suporte prioritário', 'Personalização total'] },
                ]);
              }
            }
          } catch (e) { /* use defaults */ }
        })();
      }, []);
      
      const plans = dynamicPlans.length > 0 ? dynamicPlans : [
        { id: 'basico', name: 'Básico', price: 97, features: ['1 profissional', 'Agenda completa', 'Prontuário digital', 'WhatsApp integrado', 'Suporte por email'] },
        { id: 'profissional', name: 'Profissional', price: 197, features: ['Até 5 profissionais', 'Tudo do Básico', 'Financeiro completo', 'Estoque', 'Marketing', 'Relatórios avançados'], popular: true },
        { id: 'premium', name: 'Premium', price: 397, features: ['Profissionais ilimitados', 'Tudo do Profissional', 'Multi-unidades', 'API integrada', 'Suporte prioritário', 'Personalização total'] },
      ];
      const selectedPlan = plans.find(p => p.id === signupForm.plan);

      return (
        <ToastProvider>
          <ErrorBoundary key="signup-page">
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 flex items-center justify-center p-4">
              <div className="w-full max-w-lg">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-xl shadow-cyan-200/50">
                    <span className="text-xl font-black">L</span>
                  </div>
                  <h1 className="text-xl font-black text-slate-900">Criar Conta - LuminaFlow</h1>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    {[1,2,3,4].map(s => (
                      <div key={s} className={`w-8 h-1.5 rounded-full transition-all ${s <= signupStep ? 'bg-cyan-500' : 'bg-slate-200'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Etapa {signupStep} de 4</p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6">
                  {/* Step 1 - Dados Pessoais */}
                  {signupStep === 1 && (
                    <div className="space-y-4">
                      <h2 className="font-bold text-slate-900 text-lg">Dados Pessoais</h2>
                      <button type="button" className="w-full py-3 border-2 border-slate-200 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all font-semibold text-slate-700">
                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        Continuar com Google
                      </button>
                      <div className="flex items-center gap-3"><div className="flex-1 h-px bg-slate-200"/><span className="text-xs text-slate-400">ou</span><div className="flex-1 h-px bg-slate-200"/></div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Nome completo</label>
                        <input type="text" value={signupForm.name} onChange={(e) => setSignupForm({...signupForm, name: e.target.value})} placeholder="Seu nome completo" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                        <input type="email" value={signupForm.email} onChange={(e) => setSignupForm({...signupForm, email: e.target.value})} placeholder="seu@email.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Telefone</label>
                        <input type="tel" value={signupForm.phone} onChange={(e) => setSignupForm({...signupForm, phone: e.target.value})} placeholder="(11) 99999-9999" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Senha</label>
                        <input type="password" value={signupForm.password} onChange={(e) => setSignupForm({...signupForm, password: e.target.value})} placeholder="Mínimo 6 caracteres" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Confirmar senha</label>
                        <input type="password" value={signupForm.confirmPassword} onChange={(e) => setSignupForm({...signupForm, confirmPassword: e.target.value})} placeholder="Repita a senha" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all outline-none" />
                      </div>
                      {signupError && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{signupError}</div>}
                      <button onClick={() => {
                        if (!signupForm.name || !signupForm.email || !signupForm.password) { setSignupError('Preencha todos os campos obrigatórios.'); return; }
                        if (signupForm.password !== signupForm.confirmPassword) { setSignupError('As senhas não coincidem.'); return; }
                        if (signupForm.password.length < 6) { setSignupError('A senha deve ter pelo menos 6 caracteres.'); return; }
                        setSignupError(''); setSignupStep(2);
                      }} className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:opacity-90 transition-all">
                        Próximo
                      </button>
                    </div>
                  )}

                  {/* Step 2 - Dados da Clínica */}
                  {signupStep === 2 && (
                    <div className="space-y-4">
                      <h2 className="font-bold text-slate-900 text-lg">Dados da Clínica</h2>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Clínica</label>
                        <input type="text" value={signupForm.clinicName} onChange={(e) => setSignupForm({...signupForm, clinicName: e.target.value})} placeholder="Ex: Lumina Odontologia" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de documento</label>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setSignupForm({...signupForm, docType: 'cpf'})} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${signupForm.docType === 'cpf' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600'}`}>CPF</button>
                          <button type="button" onClick={() => setSignupForm({...signupForm, docType: 'cnpj'})} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${signupForm.docType === 'cnpj' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600'}`}>CNPJ</button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">{signupForm.docType === 'cpf' ? 'CPF do Responsável' : 'CNPJ da Clínica'}</label>
                        <input type="text" value={signupForm.clinicDoc} onChange={(e) => setSignupForm({...signupForm, clinicDoc: e.target.value})} placeholder={signupForm.docType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Modalidade</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button type="button" onClick={() => setSignupForm({...signupForm, modality: 'odonto'})} className={`p-4 rounded-xl border-2 text-center transition-all ${signupForm.modality === 'odonto' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-slate-300'}`}>
                            <div className="text-2xl mb-1">🦷</div>
                            <p className="font-bold text-sm text-slate-800">Odontologia</p>
                            <p className="text-xs text-slate-500">Clínica dental</p>
                          </button>
                          <button type="button" onClick={() => setSignupForm({...signupForm, modality: 'estetica'})} className={`p-4 rounded-xl border-2 text-center transition-all ${signupForm.modality === 'estetica' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-slate-300'}`}>
                            <div className="text-2xl mb-1">✨</div>
                            <p className="font-bold text-sm text-slate-800">Estética</p>
                            <p className="text-xs text-slate-500">Clínica de estética</p>
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setSignupStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all">Voltar</button>
                        <button onClick={() => { if (!signupForm.clinicName || !signupForm.clinicDoc) { setSignupError('Preencha todos os campos.'); return; } setSignupError(''); setSignupStep(3); }} className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:opacity-90 transition-all">Próximo</button>
                      </div>
                    </div>
                  )}

                  {/* Step 3 - Plano */}
                  {signupStep === 3 && (
                    <div className="space-y-4">
                      <h2 className="font-bold text-slate-900 text-lg">Escolha seu Plano</h2>
                      <div className="space-y-3">
                        {plans.map(plan => (
                          <button key={plan.id} type="button" onClick={() => setSignupForm({...signupForm, plan: plan.id})} className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${signupForm.plan === plan.id ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-slate-300'}`}>
                            {plan.popular && <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">Popular</span>}
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-slate-900">{plan.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{plan.features.slice(0, 3).join(' • ')}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-black text-slate-900">R${plan.price}</p>
                                <p className="text-xs text-slate-500">/mês</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setSignupStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all">Voltar</button>
                        <button onClick={() => setSignupStep(4)} className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:opacity-90 transition-all">Revisar</button>
                      </div>
                    </div>
                  )}

                  {/* Step 4 - Revisão e Pagamento */}
                  {signupStep === 4 && (
                    <div className="space-y-4">
                      <h2 className="font-bold text-slate-900 text-lg">Revisão e Pagamento</h2>
                      {!pixGenerated ? (
                        <>
                          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between text-sm"><span className="text-slate-500">Responsável:</span><span className="font-semibold text-slate-800">{signupForm.name}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-slate-500">Email:</span><span className="font-semibold text-slate-800">{signupForm.email}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-slate-500">Clínica:</span><span className="font-semibold text-slate-800">{signupForm.clinicName}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-slate-500">{signupForm.docType === 'cpf' ? 'CPF' : 'CNPJ'}:</span><span className="font-semibold text-slate-800">{signupForm.clinicDoc}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-slate-500">Modalidade:</span><span className="font-semibold text-slate-800">{signupForm.modality === 'odonto' ? '🦷 Odontologia' : '✨ Estética'}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-slate-500">Plano:</span><span className="font-semibold text-slate-800">{selectedPlan?.name}</span></div>
                            <div className="border-t border-slate-200 pt-2 flex justify-between"><span className="font-bold text-slate-800">Total:</span><span className="font-black text-lg text-cyan-600">R${selectedPlan?.price}/mês</span></div>
                          </div>
                          <div className="flex gap-3">
                            <button onClick={() => setSignupStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all">Voltar</button>
                            <button onClick={async () => {
                              setSignupLoading(true);
                              setSignupError('');
                              try {
                                const clinicId = crypto.randomUUID();
                                setPendingClinicId(clinicId);
                                
                                const isDev = import.meta.env.DEV;
                                const API_BASE = isDev ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://clinxia-backend.onrender.com');
                                
                                const res = await fetch(`${API_BASE}/api/mercadopago/create-preference`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    clinicName: signupForm.clinicName,
                                    email: signupForm.email,
                                    name: signupForm.name,
                                    phone: signupForm.phone,
                                    plan: signupForm.plan,
                                    amount: selectedPlan?.price || 97,
                                    clinicId,
                                  }),
                                });
                                
                                const data = await res.json();
                                
                                if (!data.ok) {
                                  throw new Error(data.error || 'Erro ao gerar pagamento');
                                }
                                
                                setMpPreference({ init_point: data.init_point, qr_code: data.qr_code });
                                setPixGenerated(true);
                                
                                // Start polling for payment confirmation
                                setPollingPayment(true);
                                const pollInterval = setInterval(async () => {
                                  try {
                                    const { supabase, isConfigured } = await import('@/lib/supabase');
                                    if (isConfigured) {
                                      const { data: clinics } = await supabase
                                        .from('clinics')
                                        .select('id')
                                        .eq('id', clinicId)
                                        .eq('active', true);
                                      if (clinics && clinics.length > 0) {
                                        clearInterval(pollInterval);
                                        setPollingPayment(false);
                                        // Auto-login after activation
                                        try { await login(signupForm.email, signupForm.password); } catch (e) { /* user will click button */ }
                                      }
                                    }
                                  } catch (e) { /* continue polling */ }
                                }, 10000);
                                
                                // Stop polling after 30 minutes
                                setTimeout(() => { clearInterval(pollInterval); setPollingPayment(false); }, 30 * 60 * 1000);
                              } catch (err: any) {
                                setSignupError(err.message || 'Erro ao gerar QR Code');
                              } finally {
                                setSignupLoading(false);
                              }
                            }} disabled={signupLoading} className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                              {signupLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                              {signupLoading ? 'Gerando...' : 'Gerar QR Code Pix'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center space-y-4">
                          {mpPreference?.qr_code ? (
                            <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
                              <div dangerouslySetInnerHTML={{ __html: mpPreference.qr_code.replace(/<svg/, '<svg style="width:200px;height:200px"') }} />
                            </div>
                          ) : (
                            <div className="bg-white border-2 border-slate-200 rounded-xl p-6 inline-block">
                              <div className="w-48 h-48 bg-slate-100 rounded-lg flex items-center justify-center">
                                <div className="text-center">
                                  <div className="text-4xl mb-2">📱</div>
                                  <p className="text-xs text-slate-500">QR Code Pix</p>
                                </div>
                              </div>
                            </div>
                          )}
                          {mpPreference?.init_point && (
                            <a href={mpPreference.init_point} target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all text-sm">
                              Pagar pelo Mercado Pago →
                            </a>
                          )}
                          <div>
                            <p className="font-bold text-slate-800">Valor: <span className="text-cyan-600">R${selectedPlan?.price},00</span></p>
                            <p className="text-xs text-slate-500 mt-1">Escaneie o QR Code ou clique no link acima</p>
                          </div>
                          {pollingPayment && (
                            <div className="flex items-center justify-center gap-2 text-sm text-cyan-600">
                              <div className="w-4 h-4 border-2 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
                              Aguardando confirmação do pagamento...
                            </div>
                          )}
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <p className="text-xs text-amber-700">⚠️ Após a confirmação do pagamento, sua conta será ativada automaticamente.</p>
                          </div>
                          <button onClick={async () => {
                            setSignupLoading(true);
                            setSignupError('');
                            try {
                              // Import Supabase client
                              const { supabase, isConfigured } = await import('@/lib/supabase');
                              
                              if (isConfigured) {
                                // Generate clinic UUID
                                const clinicId = crypto.randomUUID();
                                
                                // Create clinic in Supabase
                                const { error: clinicError } = await supabase
                                  .from('clinics')
                                  .insert({
                                    id: clinicId,
                                    name: signupForm.clinicName,
                                    document_type: signupForm.docType,
                                    document_number: signupForm.clinicDoc.replace(/\D/g, ''),
                                    modality: signupForm.modality,
                                    plan: signupForm.plan,
                                    phone: signupForm.phone,
                                    email: signupForm.email,
                                    active: true,
                                    created_at: new Date().toISOString(),
                                  });
                                
                                if (clinicError) {
                                  console.error('Clinic creation error:', clinicError);
                                }
                                
                                // Create user in Supabase
                                const { error: userError } = await supabase
                                  .from('users')
                                  .insert({
                                    id: crypto.randomUUID(),
                                    clinic_id: clinicId,
                                    name: signupForm.name,
                                    email: signupForm.email,
                                    phone: signupForm.phone,
                                    role: 'admin',
                                    active: true,
                                    created_at: new Date().toISOString(),
                                  });
                                
                                if (userError) {
                                  console.error('User creation error:', userError);
                                }
                              }
                              
                              // Create user in local auth store
                              const { useAuth } = await import('@/hooks/useAuth');
                              useAuth.getState().createClinicUser(
                                { name: signupForm.name, email: signupForm.email, phone: signupForm.phone, role: 'admin', active: true },
                                signupForm.password,
                                { id: crypto.randomUUID(), name: signupForm.clinicName, document_type: signupForm.docType, document_number: signupForm.clinicDoc, modality: signupForm.modality, plan: signupForm.plan, active: true }
                              );
                              
                              // Login
                              await login(signupForm.email, signupForm.password);
                            } catch (err: any) {
                              console.error('Signup error:', err);
                              setSignupError(err?.message || 'Erro ao criar conta.');
                            } finally {
                              setSignupLoading(false);
                            }
                          }} disabled={signupLoading} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                            {signupLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                            {signupLoading ? 'Verificando pagamento...' : 'Já realizei o pagamento'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 text-center">
                    <button onClick={() => setAuthView('login')} className="text-sm text-cyan-600 font-medium hover:underline">
                      Já tem uma conta? Faça login
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </ErrorBoundary>
        </ToastProvider>
      );
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
      return (
        <ToastProvider>
          <ErrorBoundary key="login-page">
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
