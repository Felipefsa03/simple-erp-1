import React, { useState, useEffect } from 'react';
import { ToastProvider, ErrorBoundary } from '@/components/shared';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/useShared';

interface SignupPageProps {
  onLoginClick: () => void;
}

export function SignupPage({ onLoginClick }: SignupPageProps) {
  const { login, createClinicUser } = useAuth();
  const [signupStep, setSignupStep] = useState(1);
  const [signupForm, setSignupForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    clinicName: '', clinicDoc: '', docType: 'cpf',
    modality: 'odonto',
    plan: 'basico',
  });
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [pixGenerated, setPixGenerated] = useState(false);
  const [mpPreference, setMpPreference] = useState<{ init_point: string; qr_code: string } | null>(null);
  const [pollingPayment, setPollingPayment] = useState(false);
  const [dynamicPlans, setDynamicPlans] = useState<{ id: string; name: string; price: number; features: string[]; popular?: boolean }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { supabase, isSupabaseConfigured } = await import('@/lib/supabase');
        if (!isSupabaseConfigured()) return;
        const { data } = await supabase!.from('integration_config').select('plan_price_basico, plan_price_profissional, plan_price_premium').eq('clinic_id', '00000000-0000-0000-0000-000000000001').single();
        if (data) {
          setDynamicPlans([
            { id: 'basico', name: 'Básico', price: (data as Record<string, number>).plan_price_basico || 97, features: ['1 profissional', '500 pacientes', '200 consultas/mês', 'Prontuário digital', 'WhatsApp integrado', 'Suporte por email'] },
            { id: 'profissional', name: 'Profissional', price: (data as Record<string, number>).plan_price_profissional || 197, features: ['5 profissionais', '2.000 pacientes', '1.000 consultas/mês', 'Financeiro completo', 'Estoque', 'Marketing', 'Relatórios avançados'], popular: true },
            { id: 'premium', name: 'Premium', price: (data as Record<string, number>).plan_price_premium || 397, features: ['Profissionais ilimitados', 'Pacientes ilimitados', 'Consultas ilimitadas', 'Tudo do Profissional', 'Multi-unidades', 'API integrada', 'Suporte prioritário', 'Personalização total'] },
          ]);
        }
      } catch (_e: unknown) { /* use defaults */ }
    })();
  }, []);

  const plans = dynamicPlans.length > 0 ? dynamicPlans : [
    { id: 'basico', name: 'Básico', price: 97, features: ['1 profissional', 'Agenda completa', 'Prontuário digital', 'WhatsApp integrado', 'Suporte por email'] },
    { id: 'profissional', name: 'Profissional', price: 197, features: ['Até 5 profissionais', 'Tudo do Básico', 'Financeiro completo', 'Estoque', 'Marketing', 'Relatórios avançados'], popular: true },
    { id: 'premium', name: 'Premium', price: 397, features: ['Profissionais ilimitados', 'Tudo do Profissional', 'Multi-unidades', 'API integrada', 'Suporte prioritário', 'Personalização total'] },
  ];
  const selectedPlan = plans.find(p => p.id === signupForm.plan);

  const handleGeneratePayment = async () => {
    setSignupLoading(true);
    setSignupError('');
    try {
      const clinicId = crypto.randomUUID();
      const isDev = import.meta.env.DEV;
      const API_BASE = isDev ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://clinxia-backend.onrender.com');

      const res = await fetch(`${API_BASE}/api/mercadopago/create-preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicName: signupForm.clinicName, email: signupForm.email, name: signupForm.name,
          phone: signupForm.phone, plan: signupForm.plan, amount: selectedPlan?.price || 97, clinicId,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Erro ao gerar pagamento');

      setMpPreference({ init_point: data.init_point, qr_code: data.qr_code });
      setPixGenerated(true);

      setPollingPayment(true);
      const pollInterval = setInterval(async () => {
        try {
          const { supabase, isSupabaseConfigured } = await import('@/lib/supabase');
          if (isSupabaseConfigured()) {
            const { data: clinics } = await supabase!.from('clinics').select('id').eq('id', clinicId).eq('active', true);
            if (clinics && clinics.length > 0) {
              clearInterval(pollInterval);
              setPollingPayment(false);
              try { await login(signupForm.email, signupForm.password); } catch (_e: unknown) { /* user will click button */ }
            }
          }
        } catch (_e: unknown) { /* continue polling */ }
      }, 10000);
      setTimeout(() => { clearInterval(pollInterval); setPollingPayment(false); }, 30 * 60 * 1000);
    } catch (err: unknown) {
      setSignupError(err instanceof Error ? err.message : 'Erro ao gerar QR Code');
    } finally {
      setSignupLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    setSignupLoading(true);
    setSignupError('');
    try {
      const { supabase, isSupabaseConfigured } = await import('@/lib/supabase');
      if (isSupabaseConfigured()) {
        const { data: authData, error: authError } = await supabase!.auth.signUp({
          email: signupForm.email,
          password: signupForm.password,
        });

        if (authError) throw new Error(`Erro na criação da autenticação: ${authError.message}`);
        
        const userId = authData.user?.id || crypto.randomUUID();
        const clinicId = crypto.randomUUID();
        
        const { error: clinicError } = await supabase!.from('clinics').insert({
          id: clinicId, name: signupForm.clinicName, document_type: signupForm.docType,
          document_number: signupForm.clinicDoc.replace(/\D/g, ''), modality: signupForm.modality,
          plan: signupForm.plan, phone: signupForm.phone, email: signupForm.email,
          active: true, created_at: new Date().toISOString(),
        });
        
        if (clinicError) throw new Error(`Erro ao criar clínica no BD: ${clinicError.message}`);

        const { error: userError } = await supabase!.from('users').insert({
          id: userId, clinic_id: clinicId, name: signupForm.name,
          email: signupForm.email, phone: signupForm.phone, role: 'admin',
          active: true, created_at: new Date().toISOString(),
        });
        
        if (userError) throw new Error(`Erro ao salvar usuário no BD: ${userError.message}`);
      }
      createClinicUser(
        { name: signupForm.name, email: signupForm.email, phone: signupForm.phone, role: 'admin', active: true, commission_pct: 0 } as any,
        signupForm.password,
        { id: crypto.randomUUID(), name: signupForm.clinicName, document_type: signupForm.docType, document_number: signupForm.clinicDoc, modality: signupForm.modality, plan: signupForm.plan, active: true } as any
      );
      await login(signupForm.email, signupForm.password);
    } catch (err: unknown) {
      console.error('Signup error:', err);
      setSignupError(err instanceof Error ? err.message : 'Erro ao criar conta.');
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
                        <button onClick={handleGeneratePayment} disabled={signupLoading} className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
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
                      <button onClick={handleConfirmPayment} disabled={signupLoading} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                        {signupLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                        {signupLoading ? 'Verificando pagamento...' : 'Já realizei o pagamento'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {signupError && signupStep === 4 && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 mt-3">{signupError}</div>}

              <div className="mt-4 text-center">
                <button onClick={onLoginClick} className="text-sm text-cyan-600 font-medium hover:underline">
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
