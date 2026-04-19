import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Code, CheckCircle2, Database, Shield, Clock, Zap } from 'lucide-react';

export function APIPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Voltar para página inicial
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">API Clinxia</h1>
          <p className="text-xl text-white/90">Integre o Clinxia ao seu sistema com nossa API REST completa.</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-16">
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Visão Geral da API</h2>
          <div className="bg-slate-900 rounded-xl p-6 overflow-x-auto">
            <pre className="text-emerald-400 text-sm font-mono">
{`# Exemplo de requisição
curl -X GET "https://api.clinxia.com.br/v1/pacientes" \\
  -H "Authorization: Bearer SU_API_KEY" \\
  -H "Content-Type: application/json"`}
            </pre>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Recursos Disponíveis</h2>
          <div className="space-y-4">
            {[
              { resource: 'Pacientes', description: 'Gestão de cadastro de pacientes' },
              { resource: 'Agendamentos', description: 'Criação e listagem de agendamentos' },
              { resource: 'Financeiro', description: 'Transações e faturas' },
              { resource: 'Prontuários', description: 'Dados clínicos e históricos' },
              { resource: 'Webhooks', description: 'Eventos em tempo real' },
            ].map((item) => (
              <div key={item.resource} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <Code className="w-5 h-5 text-cyan-600" />
                <div>
                  <h3 className="font-bold text-slate-900">{item.resource}</h3>
                  <p className="text-sm text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Planos com Acesso API</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Básico', api: false, price: 'R$ 97/mês' },
              { name: 'Profissional', api: true, price: 'R$ 197/mês', highlighted: true },
              { name: 'Premium', api: true, price: 'R$ 397/mês' },
            ].map((plan) => (
              <div key={plan.name} className={`p-6 rounded-xl border-2 ${plan.highlighted ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200'}`}>
                <h3 className="font-bold text-slate-900 mb-2">{plan.name}</h3>
                <p className="text-2xl font-black text-slate-900 mb-4">{plan.price}</p>
                <div className="flex items-center gap-2 text-sm">
                  {plan.api ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">API incluída</span>
                    </>
                  ) : (
                    <span className="text-slate-500">API não disponível</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Características Técnicas</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Shield, title: 'Autenticação JWT', description: 'Tokens seguros com expiração' },
              { icon: Database, title: 'Rate Limiting', description: '1000 requisições/minuto' },
              { icon: Zap, title: 'Alta Disponibilidade', description: '99.9% de uptime' },
              { icon: Clock, title: 'Suporte 24/7', description: 'Assistência técnica dedicada' },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <item.icon className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center">
          <p className="text-slate-600 mb-4">Pronto para integrar?</p>
          <Link to="/signup" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:shadow-lg transition-all">
            Começar Agora
          </Link>
        </section>
      </main>
    </div>
  );
}