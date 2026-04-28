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
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Termos de Uso</h1>
          <p className="text-xl text-white/90">Última atualização: 19 de Abril de 2026</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-8">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">1. Aceitação dos Termos</h2>
          <p className="text-slate-600 leading-relaxed">
            Ao acessar e utilizar o sistema Clinxia, você reconhece que leu, compreendeu e concorda em cumprir 
            estes Termos de Uso e Nossa Política de Privacidade. Se você não concorda com qualquer parte destes 
            termos, não deverá utilizar nossos serviços.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">2. Descrição do Serviço</h2>
          <p className="text-slate-600 leading-relaxed">
            O Clinxia é uma plataforma de gestão para clínicas de odontologia e estética que oferece as seguintes 
            funcionalidades: agenda online, prontuário eletrônico, gestão financeira, controle de estoque, 
            comunicação com pacientes via WhatsApp e relatórios gerenciais.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">3. Cadastro e Conta</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Para utilizar nossos serviços, você deve criar uma conta fornecendo informações verdadeiras, completas e atualizadas. 
            Você é responsável por:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li>Manter a confidencialidade de sua senha e informações de conta</li>
            <li>Todas as atividades que ocorrem sob sua conta</li>
            <li>Notificar-nos imediatamente sobre qualquer uso não autorizado</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">4. Obrigações do Usuário</h2>
          <p className="text-slate-600 leading-relaxed mb-4">Ao usar o Clinxia, você concorda em:</p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li>Utilizar o sistema apenas para fins legais e autorizados</li>
            <li>Não compartilhar sua conta com terceiros</li>
            <li>Não tentar acessar áreas restritas do sistema</li>
            <li>Não utilizar o sistema de forma que pueda dañar, sobrecarregar ou impair seu funcionamento</li>
            <li>Cumprir todas as leis aplicáveis, incluindo a LGPD (Lei Geral de Proteção de Dados)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">5. Propriedade Intelectual</h2>
          <p className="text-slate-600 leading-relaxed">
            O Clinxia e todo seu conteúdo, funcionalidades e tecnologia são de propriedade exclusiva da Clinxia e seus 
            licenciadores. Você não pode copiar, modificar, distribuir, vender ou alugar qualquer parte de nossos serviços 
            sem autorização prévia por escrito.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">6. Limitação de Responsabilidade</h2>
          <p className="text-slate-600 leading-relaxed">
            O serviço é fornecido "como encontrado". Não garantimos que o sistema esté siempre disponível, sem erros ou virus. 
            Não seremos responsáveis por quaisquer danos indiretos, incidentais ou consequenciais decorrentes do uso ou 
            incapacidade de usar o serviço.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">7. Privacidade e Proteção de Dados</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Estamos comprometidos com a proteção de seus dados pessoais de acordo com a LGPD (Lei nº 13.709/2018). 
            Ao utilizar nossos serviços, você concorda com a coleta e uso de informações conforme descrito em nossa 
            Política de Privacidade.
          </p>
          <Link to="/privacidade" className="text-brand-600 hover:underline">Ver Política de Privacidade</Link>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">8. Rescisão</h2>
          <p className="text-slate-600 leading-relaxed">
            Podemos rescindir ou suspender seu acesso imediatamente, sem aviso prévio, se você violar estes termos 
            ou se suspeitarmos de atividade fraudulenta ou ilegal.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">9. Alterações nos Termos</h2>
          <p className="text-slate-600 leading-relaxed">
            Reservamo-nos o direito de modificar estes termos a qualquer momento. Mudanças significativas serão comunicadas 
            por email ou através do sistema. O uso contínuo do serviço após alterações constitui aceitação dos novos termos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">10. Lei Aplicável</h2>
          <p className="text-slate-600 leading-relaxed">
            Estes termos são regidos pelas leis brasileiras. Quaisquer disputas serão resolvidas no foro da cidade de São Paulo, SP.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">11. Contato</h2>
          <p className="text-slate-600 leading-relaxed">
            Em caso de dúvidas sobre estes termos, entre em contato pelo email contato@clinxia.com.br.
          </p>
        </section>
      </main>
    </div>
  );
}