import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Calendar, User, ArrowRight, Clock, Share2 } from 'lucide-react';

const BLOG_POSTS = [
  {
    id: 1,
    title: '5 Estratégias para Reduzir Faltas na Sua Clínica',
    excerpt: 'Descubra como os lembretes automáticos pelo WhatsApp podem reduzir as faltas em até 40% e aumentar o faturamento.',
    content: `As faltas representam um dos maiores problemas para clínicas de odontologia e estética. Cada consulta perdida significa receita perdida.

**Aqui estão 5 estratégias comprovadas:**

1. **Lembretes Automáticos via WhatsApp**
   Envie lembretes 24h e 2h antes do agendamento. O sistema Clinxia envia automaticamente.

2. **Confirmação Ativa**
   Peça confirmação ativa. Pacientes que confirmam têm 70% menos chance de faltar.

3. **Lista de Espera**
   Tenha uma lista de espera preenchida. Quando alguém cancela, você preenche rapidamente.

4. **Políticas Claras**
   Estabeleça políticas de cancelamento e cobrança antecipada para reduzir no-shows.

5. **Follow-up Inteligente**
   Após uma falta, entre em contato no mesmo dia para remarcar.`,
    category: 'Gestão',
    date: '15/04/2026',
    author: 'Equipe Clinxia',
    readTime: '5 min',
    image: 'bg-gradient-to-br from-cyan-100 to-blue-100'
  },
  {
    id: 2,
    title: 'Prontuário Eletrônico: Benefícios para a Odontologia',
    excerpt: 'Por que migrar do papel para o digital e quais ganhos esperados em termos de tempo e segurança.',
    content: `O prontuário eletrônico revolucionou a forma como Clínicas guardam informações de pacientes.

**Benefícios principais:**

1. **Acesso Rápido**
   Informações em segundos, de qualquer lugar. Não precisa procurar papeladas.

2. **Segurança**
   Dados criptografados e protegidos._BACKUP automático.

3. **Odontograma Digital**
   Desenhe diretamente na tela. Explicações mais claras para pacientes.

4. **Legislação**
   Conforme resolução do CFO, prontuários digitais têm validade legal.

5. **Economia**
   Elimina custos com papel, impressão e espacio físico.

O Clinxia oferece prontuário completo com odontograma, anamnese, evolution e muito mais.`,
    category: 'Tecnologia',
    date: '10/04/2026',
    author: 'Dr. Carlos Silva',
    readTime: '4 min',
    image: 'bg-gradient-to-br from-emerald-100 to-green-100'
  },
  {
    id: 3,
    title: 'LGPD na Saúde: O que Clínicas Precisam Saber',
    excerpt: 'Guia rápido sobre proteção de dados pessoais para consultórios odontológicos.',
    content: `A LGPD (Lei Geral de Proteção de Dados) exige cuidados especiais com dados de saúde.

**O que sua clínica precisa fazer:**

1. **Consentimento**
   Obter consentimento claro do paciente para coleta e uso de dados.

2. **Armazenamento Seguro**
   Dados de saúde devem ser criptografados e acessíveis apenas a profissionais autorizados.

3. **Registro de Tratamentos**
   Manter registro de quem acessou cada prontuário.

4. **Direito à Exclusão**
   Pacientes podem solicitar exclusão de seus dados.

5. **Tempo de Retenção**
   Dados de saúde devem ser mantidos por pelo menos 20 anos.

O Clinxia é totalmente compatível com LGPD. Todos os dados são criptografados e você tem controle total.`,
    category: 'Legal',
    date: '05/04/2026',
    author: 'Equipe Clinxia',
    readTime: '6 min',
    image: 'bg-gradient-to-br from-purple-100 to-indigo-100'
  },
  {
    id: 4,
    title: 'Como Aumentar o Ticket Médio da Sua Clínica',
    excerpt: 'Estratégias de relacionamento com pacientes para aumentar o faturamento sem captar novos pacientes.',
    content: `Aumentar o ticket médio é mais fácil do que você pensa. Veja como:

**1. Procedimentos Preventivos**
 Eduque pacientes sobre a importância de tratamentos preventivos. Limpezas mensais, aplicação de flúor.

**2. Upselling**
 Durante uma consulta, identifique necessidades. "Além disso, temos esse tratamento..."

**3. Pacotes**
 Crie pacotes de serviços. Ex: Limpeza + Clareamento com desconto.

**4. Fidelização**
 Programa de pontos ou descontos para pacientes frequentes.

**5. Comunicação**
 Use WhatsApp para enviar promotions personalizadas.

O Clinxia tem ferramentas integradas para tudo isso. Relatórios, automações e muito mais.`,
    category: 'Marketing',
    date: '01/04/2026',
    author: 'Equipe Clinxia',
    readTime: '4 min',
    image: 'bg-gradient-to-br from-amber-100 to-orange-100'
  },
  {
    id: 5,
    title: 'Automação de Marketing para Clínicas',
    excerpt: 'Como usar o WhatsApp Business para enviar campanhas efetivas e converter mais.',
    content: `O WhatsApp é o canal mais eficiente para clínicas. Veja como automatizar:

**1. Mensagens de Boas-vindas**
 Quando um novo paciente agenda, envie automatic messages com instruções.

**2. Aniversários**
 Envie mensagens de parabéns com ofertas especiais.

**3. Recall**
 Lembretes de limpezas e revisões pendentes.

**4. Campanhas**
 Promotion de nuevos tratamentos (clareamento,botox, etc).

**5. Feedback**
 Após atendentes, solicite feedback rápido.

O Clinxia integra WhatsApp Business API para automate todas essas mensagens sem precisar de celular.`,
    category: 'Marketing',
    date: '28/03/2026',
    author: 'Equipe Clinxia',
    readTime: '5 min',
    image: 'bg-gradient-to-br from-rose-100 to-pink-100'
  }
];

function BlogPost({ post, onBack }: { post: typeof BLOG_POSTS[0]; onBack: () => void }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 mb-8">
        <ArrowLeft className="w-5 h-5" />
        Voltar ao blog
      </button>
      
      <article className="bg-white">
        <div className={`h-64 ${post.image} rounded-2xl mb-8`} />
        
        <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
          <span className="px-3 py-1 bg-slate-100 rounded-full font-medium">{post.category}</span>
          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {post.date}</span>
          <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {post.readTime} de leitura</span>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">{post.title}</h1>
        
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            {post.author.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{post.author}</p>
            <p className="text-sm text-slate-500">Equipe Clinxia</p>
          </div>
        </div>
        
        <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-line">
          {post.content}
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-200 flex items-center justify-between">
          <p className="text-slate-500">Gostou? Compartilhe!</p>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
            <Share2 className="w-4 h-4" />
            Compartilhar
          </button>
        </div>
      </article>
    </div>
  );
}

export function BlogPage() {
  const location = useLocation();
  const [selectedPost, setSelectedPost] = useState<typeof BLOG_POSTS[0] | null>(null);

  if (selectedPost) {
    return <BlogPost post={selectedPost} onBack={() => setSelectedPost(null)} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Voltar para página inicial
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Blog Clinxia</h1>
          <p className="text-xl text-white/90">Dicas, notícias e tendências para sua clínica</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          {BLOG_POSTS.map(post => (
            <article key={post.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedPost(post)}>
              <div className={`h-40 ${post.image}`} />
              <div className="p-6">
                <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                  <span className="px-2 py-1 bg-slate-100 rounded-full font-medium">{post.category}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.readTime}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">{post.title}</h2>
                <p className="text-slate-600 text-sm mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 flex items-center gap-1"><User className="w-3 h-3" /> {post.author}</span>
                  <span className="text-cyan-600 font-semibold text-sm flex items-center gap-1">
                    Ler mais <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-600 mb-4">Inscreva-se na newsletter para receber novidades</p>
          <form className="max-w-md mx-auto flex gap-2">
            <input type="email" placeholder="Seu email" className="flex-1 px-4 py-3 rounded-xl border border-slate-200 outline-none" />
            <button type="submit" className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl">
              Inscrever
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}