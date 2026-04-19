import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Users, Shield, Heart, Zap, TrendingUp, MessageSquare, Mail, Globe, Phone, MapPin } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Voltar para página inicial
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Sobre a Clinxia</h1>
          <p className="text-xl text-white/90">O sistema de gestão mais completo para clínicas de odontologia e estética do Brasil.</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-16">
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Nossa História</h2>
          <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
            <p className="mb-4">
              Fundada em 2024, a Clinxia nasceu com a missão de transformar a gestão de clínicas de saúde no Brasil. 
              Identificamos que milhares de profissionais enfrentavam desafios diários com fragmentação de ferramentas, 
              planilhas-manuais e processos ineficientes.
            </p>
            <p>
              Desenvolvemos uma solução completa que integra agenda, prontuário eletrônico, financeiro, estoque e 
              comunicação com pacientes em um único sistema intuitivo e poderoso.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Por Que Escolher a Clinxia?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Zap, title: 'Implementação Rápida', description: 'Sua clínica funcionando em até 24 horas após contratação.' },
              { icon: Shield, title: 'Dados Seguros', description: 'Conformidade total com LGPD e criptografia de ponta.' },
              { icon: Heart, title: 'Suporte Dedicado', description: 'Equipe humana sempre pronta para ayudarte.' },
              { icon: TrendingUp, title: 'Resultados Comprovados', description: '40% menos faltas e 25% mais faturamento.' },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center shrink-0">
                  <item.icon className="w-6 h-6 text-cyan-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Nossos Valores</h2>
          <div className="space-y-4">
            {[
              'Inovação constante para simplificar sua gestão',
              'Transparência em todas as relações',
              'Compromisso com a segurança de dados',
              'Foco no sucesso do cliente',
            ].map((value) => (
              <div key={value} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-cyan-600" />
                <span className="text-slate-700">{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Entre em Contato</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-600">
                <Mail className="w-5 h-5 text-cyan-600" />
                <span>contato@clinxia.com.br</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Phone className="w-5 h-5 text-cyan-600" />
                <span>(11) 4000-4000</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <MapPin className="w-5 h-5 text-cyan-600" />
                <span>São Paulo, SP</span>
              </div>
            </div>
            <Link
              to="/contato"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
            >
              <MessageSquare className="w-5 h-5" />
              Fale Conosco
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}