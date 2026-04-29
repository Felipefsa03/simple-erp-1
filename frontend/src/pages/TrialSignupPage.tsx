import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ToastProvider, ErrorBoundary } from '@/components/shared';
import { useAuth } from '@/hooks/useAuth';
import { X, FileText, Crown, Check, Sparkles } from 'lucide-react';

interface TrialSignupPageProps {
  onLoginClick: () => void;
}

type Step = 1 | 2 | 3;

const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://clinxia-backend.onrender.com');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const TRIAL_FEATURES = [
  'Profissionais ilimitados',
  'Pacientes ilimitados',
  'Consultas ilimitadas',
  'Multi-unidades',
  'Financeiro completo',
  'Estoque e relatórios',
  'WhatsApp integrado',
  'Suporte prioritário',
];

export function TrialSignupPage({ onLoginClick }: TrialSignupPageProps) {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    clinicName: '',
    clinicDoc: '',
    docType: 'cpf',
    modality: 'odonto',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneTimer, setPhoneTimer] = useState(0);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [phoneVerificationEnabled, setPhoneVerificationEnabled] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState<boolean | null>(null);

  const idsRef = useRef<{ signupId: string; clinicId: string }>({
    signupId: crypto.randomUUID(),
    clinicId: crypto.randomUUID(),
  });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/auth/google-configured`);
        const j = await r.json();
        setGoogleConfigured(Boolean(j?.configured));
      } catch { setGoogleConfigured(false); }
    })();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleEmail = params.get('email');
    const googleName = params.get('name');
    const isGoogle = params.get('google_signup') === 'true';
    if (isGoogle && googleEmail) {
      const n = (googleName || googleEmail.split('@')[0]).split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      setForm(prev => ({ ...prev, name: n, email: googleEmail }));
      window.history.replaceState({}, '', '/signup/trial');
    }
  }, []);

  useEffect(() => {
    if (phoneTimer <= 0) return;
    const iv = setInterval(() => setPhoneTimer(p => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(iv);
  }, [phoneTimer]);

  const goToStep = (s: Step) => { setError(''); setStep(s); };

  const validateStep1 = () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password) {
      setError('Preencha todos os campos obrigatórios.'); return false;
    }
    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.'); return false;
    }
    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.'); return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!form.clinicName.trim() || !form.clinicDoc.trim()) {
      setError('Preencha os dados da clínica.'); return false;
    }
    return true;
  };

  const handleSendPhoneCode = async () => {
    if (!form.phone.trim()) { setError('Informe o telefone.'); return; }
    setLoading(true); setError('');
    try {
      let r;
      let d;
      for (let attempt = 0; attempt < 3; attempt++) {
        r = await fetch(`${API_BASE}/api/signup/phone/send-code`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signupId: idsRef.current.signupId, phone: form.phone, name: form.name }),
        });
        if (r.status === 503 || r.status === 500) {
          if (attempt < 2) {
            setError('Servidor iniciando/conectando, aguarde...');
            await sleep(4000);
            continue;
          }
        }
        d = await r.json();
        console.log('[Trial Signup] Send code response:', d);
        break;
      }
      if (!d?.ok) throw new Error(d?.error || 'Falha ao enviar código.');
      setError('');
      setPhoneCode(''); setPhoneCodeSent(true); setPhoneVerified(false);
      setMaskedPhone(d.masked_phone || ''); setPhoneTimer(Number(d.expires_in_seconds || 30));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar código.');
    } finally { setLoading(false); }
  };

  const handleVerifyPhoneCode = async () => {
    if (!phoneCode.trim() || phoneCode.trim().length !== 6) { setError('Informe o código de 6 dígitos.'); return; }
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API_BASE}/api/signup/phone/verify-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signupId: idsRef.current.signupId, phone: form.phone, code: phoneCode.trim() }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'Código inválido.');
      setPhoneVerified(true); setPhoneTimer(0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao validar código.');
    } finally { setLoading(false); }
  };

  const handleActivateTrial = async () => {
    if (phoneVerificationEnabled && !phoneVerified) {
      setError('Valide o telefone antes de ativar.'); return;
    }
    if (!termsAccepted) { setShowTermsModal(true); setError('Aceite os Termos de Uso.'); return; }

    setProvisioning(true); setError('');
    try {
      const r = await fetch(`${API_BASE}/api/signup/provision-trial`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signupId: idsRef.current.signupId,
          clinicId: idsRef.current.clinicId,
          name: form.name, email: form.email, phone: form.phone, password: form.password,
          clinicName: form.clinicName, clinicDoc: form.clinicDoc,
          docType: form.docType, modality: form.modality,
        }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'Falha ao ativar conta trial.');

      let logged = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        const result = await login(form.email, form.password);
        logged = result === true;
        if (logged) break;
        await sleep(1200);
      }
      if (!logged) throw new Error('Conta criada! Faça login manualmente.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao concluir cadastro.');
    } finally { setProvisioning(false); }
  };

  return (
    <ToastProvider>
      <ErrorBoundary key="trial-signup">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-xl shadow-brand-200/50">
                <Sparkles className="w-7 h-7" />
              </div>
              <h1 className="text-xl font-black text-slate-900">Teste Grátis — 7 Dias</h1>
              <p className="text-sm text-slate-500 mt-1">Acesso completo ao plano Premium. Sem cartão de crédito.</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`w-10 h-1.5 rounded-full transition-all ${s <= step ? 'bg-brand-500' : 'bg-slate-200'}`} />
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">Etapa {step} de 3</p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6">
              {/* Trial badge */}
              <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Plano Premium Grátis</p>
                  <p className="text-xs text-slate-500">7 dias com todas as funcionalidades. Cancele quando quiser.</p>
                </div>
              </div>

              {/* Step 1 - Dados Pessoais */}
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="font-bold text-slate-900 text-lg">Dados Pessoais</h2>

                  <button type="button" onClick={() => { if (googleConfigured === false || googleLoading) return; setGoogleLoading(true); setTimeout(() => { window.location.href = `${API_BASE}/api/auth/google?signup=true&trial=true`; }, 800); }} disabled={googleLoading}
                    className="w-full py-3 px-4 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 font-semibold text-slate-700 disabled:opacity-60">
                    {googleLoading ? (<><div className="w-5 h-5 border-2 border-slate-300 border-t-brand-600 rounded-full animate-spin" />Conectando...</>) : (<>
                      <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      Continuar com Google</>)}
                  </button>

                  <div className="relative py-2"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-500">ou continue com email</span></div></div>

                  <div><label className="block text-sm font-semibold text-slate-700 mb-1">Nome completo</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-400 transition-colors" /></div>
                  <div><label className="block text-sm font-semibold text-slate-700 mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-400 transition-colors" /></div>
                  <div><label className="block text-sm font-semibold text-slate-700 mb-1">Telefone</label><input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-400 transition-colors" /></div>
                  <div><label className="block text-sm font-semibold text-slate-700 mb-1">Senha</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-400 transition-colors" /></div>
                  <div><label className="block text-sm font-semibold text-slate-700 mb-1">Confirmar senha</label><input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-400 transition-colors" /></div>
                  <button onClick={() => { if (validateStep1()) goToStep(2); }} className="w-full py-3 bg-gradient-to-r from-brand-600 to-brand-600 text-white font-bold rounded-xl hover:opacity-90 transition-all">Próximo</button>
                </div>
              )}

              {/* Step 2 - Dados da Clínica */}
              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="font-bold text-slate-900 text-lg">Dados da Clínica</h2>
                  <div><label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Clínica</label><input type="text" value={form.clinicName} onChange={e => setForm({ ...form, clinicName: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-400 transition-colors" /></div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de documento</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setForm({ ...form, docType: 'cpf' })} className={`flex-1 py-2.5 rounded-xl font-bold text-sm ${form.docType === 'cpf' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>CPF</button>
                      <button type="button" onClick={() => setForm({ ...form, docType: 'cnpj' })} className={`flex-1 py-2.5 rounded-xl font-bold text-sm ${form.docType === 'cnpj' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>CNPJ</button>
                    </div>
                  </div>
                  <div><label className="block text-sm font-semibold text-slate-700 mb-1">{form.docType === 'cpf' ? 'CPF do Responsável' : 'CNPJ da Clínica'}</label><input type="text" value={form.clinicDoc} onChange={e => setForm({ ...form, clinicDoc: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-400 transition-colors" /></div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Modalidade</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setForm({ ...form, modality: 'odonto' })} className={`p-4 rounded-xl border-2 transition-all ${form.modality === 'odonto' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}>Odontologia</button>
                      <button type="button" onClick={() => setForm({ ...form, modality: 'estetica' })} className={`p-4 rounded-xl border-2 transition-all ${form.modality === 'estetica' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}>Estética</button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => goToStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Voltar</button>
                    <button onClick={() => { if (validateStep2()) goToStep(3); }} className="flex-1 py-3 bg-gradient-to-r from-brand-600 to-brand-600 text-white font-bold rounded-xl">Próximo</button>
                  </div>
                </div>
              )}

              {/* Step 3 - Validação + Termos + Ativação */}
              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="font-bold text-slate-900 text-lg">Validação e Ativação</h2>

                  {/* Resumo */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Responsável:</span><span className="font-semibold text-slate-800">{form.name}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Email:</span><span className="font-semibold text-slate-800">{form.email}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Clínica:</span><span className="font-semibold text-slate-800">{form.clinicName}</span></div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                      <span className="font-bold text-slate-800">Plano:</span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 font-bold rounded-full text-sm"><Crown className="w-4 h-4" />Premium — 7 dias grátis</span>
                    </div>
                  </div>

                  {/* Funcionalidades incluídas */}
                  <div className="bg-brand-50/50 border border-brand-100 rounded-xl p-4">
                    <p className="text-sm font-bold text-slate-700 mb-2">Funcionalidades incluídas:</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TRIAL_FEATURES.map(f => (
                        <div key={f} className="flex items-center gap-1.5 text-xs text-slate-600"><Check className="w-3.5 h-3.5 text-brand-500 shrink-0" />{f}</div>
                      ))}
                    </div>
                  </div>

                  {/* Validação telefone */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-700">Validação de Telefone</p>
                    {!phoneVerificationEnabled && (
                      <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">Validação indisponível no momento.</div>
                    )}
                    <div className="flex gap-2">
                      <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm" />
                      <button onClick={handleSendPhoneCode} disabled={loading || !phoneVerificationEnabled} className="px-4 py-3 bg-brand-600 text-white font-bold rounded-xl text-sm disabled:opacity-60 whitespace-nowrap">
                        {loading ? '...' : phoneCodeSent ? 'Reenviar' : 'Enviar'}
                      </button>
                    </div>
                    {phoneCodeSent && (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500">Código enviado para {maskedPhone || form.phone}. Válido por {phoneTimer}s.</p>
                        <input type="text" value={phoneCode} maxLength={6} onChange={e => setPhoneCode(e.target.value.replace(/\D/g, ''))} placeholder="Código de 6 dígitos" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm" />
                        <button onClick={handleVerifyPhoneCode} disabled={loading || phoneCode.length !== 6} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-60 text-sm">{loading ? 'Validando...' : 'Validar código'}</button>
                      </div>
                    )}
                    {phoneVerified && (<div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3">✓ Telefone validado com sucesso.</div>)}
                  </div>

                  {/* Termos */}
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <input type="checkbox" id="trialTerms" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="mt-1 w-4 h-4 text-brand-600 rounded" />
                    <label htmlFor="trialTerms" className="text-sm text-slate-700">
                      Li e aceito os <Link to="/termos" target="_blank" className="text-brand-600 underline">Termos de Uso</Link> e <Link to="/privacidade" target="_blank" className="text-brand-600 underline">Política de Privacidade</Link>
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => goToStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Voltar</button>
                    <button onClick={handleActivateTrial} disabled={provisioning || !termsAccepted || (phoneVerificationEnabled && !phoneVerified)}
                      className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                      {provisioning ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Ativando...</>) : (<><Sparkles className="w-4 h-4" />Ativar Teste Grátis</>)}
                    </button>
                  </div>
                </div>
              )}

              {error && (<div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 mt-3">{error}</div>)}

              <div className="mt-4 text-center">
                <button onClick={onLoginClick} className="text-sm text-brand-600 font-medium hover:underline">Já tem uma conta? Faça login</button>
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </ToastProvider>
  );
}
