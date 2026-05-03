import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gradient-to-r from-brand-600 to-brand-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Voltar para página inicial
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Termos de Uso e Serviço</h1>
          <p className="text-xl text-white/90">Última atualização: Maio de 2026</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-8 text-justify">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">1. Aceitação dos Termos</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Este Contrato de Termos de Uso ("Termos") regula o acesso e a utilização do sistema SaaS 
            (Software as a Service) denominado <strong>Clinxia</strong> ("Plataforma" ou "Sistema"), bem como 
            seus módulos de gestão de clínicas e consultórios.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Ao criar uma conta, acessar ou utilizar a Plataforma Clinxia de qualquer forma, você ("Usuário" ou "Cliente") declara que 
            compreendeu e concorda expressamente em vincular-se a estes Termos de forma irrevogável e irretratável. 
            Se não concordar com qualquer condição aqui prevista, você não deverá utilizar nossos serviços.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">2. Titularidade e Licenciamento</h2>
          <p className="text-slate-600 leading-relaxed">
            A Clinxia, presentemente representada por seus desenvolvedores e mantenedores diretos ("Licenciante"), outorga 
            ao Cliente uma licença temporária, revogável, não exclusiva e intransferível de uso do software, limitada aos termos 
            do plano contratado. A Licenciante detém todos e quaisquer direitos de Propriedade Intelectual sobre o código-fonte, 
            design, banco de dados, marcas, algoritmos e funcionalidades, independentemente da formalização definitiva do CNPJ 
            da entidade jurídica mantenedora perante os órgãos públicos. É terminantemente proibido tentar realizar engenharia reversa, 
            copiar, revender ou explorar o software comercialmente sem autorização expressa.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">3. Natureza do Serviço ("AS IS")</h2>
          <p className="text-slate-600 leading-relaxed">
            A Plataforma é fornecida "NO ESTADO EM QUE SE ENCONTRA" ("AS IS"), sem qualquer garantia expressa ou implícita 
            de que será isenta de falhas, interrupções ou vulnerabilidades, embora apliquemos as melhores práticas e esforços do 
            mercado para garantir a estabilidade e a segurança. A Clinxia não se responsabiliza por prejuízos, perdas de 
            faturamento, atrasos nos atendimentos da Clínica ou quaisquer danos indiretos e lucros cessantes decorrentes da 
            indisponibilidade temporária do sistema, manutenções, quedas de provedores parceiros (como gateways de pagamento, 
            API do WhatsApp, serviços de nuvem) ou de uso indevido pelo próprio Cliente.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">4. Obrigações e Responsabilidade do Cliente</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            O Cliente é o único e exclusivo responsável por:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li>Garantir a veracidade e a atualização de seus dados cadastrais (ex: CRM, CRO, CPF/CNPJ).</li>
            <li>Proteger e manter em absoluto sigilo suas senhas de acesso e tokens de integração (ex: WhatsApp, Asaas).</li>
            <li>Todo e qualquer diagnóstico, prescrição, receituário e tratamentos alimentados no Prontuário, excluindo a Plataforma de qualquer responsabilidade médica ou odontológica.</li>
            <li>Obter o consentimento legal e expresso de seus próprios pacientes antes de realizar o envio automático de mensagens e notificações via WhatsApp através da ferramenta.</li>
            <li>Garantir as boas práticas de segurança nos aparelhos (computadores e celulares) nos quais a plataforma é acessada para impedir malwares ou invasões de terceiros.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">5. Inadimplência e Bloqueio</h2>
          <p className="text-slate-600 leading-relaxed">
            Em caso de não compensação, atraso ou falta de pagamento da assinatura ou das taxas incidentes sobre os módulos contratados, 
            a Clinxia reserva-se o direito de realizar o bloqueio preventivo e automático do acesso ao sistema após as notificações 
            regulamentares. Em cenário de inadimplência prolongada, o armazenamento dos dados de prontuário e histórico financeiro não será 
            garantido permanentemente após 60 (sessenta) dias, ressalvadas as normas legais pertinentes que permitem ao cliente solicitar 
            a exportação prévia de seu banco de dados enquanto o contrato estiver vigente.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">6. Privacidade e Tratamento de Dados (LGPD)</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Para os fins legais e de proteção de dados, o Cliente atua na figura de "Controlador" e a Clinxia na figura estrita de "Operador". 
            A Clinxia compromete-se a tratar os dados sensíveis dos pacientes unicamente com o fim de permitir a correta operacionalização do 
            SaaS e mediante infraestrutura segura e criptografada. É de plena responsabilidade do Cliente coletar os dados de forma ética e 
            legal em seu balcão ou recepção, não havendo culpa solidária da Clinxia caso o próprio Cliente sofra sanções da ANPD por falha na gestão de consentimento de seus pacientes.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Para mais detalhes de nossa conformidade operacional, leia nossa <Link to="/privacidade" className="text-brand-600 font-semibold hover:underline">Política de Privacidade</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">7. Atualizações dos Termos e do Software</h2>
          <p className="text-slate-600 leading-relaxed">
            A Clinxia pode, a seu exclusivo critério, realizar atualizações contínuas de funcionalidades, layout, módulos e precificação 
            na Plataforma para melhorar a experiência do usuário. Da mesma forma, estes Termos de Uso poderão ser revisados e atualizados 
            unilateralmente. Mudanças contratuais relevantes serão notificadas via e-mail ou via painel de avisos na própria ferramenta. 
            A continuidade do uso após a notificação pressupõe aceitação plena aos novos termos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">8. Foro e Rescisão</h2>
          <p className="text-slate-600 leading-relaxed">
            Este Contrato vigerá por prazo indeterminado, podendo ser rescindido por qualquer das partes mediante solicitação de cancelamento. 
            Em caso de rescisão, a Clinxia faculta ao usuário ferramentas para exportação de dados (prontuários/relatórios) antes da completa remoção do banco.
            Estes Termos são regidos integralmente pelas leis da República Federativa do Brasil. Para dirimir qualquer dúvida ou litígio que porventura 
            não puder ser resolvido amigavelmente, fica eleito o Foro da Comarca de domicílio do desenvolvedor/mantenedor atual da Clinxia, com expressa renúncia a qualquer outro.
          </p>
        </section>

        <section className="pt-6 border-t border-slate-100">
          <p className="text-slate-500 text-sm">
            Se possuir alguma dúvida legal ou administrativa sobre estes Termos de Uso, favor contatar o Suporte em: <strong>contato@clinxia.com.br</strong>
          </p>
        </section>
      </main>
    </div>
  );
}