import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Shield } from "lucide-react";
import { ToastProvider, ErrorBoundary, Logo } from "@/components/shared";
import { useAuth } from "@/hooks/useAuth";

interface LoginPageProps {
  onForgotPassword: () => void;
  onSignup: () => void;
  onBackToLanding: () => void;
}

export function LoginPage({
  onForgotPassword,
  onSignup,
  onBackToLanding,
}: LoginPageProps) {
  const { login, twoFARequired, confirm2FALogin, cancelTwoFA } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [twoFACode, setTwoFACode] = useState("");
  const [twoFAError, setTwoFAError] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    const result = await login(email, password);
    setLoginLoading(false);
    if (result === "need_2fa") {
      // Não fazer nada — o estado twoFARequired vai mostrar o modal
      return;
    }
    if (!result) {
      setLoginError(
        "Email ou senha incorretos. Verifique os dados e tente novamente.",
      );
    } else {
      const callbackUrl = searchParams.get("callbackUrl");
      navigate(callbackUrl || "/dashboard");
    }
  };

  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFACode.length !== 6) {
      setTwoFAError("Digite o código de 6 dígitos");
      return;
    }
    setTwoFALoading(true);
    setTwoFAError("");
    const ok = await confirm2FALogin(twoFACode);
    setTwoFALoading(false);
    if (ok) {
      const callbackUrl = searchParams.get("callbackUrl");
      navigate(callbackUrl || "/dashboard");
    } else {
      setTwoFAError("Código inválido ou expirado. Tente novamente.");
      setTwoFACode("");
    }
  };

  const twoFACard = (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
      <div className="flex flex-col items-center mb-6">
        <div className="w-14 h-14 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-brand-200/50">
          <Shield className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">
          Verificação em Dois Fatores
        </h2>
        <p className="text-slate-500 text-sm mt-1 text-center">
          Digite o código de 6 dígitos do seu aplicativo autenticador
        </p>
      </div>

      <form onSubmit={handleConfirm2FA} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Código de verificação
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={twoFACode}
            onChange={(e) => {
              setTwoFACode(e.target.value.replace(/\D/g, ""));
              setTwoFAError("");
            }}
            placeholder="000000"
            autoComplete="one-time-code"
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none text-center text-2xl tracking-widest font-mono"
          />
        </div>

        {twoFAError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
            {twoFAError}
          </div>
        )}

        <button
          type="submit"
          disabled={twoFALoading || twoFACode.length !== 6}
          className="w-full py-3 bg-gradient-to-r from-brand-600 to-brand-600 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {twoFALoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : null}
          {twoFALoading ? "Verificando..." : "Verificar"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={() => {
            cancelTwoFA();
            setTwoFACode("");
            setTwoFAError("");
          }}
          className="text-sm text-slate-500 font-medium hover:text-slate-700 hover:underline transition-colors"
        >
          Cancelar e voltar ao login
        </button>
      </div>
    </div>
  );

  const loginCard = (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setLoginError("");
            }}
            placeholder="seu@email.com"
            autoComplete="email"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Senha
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setLoginError("");
              }}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        {loginError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
            {loginError}
          </div>
        )}
        <button
          type="submit"
          disabled={loginLoading}
          className="w-full py-3 bg-gradient-to-r from-brand-600 to-brand-600 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {loginLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : null}
          {loginLoading ? "Entrando..." : "Entrar no Sistema"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={onForgotPassword}
          className="text-sm text-brand-600 font-medium hover:underline"
        >
          Esqueceu sua senha?
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={onSignup}
          className="text-sm text-brand-600 font-bold hover:underline"
        >
          Criar conta
        </button>
        <button
          onClick={onBackToLanding}
          className="text-sm text-slate-500 font-medium hover:text-slate-700"
        >
          Voltar para o site
        </button>
      </div>
    </div>
  );

  return (
    <ToastProvider>
      <ErrorBoundary key="login-page">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8 flex flex-col items-center">
              <Logo variant="full" size="xl" className="mb-2" />
              <p className="text-slate-500 mt-1">
                A inteligência que sua clínica precisa para brilhar.
              </p>
            </div>

            {twoFARequired ? twoFACard : loginCard}
          </div>
        </div>
      </ErrorBoundary>
    </ToastProvider>
  );
}
