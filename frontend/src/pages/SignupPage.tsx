import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ToastProvider, ErrorBoundary } from '@/components/shared';
import { useAuth } from '@/hooks/useAuth';
import { X, FileText } from 'lucide-react';
// @ts-ignore - qrcode package doesn't have types
import QRCode from 'qrcode';

interface SignupPageProps {
  onLoginClick: () => void;
}

type PlanId = 'basico' | 'profissional' | 'premium';
type Step = 1 | 2 | 3 | 4 | 5;

interface PlanItem {
  id: PlanId;
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
}

const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://clinxia-backend.onrender.com');
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gzcimnredlffqyogxzqq.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const GLOBAL_CLINIC_ID = '00000000-0000-0000-0000-000000000001';

const DEFAULT_PLANS: PlanItem[] = [
  {
    id: 'basico',
    name: 'Basico',
    price: 17,
    features: ['1 profissional', '500 pacientes', '200 consultas/mes', 'Prontuario digital', 'WhatsApp integrado', 'Suporte por email'],
  },
  {
    id: 'profissional',
    name: 'Profissional',
    price: 197,
    features: ['5 profissionais', '2.000 pacientes', '1.000 consultas/mes', 'Financeiro completo', 'Estoque', 'Relatorios avancados'],
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 397,
    features: ['Profissionais ilimitados', 'Pacientes ilimitados', 'Consultas ilimitadas', 'Multi-unidades', 'API integrada', 'Suporte prioritario'],
  },
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function SignupPage({ onLoginClick }: SignupPageProps) {
  const { login } = useAuth();
  const [signupStep, setSignupStep] = useState<Step>(1);
  // Google OAuth configuration status (null = loading, true = configured, false = not configured)
  const [googleConfigured, setGoogleConfigured] = useState<boolean | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    clinicName: '',
    clinicDoc: '',
    docType: 'cpf',
    modality: 'odonto',
    plan: 'basico' as PlanId,
  });
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [dynamicPlans, setDynamicPlans] = useState<PlanItem[]>(DEFAULT_PLANS);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [phoneVerificationEnabled, setPhoneVerificationEnabled] = useState(true);
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneTimer, setPhoneTimer] = useState(0);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [pixGenerated, setPixGenerated] = useState(false);
  const [mpPreference, setMpPreference] = useState<{ init_point: string; qr_code: string; qr_code_base64: string } | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [pollingPayment, setPollingPayment] = useState(false);
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const idsRef = useRef<{ signupId: string; clinicId: string }>({
    signupId: crypto.randomUUID(),
    clinicId: crypto.randomUUID(),
  });
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedPlan = useMemo(
    () => dynamicPlans.find(plan => plan.id === signupForm.plan) || DEFAULT_PLANS[0],
    [dynamicPlans, signupForm.plan]
  );

  const clearPaymentPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  };

  const checkPaymentStatus = async () => {
    const clinicId = idsRef.current.clinicId;
    const response = await fetch(`${API_BASE}/api/mercadopago/payment-status/${clinicId}`);
    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'Erro ao verificar pagamento.');
    }
    if (data.approved) {
      setPaymentApproved(true);
      setPollingPayment(false);
      clearPaymentPolling();
      return true;
    }
    return false;
  };

  useEffect(() => {
    (async () => {
      try {
        if (SUPABASE_KEY) {
          const supabaseResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/integration_config?clinic_id=eq.${GLOBAL_CLINIC_ID}&select=plan_price_basico,plan_price_profissional,plan_price_premium&limit=1`,
            {
              headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
              },
            }
          );
          if (supabaseResponse.ok) {
            const rows = await supabaseResponse.json();
            if (Array.isArray(rows) && rows.length > 0) {
              const row = rows[0];
              const basico = Number(row.plan_price_basico);
              const profissional = Number(row.plan_price_profissional);
              const premium = Number(row.plan_price_premium);
              if (basico > 0 && profissional > 0 && premium > 0) {
                setDynamicPlans([
                  { id: 'basico', name: 'Basico', price: basico, features: DEFAULT_PLANS[0].features },
                  { id: 'profissional', name: 'Profissional', price: profissional, features: DEFAULT_PLANS[1].features, popular: true },
                  { id: 'premium', name: 'Premium', price: premium, features: DEFAULT_PLANS[2].features },
                ]);
                setPlansLoaded(true);
                return;
              }
            }
          }
        }

        const response = await fetch(`${API_BASE}/api/system/signup-config`);
        const data = await response.json();
        if (!data?.ok) {
          setDynamicPlans(DEFAULT_PLANS);
          setPlansLoaded(true);
          return;
        }
        const basico = Number(data.plan_prices?.basico);
        const profissional = Number(data.plan_prices?.profissional);
        const premium = Number(data.plan_prices?.premium);
        if (!(basico > 0 && profissional > 0 && premium > 0)) {
          setDynamicPlans(DEFAULT_PLANS);
          setPlansLoaded(true);
          return;
        }
        setDynamicPlans([
          {
            id: 'basico',
            name: 'Basico',
            price: basico,
            features: DEFAULT_PLANS[0].features,
          },
          {
            id: 'profissional',
            name: 'Profissional',
            price: profissional,
            features: DEFAULT_PLANS[1].features,
            popular: true,
          },
          {
            id: 'premium',
            name: 'Premium',
            price: premium,
            features: DEFAULT_PLANS[2].features,
          },
        ]);
        setPhoneVerificationEnabled(Boolean(data.phone_verification_enabled));
        setPlansLoaded(true);
      } catch (_error) {
        // Fallback de emergência apenas quando Supabase/API falham
        setDynamicPlans(DEFAULT_PLANS);
        setPlansLoaded(true);
      }
    })();
  }, []);

  // Load Google OAuth configuration status on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/auth/google-configured`);
        const j = await r.json();
        setGoogleConfigured(Boolean(j?.configured));
      } catch {
        setGoogleConfigured(false);
      }
    })();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleEmail = params.get('email');
    const googleName = params.get('name');
    const isGoogleSignup = params.get('google_signup') === 'true';
    
    if (isGoogleSignup && googleEmail) {
      const nameFromEmail = googleName || googleEmail.split('@')[0];
      const formattedName = nameFromEmail
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      setSignupForm(prev => ({
        ...prev,
        name: formattedName,
        email: googleEmail,
      }));
      
      window.history.replaceState({}, '', '/signup');
    }
  }, []);

  useEffect(() => {
    if (phoneTimer <= 0) return;
    const interval = setInterval(() => {
      setPhoneTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [phoneTimer]);

  useEffect(() => {
    return () => clearPaymentPolling();
  }, []);

  const goToStep = (step: Step) => {
    setSignupError('');
    setSignupStep(step);
  };

  const validateStep1 = () => {
    if (!signupForm.name.trim() || !signupForm.email.trim() || !signupForm.phone.trim() || !signupForm.password) {
      setSignupError('Preencha todos os campos obrigatorios.');
      return false;
    }
    if (signupForm.password !== signupForm.confirmPassword) {
      setSignupError('As senhas nao coincidem.');
      return false;
    }
    if (signupForm.password.length < 6) {
      setSignupError('A senha deve ter pelo menos 6 caracteres.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!signupForm.clinicName.trim() || !signupForm.clinicDoc.trim()) {
      setSignupError('Preencha os dados da clinica.');
      return false;
    }
    return true;
  };

  const handleSendPhoneCode = async () => {
    if (!signupForm.phone.trim()) {
      setSignupError('Informe o telefone para validacao.');
      return;
    }

    setSignupLoading(true);
    setSignupError('');
    try {
      const response = await fetch(`${API_BASE}/api/signup/phone/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signupId: idsRef.current.signupId,
          phone: signupForm.phone,
          name: signupForm.name,
        }),
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Falha ao enviar codigo.');

      setPhoneCode('');
      setPhoneCodeSent(true);
      setPhoneVerified(false);
      setMaskedPhone(data.masked_phone || '');
      setPhoneTimer(Number(data.expires_in_seconds || 30));
    } catch (error: unknown) {
      setSignupError(error instanceof Error ? error.message : 'Erro ao enviar codigo.');
    } finally {
      setSignupLoading(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!phoneCode.trim() || phoneCode.trim().length !== 6) {
      setSignupError('Informe o codigo de 6 digitos.');
      return;
    }
    setSignupLoading(true);
    setSignupError('');
    try {
      const response = await fetch(`${API_BASE}/api/signup/phone/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signupId: idsRef.current.signupId,
          phone: signupForm.phone,
          code: phoneCode.trim(),
        }),
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Codigo invalido.');
      setPhoneVerified(true);
      setPhoneTimer(0);
    } catch (error: unknown) {
      setSignupError(error instanceof Error ? error.message : 'Erro ao validar codigo.');
    } finally {
      setSignupLoading(false);
    }
  };

  const handleGeneratePayment = async () => {
    if (phoneVerificationEnabled && !phoneVerified) {
      setSignupError('Valide o telefone antes de gerar o pagamento.');
      return;
    }
    if (!termsAccepted) {
      setShowTermsModal(true);
      setSignupError('Você precisa aceitar os Termos de Uso e Política de Privacidade.');
      return;
    }
    setSignupLoading(true);
    setSignupError('');
    setPaymentApproved(false);
    try {
      const response = await fetch(`${API_BASE}/api/mercadopago/create-preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicName: signupForm.clinicName,
          email: signupForm.email,
          name: signupForm.name,
          phone: signupForm.phone,
          plan: signupForm.plan,
          amount: selectedPlan.price,
          clinicId: idsRef.current.clinicId,
          docType: signupForm.docType,
          clinicDoc: signupForm.clinicDoc,
          modality: signupForm.modality,
          signupId: idsRef.current.signupId,
        }),
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Erro ao gerar pagamento.');

      // Generate QR code image from the pix copy-paste code
      let qrImage = '';
      if (data.qr_code) {
        try {
          qrImage = await QRCode.toDataURL(data.qr_code, { width: 200, margin: 1 });
        } catch (e) {
          console.error('Failed to generate QR:', e);
        }
      }

      setMpPreference({ 
        init_point: data.init_point, 
        qr_code: data.qr_code || '',
        qr_code_base64: data.qr_code_base64 || ''
      });
      setQrCodeImage(qrImage);
      setPixGenerated(true);

      setPollingPayment(true);
      clearPaymentPolling();
      pollIntervalRef.current = setInterval(async () => {
        try {
          await checkPaymentStatus();
        } catch (_error) {
          // polling continua
        }
      }, 10000);
      pollTimeoutRef.current = setTimeout(() => {
        clearPaymentPolling();
        setPollingPayment(false);
      }, 30 * 60 * 1000);
    } catch (error: unknown) {
      setSignupError(error instanceof Error ? error.message : 'Erro ao iniciar pagamento.');
    } finally {
      setSignupLoading(false);
    }
  };

  const handleProvisionAccount = async () => {
    setSignupLoading(true);
    setSignupError('');
    try {
      const approved = await checkPaymentStatus();
      if (!approved) {
        throw new Error('Pagamento ainda nao aprovado. Aguarde a confirmacao.');
      }

      const provisionResponse = await fetch(`${API_BASE}/api/signup/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signupId: idsRef.current.signupId,
          clinicId: idsRef.current.clinicId,
          name: signupForm.name,
          email: signupForm.email,
          phone: signupForm.phone,
          password: signupForm.password,
          clinicName: signupForm.clinicName,
          clinicDoc: signupForm.clinicDoc,
          docType: signupForm.docType,
          modality: signupForm.modality,
          plan: signupForm.plan,
        }),
      });
      const provisionData = await provisionResponse.json();
      if (!provisionData.ok) {
        throw new Error(provisionData.error || 'Falha ao ativar conta.');
      }

      let logged = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        logged = await login(signupForm.email, signupForm.password);
        if (logged) break;
        await sleep(1200);
      }
      if (!logged) {
        throw new Error('Conta criada, mas nao foi possivel autenticar automaticamente. Tente fazer login.');
      }
    } catch (error: unknown) {
      setSignupError(error instanceof Error ? error.message : 'Erro ao concluir cadastro.');
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <ToastProvider>
      <ErrorBoundary key="signup-page">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-xl shadow-cyan-200/50">
                <span className="text-xl font-black">L</span>
              </div>
              <h1 className="text-xl font-black text-slate-900">Criar Conta - Clinxia</h1>
              <div className="flex items-center justify-center gap-2 mt-3">
                {[1, 2, 3, 4, 5].map(step => (
                  <div key={step} className={`w-7 h-1.5 rounded-full transition-all ${step <= signupStep ? 'bg-cyan-500' : 'bg-slate-200'}`} />
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">Etapa {signupStep} de 5</p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6">
              {signupStep === 1 && (
                <div className="space-y-4">
                  <h2 className="font-bold text-slate-900 text-lg">Dados Pessoais</h2>
                  {/* Status de configuração do Google OAuth */}
                  {googleConfigured === null && (
                    <div className="text-sm text-slate-500 mb-2">Verificando configuração do Google OAuth...</div>
                  )}
                  {googleConfigured === true && (
                    <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-2 mb-2">Google OAuth configurado</div>
                  )}
                  {googleConfigured === false && (
                    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-2 mb-2">Google OAuth não configurado. Contate o suporte.</div>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (googleConfigured === false || googleLoading) return;
                      setGoogleLoading(true);
                      setTimeout(() => {
                        window.location.href = `${API_BASE}/api/auth/google?signup=true`;
                      }, 800);
                    }}
                    disabled={googleLoading}
                    className="w-full py-3 px-4 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 font-semibold text-slate-700 disabled:opacity-60"
                  >
                    {googleLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-slate-300 border-t-cyan-600 rounded-full animate-spin" />
                        Conectando ao Google...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continuar com Google
                      </>
                    )}
                  </button>
                  
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-slate-500">ou continue com email</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nome completo</label>
                    <input type="text" value={signupForm.name} onChange={e => setSignupForm({ ...signupForm, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                    <input type="email" value={signupForm.email} onChange={e => setSignupForm({ ...signupForm, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Telefone</label>
                    <input type="tel" value={signupForm.phone} onChange={e => setSignupForm({ ...signupForm, phone: e.target.value, })} placeholder="(11) 99999-9999" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Senha</label>
                    <input type="password" value={signupForm.password} onChange={e => setSignupForm({ ...signupForm, password: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Confirmar senha</label>
                    <input type="password" value={signupForm.confirmPassword} onChange={e => setSignupForm({ ...signupForm, confirmPassword: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" />
                  </div>
                  <button
                    onClick={() => {
                      if (!validateStep1()) return;
                      goToStep(2);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:opacity-90 transition-all"
                  >
                    Proximo
                  </button>
                </div>
              )}

              {signupStep === 2 && (
                <div className="space-y-4">
                  <h2 className="font-bold text-slate-900 text-lg">Dados da Clinica</h2>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Clinica</label>
                    <input type="text" value={signupForm.clinicName} onChange={e => setSignupForm({ ...signupForm, clinicName: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de documento</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setSignupForm({ ...signupForm, docType: 'cpf' })} className={`flex-1 py-2.5 rounded-xl font-bold text-sm ${signupForm.docType === 'cpf' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600'}`}>CPF</button>
                      <button type="button" onClick={() => setSignupForm({ ...signupForm, docType: 'cnpj' })} className={`flex-1 py-2.5 rounded-xl font-bold text-sm ${signupForm.docType === 'cnpj' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600'}`}>CNPJ</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{signupForm.docType === 'cpf' ? 'CPF do Responsavel' : 'CNPJ da Clinica'}</label>
                    <input type="text" value={signupForm.clinicDoc} onChange={e => setSignupForm({ ...signupForm, clinicDoc: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Modalidade</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setSignupForm({ ...signupForm, modality: 'odonto' })} className={`p-4 rounded-xl border-2 transition-all ${signupForm.modality === 'odonto' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200'}`}>Odontologia</button>
                      <button type="button" onClick={() => setSignupForm({ ...signupForm, modality: 'estetica' })} className={`p-4 rounded-xl border-2 transition-all ${signupForm.modality === 'estetica' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200'}`}>Estetica</button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => goToStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Voltar</button>
                    <button
                      onClick={() => {
                        if (!validateStep2()) return;
                        goToStep(3);
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl"
                    >
                      Proximo
                    </button>
                  </div>
                </div>
              )}

              {signupStep === 3 && (
                <div className="space-y-4">
                  <h2 className="font-bold text-slate-900 text-lg">Validacao de Telefone</h2>
                  <p className="text-sm text-slate-500">
                    Antes de escolher o plano, confirme o telefone via WhatsApp.
                  </p>
                  {!phoneVerificationEnabled && (
                    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
                      Validacao de telefone indisponivel no momento. O WhatsApp global precisa estar conectado pelo super admin.
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Telefone para validacao</label>
                    <input
                      type="tel"
                      value={signupForm.phone}
                      onChange={e => setSignupForm({ ...signupForm, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSendPhoneCode}
                      disabled={signupLoading || !phoneVerificationEnabled}
                      className="flex-1 py-3 bg-cyan-600 text-white font-bold rounded-xl disabled:opacity-60"
                    >
                      {signupLoading ? 'Enviando...' : phoneCodeSent ? 'Reenviar codigo' : 'Enviar codigo'}
                    </button>
                  </div>
                  {phoneCodeSent && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500">
                        Codigo enviado para {maskedPhone || signupForm.phone}. Valido por {phoneTimer}s.
                      </p>
                      <input
                        type="text"
                        value={phoneCode}
                        maxLength={6}
                        onChange={e => setPhoneCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="Digite o codigo de 6 digitos"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
                      />
                      <button
                        onClick={handleVerifyPhoneCode}
                        disabled={signupLoading || phoneCode.length !== 6}
                        className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-60"
                      >
                        {signupLoading ? 'Validando...' : 'Validar codigo'}
                      </button>
                    </div>
                  )}
                  {phoneVerified && (
                    <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                      Telefone validado com sucesso.
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => goToStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Voltar</button>
                    <button
                      onClick={() => {
                        if (!phoneVerificationEnabled || phoneVerified) {
                          goToStep(4);
                          return;
                        }
                        setSignupError('Valide o telefone antes de prosseguir.');
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl"
                    >
                      Proximo
                    </button>
                  </div>
                </div>
              )}

              {signupStep === 4 && (
                <div className="space-y-4">
                  <h2 className="font-bold text-slate-900 text-lg">Escolha seu Plano</h2>
                  {!plansLoaded && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      Carregando preços atualizados...
                    </div>
                  )}
                  <div className="space-y-3">
                    {dynamicPlans.map(plan => (
                      <button key={plan.id} type="button" onClick={() => setSignupForm({ ...signupForm, plan: plan.id })} className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${signupForm.plan === plan.id ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200'}`}>
                        {plan.popular && <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">Popular</span>}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-900">{plan.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{plan.features.slice(0, 3).join(' | ')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black text-slate-900">R${plan.price}</p>
                            <p className="text-xs text-slate-500">/mes</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => goToStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Voltar</button>
                    <button onClick={() => { if (!termsAccepted) { setShowTermsModal(true); } else { goToStep(5); }}} className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl">
                      {!termsAccepted ? 'Revisar (aceite termos)' : 'Revisar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Terms Modal */}
              {showTermsModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-cyan-600" />
                        Termos de Uso e Privacidade
                      </h3>
                      <button onClick={() => setShowTermsModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                        <X className="w-5 h-5 text-slate-500" />
                      </button>
                    </div>
                    <div className="space-y-4 text-sm text-slate-600 max-h-60 overflow-y-auto mb-4">
                      <div>
                        <h4 className="font-bold text-slate-900 mb-2">1. Aceitação dos Termos</h4>
                        <p>Ao utilizar o sistema Clinxia, você reconhece que leu, compreendeu e concorda em cumprir os Termos de Uso e Política de Privacidade.</p>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 mb-2">2. Uso lawful</h4>
                        <p>Você concorda em utilizar o sistema apenas para fins legais e authorized, não compartilhando sua conta com terceiros.</p>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 mb-2">3. Dados Pessoais</h4>
                        <p>Seus dados serão tratados conforme LGPD (Lei nº 13.709/2018), com strict measures de segurança.</p>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 mb-2">4. Responsabilidades</h4>
                        <p>Você é responsible pela confidentiality de suas credenciais e por todas as atividades em sua conta.</p>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 mb-2">5. Propriedade Intelectual</h4>
                        <p>O sistema e todo conteúdo são de propriedade exclusiva da Clinxia. Reprodução não autorizada é proibida.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 mb-4 p-3 bg-cyan-50 rounded-xl">
                      <input type="checkbox" id="termsCheck" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1 w-4 h-4 text-cyan-600 rounded" />
                      <label htmlFor="termsCheck" className="text-sm text-slate-700">
                        Li e aceito os <Link to="/termos" target="_blank" className="text-cyan-600 underline">Termos de Uso</Link> e <Link to="/privacidade" target="_blank" className="text-cyan-600 underline">Política de Privacidade</Link>
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setShowTermsModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Cancelar</button>
                      <button onClick={() => { setShowTermsModal(false); goToStep(5); }} disabled={!termsAccepted} className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl disabled:opacity-50">
                        Continuar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {signupStep === 5 && (
                <div className="space-y-4">
                  <h2 className="font-bold text-slate-900 text-lg">Revisao e Pagamento</h2>
                  {!pixGenerated ? (
                    <>
                      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Responsavel:</span><span className="font-semibold text-slate-800">{signupForm.name}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Email:</span><span className="font-semibold text-slate-800">{signupForm.email}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Clinica:</span><span className="font-semibold text-slate-800">{signupForm.clinicName}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Plano:</span><span className="font-semibold text-slate-800">{selectedPlan.name}</span></div>
                        <div className="border-t border-slate-200 pt-2 flex justify-between"><span className="font-bold text-slate-800">Total:</span><span className="font-black text-lg text-cyan-600">R${selectedPlan.price}/mes</span></div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => goToStep(4)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Voltar</button>
                        <button onClick={handleGeneratePayment} disabled={signupLoading} className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl disabled:opacity-70">
                          {signupLoading ? 'Gerando...' : 'Gerar QR Code Pix'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center space-y-4">
                      {qrCodeImage ? (
                        <div className="bg-white border-2 border-slate-200 rounded-xl p-4 inline-block">
                          <img src={qrCodeImage} alt="QR Code Pix" className="w-48 h-48" />
                        </div>
                      ) : mpPreference?.qr_code ? (
                        <div className="bg-white border-2 border-slate-200 rounded-xl p-6 inline-block">
                          <p className="text-xs text-slate-500">QR Code Pix</p>
                        </div>
                      ) : (
                        <div className="bg-white border-2 border-slate-200 rounded-xl p-6 inline-block">
                          <p className="text-xs text-slate-500">Gerando QR Code...</p>
                        </div>
                      )}
                      {mpPreference?.init_point && (
                        <a href={mpPreference.init_point} target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all text-sm">
                          Pagar pelo Mercado Pago
                        </a>
                      )}
                      <div>
                        <p className="font-bold text-slate-800">Valor: <span className="text-cyan-600">R${selectedPlan.price.toFixed(2)}</span></p>
                        <p className="text-xs text-slate-500 mt-1">A conta so sera ativada apos pagamento aprovado.</p>
                      </div>
                      {pollingPayment && (
                        <div className="flex items-center justify-center gap-2 text-sm text-cyan-600">
                          <div className="w-4 h-4 border-2 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
                          Aguardando confirmacao do pagamento...
                        </div>
                      )}
                      {paymentApproved && (
                        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                          Pagamento aprovado. Voce ja pode ativar a conta.
                        </div>
                      )}
                      <button onClick={handleProvisionAccount} disabled={signupLoading} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-70">
                        {signupLoading ? 'Ativando conta...' : 'Ativar conta'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {signupError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 mt-3">{signupError}</div>
              )}

              <div className="mt-4 text-center">
                <button onClick={onLoginClick} className="text-sm text-cyan-600 font-medium hover:underline">
                  Ja tem uma conta? Faca login
                </button>
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </ToastProvider>
  );
}
