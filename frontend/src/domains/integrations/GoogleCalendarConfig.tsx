// ============================================
// clinxia - Google Calendar Integration Config
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, CheckCircle2, AlertCircle, Loader2, Key, Globe } from 'lucide-react';
import { toast } from '@/hooks/useShared';

interface GoogleCalendarConfigProps {
  clinicId: string;
  isConnected: boolean;
  onConnectionChange: (connected: boolean) => void;
}

const API_BASE = '';

export function GoogleCalendarConfig({ clinicId, isConnected, onConnectionChange }: GoogleCalendarConfigProps) {
  const [apiKey, setApiKey] = useState('');
  const [calendarId, setCalendarId] = useState('primary');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, [clinicId]);

  const loadConfig = async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`${API_BASE}/api/integrations/google/credentials/${clinicId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
      });
      const data = await res.json();
      if (data.credentials) {
        setApiKey(data.credentials.api_key || '');
        setCalendarId(data.credentials.calendar_id || 'primary');
        onConnectionChange(true);
      } else {
        onConnectionChange(false);
      }
    } catch (error) {
      console.error('[Google Calendar] Load config error:', error);
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
      const res = await fetch(`${API_BASE}/api/integrations/google/credentials`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          clinicId,
          api_key: apiKey,
          calendar_id: calendarId
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
      const res = await fetch(`${API_BASE}/api/integrations/google/calendar/sync`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          clinicId,
          action: 'test'
        })
      });
      const data = await res.json();
      
      if (data.ok || data.demo) {
        setTestResult({ success: true, message: 'Conexão com Google Calendar OK!' });
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
      await fetch(`${API_BASE}/api/integrations/google/credentials/${clinicId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
      });
      setApiKey('');
      setCalendarId('primary');
      setTestResult(null);
      onConnectionChange(false);
      toast('Google Calendar desconectado', 'info');
    } catch (error) {
      toast('Erro ao desconectar', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
        <h4 className="font-bold text-brand-900 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Google Calendar
        </h4>
        <p className="text-sm text-brand-700 mt-1">
          Sincronize seus agendamentos com o Google Calendar automaticamente
        </p>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">
          <Key className="w-4 h-4 inline mr-1" />
          Google API Key
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="AIzaSy..."
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm font-mono"
        />
        <p className="text-xs text-slate-500 mt-1">
          Obtenha em: Google Cloud Console → APIs → Credentials → API Key
        </p>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">
          <Globe className="w-4 h-4 inline mr-1" />
          Calendar ID
        </label>
        <input
          type="text"
          value={calendarId}
          onChange={(e) => setCalendarId(e.target.value)}
          placeholder="primary"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm"
        />
        <p className="text-xs text-slate-500 mt-1">
          Geralmente "primary" para o calendário principal
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
          Desconectar Google Calendar
        </button>
      )}
    </div>
  );
}

