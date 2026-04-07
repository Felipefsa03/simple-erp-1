import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Send, Target, TrendingUp, Users, MessageSquare, Zap, ArrowRight, Facebook, Mail, MonitorSmartphone, X, CheckCircle2, BarChart3, KanbanSquare, UserPlus2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useClinicStore } from '@/stores/clinicStore';
import { useAuth } from '@/hooks/useAuth';
import { toast, formatCurrency } from '@/hooks/useShared';
import { Modal, LoadingButton } from '@/components/shared';
import { integrationsApi } from '@/lib/integrationsApi';
import { CampaignManager } from './CampaignManager';
import { useWhatsAppSync } from '@/hooks/useWhatsAppSync';

// The HTML Template provided by the user
const generateEmailTemplate = (clinicName: string, whatsapp: string) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { margin:0; padding:0; background:#f9f9f9; font-family: 'Segoe UI', Arial, sans-serif; }
  .wrapper { max-width:600px; margin:auto; background:#ffffff; border: 1px solid #eeeeee; }
  
  /* Header */
  .header { 
    background:#0891b2; /* Cyan-600 to match ERP */
    padding: 40px 0 60px 0; 
    position: relative;
    text-align: left;
  }
  
  .logo-container { padding-left: 30px; margin-bottom: 25px; color: white; font-size: 28px; font-weight: bold; }
  
  /* Pílula branca encostada na direita */
  .card-container { text-align: right; }
  .card {
    display: inline-block;
    background: #ffffff;
    color: #0891b2;
    padding: 15px 35px;
    border-radius: 40px 0 0 40px;
    font-size: 24px;
    font-weight: bold;
  }

  .content { padding: 45px 30px; color: #333333; }
  
  .nome { 
    font-size: 32px; 
    font-weight: 800; 
    line-height: 1.1; 
    color: #1a1a1a;
    margin-bottom: 25px;
  }

  .texto { font-size: 16px; line-height: 1.6; color: #444444; }

  .button {
    margin-top: 30px;
    display: inline-block;
    background: #25D366;
    color: #ffffff !important;
    text-decoration: none;
    padding: 18px 35px;
    border-radius: 10px;
    font-weight: bold;
    font-size: 16px;
  }

  .footer { 
    background: #0f172a; /* Slate-900 */
    color: #ffffff; 
    padding: 45px 30px; 
    text-align: left; 
    font-size: 14px; 
    line-height: 1.8;
  }
  
  .footer p { margin: 10px 0; }
  .footer a { color: #22d3ee; text-decoration: none; font-weight: bold; }
</style>
</head>

<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo-container">
        ${clinicName}
      </div>
      <div class="card-container">
        <div class="card">Aviso Importante</div>
      </div>
    </div>

    <div class="content">
      <div class="nome">Olá {{nomeFormatado}},</div>

      <div class="texto">
        A equipe da <b>${clinicName}</b> informa que é hora do seu retorno.<br><br>

        Manter suas consultas em dia é fundamental para garantir sua saúde e bem-estar.<br><br>

        <b>Canais de Atendimento:</b><br>
        📞 ${whatsapp}
      </div>

      <a href="https://wa.me/55${whatsapp.replace(/\D/g, '')}" class="button">Falar com Atendimento Agora</a>
    </div>

    <div class="footer">
      <p>Abraços,<br><b>Equipe ${clinicName}</b></p>
      
      <p>Siga-nos nas redes sociais e acompanhe nossas novidades.</p>
      
      <hr style="border: 0; border-top: 1px solid #334155; margin: 25px 0;">
      
      <p>Quer tirar dúvidas sobre nossos serviços? Então acesse aqui:</p>
      <p>Quer falar com a gente? Estamos à disposição.</p>
    </div>
  </div>
</body>
</html>
`;

export function Marketing() {
  const { user, clinic } = useAuth();
  const { patients, appointments, transactions, leads, funnelStages, automationRules, addLead, moveLeadStage, addAutomationRule } = useClinicStore();
  const clinicId = useAuth(s => s.getClinicId()) || '00000000-0000-0000-0000-000000000001';

  // Auto-sync WhatsApp on mount
  const { syncStatus } = useWhatsAppSync(clinicId, (connected) => {
    setWhatsAppSessionActive(connected);
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'insights' | 'crm'>('overview');
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignStep, setCampaignStep] = useState(1);
  const [campaignType, setCampaignType] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [campaignTarget, setCampaignTarget] = useState('all');
  const [previewTemplate, setPreviewTemplate] = useState('');
  const [whatsAppRows, setWhatsAppRows] = useState('');
  const [whatsAppDefaultMessage, setWhatsAppDefaultMessage] = useState('');
  const [whatsAppLinks, setWhatsAppLinks] = useState<{ phone: string; message: string; url: string }[]>([]);
  const [whatsAppDelaySec, setWhatsAppDelaySec] = useState(25);
  const [whatsAppQueueIndex, setWhatsAppQueueIndex] = useState(0);
  const [whatsAppStatuses, setWhatsAppStatuses] = useState<('pending' | 'opened' | 'sent' | 'skipped')[]>([]);
  const [whatsAppCooldownUntil, setWhatsAppCooldownUntil] = useState<number | null>(null);
  const [whatsAppSessionActive, setWhatsAppSessionActive] = useState(false);
  const [whatsAppNow, setWhatsAppNow] = useState(() => Date.now());
  const [whatsAppLog, setWhatsAppLog] = useState<string[]>([]);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadSource, setNewLeadSource] = useState<'instagram' | 'google_ads' | 'facebook_ads' | 'referral' | 'walk_in' | 'other'>('instagram');

  const clinicPatients = useMemo(() => (patients || []).filter(p => p.clinic_id === clinicId), [patients, clinicId]);
  const clinicAppointments = useMemo(() => (appointments || []).filter(a => a.clinic_id === clinicId), [appointments, clinicId]);
  const clinicTransactions = useMemo(() => (transactions || []).filter(t => t.clinic_id === clinicId), [transactions, clinicId]);
  const clinicLeads = useMemo(() => (leads || []).filter(l => l.clinic_id === clinicId), [leads, clinicId]);
  const clinicStages = useMemo(() => (funnelStages || []).filter(s => s.clinic_id === clinicId).sort((a, b) => a.order - b.order), [funnelStages, clinicId]);
  const clinicRules = useMemo(() => (automationRules || []).filter(rule => rule.clinic_id === clinicId), [automationRules, clinicId]);

  const atRiskPatients = clinicPatients.filter(p => p.status === 'risk' || p.status === 'inactive');
  const totalRevenue = clinicTransactions.filter(t => t.type === 'income' && t.status === 'paid').reduce((s, t) => s + t.amount, 0);
  const avgTicket = clinicAppointments.filter(a => a.status === 'done').length > 0
    ? totalRevenue / clinicAppointments.filter(a => a.status === 'done').length : 0;

  const handleOpenPreview = () => {
    const html = generateEmailTemplate(clinic?.name || 'Sua Clínica', clinic?.phone || '(11) 99999-9999');
    setPreviewTemplate(html);
  };

  const handleCreateCampaign = async () => {
    try {
      if (campaignType === 'facebook') {
        await integrationsApi.pixelEvent('meta', {
          event_name: campaignName || 'campanha_facebook',
          target: campaignTarget,
          timestamp: new Date().toISOString(),
        });
      }
      if (campaignType === 'email') {
        await integrationsApi.rdEvent('EMAIL_CAMPAIGN_CREATED', {
          campaign_name: campaignName,
          target: campaignTarget,
          clinic_id: clinicId,
        });
      }
      if (campaignType === 'whatsapp') {
        const targets = campaignTarget === 'all' ? clinicPatients : campaignTarget === 'inactive' ? clinicPatients.filter(p => p.status === 'inactive') : campaignTarget === 'risk' ? clinicPatients.filter(p => p.status === 'risk') : clinicPatients;
        await integrationsApi.sendNotification({
          channel: 'whatsapp',
          recipients: targets.slice(0, 50).map(p => p.phone || p.id),
          message: whatsAppDefaultMessage || 'Campanha enviada via CRM Clinxia.',
          metadata: { campaign_name: campaignName, target: campaignTarget },
        });
      }
    } catch (error) {
      console.error(error);
      toast('Campanha criada, mas houve falha em alguma integracao.', 'warning');
    }
    toast('Campanha disparada com sucesso!', 'success');
    setIsCampaignModalOpen(false);
    setCampaignStep(1);
    setCampaignType('');
    setCampaignName('');
  };

  const handleAddLead = () => {
    if (!newLeadName.trim()) {
      toast('Informe o nome do lead.', 'error');
      return;
    }
    const firstStage = clinicStages[0];
    if (!firstStage) {
      toast('Configure as etapas do funil antes de cadastrar leads.', 'error');
      return;
    }
    addLead({
      clinic_id: clinicId,
      name: newLeadName.trim(),
      phone: newLeadPhone.trim() || undefined,
      source: newLeadSource,
      score: 50,
      stage_id: firstStage.id,
    });
    setNewLeadName('');
    setNewLeadPhone('');
    setNewLeadSource('instagram');
    toast('Lead adicionado no funil!');
  };

  const handleEnableDefaultAutomations = () => {
    if (clinicRules.length > 0) {
      toast('Automações já configuradas.', 'info');
      return;
    }
    addAutomationRule({
      clinic_id: clinicId,
      name: 'Cobrança automática 3 dias',
      type: 'billing',
      channel: 'whatsapp',
      enabled: true,
      trigger: { event: 'payment_overdue', delay_hours: 72 },
              template: 'Oi {{name}}, identificamos uma pendência. Precisa de ajuda para regularizar?',
    });
    addAutomationRule({
      clinic_id: clinicId,
      name: 'Reativação de inativos',
      type: 'reactivation',
      channel: 'email',
      enabled: true,
      trigger: { event: 'patient_inactive', inactivity_days: 90 },
      template: 'Estamos com saudade! Clique para agendar seu retorno.',
    });
    toast('Automações padrão ativadas com sucesso!');
  };

  const handleGenerateWhatsAppLinks = () => {
    const lines = whatsAppRows.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast('Adicione números e mensagens para gerar os links.', 'error');
      return;
    }
    const links = lines.map((line) => {
      const parts = line.split(';');
      const rawNumber = parts[0] || '';
      const rawMessage = parts.slice(1).join(';');
      let numero = rawNumber.toString().replace(/\D/g, '');
      if (numero && !numero.startsWith('55')) {
        numero = `55${numero}`;
      }
      const mensagem = (rawMessage || whatsAppDefaultMessage || '').toString().trim();
      const url = numero && mensagem ? `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}` : '';
      return { phone: numero, message: mensagem, url };
    }).filter(item => item.phone && item.message && item.url);

    if (links.length === 0) {
      toast('Nenhum link válido foi gerado. Verifique os dados.', 'error');
      return;
    }
    setWhatsAppLinks(links);
    setWhatsAppStatuses(Array.from({ length: links.length }, () => 'pending'));
    setWhatsAppQueueIndex(0);
    setWhatsAppCooldownUntil(null);
    setWhatsAppSessionActive(false);
    setWhatsAppLog([]);
    toast('Links gerados com sucesso!');
  };


  const appendWhatsAppLog = (message: string) => {
    setWhatsAppLog(prev => [message, ...prev].slice(0, 12));
  };

  const updateWhatsAppStatus = (index: number, status: 'pending' | 'opened' | 'sent' | 'skipped') => {
    setWhatsAppStatuses(prev => {
      const base: ('pending' | 'opened' | 'sent' | 'skipped')[] = prev.length ? [...prev] : Array.from({ length: whatsAppLinks.length }, () => 'pending' as const);
      base[index] = status;
      return base;
    });
  };

  const handleStartWhatsAppAssist = () => {
    if (whatsAppLinks.length === 0) {
      toast('Gere os links antes de iniciar o modo assistido.', 'error');
      return;
    }
    if (!whatsAppStatuses.length) {
      setWhatsAppStatuses(Array.from({ length: whatsAppLinks.length }, () => 'pending'));
    }
    setWhatsAppSessionActive(true);
    appendWhatsAppLog('Modo assistido iniciado.');
  };

  const handleStopWhatsAppAssist = () => {
    setWhatsAppSessionActive(false);
    appendWhatsAppLog('Modo assistido pausado.');
  };

  const handleResetWhatsAppQueue = () => {
    setWhatsAppQueueIndex(0);
    setWhatsAppStatuses(Array.from({ length: whatsAppLinks.length }, () => 'pending'));
    setWhatsAppCooldownUntil(null);
    setWhatsAppSessionActive(false);
    setWhatsAppLog([]);
  };

  const handleOpenCurrentWhatsApp = () => {
    const current = whatsAppLinks[whatsAppQueueIndex];
    if (!current) return;
    if (!whatsAppSessionActive) {
      toast('Inicie o modo assistido para abrir links.', 'warning');
      return;
    }
    if (cooldownLeft > 0) {
      toast(`Aguarde ${cooldownLeft}s para o proximo envio.`, 'warning');
      return;
    }
    window.open(current.url, '_blank');
    updateWhatsAppStatus(whatsAppQueueIndex, 'opened');
    appendWhatsAppLog(`Link aberto para +${current.phone}.`);
  };

  const handleMarkWhatsAppSent = (simulated: boolean = false) => {
    const current = whatsAppLinks[whatsAppQueueIndex];
    if (!current) return;
    if (!whatsAppSessionActive) {
      toast('Inicie o modo assistido para marcar envios.', 'warning');
      return;
    }
    updateWhatsAppStatus(whatsAppQueueIndex, 'sent');
    appendWhatsAppLog(`${simulated ? 'Simulado' : 'Enviado'} para +${current.phone}.`);
    setWhatsAppQueueIndex(prev => prev + 1);
    const nextDelay = Math.max(5, Number(whatsAppDelaySec) || 5);
    setWhatsAppCooldownUntil(Date.now() + nextDelay * 1000);
  };

  const handleSkipWhatsApp = () => {
    const current = whatsAppLinks[whatsAppQueueIndex];
    if (!current) return;
    if (!whatsAppSessionActive) {
      toast('Inicie o modo assistido para pular.', 'warning');
      return;
    }
    updateWhatsAppStatus(whatsAppQueueIndex, 'skipped');
    appendWhatsAppLog(`Pulou +${current.phone}.`);
    setWhatsAppQueueIndex(prev => prev + 1);
    const nextDelay = Math.max(5, Number(whatsAppDelaySec) || 5);
    setWhatsAppCooldownUntil(Date.now() + nextDelay * 1000);
  };

  const queueCompletedRef = React.useRef(false);

  useEffect(() => {
    if (!whatsAppSessionActive) return;
    const timer = setInterval(() => setWhatsAppNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [whatsAppSessionActive]);

  useEffect(() => {
    if (whatsAppSessionActive && whatsAppLinks.length > 0 && whatsAppQueueIndex >= whatsAppLinks.length && !queueCompletedRef.current) {
      queueCompletedRef.current = true;
      setWhatsAppSessionActive(false);
      setWhatsAppLog(prev => ['Fila concluída.', ...prev].slice(0, 12));
    }
    if (whatsAppQueueIndex < whatsAppLinks.length) {
      queueCompletedRef.current = false;
    }
  }, [whatsAppSessionActive, whatsAppQueueIndex, whatsAppLinks.length]);

  const cooldownLeft = whatsAppCooldownUntil ? Math.max(0, Math.ceil((whatsAppCooldownUntil - whatsAppNow) / 1000)) : 0;
  const currentWhatsApp = whatsAppLinks[whatsAppQueueIndex];
  const queueDone = whatsAppLinks.length > 0 && whatsAppQueueIndex >= whatsAppLinks.length;
  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-500" />Marketing & Campanhas
          </h1>
          <p className="text-slate-500">Automações, captação e retenção inteligente de pacientes.</p>
        </div>
      </header>

      <div className="flex bg-white border border-slate-100 rounded-2xl p-1">
        {[
          { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
          { id: 'campaigns', label: 'Campanhas', icon: Send },
          { id: 'insights', label: 'IA Insights', icon: Zap },
          { id: 'crm', label: 'CRM & Funil', icon: KanbanSquare },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all", activeTab === tab.id ? "bg-brand-50 text-brand-600" : "text-slate-500 hover:text-slate-900")}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <Target className="w-8 h-8 text-cyan-500 mb-4" />
            <p className="text-sm text-slate-500">Pacientes em Risco</p>
            <p className="text-3xl font-bold text-slate-900">{atRiskPatients.length}</p>
            <p className="text-xs text-amber-600 mt-1">Precisam de atenção</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <TrendingUp className="w-8 h-8 text-emerald-500 mb-4" />
            <p className="text-sm text-slate-500">Ticket Médio</p>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(avgTicket)}</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <Users className="w-8 h-8 text-blue-500 mb-4" />
            <p className="text-sm text-slate-500">Base Total</p>
            <p className="text-3xl font-bold text-slate-900">{(patients || []).length}</p>
            <p className="text-xs text-slate-400 mt-1">{(patients || []).filter(p => p.status === 'active').length} ativos</p>
          </div>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <CampaignManager
          clinicId={clinicId}
          clinicName={clinic?.name || 'Sua clínica'}
          clinicPhone={clinic?.phone || ''}
          patients={clinicPatients}
        />
      )}

      {activeTab === 'insights' && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl" />
          <div className="flex items-center gap-2 mb-6 relative z-10">
            <Sparkles className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold">Insights da IA</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            {[
              { icon: '📊', title: 'Horários de Pico', desc: 'Terças e Quintas às 10h são os horários mais demandados. Considere horários estendidos.' },
              { icon: '🔄', title: 'Retorno de Pacientes', desc: `${atRiskPatients.length} pacientes não retornaram nos últimos 90 dias. Uma campanha de e-mail pode recuperar até 30%.` },
              { icon: '💰', title: 'Upselling', desc: 'Pacientes de limpeza têm 45% de chance de aceitar clareamento. Sugira no pós-atendimento.' },
              { icon: '⭐', title: 'Satisfação', desc: 'Implemente NPS após cada consulta para medir a satisfação e identificar promotores.' },
            ].map((insight, i) => (
              <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                <p className="text-2xl mb-2">{insight.icon}</p>
                <p className="font-bold mb-1 col-span-2">{insight.title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{insight.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'crm' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <input
                value={newLeadName}
                onChange={e => setNewLeadName(e.target.value)}
                placeholder="Nome do lead"
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
              />
              <input
                value={newLeadPhone}
                onChange={e => setNewLeadPhone(e.target.value)}
                placeholder="Telefone"
                className="w-full md:w-52 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
              />
              <select
                value={newLeadSource}
                onChange={e => setNewLeadSource(e.target.value as any)}
                className="w-full md:w-52 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
              >
                <option value="instagram">Instagram</option>
                <option value="google_ads">Google Ads</option>
                <option value="facebook_ads">Facebook Ads</option>
                <option value="referral">Indicacao</option>
                <option value="walk_in">Presencial</option>
                <option value="other">Outro</option>
              </select>
              <button onClick={handleAddLead} className="px-4 py-2 bg-cyan-600 text-white rounded-xl text-sm font-bold hover:bg-cyan-700 inline-flex items-center gap-2">
                <UserPlus2 className="w-4 h-4" />
                Novo Lead
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {clinicStages.map(stage => {
              const stageLeads = clinicLeads.filter(lead => lead.stage_id === stage.id);
              return (
                <div key={stage.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900">{stage.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{stageLeads.length}</span>
                  </div>
                  <div className="space-y-2">
                    {stageLeads.length === 0 ? (
                      <p className="text-xs text-slate-400">Sem leads nesta etapa.</p>
                    ) : stageLeads.map(lead => (
                      <div key={lead.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-sm font-bold text-slate-800">{lead.name}</p>
                        <p className="text-xs text-slate-500">{lead.source} • score {lead.score}</p>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {clinicStages.filter(s => s.order > stage.order).slice(0, 1).map(next => (
                            <button key={next.id} onClick={() => moveLeadStage(lead.id, next.id)} className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-1 rounded-md">
                              Mover para {next.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Automações CRM</h3>
              <button onClick={handleEnableDefaultAutomations} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800">
                Ativar automações padrão
              </button>
            </div>
            <div className="space-y-2">
              {clinicRules.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma automação cadastrada.</p>
              ) : clinicRules.map(rule => (
                <div key={rule.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{rule.name}</p>
                    <p className="text-xs text-slate-500">{rule.channel} • trigger {rule.trigger.event}</p>
                  </div>
                  <span className={cn('text-xs font-bold px-2 py-1 rounded-full', rule.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                    {rule.enabled ? 'Ativa' : 'Pausada'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      <Modal isOpen={isCampaignModalOpen} onClose={() => { setIsCampaignModalOpen(false); setCampaignStep(1); }} title="Nova Campanha">
        {campaignStep === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 mb-4">Onde você quer rodar esta campanha?</p>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'facebook', name: 'Facebook & Instagram Ads', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50' },
                { id: 'email', name: 'E-mail Marketing', icon: Mail, color: 'text-purple-600', bg: 'bg-purple-50' },
                { id: 'whatsapp', name: 'Automação WhatsApp', icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50' },
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => { setCampaignType(c.id); setCampaignStep(2); }}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-cyan-500 hover:shadow-md transition-all text-left"
                >
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", c.bg, c.color)}>
                    <c.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500">Fluxos integrados com seu ERP.</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {campaignStep === 2 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome da Campanha</label>
              <input
                type="text"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                placeholder="Ex: Recuperação de Inativos - 2026"
                className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Público-Alvo</label>
              <select value={campaignTarget} onChange={e => setCampaignTarget(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none">
                <option value="all">Toda a Base ({patients.length} pacientes)</option>
                <option value="inactive">Pacientes Inativos ({atRiskPatients.length} pacientes)</option>
                <option value="birthdays">Aniversariantes do Mês</option>
              </select>
            </div>

            {campaignType === 'email' && (
              <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-100">
                <p className="text-sm font-bold text-cyan-800 mb-2">Template "Aviso Importante"</p>
                <p className="text-xs text-cyan-600 mb-4">Utilizaremos o template institucional para disparos focados em retorno preventivo e engajamento.</p>
                <button onClick={handleOpenPreview} className="text-xs font-bold bg-white text-cyan-700 px-3 py-1.5 rounded-lg shadow-sm border border-cyan-200 hover:bg-cyan-50">
                  Pré-visualizar HTML
                </button>
              </div>
            )}
            {campaignType === 'facebook' && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-sm font-bold text-blue-800 mb-2">Público Semelhante (Lookalike)</p>
                <p className="text-xs text-blue-600">O Clinxia enviará sua lista de pacientes rentáveis para o Facebook criar públicos altamente segmentados e gerar novos leads direto no seu funil.</p>
              </div>
            )}

            {campaignType === 'whatsapp' && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-sm font-bold text-green-800 mb-2">Envio por Links Individuais (Manual)</p>
                  <p className="text-xs text-green-700">Este modo gera links no estilo planilha/wa.me. Não automatiza envios em massa, evitando bloqueios.</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mensagem Padrão (opcional)</label>
                  <textarea
                    value={whatsAppDefaultMessage}
                    onChange={e => setWhatsAppDefaultMessage(e.target.value)}
                    placeholder="Ex: Olá! Gostaríamos de confirmar seu retorno..."
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none min-h-[80px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lista (um por linha)</label>
                  <textarea
                    value={whatsAppRows}
                    onChange={e => setWhatsAppRows(e.target.value)}
                    placeholder="11999999999;Olá Ana, sua consulta está agendada
21988887777;Olá João, temos horário disponível"
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none min-h-[140px]"
                  />
                  <p className="text-[10px] text-slate-400">Formato: número;mensagem. Se a mensagem estiver vazia, usa a Mensagem Padrão.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateWhatsAppLinks}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700"
                  >
                    Gerar Links
                  </button>
                  <button
                    onClick={() => { setWhatsAppRows(''); setWhatsAppLinks([]); }}
                    className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200"
                  >
                    Limpar
                  </button>
                </div>
                {whatsAppLinks.length > 0 && (
                  <div className="bg-white border border-slate-100 rounded-xl p-3 max-h-48 overflow-auto">
                    <p className="text-xs font-bold text-slate-500 mb-2">Links Gerados</p>
                    <div className="space-y-2">
                      {whatsAppLinks.map((item, idx) => (
                        <a
                          key={`${item.phone}-${idx}`}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-xs text-emerald-700 font-bold hover:underline"
                        >
                          Enviar mensagem para +{item.phone}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {whatsAppLinks.length > 0 && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Modo assistido</p>
                        <p className="text-[10px] text-slate-500">Envio manual com intervalo recomendado para reduzir bloqueios.</p>
                      </div>
                      <span className="text-xs font-bold text-slate-500">{Math.min(whatsAppQueueIndex + 1, whatsAppLinks.length)}/{whatsAppLinks.length}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Intervalo (seg)</label>
                        <input
                          type="number"
                          min={5}
                          max={900}
                          value={whatsAppDelaySec}
                          onChange={e => setWhatsAppDelaySec(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                        />
                      </div>
                      <div className="flex items-end gap-2 md:col-span-2">
                        <button
                          onClick={handleStartWhatsAppAssist}
                          className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700"
                        >
                          Iniciar
                        </button>
                        <button
                          onClick={handleStopWhatsAppAssist}
                          className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200"
                        >
                          Pausar
                        </button>
                        <button
                          onClick={handleResetWhatsAppQueue}
                          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50"
                        >
                          Reiniciar fila
                        </button>
                      </div>
                    </div>

                    {queueDone ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-bold">
                        Fila concluida.
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-100 rounded-xl p-3">
                        <p className="text-xs font-bold text-slate-500 mb-2">Proximo envio</p>
                        <div className="text-sm text-slate-700">
                          <span className="font-bold">+{currentWhatsApp?.phone || '-'} </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{currentWhatsApp?.message || 'Sem mensagem'} </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            onClick={handleOpenCurrentWhatsApp}
                            disabled={!whatsAppSessionActive || cooldownLeft > 0 || !currentWhatsApp}
                            className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Abrir link
                          </button>
                          <button
                            onClick={() => handleMarkWhatsAppSent(false)}
                            disabled={!whatsAppSessionActive || !currentWhatsApp}
                            className="px-3 py-2 bg-cyan-600 text-white text-xs font-bold rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                          >
                            Marcar enviado
                          </button>
                          <button
                            onClick={() => handleMarkWhatsAppSent(true)}
                            disabled={!whatsAppSessionActive || !currentWhatsApp}
                            className="px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 disabled:opacity-50"
                          >
                            Simular envio
                          </button>
                          <button
                            onClick={handleSkipWhatsApp}
                            disabled={!whatsAppSessionActive || !currentWhatsApp}
                            className="px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 disabled:opacity-50"
                          >
                            Pular
                          </button>
                        </div>
                        {cooldownLeft > 0 && (
                          <p className="text-[10px] text-amber-600 mt-2">Aguarde {cooldownLeft}s para o proximo envio.</p>
                        )}
                      </div>
                    )}

                    {whatsAppLog.length > 0 && (
                      <div className="text-[10px] text-slate-500 space-y-1">
                        {whatsAppLog.map((item, i) => (
                          <div key={`${item}-${i}`}>{item}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button onClick={() => setCampaignStep(1)} className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200">Voltar</button>
              <button onClick={handleCreateCampaign} disabled={!campaignName} className="flex-1 py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 disabled:opacity-50">Lançar Campanha</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Email Template Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 sm:p-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><MonitorSmartphone className="w-5 h-5" /> Preview da Campanha</h3>
              <button onClick={() => setPreviewTemplate('')} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 bg-slate-100 overflow-hidden relative p-4 lg:p-8">
              <iframe
                srcDoc={previewTemplate}
                className="w-full h-full bg-white rounded-xl shadow-sm mx-auto"
                style={{ maxWidth: '600px' }}
                title="Email Preview"
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
