import React from 'react';
import { Sparkles, CheckCircle2, ArrowRight, Star, Zap, Shield, BarChart3, Calendar, Users, DollarSign, Package, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface LandingPageProps { onLoginClick: () => void; }

export function LandingPage({ onLoginClick }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">L</div>
            <span className="font-bold text-xl tracking-tighter text-slate-900">LuminaFlow</span>
          </div>
          <button onClick={onLoginClick} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all text-sm">Entrar</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-50 text-cyan-700 rounded-full text-xs font-bold mb-8 border border-cyan-100">
              <Sparkles className="w-3 h-3" />IA + Gestão Clínica em um só lugar
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-tight mb-6">
              A inteligência que sua<br /><span className="bg-gradient-to-r from-cyan-500 to-blue-600 text-transparent bg-clip-text">clínica precisa</span>
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10">
              ERP completo para clínicas de odontologia e estética. Agenda, prontuários, financeiro, estoque e IA — tudo integrado.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button onClick={onLoginClick} className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:opacity-90 shadow-xl shadow-cyan-200/50 flex items-center gap-2">
                Começar Agora <ArrowRight className="w-5 h-5" />
              </button>
              <button className="px-8 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all">Ver Demo</button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Tudo que sua clínica precisa</h2>
            <p className="text-slate-500">Módulos completos que funcionam de ponta a ponta.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Calendar, title: 'Agenda Inteligente', desc: 'Visão dia, semana e mês. Drag & drop. Confirmações automáticas via WhatsApp.' },
              { icon: FileText, title: 'Prontuário Digital', desc: 'Odontograma FDI, anamnese, evolução, plano de tratamento e fotos clínicas.' },
              { icon: DollarSign, title: 'Financeiro Completo', desc: 'Receitas, despesas, DRE automático. Integração Asaas com Pix e Cartão.' },
              { icon: Package, title: 'Gestão de Estoque', desc: 'Controle de insumos com baixa automática por atendimento. Alertas de reposição.' },
              { icon: Users, title: 'Equipe & Comissões', desc: 'Relatório por profissional: receita, ticket médio, taxa de comparecimento e comissão.' },
              { icon: Sparkles, title: 'IA Copilot', desc: 'Insights inteligentes: risco de churn, otimização de agenda, projeção de receita.' },
            ].map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Planos que cabem no seu bolso</h2>
            <p className="text-slate-500">Sem taxa de adesão. Cancele quando quiser.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Basic', price: '197', features: ['5 profissionais', '500 pacientes', 'Agenda + Prontuário', 'Suporte email'] },
              { name: 'Pro', price: '397', popular: true, features: ['15 profissionais', 'Pacientes ilimitados', 'Financeiro completo', 'Integração Asaas', 'Suporte prioritário'] },
              { name: 'Ultra', price: '697', features: ['Profissionais ilimitados', 'Pacientes ilimitados', 'IA Copilot', 'Multi-clínica', 'API completa', 'SLA 99.9%'] },
            ].map(plan => (
              <div key={plan.name} className={cn("p-8 rounded-3xl border-2 transition-all", plan.popular ? "border-cyan-500 shadow-xl shadow-cyan-100 relative" : "border-slate-100")}>
                {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-cyan-600 px-3 py-1 rounded-full">MAIS POPULAR</span>}
                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                <p className="text-4xl font-black text-slate-900 mt-4 mb-6">R$ {plan.price}<span className="text-sm font-normal text-slate-400">/mês</span></p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-cyan-500" />{f}</li>
                  ))}
                </ul>
                <button onClick={onLoginClick} className={cn("w-full py-3 font-bold rounded-xl transition-all", plan.popular ? "bg-cyan-600 text-white hover:bg-cyan-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}>
                  Começar Agora
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">L</div>
            <span className="font-bold text-xl tracking-tighter">LuminaFlow</span>
          </div>
          <p className="text-slate-400 text-sm mb-6">A inteligência que sua clínica precisa para brilhar.</p>
          <p className="text-xs text-slate-600">© 2026 LuminaFlow. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
