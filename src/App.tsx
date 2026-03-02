/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
import { useAuth } from './hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Sparkles, Menu, AlertCircle } from 'lucide-react';

export default function App() {
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [email, setEmail] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

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
      setActiveTab('admin-dashboard');
    } else if (user) {
      setActiveTab('dashboard');
    }
  }, [user]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={setActiveTab} />;
      case 'pacientes': return <PatientList onNavigate={setActiveTab} />;
      case 'agenda': return <Agenda onNavigate={setActiveTab} />;
      case 'prontuarios': return <Prontuario onNavigate={setActiveTab} />;
      case 'financeiro': return <Financeiro />;
      case 'estoque': return <Estoque />;
      case 'marketing': return <Marketing />;
      case 'configuracoes': return <Configuracoes />;
      case 'admin-dashboard': return <SuperAdminDashboard />;
      case 'admin-clinicas': return <SuperAdminDashboard />;
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

  if (!user) {
    if (!showLogin) {
      return <LandingPage onLoginClick={() => setShowLogin(true)} />;
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center text-white mb-6 shadow-2xl shadow-cyan-200 relative overflow-hidden group">
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] animate-pulse" />
              <div className="absolute -inset-1 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Sparkles className="w-10 h-10 relative z-10" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">LuminaFlow</h1>
            <p className="text-slate-500 mt-3 text-center font-medium">A inteligência que sua clínica precisa para brilhar.</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); login(email); }} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Senha</label>
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all outline-none"
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-cyan-200/50 flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              Entrar no Sistema
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Acesso de Demonstração</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Admin:</span>
                  <code className="text-xs font-bold text-cyan-600">admin@luminaflow.com.br</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Clínica:</span>
                  <code className="text-xs font-bold text-blue-600">clinica@luminaflow.com.br</code>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-500">
              Ainda não tem uma conta? <button 
                onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
                className="text-cyan-600 font-bold cursor-pointer hover:underline"
              >
                Fale com um consultor
              </button>
            </p>
            <button 
              onClick={() => setShowLogin(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium"
            >
              Voltar para o site
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
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
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
