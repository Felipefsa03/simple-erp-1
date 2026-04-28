import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Cookie, Settings, X } from 'lucide-react';

export function CookiesPage() {
  const [showSettings, setShowSettings] = useState(false);
  
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gradient-to-r from-brand-600 to-brand-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Voltar para página inicial
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Política de Cookies</h1>
          <p className="text-xl text-white/90">Última atualização: 19 de Abril de 2026</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-8">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">1. O que são Cookies?</h2>
          <p className="text-slate-600 leading-relaxed">
            Cookies são pequenos arquivos de texto armazenados em seu navegador quando você visitaSites. Eles ajudam a lembrar suas preferências, 
            analisar tráfego e melhorar sua experiência.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">2. Como Utilizamos Cookies</h2>
          <div className="space-y-4">
            {[
              { category: 'Essenciais', desc: 'Necessários para o funcionamento do sistema', required: true },
              { category: 'Funcionais', desc: 'Lembram suas preferências', required: false },
              { category: 'Analíticos', desc: 'Nos ajudam a entender como o site é usado', required: false },
              { category: 'Marketing', desc: 'Usados para exibir anúncios relevantes', required: false },
            ].map(cookie => (
              <div key={cookie.category} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Cookie className="w-5 h-5 text-brand-600" />
                  <div>
                    <h3 className="font-bold text-slate-900">{cookie.category}</h3>
                    <p className="text-sm text-slate-600">{cookie.desc}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${cookie.required ? 'bg-slate-200 text-slate-700' : 'bg-brand-100 text-brand-700'}`}>
                  {cookie.required ? 'Obrigatório' : 'Opcional'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">3. Tipos Específicos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 font-bold text-slate-900">Nome</th>
                  <th className="text-left py-3 font-bold text-slate-900">Tipo</th>
                  <th className="text-left py-3 font-bold text-slate-900">Finalidade</th>
                  <th className="text-left py-3 font-bold text-slate-900">Duração</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                <tr className="border-b border-slate-100">
                  <td className="py-3">session_id</td>
                  <td className="py-3">Essencial</td>
                  <td className="py-3">Manter sessão ativa</td>
                  <td className="py-3">Sessão</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3">auth_token</td>
                  <td className="py-3">Essencial</td>
                  <td className="py-3">Autenticação</td>
                  <td className="py-3">30 dias</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3">preferences</td>
                  <td className="py-3">Funcional</td>
                  <td className="py-3">Preferências do usuário</td>
                  <td className="py-3">1 ano</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3">_ga</td>
                  <td className="py-3">Analítico</td>
                  <td className="py-3">Google Analytics</td>
                  <td className="py-3">2 anos</td>
                </tr>
                <tr>
                  <td className="py-3">ads_token</td>
                  <td className="py-3">Marketing</td>
                  <td className="py-3">Anúncios personalizados</td>
                  <td className="py-3">30 dias</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">4. Gerenciamento de Cookies</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Você pode controlar ou desativar cookies através das configurações do seu navegador:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-6">
            <li><strong>Chrome:</strong> Configurações → Privacidade → Cookies</li>
            <li><strong>Firefox:</strong> Opções → Privacidade</li>
            <li><strong>Safari:</strong> Preferências → Privacidade</li>
            <li><strong>Edge:</strong> Configurações → Cookies e permissões</li>
          </ul>
          <p className="text-slate-600 leading-relaxed">
            Note que desativar cookies essenciais pode afetar o funcionamento do sistema.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">5. Atualizações</h2>
          <p className="text-slate-600 leading-relaxed">
            Esta política pode ser atualizada periodicamente. Alterações significativas serão comunicadas através do sistema ou email.
          </p>
        </section>

        <section className="text-center pt-8">
          <button 
            onClick={() => setShowSettings(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all"
          >
            <Settings className="w-5 h-5" />
            Configurar Cookies
          </button>
        </section>

        {showSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Configurações de Cookies</h3>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <h4 className="font-bold text-slate-900">Essenciais</h4>
                    <p className="text-sm text-slate-600">Necessários para o sistema</p>
                  </div>
                  <input type="checkbox" checked disabled className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <h4 className="font-bold text-slate-900">Funcionais</h4>
                    <p className="text-sm text-slate-600">Preferências do usuário</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <h4 className="font-bold text-slate-900">Analíticos</h4>
                    <p className="text-sm text-slate-600">Melhorias do site</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <h4 className="font-bold text-slate-900">Marketing</h4>
                    <p className="text-sm text-slate-600">Anúncios personalizados</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5 text-brand-600" />
                </div>
              </div>
              <button onClick={() => setShowSettings(false)} className="w-full mt-6 py-3 bg-gradient-to-r from-brand-600 to-brand-600 text-white font-bold rounded-xl">
                Salvar Preferências
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}