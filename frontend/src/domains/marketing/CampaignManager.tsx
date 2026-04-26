import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Facebook,
  Gauge,
  Globe2,
  Mail,
  Megaphone,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  Send,
  Settings2,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal, LoadingButton, EmptyState } from '@/components/shared';
import { formatDateBR, toast } from '@/hooks/useShared';
import { integrationsApi } from '@/lib/integrationsApi';
import { supabase } from '@/lib/supabase';

interface CampaignManagerProps {
  clinicId: string;
  clinicName?: string;
  clinicPhone?: string;
  patients?: Array<{
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    status?: string | null;
    birth_date?: string | null;
  }>;
  openCreateSignal?: number;
}

type CampaignChannel = 'whatsapp' | 'email' | 'facebook' | 'google_ads';
type CampaignTarget = 'all' | 'inactive' | 'birthdays' | 'manual';

interface CampaignContact {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
}

interface CampaignStats {
  totalContacts: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  skipped: number;
}

interface CampaignRecord {
  id: string;
  name: string;
  channel: CampaignChannel;
  target: CampaignTarget;
  message: string;
  subject?: string;
  template?: string;
  contacts: CampaignContact[];
  status: 'draft' | 'running' | 'paused' | 'completed';
  progress: number;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  stats: CampaignStats;
  settings?: Record<string, unknown>;
}

interface CampaignDefaults {
  autoStartWhatsApp: boolean;
  minDelay: number;
  maxDelay: number;
  hourlyLimit: number;
  dailyLimit: number;
  enableTypingSimulation: boolean;
  enableMessageVariation: boolean;
  enableTypos: boolean;
}

const DEFAULTS: CampaignDefaults = {
  autoStartWhatsApp: true,
  minDelay: 30000,
  maxDelay: 90000,
  hourlyLimit: 20,
  dailyLimit: 100,
  enableTypingSimulation: true,
  enableMessageVariation: true,
  enableTypos: false,
};

const CHANNEL_META: Record<
  CampaignChannel,
  { label: string; icon: React.ElementType; tone: string; soft: string; helper: string }
> = {
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageSquare,
    tone: 'text-emerald-700',
    soft: 'bg-emerald-50 border-emerald-100',
    helper: 'Envia mensagens automáticas para os telefones selecionados.',
  },
  email: {
    label: 'E-mail',
    icon: Mail,
    tone: 'text-cyan-700',
    soft: 'bg-cyan-50 border-cyan-100',
    helper: 'Usa um template institucional com assunto e HTML prontos para disparo.',
  },
  facebook: {
    label: 'Facebook Ads',
    icon: Facebook,
    tone: 'text-blue-700',
    soft: 'bg-blue-50 border-blue-100',
    helper: 'Registra a campanha e dispara o evento de mídia para Meta.',
  },
  google_ads: {
    label: 'Google Ads',
    icon: Globe2,
    tone: 'text-amber-700',
    soft: 'bg-amber-50 border-amber-100',
    helper: 'Registra a campanha e dispara o evento de mídia para Google.',
  },
};

const isDev = import.meta.env.DEV;

function apiBase() {
  return isDev ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://clinxia-backend.onrender.com');
}

async function apiFetch(url: string, options: RequestInit = {}) {
  const sessionResponse = await supabase?.auth?.getSession();
  const session = sessionResponse?.data?.session;
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  
  return fetch(url, { ...options, headers });
}

function campaignCacheKey(clinicId: string) {
  return `luminaflow:campaigns:${clinicId}`;
}

function settingsCacheKey(clinicId: string) {
  return `luminaflow:campaign-settings:${clinicId}`;
}

function readCachedCampaigns(clinicId: string): CampaignRecord[] {
  void clinicId;
  return [];
}

function writeCachedCampaigns(clinicId: string, campaigns: CampaignRecord[]) {
  void clinicId;
  void campaigns;
}

function readCampaignDefaults(clinicId: string): CampaignDefaults {
  void clinicId;
  return DEFAULTS;
}

function writeCampaignDefaults(clinicId: string, settings: CampaignDefaults) {
  void clinicId;
  void settings;
}

async function readApiResponse<T = any>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text);
  }
}

function toWhatsappDigits(phone?: string | null) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function generateEmailTemplate(clinicName: string, whatsapp: string, message: string) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background: #f8fafc; font-family: Arial, sans-serif; color: #0f172a; }
    .shell { max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; }
    .hero { padding: 36px 32px; background: linear-gradient(135deg, #0891b2, #164e63); color: #ffffff; }
    .hero h1 { margin: 0 0 10px; font-size: 28px; }
    .hero p { margin: 0; color: rgba(255,255,255,.86); }
    .body { padding: 32px; line-height: 1.65; }
    .cta { display: inline-block; margin-top: 24px; padding: 14px 22px; border-radius: 12px; background: #22c55e; color: #ffffff; text-decoration: none; font-weight: bold; }
    .note { margin-top: 28px; padding: 18px; border-radius: 16px; background: #ecfeff; color: #155e75; }
    .footer { padding: 24px 32px; background: #0f172a; color: #cbd5e1; font-size: 14px; }
  </style>
</head>
<body>
  <div class="shell">
    <div class="hero">
      <h1>${clinicName}</h1>
      <p>Campanha institucional de relacionamento com pacientes.</p>
    </div>
    <div class="body">
      <p>Olá, {{nome}}.</p>
      <p>${message || 'Estamos entrando em contato para reforçar seu acompanhamento e manter seus retornos em dia.'}</p>
      <div class="note">
        Se preferir, fale com nosso atendimento pelo WhatsApp: <strong>${whatsapp || 'não informado'}</strong>
      </div>
      <a class="cta" href="https://wa.me/${toWhatsappDigits(whatsapp)}">Falar com a clínica</a>
    </div>
    <div class="footer">
      Equipe ${clinicName}
    </div>
  </div>
</body>
</html>
  `.trim();
}

function parseManualRecipients(value: string): CampaignContact[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, phone, email] = line.split(';').map((item) => item?.trim() || '');
      return {
        name: name || phone || email || 'Contato',
        phone: toWhatsappDigits(phone),
        email,
      };
    })
    .filter((contact) => contact.phone || contact.email);
}

function mergeCampaigns(base: CampaignRecord[], incoming: CampaignRecord[]) {
  const merged = new Map<string, CampaignRecord>();
  [...base, ...incoming].forEach((campaign) => {
    merged.set(campaign.id, campaign);
  });
  return Array.from(merged.values()).sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function normalizeCampaign(raw: any): CampaignRecord {
  return {
    id: raw.id,
    name: raw.name || 'Campanha sem nome',
    channel: (raw.channel || 'whatsapp') as CampaignChannel,
    target: (raw.target || 'all') as CampaignTarget,
    message: raw.message || '',
    subject: raw.subject || '',
    template: raw.template || '',
    contacts: Array.isArray(raw.contacts) ? raw.contacts : [],
    status: raw.status || 'draft',
    progress: Number(raw.progress || 0),
    createdAt: raw.createdAt || new Date().toISOString(),
    startedAt: raw.startedAt || null,
    completedAt: raw.completedAt || null,
    settings: raw.settings || {},
    stats: {
      totalContacts: raw.stats?.totalContacts ?? (Array.isArray(raw.contacts) ? raw.contacts.length : 0),
      sent: raw.stats?.sent ?? 0,
      delivered: raw.stats?.delivered ?? 0,
      failed: raw.stats?.failed ?? 0,
      pending: raw.stats?.pending ?? 0,
      skipped: raw.stats?.skipped ?? 0,
    },
  };
}

function buildAudienceContacts(
  patients: CampaignManagerProps['patients'],
  target: CampaignTarget,
  channel: CampaignChannel,
  manualRecipients: string,
) {
  const source = Array.isArray(patients) ? patients : [];
  const now = new Date();
  const manual = parseManualRecipients(manualRecipients);

  if (target === 'manual') {
    return manual.filter((contact) => (channel === 'email' ? contact.email : contact.phone));
  }

  const filtered = source.filter((patient) => {
    if (target === 'inactive') return patient.status === 'inactive' || patient.status === 'risk';
    if (target === 'birthdays') {
      if (!patient.birth_date) return false;
      return new Date(patient.birth_date).getMonth() === now.getMonth();
    }
    return true;
  });

  return filtered
    .map((patient) => ({
      id: patient.id,
      name: patient.name,
      phone: toWhatsappDigits(patient.phone),
      email: patient.email || '',
    }))
    .filter((contact) => (channel === 'email' ? contact.email : contact.phone));
}

export function CampaignManager({
  clinicId,
  clinicName = 'Sua clínica',
  clinicPhone = '',
  patients = [],
  openCreateSignal = 0,
}: CampaignManagerProps) {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>(() => readCachedCampaigns(clinicId));
  const [loading, setLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaults, setDefaults] = useState<CampaignDefaults>(() => readCampaignDefaults(clinicId));
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [channel, setChannel] = useState<CampaignChannel>('whatsapp');
  const [campaignName, setCampaignName] = useState('');
  const [target, setTarget] = useState<CampaignTarget>('all');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('Aviso importante');
  const [manualRecipients, setManualRecipients] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) || campaigns[0] || null,
    [campaigns, selectedCampaignId],
  );

  const summary = useMemo(() => {
    return campaigns.reduce(
      (acc, campaign) => {
        acc.total += 1;
        if (campaign.status === 'running') acc.running += 1;
        if (campaign.status === 'paused') acc.paused += 1;
        if (campaign.status === 'completed') acc.completed += 1;
        return acc;
      },
      { total: 0, running: 0, paused: 0, completed: 0 },
    );
  }, [campaigns]);

  const emailTemplate = useMemo(() => {
    return generateEmailTemplate(clinicName, clinicPhone, message);
  }, [clinicName, clinicPhone, message]);

  const loadCampaigns = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const response = await apiFetch(`${apiBase()}/api/campaigns/clinic/${clinicId}?t=${Date.now()}`, {
          cache: 'no-store',
        });
        const data = await readApiResponse<{ campaigns?: any[]; ok?: boolean }>(response);
        if (!response.ok) {
          throw new Error((data as any)?.message || `Erro ${response.status}`);
        }

        const fromApi = Array.isArray(data.campaigns) ? data.campaigns.map(normalizeCampaign) : [];
        const merged = mergeCampaigns(readCachedCampaigns(clinicId), fromApi);
        setCampaigns(merged);
        writeCachedCampaigns(clinicId, merged);
        if (!selectedCampaignId && merged[0]) {
          setSelectedCampaignId(merged[0].id);
        }
      } catch (error) {
        console.error('[CampaignManager] Load error:', error);
        if (!silent) {
          const cached = readCachedCampaigns(clinicId);
          setCampaigns(cached);
          if (cached[0] && !selectedCampaignId) setSelectedCampaignId(cached[0].id);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [clinicId, selectedCampaignId],
  );

  useEffect(() => {
    setDefaults(readCampaignDefaults(clinicId));
    loadCampaigns();
    const timer = window.setInterval(() => loadCampaigns(true), 8000);
    return () => window.clearInterval(timer);
  }, [clinicId, loadCampaigns]);

  useEffect(() => {
    if (openCreateSignal > 0) {
      setIsCreateOpen(true);
      setCreateStep(1);
    }
  }, [openCreateSignal]);

  useEffect(() => {
    if (selectedCampaign && !selectedCampaignId) {
      setSelectedCampaignId(selectedCampaign.id);
    }
  }, [selectedCampaign, selectedCampaignId]);

  const resetCreateModal = () => {
    setCreateStep(1);
    setChannel('whatsapp');
    setCampaignName('');
    setTarget('all');
    setMessage('');
    setSubject('Aviso importante');
    setManualRecipients('');
    setPreviewHtml('');
    setIsCreateOpen(false);
  };

  const persistCampaignList = (nextCampaigns: CampaignRecord[]) => {
    setCampaigns(nextCampaigns);
    writeCachedCampaigns(clinicId, nextCampaigns);
    if (!selectedCampaignId && nextCampaigns[0]) {
      setSelectedCampaignId(nextCampaigns[0].id);
    }
  };

  const syncSingleCampaign = (campaign: CampaignRecord) => {
    const next = mergeCampaigns(campaigns, [campaign]);
    persistCampaignList(next);
    setSelectedCampaignId(campaign.id);
  };

  const handleSaveSettings = () => {
    writeCampaignDefaults(clinicId, defaults);
    setIsSettingsOpen(false);
    toast('Configurações salvas com sucesso.');
  };

  const handleOpenEmailPreview = () => {
    setPreviewHtml(emailTemplate);
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      toast('Informe o nome da campanha.', 'error');
      return;
    }

    const contacts = buildAudienceContacts(patients, target, channel, manualRecipients);
    if (contacts.length === 0) {
      toast('Nenhum contato válido foi encontrado para esta campanha.', 'error');
      return;
    }

    const config = {
      name: campaignName.trim(),
      channel,
      target,
      message: message.trim(),
      subject: channel === 'email' ? subject.trim() : '',
      template: channel === 'email' ? emailTemplate : '',
      contacts,
      settings: {
        minDelay: defaults.minDelay,
        maxDelay: defaults.maxDelay,
        hourlyLimit: defaults.hourlyLimit,
        dailyLimit: defaults.dailyLimit,
        enableTypingSimulation: defaults.enableTypingSimulation,
        enableMessageVariation: defaults.enableMessageVariation,
        enableTypos: defaults.enableTypos,
      },
    };

    setIsSubmitting(true);
    try {
      const createResponse = await apiFetch(`${apiBase()}/api/campaigns/create`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          autoStart: channel === 'whatsapp' ? defaults.autoStartWhatsApp : false,
          config,
        }),
      });
      const createData = await readApiResponse<{ ok?: boolean; message?: string; campaign?: any }>(createResponse);
      if (!createResponse.ok || !createData.campaign) {
        throw new Error(createData.message || 'Erro ao criar campanha');
      }

      let persistedCampaign = normalizeCampaign(createData.campaign);

      if (channel === 'email') {
        await integrationsApi.sendNotification({
          clinicId,
          channel: 'email',
          subject: subject.trim(),
          html: emailTemplate,
          contacts,
        });
      }

      if (channel === 'facebook') {
        await integrationsApi.pixelEvent('meta', {
          clinicId,
          campaignId: persistedCampaign.id,
          campaignName: persistedCampaign.name,
          audienceSize: contacts.length,
          objective: 'remarketing',
        });
      }

      if (channel === 'google_ads') {
        await integrationsApi.pixelEvent('google', {
          clinicId,
          campaignId: persistedCampaign.id,
          campaignName: persistedCampaign.name,
          audienceSize: contacts.length,
          objective: 'remarketing',
        });
      }

      if (channel !== 'whatsapp') {
        const finishedAt = new Date().toISOString();
        const updateResponse = await apiFetch(`${apiBase()}/api/campaigns/${persistedCampaign.id}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            status: 'completed',
            startedAt: finishedAt,
            completedAt: finishedAt,
            progress: 100,
            stats: {
              totalContacts: contacts.length,
              sent: contacts.length,
              delivered: 0,
              failed: 0,
              pending: 0,
              skipped: 0,
            },
          }),
        });
        const updateData = await readApiResponse<{ campaign?: any; message?: string }>(updateResponse);
        if (!updateResponse.ok || !updateData.campaign) {
          throw new Error(updateData.message || 'Erro ao finalizar campanha');
        }
        persistedCampaign = normalizeCampaign(updateData.campaign);
      }

      syncSingleCampaign(persistedCampaign);
      resetCreateModal();
      toast(
        channel === 'whatsapp'
          ? 'Campanha criada e pronta para enviar automaticamente.'
          : 'Campanha criada e registrada com sucesso.',
      );
      loadCampaigns(true);
    } catch (error) {
      console.error('[CampaignManager] Create error:', error);
      toast(error instanceof Error ? error.message : 'Erro ao criar campanha.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const callCampaignAction = async (campaignId: string, action: 'start' | 'pause' | 'resume' | 'stop' | 'delete') => {
    try {
      const url =
        action === 'delete'
          ? `${apiBase()}/api/campaigns/${campaignId}`
          : `${apiBase()}/api/campaigns/${campaignId}/${action}`;
      const response = await apiFetch(url, {
        method: action === 'delete' ? 'DELETE' : 'POST',
        headers: { 'content-type': 'application/json' },
      });
      const data = await readApiResponse<{ ok?: boolean; message?: string }>(response);
      if (!response.ok) {
        throw new Error(data.message || 'Falha ao atualizar campanha');
      }

      if (action === 'delete') {
        const next = campaigns.filter((campaign) => campaign.id !== campaignId);
        persistCampaignList(next);
        setSelectedCampaignId(next[0]?.id || null);
      } else {
        await loadCampaigns(true);
      }

      toast(data.message || 'Campanha atualizada com sucesso.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Falha ao atualizar campanha.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              Campanhas Unificadas
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-cyan-50 drop-shadow-sm">WhatsApp, E-mail, Facebook e Google Ads em uma tela só.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Centralize a criação, o acompanhamento e o histórico das campanhas por clínica sem depender de páginas duplicadas.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <Settings2 className="h-4 w-4" />
              Configurações
            </button>
            <button
              onClick={() => {
                setIsCreateOpen(true);
                setCreateStep(1);
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300"
            >
              <Megaphone className="h-4 w-4" />
              Nova Campanha
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: 'Total', value: summary.total, icon: BarChart3, tone: 'text-slate-700 bg-slate-100' },
          { label: 'Em andamento', value: summary.running, icon: Send, tone: 'text-cyan-700 bg-cyan-50' },
          { label: 'Pausadas', value: summary.paused, icon: PauseCircle, tone: 'text-amber-700 bg-amber-50' },
          { label: 'Concluídas', value: summary.completed, icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50' },
        ].map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', card.tone)}>
              <card.icon className="h-5 w-5" />
            </div>
            <div className="mt-4 text-3xl font-black text-slate-950">{card.value}</div>
            <div className="mt-1 text-sm text-slate-500">{card.label}</div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px,minmax(0,1fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-lg font-black text-slate-950">Campanhas criadas</h3>
            <p className="mt-1 text-sm text-slate-500">Tudo o que já foi disparado ou preparado para sua clínica.</p>
          </div>

          {loading ? (
            <div className="p-5 text-sm text-slate-500">Carregando campanhas...</div>
          ) : campaigns.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="Nenhuma campanha criada"
              description="Crie sua primeira campanha para começar a enviar mensagens."
              action={{ label: 'Nova Campanha', onClick: () => setIsCreateOpen(true) }}
            />
          ) : (
            <div className="max-h-[680px] space-y-3 overflow-y-auto p-4">
              {campaigns.map((campaign) => {
                const meta = CHANNEL_META[campaign.channel];
                const Icon = meta.icon;
                const isActive = selectedCampaign?.id === campaign.id;
                return (
                  <button
                    key={campaign.id}
                    onClick={() => setSelectedCampaignId(campaign.id)}
                    className={cn(
                      'w-full rounded-2xl border p-4 text-left transition',
                      isActive ? 'border-cyan-300 bg-cyan-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl border', meta.soft)}>
                            <Icon className={cn('h-4 w-4', meta.tone)} />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{meta.label}</span>
                        </div>
                        <h4 className="mt-3 text-sm font-black text-slate-900">{campaign.name}</h4>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{campaign.message || meta.helper}</p>
                      </div>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] font-bold',
                          campaign.status === 'completed' && 'bg-emerald-50 text-emerald-700',
                          campaign.status === 'running' && 'bg-cyan-50 text-cyan-700',
                          campaign.status === 'paused' && 'bg-amber-50 text-amber-700',
                          campaign.status === 'draft' && 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {campaign.status === 'completed'
                          ? 'Concluída'
                          : campaign.status === 'running'
                            ? 'Em andamento'
                            : campaign.status === 'paused'
                              ? 'Pausada'
                              : 'Rascunho'}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-slate-400">
                        <span>Progresso</span>
                        <span>{campaign.progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-cyan-500 transition-all" style={{ width: `${campaign.progress}%` }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          {!selectedCampaign ? (
            <EmptyState
              icon={Target}
              title="Selecione uma campanha"
              description="Ao escolher uma campanha você vê status, progresso e detalhes do disparo."
            />
          ) : (
            <div className="space-y-6 p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      {CHANNEL_META[selectedCampaign.channel].label}
                    </span>
                    {selectedCampaign.status === 'completed' && selectedCampaign.stats.sent >= selectedCampaign.stats.totalContacts && (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                        Todas as mensagens enviadas
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 text-2xl font-black text-slate-950">{selectedCampaign.name}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{selectedCampaign.message || CHANNEL_META[selectedCampaign.channel].helper}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedCampaign.channel === 'whatsapp' && selectedCampaign.status === 'draft' && (
                    <button
                      onClick={() => callCampaignAction(selectedCampaign.id, 'start')}
                      className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-700"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Iniciar
                    </button>
                  )}
                  {selectedCampaign.channel === 'whatsapp' && selectedCampaign.status === 'running' && (
                    <button
                      onClick={() => callCampaignAction(selectedCampaign.id, 'pause')}
                      className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600"
                    >
                      <PauseCircle className="h-4 w-4" />
                      Pausar
                    </button>
                  )}
                  {selectedCampaign.channel === 'whatsapp' && selectedCampaign.status === 'paused' && (
                    <button
                      onClick={() => callCampaignAction(selectedCampaign.id, 'resume')}
                      className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-700"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Retomar
                    </button>
                  )}
                  <button
                    onClick={() => callCampaignAction(selectedCampaign.id, 'delete')}
                    className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {[
                  { label: 'Público total', value: selectedCampaign.stats.totalContacts, icon: Target },
                  { label: 'Enviadas', value: selectedCampaign.stats.sent, icon: Send },
                  { label: 'Pendentes', value: selectedCampaign.stats.pending, icon: Gauge },
                  { label: 'Falhas', value: selectedCampaign.stats.failed, icon: Trash2 },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{item.label}</span>
                      <item.icon className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="mt-3 text-2xl font-black text-slate-950">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-slate-200 p-5">
                <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-600">
                  <span>Andamento da campanha</span>
                  <span>{selectedCampaign.progress}%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500" style={{ width: `${selectedCampaign.progress}%` }} />
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 text-sm text-slate-500">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Criada em</div>
                    <div className="mt-1 font-semibold text-slate-700">{formatDateBR(selectedCampaign.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Iniciada em</div>
                    <div className="mt-1 font-semibold text-slate-700">
                      {selectedCampaign.startedAt ? formatDateBR(selectedCampaign.startedAt) : 'Aguardando'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Concluída em</div>
                    <div className="mt-1 font-semibold text-slate-700">
                      {selectedCampaign.completedAt ? formatDateBR(selectedCampaign.completedAt) : 'Em aberto'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr),320px]">
                <div className="rounded-3xl border border-slate-200 p-5">
                  <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Conteúdo da campanha</div>
                  {selectedCampaign.subject ? (
                    <div className="mb-3 rounded-2xl bg-slate-50 p-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Assunto</div>
                      <div className="mt-1 text-sm font-semibold text-slate-800">{selectedCampaign.subject}</div>
                    </div>
                  ) : null}
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {selectedCampaign.message || 'Campanha criada para integração de mídia.'}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 p-5">
                  <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Resumo operacional</div>
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Canal</span>
                      <strong className="text-slate-900">{CHANNEL_META[selectedCampaign.channel].label}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Alvo</span>
                      <strong className="text-slate-900">{selectedCampaign.target}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Contatos</span>
                      <strong className="text-slate-900">{selectedCampaign.contacts.length}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      <strong className="text-slate-900">{selectedCampaign.status}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Modal isOpen={isCreateOpen} onClose={resetCreateModal} title="Criar campanha" maxWidth="max-w-4xl">
        {createStep === 1 ? (
          <div className="space-y-5">
            <p className="text-sm text-slate-500">Escolha onde deseja publicar ou enviar sua campanha.</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(Object.keys(CHANNEL_META) as CampaignChannel[]).map((key) => {
                const meta = CHANNEL_META[key];
                const Icon = meta.icon;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setChannel(key);
                      setCreateStep(2);
                    }}
                    className="rounded-3xl border border-slate-200 p-5 text-left transition hover:border-cyan-300 hover:bg-cyan-50/40"
                  >
                    <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl border', meta.soft)}>
                      <Icon className={cn('h-5 w-5', meta.tone)} />
                    </div>
                    <h4 className="mt-4 text-lg font-black text-slate-950">{meta.label}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{meta.helper}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setCreateStep(1)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200">
                Voltar
              </button>
              <div className="text-sm text-slate-500">
                Canal escolhido: <strong className="text-slate-900">{CHANNEL_META[channel].label}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr),360px]">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Nome da campanha</label>
                  <input
                    value={campaignName}
                    onChange={(event) => setCampaignName(event.target.value)}
                    placeholder="Ex: Reativação de pacientes em risco"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Público</label>
                  <select
                    value={target}
                    onChange={(event) => setTarget(event.target.value as CampaignTarget)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                  >
                    <option value="all">Toda a base</option>
                    <option value="inactive">Pacientes inativos / em risco</option>
                    <option value="birthdays">Aniversariantes do mês</option>
                    <option value="manual">Lista manual</option>
                  </select>
                </div>

                {target === 'manual' && (
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Lista manual</label>
                    <textarea
                      value={manualRecipients}
                      onChange={(event) => setManualRecipients(event.target.value)}
                      placeholder="Nome;5511999999999;email@exemplo.com"
                      className="min-h-[140px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                    />
                    <p className="mt-2 text-xs text-slate-400">Use um contato por linha no formato: nome;telefone;email.</p>
                  </div>
                )}

                {channel === 'email' && (
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Assunto</label>
                    <input
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    {channel === 'facebook' || channel === 'google_ads' ? 'Mensagem base da campanha' : 'Mensagem'}
                  </label>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Digite a mensagem base da campanha."
                    className="min-h-[180px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className={cn('rounded-3xl border p-5', CHANNEL_META[channel].soft)}>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Resumo da automação</div>
                  <div className="mt-3 text-sm leading-6 text-slate-700">{CHANNEL_META[channel].helper}</div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-white/80 p-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Contatos previstos</div>
                      <div className="mt-1 text-2xl font-black text-slate-950">
                        {buildAudienceContacts(patients, target, channel, manualRecipients).length}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/80 p-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Canal</div>
                      <div className="mt-1 text-base font-black text-slate-950">{CHANNEL_META[channel].label}</div>
                    </div>
                  </div>
                </div>

                {channel === 'email' && (
                  <div className="rounded-3xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Template padrão de e-mail</div>
                        <div className="mt-2 text-sm text-slate-600">Use o mesmo modelo institucional com CTA para WhatsApp da clínica.</div>
                      </div>
                      <button
                        onClick={handleOpenEmailPreview}
                        className="rounded-xl bg-cyan-600 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-700"
                      >
                        Pré-visualizar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={resetCreateModal} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200">
                Cancelar
              </button>
              <LoadingButton
                loading={isSubmitting}
                onClick={handleCreateCampaign}
                className="rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-black text-white hover:bg-cyan-700"
              >
                Criar Campanha
              </LoadingButton>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Configurações de campanha" maxWidth="max-w-3xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-bold text-slate-900">Auto iniciar WhatsApp</div>
            <div className="mt-1 text-xs text-slate-500">Ao criar a campanha de WhatsApp, já começa a fila automaticamente.</div>
            <input
              type="checkbox"
              checked={defaults.autoStartWhatsApp}
              onChange={(event) => setDefaults((prev) => ({ ...prev, autoStartWhatsApp: event.target.checked }))}
              className="mt-4 h-4 w-4 rounded border-slate-300"
            />
          </label>

          {[
            ['Delay mínimo (ms)', 'minDelay'],
            ['Delay máximo (ms)', 'maxDelay'],
            ['Limite por hora', 'hourlyLimit'],
            ['Limite por dia', 'dailyLimit'],
          ].map(([label, key]) => (
            <label key={key} className="rounded-2xl border border-slate-200 p-4">
              <div className="text-sm font-bold text-slate-900">{label}</div>
              <input
                type="number"
                value={defaults[key as keyof CampaignDefaults] as number}
                onChange={(event) =>
                  setDefaults((prev) => ({ ...prev, [key]: Math.max(0, Number(event.target.value) || 0) }))
                }
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-400"
              />
            </label>
          ))}

          {[
            ['Simular digitação', 'enableTypingSimulation'],
            ['Variar mensagens', 'enableMessageVariation'],
            ['Permitir pequenos typos', 'enableTypos'],
          ].map(([label, key]) => (
            <label key={key} className="rounded-2xl border border-slate-200 p-4">
              <div className="text-sm font-bold text-slate-900">{label}</div>
              <input
                type="checkbox"
                checked={Boolean(defaults[key as keyof CampaignDefaults])}
                onChange={(event) => setDefaults((prev) => ({ ...prev, [key]: event.target.checked }))}
                className="mt-4 h-4 w-4 rounded border-slate-300"
              />
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setIsSettingsOpen(false)} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200">
            Cancelar
          </button>
          <button onClick={handleSaveSettings} className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-black text-white hover:bg-cyan-700">
            Salvar Configurações
          </button>
        </div>
      </Modal>

      <Modal isOpen={Boolean(previewHtml)} onClose={() => setPreviewHtml('')} title="Pré-visualização do e-mail" maxWidth="max-w-5xl">
        <div className="h-[70vh] rounded-3xl bg-slate-100 p-3">
          <iframe title="Email Preview" srcDoc={previewHtml} className="h-full w-full rounded-2xl bg-white" />
        </div>
      </Modal>
    </div>
  );
}
