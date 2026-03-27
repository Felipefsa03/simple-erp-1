// ============================================
// LuminaFlow - Integrações Externas
// Google Calendar, Facebook Ads, Google Ads, Asaas, WhatsApp
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, ExternalLink, Settings, CheckCircle2, AlertCircle,
  Facebook, Target, CreditCard, Link2, Unlink, RefreshCw,
  Globe, Mail, Smartphone, Zap, Shield, X, TrendingUp, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useClinicStore } from '@/stores/clinicStore';
import { toast } from '@/hooks/useShared';
import { WhatsAppIntegration } from './WhatsAppConnection';
import { FacebookAdsConfig } from './FacebookAdsConfig';
import { AsaasConfig } from './AsaasConfig';
import { GoogleCalendarConfig } from './GoogleCalendarConfig';
import { GoogleAdsConfig } from './GoogleAdsConfig';
import { EmailMarketingConfig } from './EmailMarketingConfig';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  connected: boolean;
  category: 'calendar' | 'ads' | 'payments' | 'communication' | 'marketing' | 'medical';
  features: string[];
}

export function Integrations() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  
  // Estado para clínica selecionada (Super Admin pode trocar)
  const [selectedClinicId, setSelectedClinicId] = useState<string>(() => {
    if (user?.role === 'super_admin') return 'clinic-1';
    return user?.clinic_id || 'clinic-1';
  });
  
  const clinicId = selectedClinicId;
  
  // Usar o store multi-tenant para WhatsApp por clínica
  // CORREÇÃO: Usar seletor estável para evitar loop infinito
  const whatsappIntegrations = useClinicStore(s => s.whatsappIntegrations);
  const whatsappConnected = useMemo(() => {
    const status = whatsappIntegrations[clinicId];
    return status?.connected || false;
  }, [whatsappIntegrations, clinicId]);
  
  // Lista de clínicas para o Super Admin selecionar
  const clinics = [
    { id: 'clinic-1', name: 'Lumina Odontologia' },
    { id: 'clinic-2', name: 'Sorriso Total' },
    { id: 'clinic-3', name: 'Estética Bella' },
  ];
  
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Sincronize agendamentos automaticamente com o Google Calendar',
      icon: Calendar,
      color: 'bg-blue-500',
      connected: false,
      category: 'calendar',
      features: ['Sincronização bidirecional', 'Lembretes automáticos', 'Disponibilidade em tempo real'],
    },
    {
      id: 'facebook-ads',
      name: 'Facebook Ads',
      description: 'Importe leads e métricas de campanhas do Facebook Ads',
      icon: Facebook,
      color: 'bg-blue-600',
      connected: false,
      category: 'ads',
      features: ['Importação automática de leads', 'ROI por campanha', 'Segmentação de público'],
    },
    {
      id: 'google-ads',
      name: 'Google Ads',
      description: 'Acompanhe conversões e custos de aquisição do Google Ads',
      icon: Target,
      color: 'bg-red-500',
      connected: false,
      category: 'ads',
      features: ['Conversões em tempo real', 'Custo por aquisição', 'Palavras-chave performáticas'],
    },
    {
      id: 'asaas',
      name: 'Asaas',
      description: 'Gateway de pagamentos com PIX, boleto e cartão',
      icon: CreditCard,
      color: 'bg-emerald-500',
      connected: false,
      category: 'payments',
      features: ['PIX instantâneo', 'Boleto bancário', 'Cartão de crédito', 'Cobrança recorrente'],
    },
    {
      id: 'email-marketing',
      name: 'E-mail Marketing',
      description: 'Campanhas de e-mail automatizadas e segmentadas',
      icon: Mail,
      color: 'bg-purple-500',
      connected: false,
      category: 'communication',
      features: ['Templates personalizados', 'Automação de sequências', 'Relatórios de abertura'],
    },
    {
      id: 'rd-station',
      name: 'RD Station',
      description: 'Automação de marketing e CRM para clínicas',
      icon: TrendingUp,
      color: 'bg-orange-500',
      connected: false,
      category: 'marketing',
      features: ['Automação de marketing', 'CRM integrado', 'Lead scoring', 'E-mail marketing'],
    },
    {
      id: 'memed',
      name: 'Memed',
      description: 'Plataforma de prescrição digital e receitas médicas',
      icon: FileText,
      color: 'bg-teal-500',
      connected: false,
      category: 'medical',
      features: ['Prescrição digital', 'Receitas automáticas', 'Histórico de prescrições'],
    },
    {
      id: 'meta-pixel',
      name: 'Meta Pixel',
      description: 'Rastreamento de conversões no Facebook e Instagram',
      icon: TrendingUp,
      color: 'bg-blue-700',
      connected: false,
      category: 'ads',
      features: ['Rastreamento de conversões', 'Públicos personalizados', 'Remarketing'],
    },
  ]);

  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showWhatsAppDetail, setShowWhatsAppDetail] = useState(false);
  const [showFacebookConfig, setShowFacebookConfig] = useState(false);
  const [showAsaasConfig, setShowAsaasConfig] = useState(false);
  const [showGoogleCalendarConfig, setShowGoogleCalendarConfig] = useState(false);
  const [showGoogleAdsConfig, setShowGoogleAdsConfig] = useState(false);
  const [showEmailMarketingConfig, setShowEmailMarketingConfig] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [asaasConnected, setAsaasConnected] = useState(false);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [googleAdsConnected, setGoogleAdsConnected] = useState(false);
  const [emailMarketingConnected, setEmailMarketingConnected] = useState(false);
  const [rdStationConnected, setRdStationConnected] = useState(false);
  const [memedConnected, setMemedConnected] = useState(false);
  const [metaPixelConnected, setMetaPixelConnected] = useState(false);

  const categories = [
    { id: 'calendar', label: 'Calendário', icon: Calendar },
    { id: 'ads', label: 'Marketing Digital', icon: Target },
    { id: 'payments', label: 'Pagamentos', icon: CreditCard },
    { id: 'communication', label: 'Comunicação', icon: Globe },
    { id: 'marketing', label: 'Automação', icon: TrendingUp },
    { id: 'medical', label: 'Médico', icon: FileText },
  ];

  const handleConnect = (integration: Integration) => {
    if (integration.id === 'asaas') {
      toast('Asaas já está conectado.', 'info');
      return;
    }
    
    toast(`Conectando com ${integration.name}...`, 'info');
    
    setTimeout(() => {
      setIntegrations(prev => prev.map(i => 
        i.id === integration.id ? { ...i, connected: true } : i
      ));
      toast(`${integration.name} conectado com sucesso!`, 'success');
    }, 1500);
  };

  const handleDisconnect = (integration: Integration) => {
    setIntegrations(prev => prev.map(i => 
      i.id === integration.id ? { ...i, connected: false } : i
    ));
    toast(`${integration.name} desconectado.`, 'info');
    setSelectedIntegration(null);
  };

  const connectedCount = integrations.filter(i => i.connected).length + (whatsappConnected ? 1 : 0);
  const totalCount = integrations.length + 1; // +1 for WhatsApp

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Link2 className="w-6 h-6 text-cyan-500" /> Integrações
          </h1>
          <p className="text-slate-500">Conecte suas ferramentas favoritas para automatizar seu fluxo</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{connectedCount} de {totalCount} conectadas</span>
          <div className="w-32 bg-slate-100 rounded-full h-2">
            <div 
              className="bg-cyan-500 h-2 rounded-full transition-all"
              style={{ width: `${(connectedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Seletor de Clínica (apenas Super Admin) */}
      {isSuperAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-blue-800">Visualizando clínica:</span>
          </div>
          <select
            value={selectedClinicId}
            onChange={e => setSelectedClinicId(e.target.value)}
            className="flex-1 max-w-xs px-4 py-2 rounded-xl border border-blue-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium"
          >
            {clinics.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <span className="text-xs text-blue-600">
            As integrações são isoladas por clínica
          </span>
        </div>
      )}

      {/* WhatsApp Business Card - Special */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-3xl border border-green-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-200">
              <Smartphone className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">WhatsApp Business</h3>
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-full",
                  whatsappConnected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                )}>
                  {whatsappConnected ? 'Conectado' : 'Não conectado'}
                </span>
              </div>
              <p className="text-sm text-slate-500">Conecte sua conta do WhatsApp para enviar mensagens e campanhas</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl p-3 text-center border border-green-100">
            <p className="text-xs text-slate-500">Mensagens</p>
            <p className="text-sm font-bold text-slate-900">Automáticas</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-green-100">
            <p className="text-xs text-slate-500">Campanhas</p>
            <p className="text-sm font-bold text-slate-900">Em massa</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-green-100">
            <p className="text-xs text-slate-500">Confirmações</p>
            <p className="text-sm font-bold text-slate-900">Automáticas</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowWhatsAppDetail(true)}
          className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200"
        >
          <Link2 className="w-5 h-5" />
          {whatsappConnected ? 'Gerenciar Conexão' : 'Conectar WhatsApp Business'}
        </button>
      </div>

      {/* Other Integrations */}
      <div className="space-y-4">
        {categories.map(category => {
          const categoryIntegrations = integrations.filter(i => i.category === category.id);
          if (categoryIntegrations.length === 0) return null;
          
          return (
            <div key={category.id} className="space-y-4">
              <div className="flex items-center gap-2">
                <category.icon className="w-5 h-5 text-slate-500" />
                <h2 className="text-lg font-bold text-slate-900">{category.label}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryIntegrations.map(integration => (
                  <div 
                    key={integration.id} 
                    className={cn(
                      "bg-white rounded-2xl border p-5 transition-all hover:shadow-md cursor-pointer",
                      integration.connected ? "border-emerald-200" : "border-slate-100"
                    )}
                    onClick={() => {
                      // Abre o modal de configuração diretamente (fluxo: credenciais primeiro)
                      if (integration.id === 'facebook-ads') {
                        setShowFacebookConfig(true);
                      } else if (integration.id === 'asaas') {
                        setShowAsaasConfig(true);
                      } else if (integration.id === 'google-calendar') {
                        setShowGoogleCalendarConfig(true);
                      } else if (integration.id === 'google-ads') {
                        setShowGoogleAdsConfig(true);
                      } else if (integration.id === 'email-marketing') {
                        setShowEmailMarketingConfig(true);
                      } else {
                        setSelectedIntegration(integration);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white", integration.color)}>
                          <integration.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{integration.name}</h3>
                          <p className="text-xs text-slate-500">{integration.description}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-xs font-bold px-2 py-1 rounded-full",
                        integration.connected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {integration.connected ? 'Conectado' : 'Desconectado'}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {integration.features.slice(0, 2).map(feature => (
                        <span key={feature} className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
                          {feature}
                        </span>
                      ))}
                      {integration.features.length > 2 && (
                        <span className="text-[10px] text-slate-400">+{integration.features.length - 2}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* WhatsApp Detail Modal */}
      {showWhatsAppDetail && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">WhatsApp Business</h2>
              <button onClick={() => setShowWhatsAppDetail(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <span className="text-slate-400 text-xl">&times;</span>
              </button>
            </div>
            <div className="p-6">
              <WhatsAppIntegration 
                clinicId={clinicId}
              />
            </div>
          </div>
        </div>
      )}

      {/* Other Integration Modal */}
      {selectedIntegration && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white", selectedIntegration.color)}>
                  <selectedIntegration.icon className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedIntegration.name}</h2>
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full",
                    selectedIntegration.connected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                  )}>
                    {selectedIntegration.connected ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">{selectedIntegration.description}</p>
              
              <div>
                <p className="text-sm font-bold text-slate-900 mb-2">Funcionalidades</p>
                <ul className="space-y-2">
                  {selectedIntegration.features.map(feature => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {selectedIntegration.connected ? (
                <div className="space-y-3">
                  <button 
                    onClick={() => { setShowConfig(true); }}
                    className="w-full py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 flex items-center justify-center gap-2"
                  >
                    <Settings className="w-4 h-4" /> Configurar
                  </button>
                  <button 
                    onClick={() => handleDisconnect(selectedIntegration)}
                    className="w-full py-2.5 bg-red-50 text-red-600 font-bold rounded-xl text-sm hover:bg-red-100 flex items-center justify-center gap-2"
                  >
                    <Unlink className="w-4 h-4" /> Desconectar
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => handleConnect(selectedIntegration)}
                  className="w-full py-2.5 bg-cyan-600 text-white font-bold rounded-xl text-sm hover:bg-cyan-700 flex items-center justify-center gap-2"
                >
                  <Link2 className="w-4 h-4" /> Conectar
                </button>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedIntegration(null)}
                className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Facebook Ads Configuration Modal */}
      {showFacebookConfig && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Facebook Ads</h2>
              <button onClick={() => setShowFacebookConfig(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              <FacebookAdsConfig 
                clinicId={clinicId}
                isConnected={facebookConnected}
                onConnectionChange={(connected) => {
                  setFacebookConnected(connected);
                  setIntegrations(prev => prev.map(i => 
                    i.id === 'facebook-ads' ? { ...i, connected } : i
                  ));
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Asaas Configuration Modal */}
      {showAsaasConfig && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Asaas - Pagamentos</h2>
              <button onClick={() => setShowAsaasConfig(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              <AsaasConfig 
                clinicId={clinicId}
                isConnected={asaasConnected}
                onConnectionChange={(connected) => {
                  setAsaasConnected(connected);
                  setIntegrations(prev => prev.map(i => 
                    i.id === 'asaas' ? { ...i, connected } : i
                  ));
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Google Calendar Configuration Modal */}
      {showGoogleCalendarConfig && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Google Calendar</h2>
              <button onClick={() => setShowGoogleCalendarConfig(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              <GoogleCalendarConfig 
                clinicId={clinicId}
                isConnected={googleCalendarConnected}
                onConnectionChange={(connected) => {
                  setGoogleCalendarConnected(connected);
                  setIntegrations(prev => prev.map(i => 
                    i.id === 'google-calendar' ? { ...i, connected } : i
                  ));
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Google Ads Configuration Modal */}
      {showGoogleAdsConfig && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Google Ads</h2>
              <button onClick={() => setShowGoogleAdsConfig(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              <GoogleAdsConfig 
                clinicId={clinicId}
                isConnected={googleAdsConnected}
                onConnectionChange={(connected) => {
                  setGoogleAdsConnected(connected);
                  setIntegrations(prev => prev.map(i => 
                    i.id === 'google-ads' ? { ...i, connected } : i
                  ));
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* E-mail Marketing Configuration Modal */}
      {showEmailMarketingConfig && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">E-mail Marketing</h2>
              <button onClick={() => setShowEmailMarketingConfig(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              <EmailMarketingConfig 
                clinicId={clinicId}
                isConnected={emailMarketingConnected}
                onConnectionChange={(connected) => {
                  setEmailMarketingConnected(connected);
                  setIntegrations(prev => prev.map(i => 
                    i.id === 'email-marketing' ? { ...i, connected } : i
                  ));
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* RD Station Configuration Modal */}
      {selectedIntegration?.id === 'rd-station' && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">RD Station</h2>
              <button onClick={() => setSelectedIntegration(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Token de API</label>
                <input type="text" placeholder="Seu token do RD Station" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              </div>
              <button onClick={() => { setRdStationConnected(!rdStationConnected); setSelectedIntegration(null); toast(rdStationConnected ? 'Desconectado!' : 'Conectado ao RD Station!'); }} className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700">
                {rdStationConnected ? 'Desconectar' : 'Conectar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Memed Configuration Modal */}
      {selectedIntegration?.id === 'memed' && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Memed</h2>
              <button onClick={() => setSelectedIntegration(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">URL da API</label>
                <input type="text" placeholder="https://api.memed.com.br" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Token de API</label>
                <input type="text" placeholder="Seu token da Memed" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              </div>
              <button onClick={() => { setMemedConnected(!memedConnected); setSelectedIntegration(null); toast(memedConnected ? 'Desconectado!' : 'Conectado à Memed!'); }} className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700">
                {memedConnected ? 'Desconectar' : 'Conectar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meta Pixel Configuration Modal */}
      {selectedIntegration?.id === 'meta-pixel' && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Meta Pixel</h2>
              <button onClick={() => setSelectedIntegration(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Pixel ID</label>
                <input type="text" placeholder="1234567890" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Token de Acesso</label>
                <input type="text" placeholder="Seu access token" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              </div>
              <button onClick={() => { setMetaPixelConnected(!metaPixelConnected); setSelectedIntegration(null); toast(metaPixelConnected ? 'Desconectado!' : 'Conectado ao Meta Pixel!'); }} className="w-full py-3 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800">
                {metaPixelConnected ? 'Desconectar' : 'Conectar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
