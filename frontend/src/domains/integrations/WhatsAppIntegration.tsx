import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Save, TestTube, Check, AlertCircle, Eye, EyeOff, Wifi, WifiOff, Phone, Key, Building2, Shield
} from 'lucide-react';
import { cn, uid } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/useShared';
import type { ClinicIntegration } from '@/types';

interface WhatsAppIntegrationProps {
  clinicId?: string;
}

// Simulação de banco de integrações
const demoIntegrations: ClinicIntegration[] = [
  {
    id: 'int-1',
    clinic_id: 'clinic-1',
    integration_type: 'whatsapp',
    status: 'active',
    api_token: 'demo-token-clinic-1',
    phone_number: '11987654321',
    webhook_url: '',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-03-20T00:00:00Z',
  },
  {
    id: 'int-2',
    clinic_id: 'clinic-2',
    integration_type: 'whatsapp',
    status: 'inactive',
    api_token: '',
    phone_number: '',
    created_at: '2024-02-10T00:00:00Z',
    updated_at: '2024-02-10T00:00:00Z',
  },
];

export function WhatsAppIntegration({ clinicId }: WhatsAppIntegrationProps) {
  const { user, hasPermission } = useAuth();
  const [integrations, setIntegrations] = useState<ClinicIntegration[]>(demoIntegrations);
  const [selectedClinic, setSelectedClinic] = useState(clinicId || 'clinic-1');
  const [form, setForm] = useState({
    api_token: '',
    phone_number: '',
    webhook_url: '',
  });
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin';
  const canManage = isSuperAdmin || isAdmin;

  // Clínicas demo para o Super Admin
  const clinics = [
    { id: 'clinic-1', name: 'Lumina Odontologia' },
    { id: 'clinic-2', name: 'Sorriso Total' },
    { id: 'clinic-3', name: 'Estética Bella' },
  ];

  const currentIntegration = integrations.find(
    i => i.clinic_id === selectedClinic && i.integration_type === 'whatsapp'
  );

  useEffect(() => {
    if (currentIntegration) {
      setForm({
        api_token: currentIntegration.api_token || '',
        phone_number: currentIntegration.phone_number || '',
        webhook_url: currentIntegration.webhook_url || '',
      });
    } else {
      setForm({ api_token: '', phone_number: '', webhook_url: '' });
    }
  }, [selectedClinic, currentIntegration]);

  if (!canManage) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <Shield className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
        <p className="text-sm text-yellow-800 font-medium">Acesso restrito</p>
        <p className="text-xs text-yellow-600 mt-1">Apenas administradores podem gerenciar integrações.</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!form.api_token?.trim()) {
      toast('Token da API é obrigatório.', 'error');
      return;
    }
    if (!form.phone_number?.trim()) {
      toast('Número do WhatsApp é obrigatório.', 'error');
      return;
    }

    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));

    if (currentIntegration) {
      setIntegrations(prev => prev.map(i =>
        i.id === currentIntegration.id
          ? { ...i, api_token: form.api_token, phone_number: form.phone_number, webhook_url: form.webhook_url, status: 'active' as const, updated_at: new Date().toISOString() }
          : i
      ));
    } else {
      const newIntegration: ClinicIntegration = {
        id: uid(),
        clinic_id: selectedClinic,
        integration_type: 'whatsapp',
        status: 'active',
        api_token: form.api_token,
        phone_number: form.phone_number,
        webhook_url: form.webhook_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setIntegrations(prev => [...prev, newIntegration]);
    }

    setSaving(false);
    setSaved(true);
    toast('Integração WhatsApp salva!', 'success');
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTest = async () => {
    if (!form.api_token?.trim()) {
      toast('Configure o token antes de testar.', 'error');
      return;
    }

    setTesting(true);
    await new Promise(r => setTimeout(r, 2000));

    // Simula teste de conexão
    const success = form.api_token.length > 5;
    if (success) {
      toast('Conexão WhatsApp estabelecida!', 'success');
    } else {
      toast('Falha na conexão. Verifique o token.', 'error');
    }
    setTesting(false);
  };

  const toggleStatus = () => {
    if (!currentIntegration) return;
    const newStatus = currentIntegration.status === 'active' ? 'inactive' : 'active';
    setIntegrations(prev => prev.map(i =>
      i.id === currentIntegration.id ? { ...i, status: newStatus } : i
    ));
    toast(`Integração ${newStatus === 'active' ? 'ativada' : 'desativada'}.`, 'success');
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            Integração WhatsApp
          </h2>
          <p className="text-sm text-slate-500 mt-1">Configure a conexão do WhatsApp Business para esta clínica</p>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
          currentIntegration?.status === 'active' ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-700"
        )}>
          {currentIntegration?.status === 'active' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {currentIntegration?.status === 'active' ? 'Conectado' : 'Desconectado'}
        </div>
      </div>

      {/* Seletor de clínica (apenas Super Admin) */}
      {isSuperAdmin && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            Selecionar Clínica
          </label>
          <select
            value={selectedClinic}
            onChange={e => setSelectedClinic(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none text-sm"
          >
            {clinics.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">Como Super Admin, você pode configurar a integração de qualquer clínica.</p>
        </div>
      )}

      {/* Informação para Admin da clínica */}
      {isAdmin && !isSuperAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Building2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Sua clínica</p>
            <p className="text-xs text-blue-600 mt-1">Você está configurando a integração da sua clínica. Usuários comuns não têm acesso a esta área.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-600" />
            Credenciais da API
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Token da API *</label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={form.api_token}
                  onChange={e => setForm(f => ({ ...f, api_token: e.target.value }))}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none text-sm"
                  placeholder="Cole o token da API do WhatsApp Business"
                />
                <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">Obtenha seu token no painel do WhatsApp Business API ou provedor (Z-API, W-API, etc).</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Número do WhatsApp *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.phone_number}
                  onChange={e => setForm(f => ({ ...f, phone_number: formatPhone(e.target.value) }))}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none text-sm"
                  placeholder="(11) 99999-0000"
                  maxLength={15}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Número que aparecerá como remetente nas mensagens.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Webhook URL (opcional)</label>
              <input
                type="url"
                value={form.webhook_url}
                onChange={e => setForm(f => ({ ...f, webhook_url: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none text-sm"
                placeholder="https://seu-dominio.com/api/whatsapp/webhook"
              />
              <p className="text-xs text-slate-400 mt-1">URL para receber respostas e mensagens recebidas.</p>
            </div>
          </div>
        </div>

        {/* Status da conexão */}
        {currentIntegration && (
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  currentIntegration.status === 'active' ? "bg-emerald-500" : "bg-yellow-500"
                )} />
                <span className="text-sm text-slate-600">
                  Status: <strong>{currentIntegration.status === 'active' ? 'Ativo' : 'Inativo'}</strong>
                </span>
              </div>
              <button
                onClick={toggleStatus}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  currentIntegration.status === 'active'
                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                    : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                )}
              >
                {currentIntegration.status === 'active' ? 'Desativar' : 'Ativar'}
              </button>
            </div>
            {currentIntegration.updated_at && (
              <p className="text-xs text-slate-400 mt-2">
                Última atualização: {new Date(currentIntegration.updated_at).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={handleTest}
            disabled={testing || !form.api_token}
            className="flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-50 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <TestTube className="w-4 h-4" />
            {testing ? 'Testando...' : 'Testar Conexão'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors",
              saved ? "bg-emerald-600" : "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Integração'}
          </button>
        </div>
      </div>

      {/* Tabela de integrações (apenas Super Admin) */}
      {isSuperAdmin && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Todas as Integrações</h3>
            <p className="text-xs text-slate-400 mt-1">Visão geral de todas as clínicas</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Clínica</th>
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Última Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clinics.map(clinic => {
                const integration = integrations.find(i => i.clinic_id === clinic.id);
                return (
                  <tr key={clinic.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{clinic.name}</td>
                    <td className="px-4 py-3 text-slate-600">{integration?.phone_number || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                        integration?.status === 'active' ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-700"
                      )}>
                        {integration?.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {integration?.updated_at ? new Date(integration.updated_at).toLocaleDateString('pt-BR') : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
