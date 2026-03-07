import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, CheckCircle2, Calendar, FileText, DollarSign, Users, Shield, MessageSquare, Menu, X, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import agendaImage from '@/assets/agenda-inteligente.svg';
import prontuarioImage from '@/assets/prontuario-eletronico.svg';
import financeiroImage from '@/assets/financeiro-lucrar.svg';
import avatarCarolina from '@/assets/avatar-carolina.svg';
import avatarRoberto from '@/assets/avatar-roberto.svg';
import avatarJulia from '@/assets/avatar-julia.svg';

// Features data for the interactive tabs
const features = [
  {
    id: 'agenda',
    title: 'Agenda Inteligente',
    icon: Calendar,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    description: 'Gestão de horários fluida com confirmação via WhatsApp. Reduza faltas em até 40% com lembretes automáticos.',
    image: agendaImage
  },
  {
    id: 'prontuario',
    title: 'Prontuário Eletrônico',
    icon: FileText,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    description: 'Odontograma interativo, anamnese completa e evolução clínica detalhada com assinaturas digitais.',
    image: prontuarioImage
  },
  {
    id: 'financeiro',
    title: 'Feito para Lucrar',
    icon: DollarSign,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50',
    description: 'Boleto, Pix e Cartão integrados. Visualize seu fluxo de caixa e DRE em tempo real sem planilhas complexas.',
    image: financeiroImage
  }
];

interface LandingPageProps {
  onLoginClick: () => void;
}

export function LandingPage({ onLoginClick }: LandingPageProps) {
  const [activeTab, setActiveTab] = useState(features[0].id);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-cyan-500 selection:text-white overflow-x-hidden">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-200">
              L
            </div>
            <span className="font-bold text-2xl tracking-tighter text-slate-900 hidden sm:block">LuminaFlow</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-cyan-600 transition-colors">Funcionalidades</a>
            <a href="#depoimentos" className="hover:text-cyan-600 transition-colors">Depoimentos</a>
            <a href="#planos" className="hover:text-cyan-600 transition-colors">Planos</a>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={onLoginClick} className="hidden sm:block px-5 py-2.5 text-slate-600 hover:text-slate-900 font-bold transition-all">
              Entrar
            </button>
            <button onClick={onLoginClick} className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all hover:shadow-xl hover:-translate-y-0.5 transform">
              Teste Grátis
            </button>
            <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-6 h-6 text-slate-900" /> : <Menu className="w-6 h-6 text-slate-900" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 lg:pt-48 pb-20 lg:pb-32 px-6 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[600px] h-[600px] bg-cyan-200/40 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-3xl opacity-50 pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-full text-xs font-bold mb-6 border border-slate-200 shadow-sm">
              <Sparkles className="w-4 h-4 text-amber-500" /> O software 100% focado em conversão
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tighter leading-[1.1] mb-6">
              Organize sua clínica e <span className="bg-gradient-to-r from-cyan-600 to-blue-600 text-transparent bg-clip-text">aumente seu lucro.</span>
            </h1>
            <p className="text-lg text-slate-500 mb-8 max-w-lg leading-relaxed">
              O LuminaFlow é o ERP completo para clínicas modernas. Mais tempo para seus pacientes, mais controle sobre sua receita. Sem complicações.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button onClick={onLoginClick} className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-2xl hover:opacity-90 shadow-xl shadow-cyan-200/50 flex items-center justify-center gap-2 text-lg transition-transform hover:-translate-y-1">
                Começar Teste de 7 Dias <ArrowRight className="w-5 h-5" />
              </button>
              <button onClick={onLoginClick} className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 font-bold rounded-2xl hover:bg-slate-50 border border-slate-200 transition-all flex items-center justify-center gap-2 text-lg">
                <PlayCircle className="w-5 h-5 text-slate-400" /> Ver Demonstração
              </button>
            </div>

            <div className="mt-10 flex items-center gap-4 text-sm text-slate-500">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <img key={i} src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" className="w-10 h-10 rounded-full border-2 border-slate-50 relative z-10" />
                ))}
              </div>
              <p>Mais de <strong>2.000 clínicas</strong> usam e aprovam.</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative lg:h-[600px] flex items-center justify-center"
          >
            {/* Dashboard Mockup */}
            <div className="relative w-full aspect-[4/3] bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden z-20">
              <div className="h-10 border-b border-slate-100 flex items-center px-4 gap-2 bg-slate-50/50">
                <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-amber-400" /><div className="w-3 h-3 rounded-full bg-emerald-400" /></div>
              </div>
              <div className="p-6 h-full bg-slate-50/30">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-1/3 h-6 bg-slate-200 rounded-lg animate-pulse" />
                  <div className="w-1/4 h-8 bg-cyan-100 rounded-xl animate-pulse" />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="h-24 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col justify-between">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100" />
                    <div className="w-1/2 h-4 bg-slate-200 rounded animate-pulse" />
                  </div>
                  <div className="h-24 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col justify-between">
                    <div className="w-8 h-8 rounded-lg bg-cyan-100" />
                    <div className="w-1/2 h-4 bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-40 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                  <div className="w-full h-8 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="w-5/6 h-8 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="w-4/6 h-8 bg-slate-100 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>

            {/* Floating Element 1 */}
            <motion.div
              animate={{ y: [-10, 10, -10] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -right-6 top-1/4 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 z-30 hidden md:block"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase">Pix Recebido</p>
                  <p className="text-sm font-black text-slate-900">+ R$ 850,00</p>
                </div>
              </div>
            </motion.div>

            {/* Floating Element 2 */}
            <motion.div
              animate={{ y: [10, -10, 10] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className="absolute -left-6 bottom-1/4 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 z-30 hidden md:block"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase">Consulta Confirmada</p>
                  <p className="text-sm font-black text-slate-900">Dr. Lucas • 14:00</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Interactive Features */}
      <section id="features" className="py-24 px-6 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">Um sistema. Todas as soluções.</h2>
            <p className="text-slate-500 text-lg">Pare de usar 5 planilhas e 3 softwares diferentes. Nós unificamos a gestão do seu negócio.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-4">
              {features.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => setActiveTab(feature.id)}
                  className={cn(
                    "w-full text-left p-6 rounded-3xl transition-all duration-300 border-2",
                    activeTab === feature.id
                      ? `border-cyan-500 bg-white shadow-xl shadow-cyan-100`
                      : `border-transparent hover:bg-slate-50`
                  )}
                >
                  <div className="flex gap-4">
                    <div className={cn("w-12 h-12 rounded-2xl flex flex-shrink-0 items-center justify-center", feature.bgColor, feature.color)}>
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
                      <p className={cn("text-slate-500 transition-all duration-300", activeTab === feature.id ? "opacity-100" : "opacity-0 h-0 overflow-hidden")}>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="lg:col-span-7">
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-slate-100">
                <AnimatePresence mode="wait">
                  {features.map((feature) => (
                    feature.id === activeTab && (
                      <motion.img
                        key={feature.id}
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        src={feature.image}
                        alt={feature.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section id="depoimentos" className="py-24 px-6 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <h2 className="text-4xl font-black mb-16 tracking-tighter">Quem usa, indica.</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Dra. Carolina Mendes", role: "Clínica Sorriso Premium", quote: "O módulo financeiro com o Asaas integrado mudou nossa vida. Zero inadimplência e muito mais clareza.", avatar: avatarCarolina },
              { name: "Dr. Roberto Alves", role: "Alves Odonto", quote: "Antes eu perdia horas montando prontuários de papel. Agora em 2 cliques eu acesso o odontograma e as fotos.", avatar: avatarRoberto },
              { name: "Julia Santos", role: "Gestora, Estética Avançada", quote: "As campanhas de marketing automatizadas do LuminaFlow trouxeram de volta 40 pacientes inativos só no último mês!", avatar: avatarJulia }
            ].map((testimonial, i) => (
              <motion.div key={i} whileHover={{ y: -5 }} className="bg-slate-800 p-8 rounded-3xl border border-slate-700 text-left">
                <div className="flex text-yellow-500 mb-6">
                  {Array.from({ length: 5 }).map((_, j) => <Sparkles key={j} className="w-5 h-5 fill-current" />)}
                </div>
                <p className="text-lg text-slate-300 mb-8">"{testimonial.quote}"</p>
                <div className="flex items-center gap-4">
                  <img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-full object-cover" loading="lazy" />
                  <div>
                    <p className="font-bold text-white">{testimonial.name}</p>
                    <p className="text-sm text-cyan-400">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">Planos simples e transparentes</h2>
            <p className="text-slate-500 text-lg">Sem taxa de adesão ou fidelidade. Escale junto com a sua clínica.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { name: 'Basic', price: '197', desc: 'Para consultórios individuais.', features: ['Até 2 Profissionais', 'Prontuário Digital', 'Agenda Completa', 'Controle Financeiro Básico'] },
              { name: 'Pro', price: '397', popular: true, desc: 'Para clínicas em crescimento.', features: ['Até 10 Profissionais', 'Integração Asaas Recebimentos', 'Campanhas E-mail & WhatsApp', 'Suporte Prioritário'] },
              { name: 'Ultra', price: '697', desc: 'Para grandes operações.', features: ['Profissionais Ilimitados', 'IA Analítica de Dados', 'Múltiplas Unidades (Filiais)', 'API e Webhooks'] },
            ].map(plan => (
              <div key={plan.name} className={cn("p-8 rounded-3xl bg-white transition-all transform hover:-translate-y-1 hover:shadow-2xl", plan.popular ? "border-2 border-cyan-500 shadow-xl shadow-cyan-100 relative" : "border border-slate-200")}>
                {plan.popular && <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-black text-white bg-cyan-600 px-4 py-1.5 rounded-full uppercase tracking-wider">RECOMENDADO</span>}
                <h3 className="text-2xl font-black text-slate-900">{plan.name}</h3>
                <p className="text-sm text-slate-500 mt-2 h-10">{plan.desc}</p>
                <div className="my-6">
                  <p className="text-5xl font-black text-slate-900">R$ {plan.price}<span className="text-base font-normal text-slate-500">/mês</span></p>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-3 text-slate-700"><CheckCircle2 className="w-5 h-5 text-cyan-500 shrink-0" />{f}</li>
                  ))}
                </ul>
                <button onClick={onLoginClick} className={cn("w-full py-4 text-center font-bold rounded-2xl transition-all", plan.popular ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100")}>
                  Começar Trial de 7 Dias
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 px-6 relative overflow-hidden bg-gradient-to-br from-cyan-600 to-blue-700 flex justify-center text-center">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter">Pronto para digitalizar e escalar?</h2>
          <p className="text-lg text-cyan-100 mb-10 max-w-2xl mx-auto">Junte-se a milhares de clínicas que pararam de perder tempo com tarefas burocráticas e focaram no paciente.</p>
          <button onClick={onLoginClick} className="px-10 py-5 bg-white text-cyan-700 font-bold rounded-2xl hover:scale-105 shadow-2xl transition-all text-xl">
            Criar conta grátis agora
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">L</div>
            <span className="font-bold text-xl tracking-tighter text-white">LuminaFlow</span>
          </div>
          <div className="flex gap-8 text-sm font-medium">
            <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Suporte</a>
          </div>
          <p className="text-sm">© {(new Date()).getFullYear()} LuminaFlow. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
