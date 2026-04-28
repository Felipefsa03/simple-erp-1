import React, { useState, useEffect } from 'react';
import {
  FileText, Save, TestTube, Check, AlertCircle, Eye, EyeOff, Building2, Key, Globe, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/useShared';
import { configureNFe, loadNFeConfig, isNFeConfigured, type NFeConfig, type NFeProvider } from '@/services/nfe/nfeService';

export function NFeSettings() {
  const [form, setForm] = useState<NFeConfig>({
    provider: 'focus_nfe',
    apiKey: '',
    apiSecret: '',
    environment: 'homologacao',
    cnpj: '',
    ie: '',
    razaoSocial: '',
    nomeFantasia: '',
    logradouro: '',
    numero: '',
    bairro: '',
    municipio: '',
    uf: '',
    cep: '',
    regimeTributario: '1',
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const config = loadNFeConfig();
    if (config) {
      setForm(config);
      setConnected(true);
    }
  }, []);

  const handleSave = () => {
    if (!form.apiKey?.trim()) {
      toast('API Key é obrigatória.', 'error');
      return;
    }
    if (!form.cnpj?.trim()) {
      toast('CNPJ é obrigatório.', 'error');
      return;
    }
    if (!form.razaoSocial?.trim()) {
      toast('Razão Social é obrigatória.', 'error');
      return;
    }

    configureNFe(form);
    setConnected(true);
    setSaved(true);
    toast('Configuração de NFe salva!', 'success');
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTest = async () => {
    if (!form.apiKey?.trim()) {
      toast('Configure a API Key antes de testar.', 'error');
      return;
    }
    setTesting(true);
    configureNFe(form);

    try {
      const baseUrl = form.environment === 'producao'
        ? 'https://api.focusnfe.com.br'
        : 'https://homologacao.focusnfe.com.br';

      const response = await fetch(`${baseUrl}/v2/nfe`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(form.apiKey + ':')}`,
        },
      });

      if (response.ok || response.status === 404) {
        toast('Conexão com o provedor NFe estabelecida!', 'success');
        setConnected(true);
      } else if (response.status === 401) {
        toast('API Key inválida. Verifique suas credenciais.', 'error');
        setConnected(false);
      } else {
        toast(`Erro ao conectar: ${response.status}`, 'error');
        setConnected(false);
      }
    } catch (error) {
      toast('Erro de conexão. Verifique a URL e sua internet.', 'error');
      setConnected(false);
    }
    setTesting(false);
  };

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
  };

  const formatCEP = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
  };

  const providers: { id: NFeProvider; name: string; description: string; url: string }[] = [
    { id: 'focus_nfe', name: 'Focus NFe', description: 'API completa de emissão de NF-e, NFC-e e CT-e', url: 'https://focusnfe.com.br' },
    { id: 'nfe_io', name: 'NFe.io', description: 'API simples e moderna para emissão de notas fiscais', url: 'https://nfe.io' },
    { id: 'webmaniabr', name: 'WebmaniaBR', description: 'Emissão de NF-e, NFC-e e MDF-e via API', url: 'https://webmaniabr.com' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-600" />
            Configuração de NFe
          </h2>
          <p className="text-sm text-slate-500 mt-1">Configure a emissão de Notas Fiscais Eletrônicas</p>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
          connected ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-700"
        )}>
          {connected ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {connected ? 'Configurado' : 'Não configurado'}
        </div>
      </div>

      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
        <p className="text-sm text-brand-800">
          <strong>Provedores suportados:</strong> Focus NFe, NFe.io e WebmaniaBR são provedores brasileiros que fazem a comunicação oficial com a SEFAZ para emissão de notas fiscais eletrônicas.
          Você precisará de uma conta em um desses provedores e uma API Key para começar.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-600" />
            Provedor de Emissão
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {providers.map(p => (
              <button
                key={p.id}
                onClick={() => setForm(f => ({ ...f, provider: p.id }))}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  form.provider === p.id
                    ? "border-brand-500 bg-brand-50"
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                <div className="font-semibold text-slate-900">{p.name}</div>
                <div className="text-xs text-slate-500 mt-1">{p.description}</div>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline mt-2 inline-block">
                  Criar conta →
                </a>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Key className="w-4 h-4 text-brand-600" />
            Credenciais da API
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Ambiente</label>
              <select value={form.environment} onChange={e => setForm(f => ({ ...f, environment: e.target.value as NFeConfig['environment'] }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm">
                <option value="homologacao">Homologação (Testes)</option>
                <option value="producao">Produção</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">API Key *</label>
              <div className="relative">
                <input type={showApiKey ? 'text' : 'password'} value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" placeholder="Cole sua API Key aqui" />
                <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-600" />
            Dados do Emitente (Sua Clínica)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">CNPJ *</label>
              <input type="text" value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: formatCNPJ(e.target.value) }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" placeholder="00.000.000/0000-00" maxLength={18} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Inscrição Estadual</label>
              <input type="text" value={form.ie} onChange={e => setForm(f => ({ ...f, ie: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" placeholder="123.456.789.012" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Regime Tributário</label>
              <select value={form.regimeTributario} onChange={e => setForm(f => ({ ...f, regimeTributario: e.target.value as NFeConfig['regimeTributario'] }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm">
                <option value="1">1 - Simples Nacional</option>
                <option value="2">2 - Simples Nacional (excesso de sublimite)</option>
                <option value="3">3 - Regime Normal</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Razão Social *</label>
              <input type="text" value={form.razaoSocial} onChange={e => setForm(f => ({ ...f, razaoSocial: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" placeholder="Nome completo da empresa" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Fantasia</label>
              <input type="text" value={form.nomeFantasia} onChange={e => setForm(f => ({ ...f, nomeFantasia: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" placeholder="Nome fantasia" />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <h3 className="font-semibold text-slate-900 mb-4">Endereço do Emitente</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Logradouro</label>
              <input type="text" value={form.logradouro} onChange={e => setForm(f => ({ ...f, logradouro: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" placeholder="Rua, Av, etc." />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Número</label>
              <input type="text" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" placeholder="SN" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Bairro</label>
              <input type="text" value={form.bairro} onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" placeholder="Centro" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Município</label>
              <input type="text" value={form.municipio} onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" placeholder="São Paulo" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">UF</label>
              <select value={form.uf} onChange={e => setForm(f => ({ ...f, uf: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm">
                <option value="">Selecione</option>
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">CEP</label>
              <input type="text" value={form.cep} onChange={e => setForm(f => ({ ...f, cep: formatCEP(e.target.value) }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm" placeholder="00000-000" maxLength={9} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button onClick={handleTest} disabled={testing} className="flex items-center gap-2 px-4 py-2 border border-brand-200 text-brand-700 rounded-xl hover:bg-brand-50 transition-colors text-sm font-medium disabled:opacity-50">
            <TestTube className="w-4 h-4" />
            {testing ? 'Testando...' : 'Testar Conexão'}
          </button>
          <button onClick={handleSave} className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors",
            saved ? "bg-emerald-600" : "bg-brand-600 hover:bg-brand-700"
          )}>
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Salvo!' : 'Salvar Configuração'}
          </button>
        </div>
      </div>
    </div>
  );
}
