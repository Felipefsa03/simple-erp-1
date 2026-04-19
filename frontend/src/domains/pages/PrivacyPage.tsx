import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, Lock, Mail, Trash2 } from 'lucide-react';

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Voltar para página inicial
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Política de Privacidade</h1>
          <p className="text-xl text-white/90">Última atualização: 19 de Abril de 2026</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-8">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">1. Introdução</h2>
          <p className="text-slate-600 leading-relaxed">
            A Clinxia está comprometida com a proteção de seus dados pessoais. Esta Política de Privacidade descreve como coletamos, 
            usamos, armazenamos e protegemos suas informações em conformidade com a LGPD (Lei Geral de Proteção de Dados - Lei nº 13.709/2018).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">2. Dados que Coletamos</h2>
          <div className="space-y-4">
            {[
              { title: 'Dados de Cadastro', desc: 'Nome, email, telefone, CPF/CNPJ' },
              { title: 'Dados da Clínica', desc: 'Nome da clínica, endereço, razões sociais' },
              { title: 'Dados de Pacientes', desc: 'Informações de prontuário eletrônico' },
              { title: 'Dados Financeiros', desc: 'Transações, faturas, pagamentos' },
              { title: 'Dados de Uso', desc: 'como você interage com nossa plataforma' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-cyan-600 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">3. Como Usamos seus Dados</h2>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li>Fornecer e manter nossos serviços</li>
            <li>Personalizar sua experiência</li>
            <li>Processar pagamentos</li>
            <li>Enviar comunicações sobre sua conta</li>
            <li>Cumprir obrigações legais</li>
            <li>Melhorar nossos serviços</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">4. Compartilhamento de Dados</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Não vendemos seus dados pessoais. Compartilhamos apenas quando necessário para:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li>Parceiros de pagamento (Mercado Pago, Asaas)</li>
            <li>Prestadores de serviços que nos ajudam a operar</li>
            <li>Autoridades legais, quando exigido por lei</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">5. Segurança</h2>
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-cyan-600 mt-0.5" />
            <p className="text-slate-600 leading-relaxed">
              Utilizamos medidas de segurança técnicas e organizacionais para proteger seus dados, incluindo criptografia TLS/SSL, 
              senhas hasheadas com bcrypt e controles de acesso rigorosos.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">6. Seus Direitos (LGPD)</h2>
          <p className="text-slate-600 leading-relaxed mb-4">Você tem direito a:</p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li><strong>Confirmação</strong>: Saber se tratamos seus dados</li>
            <li><strong>Acesso</strong>: Solicitar cópia de seus dados</li>
            <li><strong>Correção</strong>:Solicitar correção de dados incorretos</li>
            <li><strong>Anonimização</strong>:Solicitar anonimização de dados</li>
            <li><strong>Exclusão</strong>: Solicitar exclusão de dados</li>
            <li><strong>Portabilidade</strong>: Receber seus dados em formato legível</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">7. Retenção de Dados</h2>
          <p className="text-slate-600 leading-relaxed">
            Mantemos seus dados pelo tempo necessário para fornecer os serviços e cumprir obrigações legais. Dados de pacientes são mantidos conforme 
            legislação sanitária aplicável (mínimo 20 anos).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">8. Contato - DPO</h2>
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-cyan-600" />
            <p className="text-slate-600">
              Para exercer seus direitos ou tir dúvidas sobre privacidade: <strong>privacidade@clinxia.com.br</strong>
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">9.Cookies</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Utilizamos cookies para melhorar sua experiência. Você pode controlar cookies através das configurações do navegador.
          </p>
          <Link to="/cookies" className="text-cyan-600 hover:underline">Ver Política de Cookies</Link>
        </section>
      </main>
    </div>
  );
}