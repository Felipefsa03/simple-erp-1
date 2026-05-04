// ============================================
// clinxia - Asaas Integration Config
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CreditCard, CheckCircle2, AlertCircle, Loader2, Key, Globe } from 'lucide-react';
import { toast } from '@/hooks/useShared';

interface AsaasConfigProps {
  clinicId: string;
  isConnected: boolean;
  onConnectionChange: (connected: boolean) => void;
}

const isDev = import.meta.env.DEV;
const API_BASE = isDev ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://clinxia-backend.onrender.com');

export function AsaasConfig({ clinicId, isConnected, onConnectionChange }: AsaasConfigProps) {
  const [apiKey, setApiKey] = useState('');
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, [clinicId]);

  const loadConfig = async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`${API_BASE}/api/integrations/asaas/credentials/${clinicId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
      });
      const data = await res.json();
      if (data.credentials) {
        setApiKey(data.credentials.api_key || '');
        setEnvironment(data.credentials.environment || 'sandbox');
        onConnectionChange(true);
      } else {
        onConnectionChange(false);
      }
    } catch (error) {
      console.error('[Asaas] Load config error:', error);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast('API Key é obrigatória', 'error');
      return;
    }

    setLoading(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`${API_BASE}/api/integrations/asaas/credentials`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          clinicId,
          api_key: apiKey,
          environment
        })
      });
      const data = await res.json();
      
      if (data.ok) {
        toast('Credenciais salvas!', 'success');
        await handleTest();
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
      const res = await fetch(`${API_BASE}/api/integrations/asaas/test`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          apiKey,
          environment
        })
      });
      const data = await res.json();
      
      if (data.ok) {
        setTestResult({ success: true, message: 'Conexão exitosa!' });
        onConnectionChange(true);
      } else {
        setTestResult({ success: false, message: data.message || 'Erro na conexão' });
        onConnectionChange(false);
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Erro ao testar conexão' });
      onConnectionChange(false);
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      await fetch(`${API_BASE}/api/integrations/asaas/credentials/${clinicId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
      });
      setApiKey('');
      setEnvironment('sandbox');
      setTestResult(null);
      onConnectionChange(false);
      toast('Asaas desconectado', 'info');
    } catch (error) {
      toast('Erro ao desconectar', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
        <h4 className="font-bold text-brand-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Configuração do Asaas
        </h4>
        <p className="text-sm text-brand-700 mt-1">
          Insira sua API Key do Asaas para processar pagamentos
        </p>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">
          Ambiente
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEnvironment('sandbox')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              environment === 'sandbox'
                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            🧪 Sandbox (Teste)
          </button>
          <button
            type="button"
            onClick={() => setEnvironment('production')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              environment === 'production'
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            🏢 Produção
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">
          <Key className="w-4 h-4 inline mr-1" />
          API Key
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={environment === 'sandbox' ? '$$ sandbox_api_key_here' : 'sua_api_key_de_produção'}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm font-mono"
        />
        <p className="text-xs text-slate-500 mt-1">
          Obtenha sua API Key em: Asaas → Configurações → Integrações
        </p>
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
          className="flex-1 py-2.5 bg-brand-600 text-white font-bold rounded-xl text-sm hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
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
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Testar'}
          </button>
        )}
      </div>

      {isConnected && (
        <button
          onClick={handleDisconnect}
          className="w-full py-2.5 bg-red-50 text-red-600 font-bold rounded-xl text-sm hover:bg-red-100 flex items-center justify-center gap-2"
        >
          Desconectar Asaas
        </button>
      )}
    </div>
  );
}

