import React from 'react';
import { 
  Sparkles, 
  ChevronRight, 
  CheckCircle2, 
  Zap, 
  Shield, 
  Users, 
  BarChart3,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface LandingPageProps {
  onLoginClick: () => void;
}

export function LandingPage({ onLoginClick }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-cyan-100 selection:text-cyan-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-200">L</div>
            <span className="font-black text-2xl tracking-tighter text-slate-900">LuminaFlow</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
            <a href="#features" className="hover:text-cyan-600 transition-colors">Funcionalidades</a>
            <a href="#ia" className="hover:text-cyan-600 transition-colors">Inteligência Artificial</a>
            <a href="#pricing" className="hover:text-cyan-600 transition-colors">Preços</a>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={onLoginClick}
              className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Entrar
            </button>
            <button 
              onClick={onLoginClick}
              className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-full hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              Começar Grátis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-50 text-cyan-700 rounded-full text-sm font-bold mb-8"
          >
            <Sparkles className="w-4 h-4" />
            A nova era da gestão odontológica chegou
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 mb-8 leading-[0.9]"
          >
            Do agendamento ao glow.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">Gestão inteligente</span> para clínicas de odontologia e estética.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg text-slate-500 mb-12 font-medium"
          >
            Elimine o caos administrativo, automatize decisões com IA e foque no que realmente importa: o sorriso dos seus pacientes.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button 
              onClick={onLoginClick}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-cyan-200 flex items-center justify-center gap-2 group"
            >
              Testar 14 dias grátis
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
              className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
            >
              Ver demonstração
            </button>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-20 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10" />
            <div className="bg-slate-900 rounded-[2rem] p-4 shadow-2xl overflow-hidden border-8 border-slate-800">
              <img 
                src="https://picsum.photos/seed/dashboard/1600/900" 
                alt="Dashboard Preview" 
                className="w-full rounded-2xl opacity-80"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 mb-4">Tudo o que sua clínica precisa</h2>
            <p className="text-slate-500 font-medium">Uma plataforma completa, integrada e absurdamente fácil de usar.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Agenda Inteligente', desc: 'Reduza faltas em até 40% com confirmações automáticas via WhatsApp.', icon: Zap },
              { title: 'Prontuário Digital', desc: 'Histórico completo, fotos e evolução clínica em um só lugar.', icon: Shield },
              { title: 'Financeiro Ágil', desc: 'Fluxo de caixa, DRE e emissão de notas fiscais automatizada.', icon: BarChart3 },
              { title: 'Marketing & IA', desc: 'Recupere pacientes inativos e gere conteúdo com inteligência artificial.', icon: Sparkles },
              { title: 'Gestão de Equipe', desc: 'Controle de comissões, metas e permissões de acesso.', icon: Users },
              { title: 'Suporte VIP', desc: 'Atendimento humano e especializado para tirar todas as suas dúvidas.', icon: MessageSquare },
            ].map((feature) => (
              <div key={feature.title} className="bg-white p-8 rounded-3xl border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-from)_0%,_transparent_50%)] from-cyan-500/20" />
          
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white mb-8 relative z-10">
            Pronto para transformar sua clínica?
          </h2>
          <p className="text-slate-400 text-lg mb-12 max-w-2xl mx-auto relative z-10 font-medium">
            Junte-se a mais de 500 clínicas que já usam o LuminaFlow para crescer com inteligência.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <button 
              onClick={onLoginClick}
              className="w-full sm:w-auto px-10 py-5 bg-white text-slate-900 font-black rounded-2xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
            >
              Começar agora
              <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
              className="w-full sm:w-auto px-10 py-5 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 transition-all border border-white/10"
            >
              Falar com consultor
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold">L</div>
            <span className="font-black text-xl tracking-tighter text-slate-900">LuminaFlow</span>
          </div>
          <p className="text-slate-400 text-sm font-medium">© 2025 LuminaFlow. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6 text-sm font-bold text-slate-400">
            <a href="#" className="hover:text-slate-900">Termos</a>
            <a href="#" className="hover:text-slate-900">Privacidade</a>
            <a href="#" className="hover:text-slate-900">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
