import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, MessageSquare, Lock, Eye, EyeOff, Check, AlertCircle, Loader2 } from 'lucide-react';
import { cn, uid, formatPhoneForWhatsApp } from '@/lib/utils';
import { toast } from '@/hooks/useShared';
import { useClinicStore } from '@/stores/clinicStore';

interface PasswordResetFlowProps {
  onBack: () => void;
  onSuccess: () => void;
}

type Step = 'email' | 'code' | 'new-password' | 'success';

// Proxy handles routing: Vite dev proxy in dev, Vercel rewrites in production
const API_BASE = '';
const SYSTEM_CLINIC_ID = 'system-global';

// Usuários demo para simulação
const demoUsers: Record<string, { id: string; name: string; phone: string; password: string }> = {
  'clinica@luminaflow.com.br': { id: 'user-1', name: 'Dr. Carlos Lima', phone: '11999990001', password: 'demo123' },
  'recepcao@luminaflow.com.br': { id: 'user-2', name: 'Ana Santos', phone: '11999990002', password: 'demo123' },
  'dentista@luminaflow.com.br': { id: 'user-3', name: 'Dr. Roberto', phone: '11999990003', password: 'demo123' },
  'admin@luminaflow.com.br': { id: 'user-4', name: 'Super Admin', phone: '11999990000', password: 'admin123' },
  'lucas@lumina.com.br': { id: 'user-5', name: 'Dr. Lucas Silva', phone: '5575991517196', password: 'lucas123' },
};

// Armazenamento de códigos de reset (em produção seria no banco de dados)
const resetCodes: Map<string, { code: string; expiresAt: number; attempts: number }> = new Map();
const rateLimits: Map<string, { count: number; resetAt: number }> = new Map();

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return '***';
  const digits = phone.replace(/\D/g, '');
  return `(**) *****-${digits.slice(-4)}`;
}

export function PasswordResetFlow({ onBack, onSuccess }: PasswordResetFlowProps) {
  const systemWhatsApp = useClinicStore(s => s.systemWhatsApp);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [blockedUntil, setBlockedUntil] = useState(0);
  const [codeAttempts, setCodeAttempts] = useState(0);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Verificar bloqueio
  useEffect(() => {
    if (blockedUntil > 0 && Date.now() < blockedUntil) {
      const interval = setInterval(() => {
        if (Date.now() > blockedUntil) {
          setBlockedUntil(0);
          setCodeAttempts(0);
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [blockedUntil]);

  const sendWhatsAppMessage = async (phone: string, message: string): Promise<boolean> => {
    
    try {
      const phoneDigits = formatPhoneForWhatsApp(phone);

      const requestBody = {
        clinicId: SYSTEM_CLINIC_ID,
        to: phoneDigits,
        message: message,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${API_BASE}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (data.ok) {
        if (data.warning) {
          toast(data.warning, 'info');
        }
        return true;
      } else {
        console.error('[PasswordReset] Erro ao enviar:', data.error || data.message);
        toast(`Erro: ${data.error || data.message || 'Não foi possível enviar'}`, 'error');
        return false;
      }
    } catch (err: any) {
      console.error('[PasswordReset] Erro de rede:', err);
      if (err.name === 'AbortError') {
        toast('Timeout: O envio demorou muito. Tente novamente.', 'error');
      } else {
        toast(`Erro de rede: ${err.message}. Verifique se o servidor está rodando.`, 'error');
      }
      return false;
    }
  };

  const sendCode = async (targetEmail: string): Promise<boolean> => {
    
    // Rate limiting
    const rateKey = `rate:${targetEmail}`;
    const rate = rateLimits.get(rateKey);
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    if (rate && now < rate.resetAt) {
      if (rate.count >= 3) {
        setError('Muitas solicitações. Aguarde 10 minutos antes de tentar novamente.');
        return false;
      }
      rate.count++;
    } else {
      rateLimits.set(rateKey, { count: 1, resetAt: now + tenMinutes });
    }

    // Verificar se usuário existe
    const user = demoUsers[targetEmail.toLowerCase()];
    if (!user) {
      // Não revelar se o email existe (segurança)
      toast('Se este email estiver cadastrado, você receberá um código.', 'info');
      setStep('code');
      setTimer(30);
      return true;
    }

    // Gerar código
    const codeGenerated = generateCode();
    resetCodes.set(user.id, { code: codeGenerated, expiresAt: now + 30000, attempts: 0 });

    // Mensagem para enviar
    const message = `🔐 *LuminaFlow - Recuperação de Senha*\n\nSeu código de recuperação de senha é:\n\n*${codeGenerated}*\n\nEste código expira em 30 segundos.\n\nSe você não solicitou esta alteração, ignore esta mensagem.`;

    // Enviar via WhatsApp
    const sent = await sendWhatsAppMessage(user.phone, message);

    if (!sent) {
      setError('Não foi possível enviar o código via WhatsApp. Verifique a conexão e tente novamente.');
      return false;
    }

    setCurrentUserId(user.id);
    setCurrentUserEmail(targetEmail);
    setMaskedPhone(maskPhone(user.phone));
    setStep('code');
    setTimer(30);
    setCodeAttempts(0);
    setBlockedUntil(0);
    setError('');

    toast(`Código enviado para ${maskPhone(user.phone)}`, 'success');
    return true;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Por favor, insira seu email.');
      return;
    }

    setLoading(true);
    await sendCode(email);
    setLoading(false);
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit quando completo
    if (newCode.every(d => d !== '') && index === 5) {
      verifyCode(newCode.join(''));
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split('');
      setCode(newCode);
      codeInputRefs.current[5]?.focus();
      verifyCode(pasted);
    }
  };

  const verifyCode = async (codeStr: string) => {
    // Verificar bloqueio
    if (blockedUntil > 0 && Date.now() < blockedUntil) {
      const secondsLeft = Math.ceil((blockedUntil - Date.now()) / 1000);
      setError(`Bloqueado. Aguarde ${secondsLeft} segundos.`);
      return;
    }

    const resetCode = resetCodes.get(currentUserId);
    if (!resetCode) {
      setError('Código não encontrado. Solicite um novo código.');
      return;
    }

    // Verificar expiração
    if (Date.now() > resetCode.expiresAt) {
      setError('Código expirado. Clique em "Reenviar código".');
      return;
    }

    // Verificar código
    if (codeStr !== resetCode.code) {
      const newAttempts = codeAttempts + 1;
      setCodeAttempts(newAttempts);

      if (newAttempts >= 3) {
        setBlockedUntil(Date.now() + 60000); // 1 minuto
        setError('Muitas tentativas incorretas. Bloqueado por 60 segundos.');
      } else {
        setError(`Código incorreto. ${3 - newAttempts} tentativa(s) restante(s).`);
      }
      return;
    }

    // Código correto
    resetCode.attempts = 0;
    setStep('new-password');
    setError('');
    toast('Código verificado com sucesso!', 'success');
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeStr = code.join('');
    if (codeStr.length !== 6) {
      setError('Digite o código completo de 6 dígitos.');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    await verifyCode(codeStr);
    setLoading(false);
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError('');
    setCode(['', '', '', '', '', '']);
    setCodeAttempts(0);
    setBlockedUntil(0);
    await sendCode(currentUserEmail || email);
    setLoading(false);
    codeInputRefs.current[0]?.focus();
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError('A senha deve conter pelo menos 1 letra maiúscula.');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setError('A senha deve conter pelo menos 1 número.');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      setError('A senha deve conter pelo menos 1 caractere especial (!@#$%&*).');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));

    // Em produção: UPDATE users SET password = bcrypt.hash(newPassword) WHERE id = ?
    // Atualizar a senha do usuário demo
    if (currentUserId && currentUserEmail) {
      const user = demoUsers[currentUserEmail.toLowerCase()];
      if (user) {
        user.password = newPassword;
      }
      // Armazenar senha atualizada no localStorage para uso no login
      try {
        const stored = localStorage.getItem('luminaflow-reset-passwords');
        const passwords = stored ? JSON.parse(stored) : {};
        passwords[currentUserEmail.toLowerCase()] = newPassword;
        localStorage.setItem('luminaflow-reset-passwords', JSON.stringify(passwords));
      } catch (err) {
        console.error('[PasswordReset] Erro ao salvar senha:', err);
      }
    }

    // Limpar código usado
    resetCodes.delete(currentUserId);

    setLoading(false);
    setStep('success');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-xl shadow-cyan-200/50">
            <span className="text-2xl font-black">L</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {step === 'email' && 'Recuperar Senha'}
            {step === 'code' && 'Verificação de Segurança'}
            {step === 'new-password' && 'Criar Nova Senha'}
            {step === 'success' && 'Senha Redefinida!'}
          </h1>
          <p className="text-slate-500 mt-1">
            {step === 'email' && 'Digite seu e-mail cadastrado para receber o código.'}
            {step === 'code' && `Enviamos um código para seu WhatsApp ${maskedPhone}.`}
            {step === 'new-password' && 'Escolha uma nova senha segura para sua conta.'}
            {step === 'success' && 'Sua senha foi alterada com sucesso.'}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          {/* Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">E-mail cadastrado</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all outline-none"
                  required
                />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <MessageSquare className="w-5 h-5" />
                )}
                {loading ? 'Enviando...' : 'Enviar código via WhatsApp'}
              </button>
            </form>
          )}

          {/* Step 2: Código */}
          {step === 'code' && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="flex justify-center gap-3" onPaste={handleCodePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { codeInputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleCodeChange(i, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(i, e)}
                    className={cn(
                      "w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all",
                      digit ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-slate-200 focus:border-cyan-400",
                      error && "border-red-300 bg-red-50"
                    )}
                    disabled={blockedUntil > 0 && Date.now() < blockedUntil}
                  />
                ))}
              </div>

              {timer > 0 && (
                <div className="text-center">
                  <p className="text-sm text-slate-500">Tempo restante</p>
                  <p className={cn(
                    "text-2xl font-bold tabular-nums",
                    timer <= 10 ? "text-red-500" : "text-slate-700"
                  )}>
                    {formatTime(timer)}
                  </p>
                </div>
              )}

              {timer === 0 && (
                <div className="text-center">
                  <p className="text-sm text-yellow-600 mb-2">O código expirou.</p>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-cyan-600 font-bold hover:underline text-sm"
                  >
                    {loading ? 'Reenviando...' : 'Reenviar código'}
                  </button>
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.some(d => !d) || (blockedUntil > 0 && Date.now() < blockedUntil)}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : null}
                {loading ? 'Verificando...' : 'Verificar código'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('email'); setError(''); setCode(['', '', '', '', '', '']); }}
                className="w-full text-sm text-slate-500 hover:text-slate-700 text-center"
              >
                Voltar para inserir email
              </button>
            </form>
          )}

          {/* Step 3: Nova Senha */}
          {step === 'new-password' && (
            <form onSubmit={handleNewPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nova senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setError(''); }}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all outline-none pr-12"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Confirmar nova senha</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="Repita a senha"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all outline-none pr-12"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 space-y-1">
                <p className="text-xs font-semibold text-slate-600 mb-2">Requisitos da senha:</p>
                {[
                  { check: newPassword.length >= 8, text: 'Mínimo 8 caracteres' },
                  { check: /[A-Z]/.test(newPassword), text: '1 letra maiúscula' },
                  { check: /[0-9]/.test(newPassword), text: '1 número' },
                  { check: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword), text: '1 caractere especial' },
                  { check: newPassword && confirmPassword && newPassword === confirmPassword, text: 'Senhas coincidem' },
                ].map((req, i) => (
                  <div key={i} className={cn("flex items-center gap-2 text-xs", req.check ? "text-emerald-600" : "text-slate-400")}>
                    <Check className={cn("w-3 h-3", req.check ? "opacity-100" : "opacity-30")} />
                    {req.text}
                  </div>
                ))}
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          )}

          {/* Step 4: Sucesso */}
          {step === 'success' && (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Senha redefinida com sucesso!</h2>
              <p className="text-slate-500 text-sm mb-6">Você já pode fazer login com sua nova senha.</p>
              <button
                onClick={onSuccess}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                Ir para login
              </button>
            </div>
          )}

          {/* Footer */}
          {step !== 'success' && (
            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <button onClick={onBack} className="text-sm text-slate-500 font-medium hover:text-slate-700 flex items-center gap-1 mx-auto">
                <ArrowLeft className="w-4 h-4" />
                Voltar para o login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
