import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { ToastProvider, ErrorBoundary } from '@/components/shared';
import { useAuth } from '@/hooks/useAuth';

interface LoginPageProps {
  onForgotPassword: () => void;
  onSignup: () => void;
  onBackToLanding: () => void;
}

export function LoginPage({ onForgotPassword, onSignup, onBackToLanding }: LoginPageProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

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

  return (
    <ToastProvider>
      <ErrorBoundary key="login-page">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-xl shadow-cyan-200/50">
                <span className="text-2xl font-black">C</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Clinxia</h1>
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
                <button onClick={onForgotPassword} className="text-sm text-cyan-600 font-medium hover:underline">
                  Esqueceu sua senha?
                </button>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button onClick={onSignup} className="text-sm text-cyan-600 font-bold hover:underline">
                  Criar conta
                </button>
                <button onClick={onBackToLanding} className="text-sm text-slate-500 font-medium hover:text-slate-700">
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
