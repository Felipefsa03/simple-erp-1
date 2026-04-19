import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Send, MessageSquare, Clock } from 'lucide-react';

export function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSending(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Voltar para página inicial
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Fale Conosco</h1>
          <p className="text-xl text-white/90">Estamos prontos para responder suas dúvidas e ouvir suas sugestões.</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Envie uma Mensagem</h2>
            {sent ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 text-center">
                <MessageSquare className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-emerald-800 mb-2">Mensagem Enviada!</h3>
                <p className="text-emerald-700">Obrigado pelo contato. Retornaremos em breve.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nome</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Telefone</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Assunto</label>
                  <select required value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-cyan-500">
                    <option value="">Selecione...</option>
                    <option value="duvida">Dúvida sobre o sistema</option>
                    <option value="suporte">Suporte técnico</option>
                    <option value="comercial">Proposta comercial</option>
                    <option value="parceria">Parcerias</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Mensagem</label>
                  <textarea required rows={4} value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-cyan-500" />
                </div>
                <button type="submit" disabled={sending} className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {sending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
                  {sending ? 'Enviando...' : 'Enviar Mensagem'}
                </button>
              </form>
            )}
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Informações de Contato</h2>
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
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Horário de Atendimento</h2>
              <div className="flex items-center gap-3 text-slate-600">
                <Clock className="w-5 h-5 text-cyan-600" />
                <span>Segunda a Sexta: 8h às 18h</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-2">Suporte Técnico</h3>
              <p className="text-slate-600 text-sm mb-4">Para questões técnicas, accedemos painel administrativo após login.</p>
              <Link to="/login" className="text-cyan-600 font-semibold hover:underline">Acessar sistema</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}