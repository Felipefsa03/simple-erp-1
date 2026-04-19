import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, ArrowRight } from 'lucide-react';

export function BlogPage() {
  const posts = [
    {
      id: 1,
      title: '5 Estratégias para Reduzir Faltas na Sua Clínica',
      excerpt: 'Descubra como os lembretes automáticos pelo WhatsApp pueden reduzir as faltas em até 40%.',
      category: 'Gestão',
      date: '15/04/2026',
      author: 'Equipe Clinxia',
      image: 'bg-gradient-to-br from-cyan-100 to-blue-100'
    },
    {
      id: 2,
      title: 'Prontuário Eletrônico: Benefícios para a Odontologia',
      excerpt: 'Por que migrar do papel para o digital e quais ganhos esperados.',
      category: 'Tecnologia',
      date: '10/04/2026',
      author: 'Dr. Carlos Silva',
      image: 'bg-gradient-to-br from-emerald-100 to-green-100'
    },
    {
      id: 3,
      title: 'LGPD na Saúde: O que Clínicas Precisan Saber',
      excerpt: ' guia rápido sobre proteção de dados para consultórios.',
      category: 'Legal',
      date: '05/04/2026',
      author: 'Equipe Clinxia',
      image: 'bg-gradient-to-br from-purple-100 to-indigo-100'
    },
    {
      id: 4,
      title: 'Como Aumentar o Ticket Médio da Sua Clínica',
      excerpt: 'Estratégias de relacionamento com pacientes para maior receita.',
      category: 'Marketing',
      date: '01/04/2026',
      author: 'Equipe Clinxia',
      image: 'bg-gradient-to-br from-amber-100 to-orange-100'
    },
    {
      id: 5,
      title: 'Automação de Marketing para Clínicas',
      excerpt: 'Como usar o WhatsApp para enviar campanhas efetivas.',
      category: 'Marketing',
      date: '28/03/2026',
      author: 'Equipe Clinxia',
      image: 'bg-gradient-to-br from-rose-100 to-pink-100'
    }
  ];

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
          {posts.map(post => (
            <article key={post.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
              <div className={`h-40 ${post.image}`} />
              <div className="p-6">
                <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                  <span className="px-2 py-1 bg-slate-100 rounded-full font-medium">{post.category}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {post.date}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">{post.title}</h2>
                <p className="text-slate-600 text-sm mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 flex items-center gap-1"><User className="w-3 h-3" /> {post.author}</span>
                  <Link to="/blog" className="text-cyan-600 font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                    Ler mais <ArrowRight className="w-4 h-4" />
                  </Link>
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