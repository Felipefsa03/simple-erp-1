// ============================================
// LuminaFlow - E-mail Marketing Integration Config
// ============================================

import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, AlertCircle, Loader2, Key, Globe, Send } from 'lucide-react';
import { toast } from '@/hooks/useShared';

interface EmailMarketingConfigProps {
  clinicId: string;
  isConnected: boolean;
  onConnectionChange: (connected: boolean) => void;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

type ProviderType = 'RD Station' | 'Mailchimp' | 'SendGrid' | 'Custom';

export function EmailMarketingConfig({ clinicId, isConnected, onConnectionChange }: EmailMarketingConfigProps) {
  const [provider, setProvider] = useState<ProviderType>('RD Station');
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, [clinicId]);

  const loadConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/integrations/email-marketing/credentials/${clinicId}`);
      const data = await res.json();
      if (data.credentials) {
        setProvider(data.credentials.provider || 'RD Station');
        setApiKey(data.credentials.api_key || '');
        setApiUrl(data.credentials.api_url || '');
        setFromEmail(data.credentials.from_email || '');
        setFromName(data.credentials.from_name || '');
        onConnectionChange(true);
      } else {
        onConnectionChange(false);
      }
    } catch (error) {
      console.error('[Email Marketing] Load config error:', error);
      onConnectionChange(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast('API Key é obrigatória', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/integrations/email-marketing/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          provider,
          api_key: apiKey,
          api_url: apiUrl,
          from_email: fromEmail,
          from_name: fromName
        })
      });
      const data = await res.json();
      
      if (data.ok) {
        toast('Credenciais salvas!', 'success');
        onConnectionChange(true);
        setTestResult({ success: true, message: 'Credenciais armazenadas!' });
      } else {
        toast(data.message || 'Erro ao salvar', 'error');
      }
    } catch (error) {
      toast('Erro ao salvar credenciais', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const res = await fetch(`${API_BASE}/api/integrations/email-marketing/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId })
      });
      const data = await res.json();
      
      if (data.ok) {
        setTestResult({ success: true, message: 'Conexão com E-mail Marketing OK!' });
        onConnectionChange(true);
      } else {
        setTestResult({ success: false, message: data.message || 'Erro na conexão' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Erro ao testar conexão' });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`${API_BASE}/api/integrations/email-marketing/credentials/${clinicId}`, {
        method: 'DELETE'
      });
      setApiKey('');
      setApiUrl('');
      setFromEmail('');
      setFromName('');
      setTestResult(null);
      onConnectionChange(false);
      toast('E-mail Marketing desconectado', 'info');
    } catch (error) {
      toast('Erro ao desconectar', 'error');
    }
  };

  const providerDefaults: Record<ProviderType, { apiUrl: string; apiKeyLabel: string }> = {
    'RD Station': {
      apiUrl: 'https://api.rd_services.com',
      apiKeyLabel: 'Token RD Station'
    },
    'Mailchimp': {
      apiUrl: 'https://<dc>.api.mailchimp.com/3.0',
      apiKeyLabel: 'API Key Mailchimp'
    },
    'SendGrid': {
      apiUrl: 'https://api.sendgrid.com/v3',
      apiKeyLabel: 'API Key SendGrid'
    },
    'Custom': {
      apiUrl: '',
      apiKeyLabel: 'API Key'
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <h4 className="font-bold text-purple-900 flex items-center gap-2">
          <Mail className="w-5 h-5" />
          E-mail Marketing
        </h4>
        <p className="text-sm text-purple-700 mt-1">
          Campanhas de e-mail automatizadas e segmentadas
        </p>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">
          Provedor
        </label>
        <select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value as ProviderType);
            if (e.target.value !== 'Custom') {
              setApiUrl(providerDefaults[e.target.value as ProviderType].apiUrl);
            }
          }}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm"
        >
          <option value="RD Station">RD Station</option>
          <option value="Mailchimp">Mailchimp</option>
          <option value="SendGrid">SendGrid</option>
          <option value="Custom">Personalizado (API)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">
          <Key className="w-4 h-4 inline mr-1" />
          {providerDefaults[provider].apiKeyLabel}
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="••••••••••••••••"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">
          <Globe className="w-4 h-4 inline mr-1" />
          API URL
        </label>
        <input
          type="text"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          placeholder={providerDefaults[provider].apiUrl}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            E-mail Remetente
          </label>
          <input
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="contato@clinica.com"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Nome Remetente
          </label>
          <input
            type="text"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder="Clínica Nome"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm"
          />
        </div>
      </div>

      {testResult && (
        <div className={`rounded-xl p-3 flex items-center gap-2 ${
          testResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {testResult.success ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">{testResult.message}</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 py-2.5 bg-purple-600 text-white font-bold rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Salvar Credenciais
        </button>
        
        {apiKey && (
          <button
            onClick={handleTest}
            disabled={testing || !apiKey}
            className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        )}
      </div>

      {isConnected && (
        <button
          onClick={handleDisconnect}
          className="w-full py-2.5 bg-red-50 text-red-600 font-bold rounded-xl text-sm hover:bg-red-100 flex items-center justify-center gap-2"
        >
          Desconectar E-mail Marketing
        </button>
      )}
    </div>
  );
}
