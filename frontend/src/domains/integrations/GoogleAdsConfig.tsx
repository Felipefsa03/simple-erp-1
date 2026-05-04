// ============================================
// clinxia - Google Ads Integration Config
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Target, CheckCircle2, AlertCircle, Loader2, Key, Globe } from 'lucide-react';
import { toast } from '@/hooks/useShared';

interface GoogleAdsConfigProps {
  clinicId: string;
  isConnected: boolean;
  onConnectionChange: (connected: boolean) => void;
}

const API_BASE = '';

export function GoogleAdsConfig({ clinicId, isConnected, onConnectionChange }: GoogleAdsConfigProps) {
  const [developerToken, setDeveloperToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, [clinicId]);

  const loadConfig = async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`${API_BASE}/api/integrations/google-ads/credentials/${clinicId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
      });
      const data = await res.json();
      if (data.credentials) {
        setDeveloperToken(data.credentials.developer_token || '');
        setClientId(data.credentials.client_id || '');
        setClientSecret(data.credentials.client_secret || '');
        onConnectionChange(true);
      } else {
        onConnectionChange(false);
      }
    } catch (error) {
      console.error('[Google Ads] Load config error:', error);
      onConnectionChange(false);
    }
  };

  const handleSave = async () => {
    if (!developerToken.trim()) {
      toast('Developer Token é obrigatório', 'error');
      return;
    }

    setLoading(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`${API_BASE}/api/integrations/google-ads/credentials`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          clinicId,
          developer_token: developerToken,
          client_id: clientId,
          client_secret: clientSecret
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
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`${API_BASE}/api/integrations/google-ads/test`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ clinicId })
      });
      const data = await res.json();
      
      if (data.ok) {
        setTestResult({ success: true, message: 'Conexão com Google Ads OK!' });
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
      const session = (await supabase.auth.getSession()).data.session;
      await fetch(`${API_BASE}/api/integrations/google-ads/credentials/${clinicId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
      });
      setDeveloperToken('');
      setClientId('');
      setClientSecret('');
      setTestResult(null);
      onConnectionChange(false);
      toast('Google Ads desconectado', 'info');
    } catch (error) {
      toast('Erro ao desconectar', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <h4 className="font-bold text-red-900 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Google Ads
        </h4>
        <p className="text-sm text-red-700 mt-1">
          Acompanhe conversões e custos de aquisição do Google Ads
        </p>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">
          <Key className="w-4 h-4 inline mr-1" />
          Developer Token
        </label>
        <input
          type="text"
          value={developerToken}
          onChange={(e) => setDeveloperToken(e.target.value)}
          placeholder="xxxxxxxxxxxxxx"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm font-mono"
        />
        <p className="text-xs text-slate-500 mt-1">
          Obtenha em: Google Ads → Configurações → Centro de API
        </p>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">
          <Globe className="w-4 h-4 inline mr-1" />
          Client ID (Opcional)
        </label>
        <input
          type="text"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="client-id.apps.googleusercontent.com"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">
          <Key className="w-4 h-4 inline mr-1" />
          Client Secret (Opcional)
        </label>
        <input
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          placeholder="GOCSPX-..."
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm font-mono"
        />
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
          className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Salvar Credenciais
        </button>
        
        {developerToken && (
          <button
            onClick={handleTest}
            disabled={testing || !developerToken}
            className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Testar'}
          </button>
        )}
      </div>

      {isConnected && (
        <button
          onClick={handleDisconnect}
          className="w-full py-2.5 bg-red-50 text-red-600 font-bold rounded-xl text-sm hover:bg-red-100 flex items-center justify-center gap-2"
        >
          Desconectar Google Ads
        </button>
      )}
    </div>
  );
}

