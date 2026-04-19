import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Send, CheckCircle2, DollarSign, Heart, Zap, Users, Globe } from 'lucide-react';

const CLINEMAIL = 'contato.clinxia@gmail.com';

export function CareersPage() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', role: '', linkedin: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    const subject = encodeURIComponent(`[Clinxia Currículo] ${formData.role} - ${formData.name}`);
    const body = encodeURIComponent(
      `Nome Completo: ${formData.name}\n` +
      `Email: ${formData.email}\n` +
      `Telefone: ${formData.phone}\n` +
      `Vaga de Interesse: ${formData.role}\n` +
      `LinkedIn: ${formData.linkedin || 'Não informado'}\n\n` +
      `Mensagem:\n${formData.message}`
    );
    
    window.location.href = `mailto:${CLINEMAIL}?subject=${subject}&body=${body}`;
    
    await new Promise(resolve => setTimeout(resolve, 500));
    setSending(false);
    setSent(true);
    setFormData({ name: '', email: '', phone: '', role: '', linkedin: '', message: '' });
  };

  const roleOptions = [
    'Desenvolvedor Full Stack',
    'Designer UX/UI', 
    'Especialista de Produto',
    'Customer Success',
    'Outro'
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Voltar para página inicial
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Trabalhe na Clinxia</h1>
          <p className="text-xl text-white/90">Junte-se à equipe que está revolucionando a gestão de clínicas no Brasil</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-16">
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Por Que Trabalhar na Clinxia?</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Heart, title: 'Propósito', desc: 'Impacto real na saúde dos brasileiros' },
              { icon: Globe, title: 'Remoto', desc: 'Trabalho híbrido ou 100% remoto' },
              { icon: DollarSign, title: 'Competitivo', desc: 'Salário acima do mercado + equity' },
              { icon: Users, title: 'Crescimento', desc: 'Desenvolvimento profissional' },
              { icon: Zap, title: 'Inovação', desc: 'Tecnologias de ponta' },
              { icon: Clock, title: 'Flexibilidade', desc: 'Horário flexível' },
            ].map(perk => (
              <div key={perk.title} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                  <perk.icon className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{perk.title}</h3>
                  <p className="text-xs text-slate-600">{perk.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Envie seu Currículo</h2>
          {sent ? (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-emerald-800 mb-2">Currículo Enviado!</h3>
              <p className="text-emerald-700">Obrigado pelo interesse. Retornaremos em breve.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Completo</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-cyan-500" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Telefone</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="(DDD) XXXXX-XXXX" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Vaga de Interesse</label>
                  <select required value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-cyan-500">
                    <option value="">Selecione...</option>
                    {roleOptions.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">LinkedIn (opcional)</label>
                <input type="url" value={formData.linkedin} onChange={e => setFormData({ ...formData, linkedin: e.target.value })} placeholder="https://linkedin.com/in/seu-perfil" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Mensagem</label>
                <textarea rows={4} value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} placeholder="Conte-nos um pouco sobre você..." className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-cyan-500" />
              </div>
              <button type="submit" disabled={sending} className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {sending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
                {sending ? 'Enviando...' : 'Enviar Currículo'}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}