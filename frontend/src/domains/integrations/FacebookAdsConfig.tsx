// ============================================
// clinxia - Facebook Ads Configuration
// Real integration with Facebook Marketing API
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Facebook, Settings, CheckCircle2, AlertCircle, 
  Eye, EyeOff, ExternalLink, Loader2, RefreshCw, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/useShared';

const isDev = import.meta.env.DEV;
const API_BASE = isDev ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://clinxia-backend.onrender.com');

interface FacebookConfigProps {
  clinicId: string;
  isConnected: boolean;
  onConnectionChange: (connected: boolean) => void;
}

interface FacebookCredentials {
  appId: string;
  appSecret: string;
  accessToken: string;
}

interface FacebookConfig {
  isConnected: boolean;
  hasAccessToken: boolean;
  updatedAt?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  adAccountsCount?: number;
}

export function FacebookAdsConfig({ clinicId, isConnected, onConnectionChange }: FacebookConfigProps) {
  const [config, setConfig] = useState<FacebookConfig>({ isConnected: false, hasAccessToken: false });
  const [showCredentials, setShowCredentials] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  
  const [credentials, setCredentials] = useState<FacebookCredentials>({
    appId: '',
    appSecret: '',
    accessToken: '',
  });

  // Load current connection status
  useEffect(() => {
    loadConnectionStatus();
  }, [clinicId]);

  const loadConnectionStatus = async () => {
    setIsLoading(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const response = await fetch(`${API_BASE}/api/integrations/facebook/credentials/${clinicId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
      });
      const data = await response.json();
      
      if (data.ok) {
        setConfig({
          isConnected: data.connected,
          hasAccessToken: data.hasAccessToken,
          updatedAt: data.updatedAt,
        });
        onConnectionChange(data.connected);
      }
    } catch (error) {
      console.error('Error loading Facebook status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!credentials.accessToken) {
      toast('Access Token é obrigatório', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const response = await fetch(`${API_BASE}/api/integrations/facebook/credentials`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          clinicId,
          accessToken: credentials.accessToken,
          appId: credentials.appId,
          appSecret: credentials.appSecret,
        }),
      });
      
      const data = await response.json();
      
      if (data.ok) {
        toast('Credenciais salvas com sucesso!', 'success');
        setShowCredentials(false);
        loadConnectionStatus();
      } else {
        toast(data.message || 'Erro ao salvar credenciais', 'error');
      }
    } catch (error) {
      console.error('Error saving credentials:', error);
      toast('Erro ao salvar credenciais', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!credentials.accessToken && !config.hasAccessToken) {
      toast('Insira o Access Token primeiro', 'error');
      return;
    }

    setIsTesting(true);
    try {
      const tokenToTest = credentials.accessToken || config.hasAccessToken ? 'existing' : '';
      
      const session = (await supabase.auth.getSession()).data.session;
      const response = await fetch(`${API_BASE}/api/facebook/test`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          clinicId,
          accessToken: tokenToTest === 'existing' ? undefined : credentials.accessToken,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setConfig({
          isConnected: true,
          hasAccessToken: true,
          user: data.user,
          adAccountsCount: data.adAccountsCount,
        });
        onConnectionChange(true);
        toast('Conexão com Facebook estabelecida!', 'success');
        setShowCredentials(false);
      } else {
        toast(data.error || 'Falha na conexão', 'error');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast('Erro ao testar conexão', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const response = await fetch(`${API_BASE}/api/facebook/credentials/${clinicId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
      });
      
      const data = await response.json();
      
      if (data.ok) {
        setConfig({ isConnected: false, hasAccessToken: false });
        onConnectionChange(false);
        setCredentials({ appId: '', appSecret: '', accessToken: '' });
        toast('Facebook Ads desconectado', 'info');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast('Erro ao desconectar', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        <span className="ml-2 text-slate-500">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!config.isConnected ? (
        <div className="text-center py-8">
          <div className="w-20 h-12 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Facebook className="w-10 h-10 text-brand-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Facebook Ads</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
            Conecte sua conta do Facebook Ads para importar leads, campanhas e métricas.
          </p>
          
          {!showCredentials ? (
            <button
              onClick={() => setShowCredentials(true)}
              className="px-6 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 flex items-center gap-2 mx-auto"
            >
              <Settings className="w-5 h-5" />
              Configurar Conexão
            </button>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-6 max-w-sm mx-auto text-left">
              <h4 className="font-bold text-slate-900 mb-4">Credenciais do Facebook</h4>
              
              <div className="space-y-4">
                {/* App ID */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    App ID do Facebook
                  </label>
                  <input
                    type="text"
                    value={credentials.appId}
                    onChange={(e) => setCredentials({ ...credentials, appId: e.target.value })}
                    placeholder="Ex: 123456789012345"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                
                {/* App Secret */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    App Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={credentials.appSecret}
                      onChange={(e) => setCredentials({ ...credentials, appSecret: e.target.value })}
                      placeholder="Ex: abc123def456..."
                      className="w-full px-4 py-2 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                {/* Access Token */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Access Token
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={credentials.accessToken}
                      onChange={(e) => setCredentials({ ...credentials, accessToken: e.target.value })}
                      placeholder="Ex: EAABwzLixnjYBO..."
                      className="w-full px-4 py-2 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Token com permissões: ads_read, ads_management
                  </p>
                </div>
                
                {/* Help text */}
                <div className="bg-brand-50 rounded-xl p-3">
                  <p className="text-xs text-brand-700">
                    <strong>Como obter as credenciais:</strong>
                  </p>
                  <ol className="text-xs text-brand-600 mt-1 space-y-1 list-decimal list-inside">
                    <li>Acesse <a href="https://developers.facebook.com" target="_blank" rel="noopener" className="underline">developers.facebook.com</a></li>
                    <li>Crie um aplicativo ou use um existente</li>
                    <li>Adicione o produto "Marketing API"</li>
                    <li>Gere um Access Token de longa duração</li>
                  </ol>
                </div>
                
                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowCredentials(false)}
                    className="flex-1 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting || !credentials.accessToken}
                    className="flex-1 py-2.5 bg-brand-600 text-white font-bold rounded-xl text-sm hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Testando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Testar e Salvar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <p className="text-xs text-slate-400 mt-4">
            Integração real com Facebook Marketing API
          </p>
        </div>
      ) : (
        <div className="py-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl flex items-center justify-center text-white">
              <Facebook className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900">Facebook Ads</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Conectado</span>
              </div>
              {config.user && (
                <p className="text-sm text-slate-500">{config.user.name}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-medium">Contas de Anúncio</p>
              <p className="text-sm font-bold text-slate-900">{config.adAccountsCount || 0}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-medium">Status</p>
              <p className="text-sm font-bold text-emerald-600">Ativo</p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setShowCredentials(true)}
              className="w-full py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Alterar Credenciais
            </button>
            <button
              onClick={handleDisconnect}
              className="w-full py-2.5 bg-red-50 text-red-600 font-bold rounded-xl text-sm hover:bg-red-100 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Desconectar
            </button>
          </div>

          {/* Edit credentials modal */}
          {showCredentials && (
            <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl shadow-xl max-w-md w-full">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Editar Credenciais</h2>
                  <button onClick={() => setShowCredentials(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      App ID do Facebook
                    </label>
                    <input
                      type="text"
                      value={credentials.appId}
                      onChange={(e) => setCredentials({ ...credentials, appId: e.target.value })}
                      placeholder="Ex: 123456789012345"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      App Secret
                    </label>
                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={credentials.appSecret}
                        onChange={(e) => setCredentials({ ...credentials, appSecret: e.target.value })}
                        placeholder="Ex: abc123def456..."
                        className="w-full px-4 py-2 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Access Token
                    </label>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={credentials.accessToken}
                        onChange={(e) => setCredentials({ ...credentials, accessToken: e.target.value })}
                        placeholder="Ex: EAABwzLixnjYBO..."
                        className="w-full px-4 py-2 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => setShowCredentials(false)}
                    className="flex-1 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveCredentials}
                    disabled={isSaving}
                    className="flex-1 py-2.5 bg-brand-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

