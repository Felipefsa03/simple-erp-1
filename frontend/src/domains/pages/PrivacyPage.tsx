import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, Lock, Mail, Server } from 'lucide-react';

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gradient-to-r from-brand-600 to-brand-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Voltar para página inicial
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Política de Privacidade</h1>
          <p className="text-xl text-white/90">Proteção de Dados para Clínicas e Pacientes - Última atualização: Maio de 2026</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-8 text-justify">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">1. Introdução e Definições Jurídicas</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            A <strong>Clinxia</strong> ("Nós", "A Plataforma", "O Sistema") tem como pilar inegociável a privacidade e a proteção rigorosa 
            dos dados confiados ao nosso software SaaS B2B. A presente Política de Privacidade estabelece e rege as diretrizes 
            de como ocorre a coleta, uso, compartilhamento e eliminação de informações pessoais e médicas, estando em estrita conformidade com a 
            <strong>Lei Geral de Proteção de Dados do Brasil (LGPD - Lei nº 13.709/2018)</strong> e demais normativas vigentes.
          </p>
          <p className="text-slate-600 leading-relaxed font-medium">
            Entende-se por "Controlador" a Clínica, o Consultório ou o Profissional (nosso Cliente) que usa a Clinxia, os quais definem a finalidade do uso de dados de seus pacientes. 
            Nós, enquanto Clinxia, atuamos primariamente na figura de "Operador", ofertando apenas a infraestrutura tecnológica para abrigar e processar tais dados de maneira segura e automatizada.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">2. Coleta de Dados Pessoais e Sensíveis</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            A Clinxia, na qualidade de plataforma de gestão e através dos inputs gerados pelos Usuários/Clínicas, armazena as seguintes categorias de informações em servidores em nuvem de alta segurança:
          </p>
          <div className="space-y-4">
            {[
              { title: 'Dados do Controlador (Clínicas e Profissionais):', desc: 'Nome, CPF/CNPJ, Registro Profissional (CRO/CRM), E-mail, Telefones e Endereços Físicos para faturamento, identificação da licença e prevenção à fraude.' },
              { title: 'Dados dos Pacientes (Geridos pela Clínica):', desc: 'Nome, E-mail, Telefone, CPF e Endereço inseridos pelo estabelecimento.' },
              { title: 'Dados Sensíveis e Prontuários Médicos:', desc: 'Anamnese detalhada, odontogramas, evolução clínica, laudos, queixas e tratamentos de saúde.' },
              { title: 'Dados Financeiros e Metadados:', desc: 'Histórico de consultas, pagamentos, orçamentos transacionados via integradores (Asaas/Mercado Pago), endereços IP, cookies de sessão e logs de auditoria técnica de acesso.' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">3. Finalidade e Utilização dos Dados</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Asseguramos que em nenhuma hipótese vendemos, alugamos, comercializamos ou realizamos mineração arbitrária (data-mining) das informações 
            sensíveis de saúde depositadas na Plataforma. O uso restringe-se exclusivamente aos seguintes propósitos:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li>Fornecer, manter e otimizar as funcionalidades do SaaS contratado pelo Cliente;</li>
            <li>Possibilitar a comunicação entre as Clínicas e os Pacientes (e.g. envio de lembretes e links de pagamento via WhatsApp/Email);</li>
            <li>Garantir a integridade financeira e de auditoria da conta mediante processamento em gateways;</li>
            <li>Emitir relatórios gerenciais criptografados aos quais apenas a Clínica possui a chave de acesso e decodificação analítica;</li>
            <li>Cooperar por ofício judicial válido caso haja requisição oficial decorrente de investigações legais.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">4. Segurança da Informação e Padrão Tecnológico</h2>
          <div className="flex items-start gap-3">
            <Lock className="w-6 h-6 text-brand-600 mt-0.5 flex-shrink-0" />
            <p className="text-slate-600 leading-relaxed">
              O banco de dados da Clinxia é hospedado em provedores de nuvem certificados (ex: AWS, Supabase, Google Cloud), que atendem padrões 
              ISO e SOC 2. O tráfego de toda a aplicação é encriptado via TLS (Transport Layer Security - HTTPS) nas transações de ponta a ponta.
              As senhas são protegidas por algoritmos de hashing irreversíveis (e.g. Bcrypt). Ademais, implementamos firewalls de proteção (Rate Limiting e detecção de ataques de força-bruta) para bloquear 
              tentativas não autorizadas de vazamento de prontuários.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">5. Compartilhamento Mínimo e APIs Terceiras</h2>
          <div className="flex items-start gap-3 mb-4">
            <Server className="w-6 h-6 text-brand-600 mt-0.5 flex-shrink-0" />
            <p className="text-slate-600 leading-relaxed">
              Para a execução correta da plataforma tecnológica, a Clinxia estabelece conexão apenas com sistemas terceiros (Suboperadores) indispensáveis, sendo eles: 
              Processadores Financeiros (como <strong>Asaas</strong>, para geração de boletos, pix ou assinaturas via cartão) e 
              Serviços de Mensageria (API Cloud WhatsApp para envio de notificações automatizadas). O compartilhamento é contido à estrita finalidade de funcionamento da funcionalidade ativada pelo próprio Controlador (Clínica).
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">6. Exercício dos Direitos dos Titulares (Pacientes)</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            A LGPD outorga ao paciente titular (dono do dado) direitos fundamentais. A Clinxia proverá total assistência às Clínicas 
            na execução destes direitos. Sendo o paciente de uma Clínica usuária, qualquer requerimento de Anonimização, Exportação ou 
            Exclusão Definitiva ("Direito ao Esquecimento") deve ser reportado primeiramente à Clínica, que possui as ferramentas no painel 
            para apagar os registros permanentemente, ressalvada a retenção médica obrigatória prevista pelas Portarias do Ministério da Saúde e Conselhos (CRO/CRM).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">7. Tratamento Legal da Empresa em Organização</h2>
          <p className="text-slate-600 leading-relaxed">
            Até o estabelecimento formal da personalidade jurídica definitiva (constituição ou inscrição de CNPJ específico da Clinxia), a 
            propriedade, guarda, direitos e prerrogativas desta Política de Privacidade pertencem inteiramente aos seus desenvolvedores 
            e criadores principais ("Titulares Legais"), permanecendo válidas e imutáveis todas as cláusulas protetivas contra cópia, exploração de vulnerabilidades, danos morais ou materiais.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">8. Alterações a esta Política</h2>
          <p className="text-slate-600 leading-relaxed">
            As disposições aqui pactuadas podem sofrer readequações a qualquer momento, visando o aperfeiçoamento da segurança ou adequação a novas resoluções da ANPD. As Clínicas cadastradas serão devidamente alertadas sobre revisões estruturais no momento do login.
          </p>
        </section>

        <section className="pt-6 border-t border-slate-100 flex flex-col items-center justify-center text-center">
          <Mail className="w-8 h-8 text-brand-600 mb-3" />
          <p className="text-slate-600 font-medium">
            Em caso de dúvidas, relatórios de violação de dados, vulnerabilidades ou requisições formais ligadas à Privacidade, o nosso Encarregado de Proteção de Dados (DPO) atende através do e-mail:
          </p>
          <p className="text-lg font-bold text-slate-900 mt-2">
            privacidade@clinxia.com.br
          </p>
        </section>
      </main>
    </div>
  );
}