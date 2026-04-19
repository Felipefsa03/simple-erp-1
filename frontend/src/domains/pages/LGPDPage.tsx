import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Mail, CheckCircle2 } from 'lucide-react';

export function LGPDPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Voltar para página inicial
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">LGPD - Clinxia</h1>
          <p className="text-xl text-white/90">Compromisso com a Lei Geral de Proteção de Dados</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-8">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">O que é a LGPD?</h2>
          <p className="text-slate-600 leading-relaxed">
            A LGPD (Lei Geral de Proteção de Dados - Lei nº 13.709/2018) é a legislação brasileira que regula o tratamento de dados pessoais de pessoas naturais, 
            garantindo direitos aos titulares e estabelecendo obrigações às empresas que processam esses dados.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Como a Clinxia Cumpre a LGPD</h2>
          <div className="space-y-4">
            {[
              { title: 'Base Legal', desc: 'Processamos dados com base em contrato, obrigação legal e consentimento quando necessário' },
              { title: 'Transparência', desc: 'Informamos claramente quais dados coletamos e para qué purpose' },
              { title: 'Minimização', desc: 'Coletamos apenas os dados necessários para nossos serviços' },
              { title: 'Segurança', desc: 'Implementamos medidas técnicas e administrativas para proteger dados' },
              { title: 'Registro', desc: 'Mantemos registro de todas as operações de tratamento' },
              { title: 'Direitos', desc: 'Respeitamos todos os direitos dos titulares de dados' },
            ].map(item => (
              <div key={title} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Dados de Saúde - Categoria Especial</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Dados de saúde são considerados "categorias especiais" pela LGPD e recebem proteção reforçada. No Clinxia:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li>Prontuários são criptografados em repouso e em trânsito</li>
            <li>Apenas profissionais autorizados podem acessar</li>
            <li>Registro de todos os acessos é mantido</li>
            <li>Consentimento específico é obtido quando necessário</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Encarregado de Dados (DPO)</h2>
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-cyan-600" />
            <p className="text-slate-600">
              Nosso Encarregado de Proteção de Dados: <strong>privacidade@clinxia.com.br</strong>
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Seus Direitos</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              'Confirmação da existência de tratamento',
              'Acesso aos dados',
              'Correção de dados incompletos',
              'Anonimização ou bloqueio',
              'Eliminação de dados desnecessários',
              'Portabilidade a outro fornecedor',
              'Revogação do consentimento',
              'Informação sobre compartilhamento',
            ].map(right => (
              <div key={right} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <Shield className="w-4 h-4 text-cyan-600" />
                <span className="text-sm text-slate-700">{right}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Como Exercer seus Direitos</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Para exercer qualquer dos direitos previstos na LGPD, entre em contato conosco:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li>Email: privacidade@clinxia.com.br</li>
            <li>Painel administrativo após login</li>
            <li>Resposta em até 15 dias conforme legislação</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Documentação</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Mantemos os seguintes documentos em conformidade com a LGPD:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li>Registro de operações de tratamento</li>
            <li>Relatório de Impacto à Proteção de Dados (RIPD)</li>
            <li>Políticas internas de privacidade</li>
            <li>Contratos de processamento de dados com terceiros</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Violações de Dados</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Em caso de incidente de segurança que possa causar risco ou dano relevante, notifyaremos:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li>A Autoridade Nacional de Proteção de Dados (ANPD) em até 72 horas</li>
            <li>Os titulares afetados em tempo razoável</li>
          </ul>
        </section>

        <section className="bg-cyan-50 rounded-xl p-6">
          <h3 className="font-bold text-slate-900 mb-2">Dúvidas sobre LGPD?</h3>
          <p className="text-slate-600 mb-4">Estamos disponíveis para esclarecer qualquer questão sobreprivacy.</p>
          <Link to="/contato" className="text-cyan-600 font-semibold hover:underline">Fale conosco</Link>
        </section>
      </main>
    </div>
  );
}