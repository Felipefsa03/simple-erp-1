import React, { useState, useMemo, useEffect } from "react";
import {
  Settings,
  Users,
  Shield,
  Bell,
  CreditCard,
  Stethoscope,
  Plus,
  Save,
  Edit2,
  Trash2,
  X,
  Check,
  Package,
  DollarSign,
  BarChart3,
  Wifi,
  WifiOff,
  CheckCircle2,
  ArrowUpRight,
  Link2,
  FileText,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useClinicStore } from "@/stores/clinicStore";
import { useAuth } from "@/hooks/useAuth";
import { toast, formatCurrency } from "@/hooks/useShared";
import { Modal, EmptyState, ConfirmDialog } from "@/components/shared";
import type {
  Service,
  ServiceMaterial,
  AsaasConfig,
  UserRole,
  User,
} from "@/types";
import { integrationsApi } from "@/lib/integrationsApi";
import { Integrations } from "@/domains/integrations/Integrations";
import { NFeSettings } from "./NFeSettings";
import { SystemWhatsAppConfig } from "./SystemWhatsAppConfig";
import { isSupabaseConfigured } from "@/lib/supabase";

interface ConfiguracoesProps {
  onNavigate?: (tab: string, ctx?: any) => void;
}

const configTabs = [
  { id: "clinica", label: "Clínica", icon: Settings },
  { id: "equipe", label: "Equipe", icon: Users },
  { id: "servicos", label: "Serviços", icon: Stethoscope },
  { id: "permissoes", label: "Permissões", icon: Shield },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "assinatura", label: "Assinatura", icon: CreditCard },
  { id: "asaas", label: "Integração Asaas", icon: Link2 },
  { id: "nfe", label: "NFe", icon: FileText },
  { id: "sistema", label: "Sistema (Global)", icon: Globe },
  { id: "seguranca", label: "Segurança", icon: Shield },
  { id: "integracoes", label: "Integrações", icon: Link2 },
];

const filteredConfigTabs = (userRole: string | undefined) =>
  userRole === "super_admin"
    ? configTabs
    : configTabs.filter((tab) => tab.id !== "sistema");

export function Configuracoes({ onNavigate }: ConfiguracoesProps) {
  const {
    user,
    clinic,
    updateClinic,
    hasPermission,
    permissions,
    setPermission,
    resetPermissions,
    createClinicUser,
  } = useAuth();
  const visibleTabs = filteredConfigTabs(user?.role);
  const permissionMatrix = permissions || {};
  const store = useClinicStore();
  const {
    professionals,
    services,
    stockItems,
    addProfessional,
    updateProfessional,
    deleteProfessional,
    addService,
    updateService,
    deleteService,
    getProfessionalStats,
    notificationPrefs,
    setNotificationPref,
    setIntegrationConfig,
    integrationConfig,
  } = store;

  const [activeSubTab, setActiveSubTab] = useState("clinica");
  const [clinicForm, setClinicForm] = useState({
    name: clinic?.name || "",
    cnpj: clinic?.cnpj || "",
    phone: clinic?.phone || "",
    email: clinic?.email || "",
  });
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [svcForm, setSvcForm] = useState({
    name: "",
    category: "Consulta",
    base_price: "",
    avg_duration_min: "60",
    estimated_cost: "0",
  });
  const [svcMaterials, setSvcMaterials] = useState<ServiceMaterial[]>([]);
  const [svcProfPrices, setSvcProfPrices] = useState<Record<string, string>>(
    {},
  );
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<
    string | null
  >(null);
  const [editingCommission, setEditingCommission] = useState<{
    id: string;
    pct: string;
  } | null>(null);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    commission_pct: string;
  } | null>(null);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState<string | null>(
    null,
  );
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "receptionist" as UserRole,
    commission_pct: "0",
    password: "",
  });
  const [upgradeModal, setUpgradeModal] = useState<{
    plan: string;
    price: number;
  } | null>(null);
  const [asaasConfig, setAsaasConfig] = useState<AsaasConfig>({
    api_key: "",
    wallet_id: "",
    environment: "sandbox",
    enabled: false,
    webhook_url: "",
  });
  const [asaasTesting, setAsaasTesting] = useState(false);
  const [asaasConnected, setAsaasConnected] = useState(false);
  const [integrationForm, setIntegrationForm] = useState({
    memed_api_url: integrationConfig?.memed_api_url || "",
    memed_api_token: integrationConfig?.memed_api_token || "",
    tiss_provider_name: integrationConfig?.tiss_provider_name || "",
    tiss_ans_code: integrationConfig?.tiss_ans_code || "",
    rd_station_token: integrationConfig?.rd_station_token || "",
    meta_pixel_id: integrationConfig?.meta_pixel_id || "",
    google_ads_customer_id: integrationConfig?.google_ads_customer_id || "",
    google_calendar_email: integrationConfig?.google_calendar_email || "",
    mp_access_token: integrationConfig?.mp_access_token || "",
    mp_public_key: integrationConfig?.mp_public_key || "",
    mp_webhook_secret: integrationConfig?.mp_webhook_secret || "",
    plan_price_basico: String(integrationConfig?.plan_price_basico ?? ""),
    plan_price_profissional: String(
      integrationConfig?.plan_price_profissional ?? "",
    ),
    plan_price_premium: String(integrationConfig?.plan_price_premium ?? ""),
  });

  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [showTwoFAModal, setShowTwoFAModal] = useState(false);
  const [twoFAQrCode, setTwoFAQrCode] = useState("");
  const [twoFASecret, setTwoFASecret] = useState("");
  const [twoFAVerifyCode, setTwoFAVerifyCode] = useState("");
  const [twoFAError, setTwoFAError] = useState("");
  const [apiKeys, setApiKeys] = useState<
    {
      id: string;
      name: string;
      key: string;
      created: string;
      lastUsed: string;
    }[]
  >([
    {
      id: "1",
      name: "Produção",
      key: "sk_live_••••••••••••",
      created: "15/01/2026",
      lastUsed: "24/03/2026",
    },
  ]);
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [generatingKey, setGeneratingKey] = useState(false);

  const canManageSettings = hasPermission("manage_settings");
  const canManageCommissions = hasPermission("manage_commissions");
  const canManageTeam = hasPermission("manage_team");
  const API_BASE = import.meta.env.DEV
    ? ""
    : import.meta.env.VITE_API_BASE_URL ||
      "https://clinxia-backend.onrender.com";
  const SUPABASE_URL =
    import.meta.env.VITE_SUPABASE_URL ||
    "https://gzcimnredlffqyogxzqq.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    "";
  const SYSTEM_GLOBAL_CLINIC_ID = "00000000-0000-0000-0000-000000000001";
  const clinicId =
    useAuth((s) => s.getClinicId()) || "00000000-0000-0000-0000-000000000001";
  const permissionRoles: { key: UserRole; label: string }[] = [
    { key: "receptionist", label: "Recepção" },
    { key: "dentist", label: "Dentista" },
    { key: "aesthetician", label: "Esteticista" },
    { key: "financial", label: "Financeiro" },
    { key: "admin", label: "Admin/Dono" },
  ];
  const permissionRows: { key: string; label: string }[] = [
    { key: "view_dashboard", label: "Ver Dashboard" },
    { key: "create_appointment", label: "Criar Agendamento" },
    { key: "edit_record", label: "Editar Prontuário" },
    { key: "finalize_appointment", label: "Finalizar Atendimento" },
    { key: "view_patients", label: "Ver Pacientes" },
    { key: "manage_patients", label: "Gerenciar Pacientes" },
    { key: "import_patients", label: "Importar Pacientes" },
    { key: "view_financial", label: "Ver Financeiro" },
    { key: "manage_financial", label: "Gerenciar Financeiro" },
    { key: "manage_stock", label: "Gerenciar Estoque" },
    { key: "manage_commissions", label: "Configurar Comissões" },
    { key: "manage_team", label: "Gerenciar Equipe" },
    { key: "manage_settings", label: "Gerenciar Configurações" },
    { key: "manage_integrations", label: "Configurar Integrações" },
    { key: "delete_patient", label: "Excluir Paciente" },
  ];
  const handleTogglePermission = (action: string, role: UserRole) => {
    if (!canManageSettings) {
      toast("Você não tem permissão para alterar permissões.", "error");
      return;
    }
    if (action === "manage_settings" && role === user?.role) {
      toast(
        "Você não pode remover sua própria permissão de configurações.",
        "error",
      );
      return;
    }
    const current = permissions[action] || [];
    const allowed = current.includes(role);
    setPermission(action, role, !allowed);
  };
  const handleResetPermissions = () => {
    if (!canManageSettings) {
      toast("Você não tem permissão para alterar permissões.", "error");
      return;
    }
    resetPermissions();
    toast("Permissões restauradas para o padrão.");
  };
  const clinicProfessionals = useMemo(
    () => (professionals || []).filter((p) => p.clinic_id === clinicId),
    [professionals, clinicId],
  );
  const clinicServices = useMemo(
    () => (services || []).filter((s) => s.clinic_id === clinicId),
    [services, clinicId],
  );
  const clinicStockItems = useMemo(
    () => (stockItems || []).filter((s) => s.clinic_id === clinicId),
    [stockItems, clinicId],
  );

  useEffect(() => {
    setAsaasConfig((prev) => ({
      ...prev,
      api_key: prev.api_key || "",
      wallet_id: prev.wallet_id || "",
      webhook_url: prev.webhook_url || "",
    }));
  }, []);

  useEffect(() => {
    // Só carrega do clinicStore se NÃO for super_admin na aba sistema
    const isSuperAdminOnSistema =
      user?.role === "super_admin" && activeSubTab === "sistema";
    if (isSuperAdminOnSistema) return;

    setIntegrationForm({
      memed_api_url: integrationConfig.memed_api_url || "",
      memed_api_token: integrationConfig.memed_api_token || "",
      tiss_provider_name: integrationConfig.tiss_provider_name || "",
      tiss_ans_code: integrationConfig.tiss_ans_code || "",
      rd_station_token: integrationConfig.rd_station_token || "",
      meta_pixel_id: integrationConfig.meta_pixel_id || "",
      google_ads_customer_id: integrationConfig.google_ads_customer_id || "",
      google_calendar_email: integrationConfig.google_calendar_email || "",
      mp_access_token: integrationConfig.mp_access_token || "",
      mp_public_key: integrationConfig.mp_public_key || "",
      mp_webhook_secret: integrationConfig.mp_webhook_secret || "",
      plan_price_basico: String(integrationConfig.plan_price_basico ?? ""),
      plan_price_profissional: String(
        integrationConfig.plan_price_profissional ?? "",
      ),
      plan_price_premium: String(integrationConfig.plan_price_premium ?? ""),
    });
  }, [integrationConfig, user?.role, activeSubTab]);

  useEffect(() => {
    if (user?.role !== "super_admin" || activeSubTab !== "sistema") return;

    let cancelled = false;
    const loadGlobalConfig = async () => {
      try {
        const { supabase, isSupabaseConfigured, getSupabaseSession } =
          await import("@/lib/supabase");
        console.log(
          "[Sistema Global] Carregando config, Supabase configured:",
          isSupabaseConfigured(),
        );

        // Obter sessão atual para ter o token
        const session = getSupabaseSession ? getSupabaseSession() : null;
        console.log(
          "[Sistema Global] Session:",
          session ? "tem sessão" : "sem sessão",
        );

        if (isSupabaseConfigured() && SUPABASE_PUBLISHABLE_KEY) {
          // Usar query direta com fetch para garantir que o token seja enviado
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: session?.access_token
              ? `Bearer ${session.access_token}`
              : `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          };

          const response = await fetch(
            `${SUPABASE_URL}/rest/v1/integration_config?clinic_id=eq.${SYSTEM_GLOBAL_CLINIC_ID}&select=mp_access_token,mp_public_key,mp_webhook_secret,plan_price_basico,plan_price_profissional,plan_price_premium`,
            { headers },
          );

          const data = response.ok ? await response.json() : null;
          const error = response.ok ? null : { message: "Failed to fetch" };

          console.log("[Sistema Global] Query result:", {
            data,
            error,
            status: response.status,
          });

          if (!cancelled && data && data.length > 0) {
            const config = data[0];
            console.log("[Sistema Global] Usando dados do banco:", config);
            setIntegrationForm((prev) => ({
              ...prev,
              mp_access_token: config.mp_access_token || "",
              mp_public_key: config.mp_public_key || "",
              mp_webhook_secret: config.mp_webhook_secret || "",
              plan_price_basico: String(config.plan_price_basico ?? ""),
              plan_price_profissional: String(
                config.plan_price_profissional ?? "",
              ),
              plan_price_premium: String(config.plan_price_premium ?? ""),
            }));
            setIntegrationConfig({
              mp_access_token: config.mp_access_token || "",
              mp_public_key: config.mp_public_key || "",
              plan_price_basico: Number(config.plan_price_basico || 0),
              plan_price_profissional: Number(
                config.plan_price_profissional || 0,
              ),
              plan_price_premium: Number(config.plan_price_premium || 0),
            });
            return;
          } else if (error) {
            console.error("[Sistema Global] Erro na query:", error);
          }
        }

        console.log("[Sistema Global] Usando fallback API...");
        const fallbackRes = await fetch(
          `${API_BASE}/api/system/signup-config?t=${Date.now()}`,
        );
        const fallbackData = await fallbackRes.json();
        console.log("[Sistema Global] API response:", fallbackData);
        if (!cancelled && fallbackData?.ok && fallbackData.plan_prices) {
          setIntegrationForm((prev) => ({
            ...prev,
            plan_price_basico: String(fallbackData.plan_prices.basico ?? ""),
            plan_price_profissional: String(
              fallbackData.plan_prices.profissional ?? "",
            ),
            plan_price_premium: String(fallbackData.plan_prices.premium ?? ""),
          }));
          setIntegrationConfig({
            plan_price_basico: Number(fallbackData.plan_prices.basico || 0),
            plan_price_profissional: Number(
              fallbackData.plan_prices.profissional || 0,
            ),
            plan_price_premium: Number(fallbackData.plan_prices.premium || 0),
          });
        }
      } catch (e) {
        console.error("[Sistema Global] erro ao carregar config:", e);
      }
    };

    void loadGlobalConfig();
    return () => {
      cancelled = true;
    };
  }, [
    activeSubTab,
    user?.role,
    API_BASE,
    SYSTEM_GLOBAL_CLINIC_ID,
    setIntegrationConfig,
    SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_URL,
  ]);

  const handleSaveClinic = () => {
    updateClinic(clinicForm);
    
    // Log de auditoria
    store.addAuditLog({
      user_id: user?.id,
      clinic_id: clinic?.id,
      action: "UPDATE_SETTINGS",
      entity: "clinic",
      entity_id: clinic?.id,
    });

    toast("Configurações da clínica salvas com sucesso!");
  };

  const handleSaveService = () => {
    if (!canManageSettings) {
      toast("Você não tem permissão para gerenciar serviços.", "error");
      return;
    }
    // Build professional_prices from form
    const profPrices: Record<string, number> = {};
    Object.entries(svcProfPrices).forEach(([id, val]) => {
      const n = parseFloat(String(val).replace(",", "."));
      if (n > 0) profPrices[id] = n;
    });
    const data = {
      clinic_id: clinicId,
      name: svcForm.name,
      category: svcForm.category,
      base_price: parseFloat(String(svcForm.base_price).replace(",", ".")),
      avg_duration_min: parseInt(String(svcForm.avg_duration_min)),
      estimated_cost: parseFloat(
        String(svcForm.estimated_cost).replace(",", ".") || "0",
      ),
      materials: svcMaterials,
      active: true,
      professional_prices:
        Object.keys(profPrices).length > 0 ? profPrices : undefined,
    };
    if (editingService) {
      updateService(editingService.id, data);
      toast("Serviço atualizado!");
    } else {
      addService(data);
      toast("Serviço cadastrado!");
    }
    setShowServiceModal(false);
    setEditingService(null);
    setSvcForm({
      name: "",
      category: "Consulta",
      base_price: "",
      avg_duration_min: "60",
      estimated_cost: "0",
    });
    setSvcMaterials([]);
    setSvcProfPrices({});
  };

  const handleEditService = (svc: Service) => {
    setEditingService(svc);
    setSvcForm({
      name: svc.name,
      category: svc.category,
      base_price: String(svc.base_price),
      avg_duration_min: String(svc.avg_duration_min),
      estimated_cost: String(svc.estimated_cost),
    });
    setSvcMaterials(svc.materials || []);
    // Load professional prices
    const pp: Record<string, string> = {};
    if (svc.professional_prices) {
      Object.entries(svc.professional_prices).forEach(([id, val]) => {
        pp[id] = String(val);
      });
    }
    setSvcProfPrices(pp);
    setShowServiceModal(true);
  };

  const handleSaveCommission = () => {
    if (!canManageCommissions) return;
    if (!editingCommission) return;
    updateProfessional(editingCommission.id, {
      commission_pct: parseFloat(editingCommission.pct),
    });
    toast("Comissão atualizada!");
    setEditingCommission(null);
  };

  const handleEditUser = (prof: User) => {
    setEditingUser({
      id: prof.id,
      name: prof.name,
      email: prof.email,
      phone: prof.phone || "",
      role: prof.role,
      commission_pct: String(prof.commission_pct || 0),
    });
    setShowEditUserModal(true);
  };

  const handleSaveEditUser = () => {
    if (!editingUser) return;
    if (!editingUser.name.trim() || !editingUser.email.trim()) {
      toast("Preencha nome e email.", "error");
      return;
    }
    updateProfessional(editingUser.id, {
      name: editingUser.name.trim(),
      email: editingUser.email.trim(),
      phone: editingUser.phone.trim(),
      role: editingUser.role,
      commission_pct: parseFloat(editingUser.commission_pct) || 0,
    });
    toast("Membro da equipe atualizado!", "success");
    setShowEditUserModal(false);
    setEditingUser(null);
  };

  const handleDeleteUser = (id: string) => {
    if (!canManageTeam) {
      toast("Você não tem permissão para excluir membros.", "error");
      return;
    }
    deleteProfessional(id);
    toast("Membro da equipe removido.", "success");
    setDeleteUserConfirm(null);
    if (selectedProfessional === id) setSelectedProfessional(null);
  };

  const handleCreateUser = () => {
    if (!canManageTeam) {
      toast("Você não tem permissão para gerenciar equipe.", "error");
      return;
    }
    if (!newUserForm.name.trim() || !newUserForm.email.trim()) {
      toast("Preencha nome e email.", "error");
      return;
    }
    const pwd =
      newUserForm.password.trim() ||
      `user${Math.random().toString(16).slice(2, 8)}`;
    const created = addProfessional({
      name: newUserForm.name.trim(),
      email: newUserForm.email.trim(),
      phone: newUserForm.phone.trim() || undefined,
      role: newUserForm.role,
      commission_pct: Number(newUserForm.commission_pct || 0),
      clinic_id: clinicId,
      password: pwd,
    });
    if (!created) {
      toast("Este email já está em uso.", "error");
      return;
    }
    toast(`Usuário criado!${newUserForm.password ? '' : ' Senha: ' + pwd}`, "success");
    setShowUserModal(false);
    setNewUserForm({
      name: "",
      email: "",
      phone: "",
      role: "receptionist",
      commission_pct: "0",
      password: "",
    });
  };

  const handleUpgrade = async (plan: string) => {
    try {
      const planPrices: Record<string, number> = {
        basico: integrationConfig?.plan_price_basico || 97,
        profissional: integrationConfig?.plan_price_profissional || 197,
        premium: integrationConfig?.plan_price_premium || 397,
      };
      const currentPlan = clinic?.plan || "basico";
      const currentPrice = planPrices[currentPlan] || 97;
      const newPrice = planPrices[plan] || 97;

      // Calculate proportional cost
      const today = new Date();
      const daysInMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
      ).getDate();
      const daysRemaining = daysInMonth - today.getDate();
      const dailyRate = (newPrice - currentPrice) / daysInMonth;
      const proportionalAmount = Math.max(0, dailyRate * daysRemaining);

      const isDev = import.meta.env.DEV;
      const API_BASE = isDev
        ? ""
        : import.meta.env.VITE_API_BASE_URL ||
          "https://clinxia-backend.onrender.com";

      const res = await fetch(`${API_BASE}/api/mercadopago/create-preference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicName: clinic?.name || "Minha Clínica",
          email: user?.email || "",
          name: user?.name || "",
          phone: user?.phone || "",
          plan,
          amount: proportionalAmount > 0 ? proportionalAmount : newPrice,
          clinicId: user?.clinic_id || "00000000-0000-0000-0000-000000000001",
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Erro ao gerar pagamento");

      if (data.init_point) {
        window.open(data.init_point, "_blank");
        toast(
          `Upgrade para ${plan}! Valor proporcional: R$${proportionalAmount.toFixed(2)}. Após pagamento, o plano será ativado.`,
        );
      }
    } catch (e: any) {
      toast("Erro no upgrade: " + e.message, "error");
    }
    setUpgradeModal(null);
  };

  const handleTestAsaas = async () => {
    if (!asaasConfig.api_key) {
      toast("Insira a chave de API.", "error");
      return;
    }
    setAsaasTesting(true);
    try {
      await integrationsApi.asaasTest({
        apiKey: asaasConfig.api_key,
        environment: asaasConfig.environment,
      });
      setAsaasConnected(true);
      setAsaasConfig((prev) => ({
        ...prev,
        enabled: true,
        connected_at: new Date().toISOString(),
      }));
      toast("Conexao com Asaas estabelecida com sucesso!");
    } catch (error) {
      console.error(error);
      setAsaasConnected(false);
      toast("Falha ao validar credenciais do Asaas.", "error");
    } finally {
      setAsaasTesting(false);
    }
  };

  const handleSaveAsaasCredentials = () => {
    if (!asaasConfig.api_key) {
      toast("Preencha a API Key antes de salvar.", "error");
      return;
    }
    toast("Credenciais Asaas aplicadas nesta sessao.", "success");
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      toast("Preencha todos os campos.", "warning");
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      toast("As senhas não coincidem.", "error");
      return;
    }
    if (passwordForm.new.length < 8) {
      toast("A senha deve ter pelo menos 8 caracteres.", "error");
      return;
    }
    if (!/[A-Z]/.test(passwordForm.new)) {
      toast("A senha deve conter pelo menos 1 letra maiúscula.", "error");
      return;
    }
    if (!/[0-9]/.test(passwordForm.new)) {
      toast("A senha deve conter pelo menos 1 número.", "error");
      return;
    }

    setPasswordLoading(true);

    try {
      const { getSupabaseSession } = await import("@/lib/supabase");
      const session = getSupabaseSession ? getSupabaseSession() : null;
      if (!session?.access_token) {
        toast("Sessão expirada. Faça login novamente.", "error");
        setPasswordLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || "https://example.supabase.co"}/auth/v1/user`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            apikey:
              import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
              import.meta.env.VITE_SUPABASE_ANON_KEY ||
              "",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ password: passwordForm.new }),
        },
      );

      if (!response.ok) {
        const err = await response.json();
        toast(
          err.error_description || err.msg || "Erro ao alterar senha",
          "error",
        );
        setPasswordLoading(false);
        return;
      }

      // Log de auditoria
      store.addAuditLog({
        user_id: user?.id,
        clinic_id: clinic?.id,
        action: "PASSWORD_CHANGE",
        entity: "user",
        entity_id: user?.id,
      });

      toast("Senha alterada com sucesso!", "success");
      setPasswordForm({ current: "", new: "", confirm: "" });
    } catch (e) {
      console.error("Password update error:", e);
      toast("Erro ao alterar senha. Verifique sua conexão.", "error");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    if (twoFactorEnabled) {
      setTwoFactorLoading(true);
      try {
        const { getSupabaseSession } = await import("@/lib/supabase");
        const session = getSupabaseSession ? getSupabaseSession() : null;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const res = await fetch(`${API_BASE}/api/2fa/disable`, {
          method: "POST",
          headers,
          body: JSON.stringify({ userId: user?.id }),
        });
        const data = await res.json();
        if (data.ok) {
          setTwoFactorEnabled(false);

          // Log de auditoria
          store.addAuditLog({
            user_id: user?.id,
            clinic_id: clinic?.id,
            action: "2FA_DISABLE",
            entity: "user",
            entity_id: user?.id,
          });

          toast("2FA desativado com sucesso!", "success");
        } else {
          toast(data.error || "Erro ao desativar 2FA", "error");
        }
      } catch (e) {
        toast("Erro ao conectar com o servidor", "error");
      }
      setTwoFactorLoading(false);
      return;
    }

    setTwoFactorLoading(true);
    setTwoFAError("");
    try {
      const { getSupabaseSession } = await import("@/lib/supabase");
      const session = getSupabaseSession ? getSupabaseSession() : null;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${API_BASE}/api/2fa/setup`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userId: user?.id, userEmail: user?.email }),
      });
      const data = await res.json();

      if (data.ok) {
        setTwoFASecret(data.secret);
        setTwoFAQrCode(data.otpauthUri);
        setShowTwoFAModal(true);
      } else {
        setTwoFAError(data.error || "Erro ao gerar 2FA");
        toast(data.error || "Erro ao configurar 2FA", "error");
      }
    } catch (e) {
      setTwoFAError("Erro ao conectar com o servidor");
    }
    setTwoFactorLoading(false);
  };

  const handleVerify2FA = async () => {
    if (!twoFAVerifyCode || twoFAVerifyCode.length !== 6) {
      setTwoFAError("Digite o código de 6 dígitos");
      return;
    }
    setTwoFactorLoading(true);
    setTwoFAError("");
    try {
      const { getSupabaseSession } = await import("@/lib/supabase");
      const session = getSupabaseSession ? getSupabaseSession() : null;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${API_BASE}/api/2fa/verify`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userId: user?.id, code: twoFAVerifyCode }),
      });
      const data = await res.json();

      if (data.ok) {
        setTwoFactorEnabled(true);

        // Log de auditoria
        store.addAuditLog({
          user_id: user?.id,
          clinic_id: clinic?.id,
          action: "2FA_ENABLE",
          entity: "user",
          entity_id: user?.id,
        });

        setShowTwoFAModal(false);
        setTwoFAQrCode("");
        setTwoFASecret("");
        setTwoFAVerifyCode("");
        toast("2FA ativado com sucesso!", "success");
      } else {
        setTwoFAError(data.error || "Código inválido");
      }
    } catch (e) {
      setTwoFAError("Erro ao verificar código");
    }
    setTwoFactorLoading(false);
  };

  // Check 2FA status on mount
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      try {
        // Tentar via Supabase client direto (mais confiável que o backend)
        const { supabase, isSupabaseConfigured: checkConfigured } =
          await import("@/lib/supabase");
        if (checkConfigured() && supabase) {
          const { data: twoFARecord } = await supabase
            .from("user_2fa")
            .select("enabled")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!cancelled && twoFARecord?.enabled === true) {
            setTwoFactorEnabled(true);
            return;
          }
        }

        // Fallback: tentar via backend com retry de sessão
        const { getSupabaseSession } = await import("@/lib/supabase");
        const session = getSupabaseSession ? getSupabaseSession() : null;
        if (session?.access_token) {
          const res = await fetch(
            `${API_BASE}/api/2fa/status?userId=${user.id}`,
            {
              headers: { Authorization: `Bearer ${session.access_token}` },
            },
          );
          const data = await res.json();
          if (!cancelled && data.ok && data.enabled) setTwoFactorEnabled(true);
        }
      } catch (_e) {
        // silencioso — não travar a UI
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, API_BASE]);

  const handleGenerateApiKey = async () => {
    if (!newApiKeyName.trim()) {
      toast("Digite um nome para a API Key.", "warning");
      return;
    }
    setGeneratingKey(true);
    await new Promise((r) => setTimeout(r, 1000));
    const newKey = {
      id: Date.now().toString(),
      name: newApiKeyName,
      key:
        "sk_live_" +
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15),
      created: new Date().toLocaleDateString("pt-BR"),
      lastUsed: "-",
    };
    setApiKeys([...apiKeys, newKey]);
    setGeneratingKey(false);
    setNewApiKeyName("");
    toast("API Key gerada com sucesso!", "success");
  };

  const handleDeleteApiKey = (id: string) => {
    setApiKeys(apiKeys.filter((k) => k.id !== id));
    toast("API Key excluída.", "success");
  };

  const handleSaveIntegrations = () => {
    setIntegrationConfig({
      memed_api_url: integrationForm.memed_api_url,
      memed_api_token: integrationForm.memed_api_token,
      tiss_provider_name: integrationForm.tiss_provider_name,
      tiss_ans_code: integrationForm.tiss_ans_code,
      rd_station_token: integrationForm.rd_station_token,
      meta_pixel_id: integrationForm.meta_pixel_id,
      google_ads_customer_id: integrationForm.google_ads_customer_id,
      google_calendar_email: integrationForm.google_calendar_email,
    });
    toast("Configuracoes de integracoes salvas!");
  };

  const handleTestTissExport = async () => {
    try {
      await integrationsApi.tissExport({
        registro_ans: integrationForm.tiss_ans_code,
        numero_guia: `GUIA-${Date.now()}`,
        patient_name: "Paciente Teste",
        card_number: "0000000",
        procedure_code: "10101012",
        procedure_name: "Consulta odontologica",
        amount: 150,
      });
      toast("Exportacao TISS simulada com sucesso!");
    } catch (error) {
      console.error(error);
      toast("Falha ao testar exportacao TISS.", "error");
    }
  };

  const profStats = useMemo(() => {
    if (!selectedProfessional) return null;
    return getProfessionalStats(selectedProfessional, clinic?.id);
  }, [
    selectedProfessional,
    store.appointments,
    store.transactions,
    clinic?.id,
  ]);
  const selectedProf = useMemo(
    () => clinicProfessionals.find((p) => p.id === selectedProfessional),
    [clinicProfessionals, selectedProfessional],
  );
  const commissionValue = useMemo(() => {
    if (!profStats || !selectedProf) return 0;
    return profStats.revenue * (selectedProf.commission_pct / 100);
  }, [profStats, selectedProf]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500">
          Gerencie sua clínica, equipe, serviços e permissões.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex bg-white border border-slate-100 rounded-2xl p-1 overflow-x-auto no-scrollbar">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
              activeSubTab === tab.id
                ? "bg-brand-50 text-brand-600 shadow-sm"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Clinic Settings */}
      {activeSubTab === "clinica" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6"
        >
          <h2 className="text-lg font-bold text-slate-900">Dados da Clínica</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                key: "name",
                label: "Nome da Clínica",
                ph: "Lumina Odontologia",
              },
              { key: "cnpj", label: "CNPJ", ph: "12.345.678/0001-90" },
              { key: "phone", label: "Telefone", ph: "(11) 99999-9999" },
              { key: "email", label: "Email", ph: "contato@clinica.com" },
            ].map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {f.label}
                </label>
                <input
                  type="text"
                  value={(clinicForm as any)[f.key]}
                  onChange={(e) =>
                    setClinicForm((prev) => ({
                      ...prev,
                      [f.key]: e.target.value,
                    }))
                  }
                  placeholder={f.ph}
                  disabled={!canManageSettings}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none disabled:opacity-60"
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleSaveClinic}
            disabled={!canManageSettings}
            className="px-6 py-2 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 inline mr-2" />
            Salvar Alterações
          </button>
        </motion.div>
      )}

      {/* Team */}
      {activeSubTab === "equipe" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Equipe</h2>
              <button
                onClick={() => setShowUserModal(true)}
                disabled={!canManageTeam}
                className="px-4 py-2 bg-brand-600 text-white text-sm font-bold rounded-xl hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                + Novo Usuário
              </button>
            </div>
            <div className="space-y-3">
              {clinicProfessionals.map((prof) => (
                <div
                  key={prof.id}
                  onClick={() => setSelectedProfessional(prof.id)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer",
                    selectedProfessional === prof.id
                      ? "bg-brand-50 border border-brand-200"
                      : "border border-transparent hover:bg-slate-50",
                  )}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-500 rounded-full flex items-center justify-center text-white font-bold">
                    {prof.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      {prof.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {prof.role === "dentist"
                        ? "Dentista"
                        : prof.role === "aesthetician"
                          ? "Esteticista"
                          : prof.role === "admin"
                            ? "Administrador"
                            : prof.role === "financial"
                              ? "Financeiro"
                              : "Recepcionista"}
                    </p>
                    <p className="text-xs text-slate-400">{prof.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Comissão
                      </p>
                      {editingCommission?.id === prof.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editingCommission.pct}
                            onChange={(e) =>
                              setEditingCommission({
                                ...editingCommission,
                                pct: e.target.value,
                              })
                            }
                            className="w-14 px-2 py-0.5 bg-white border border-slate-200 rounded text-sm text-right outline-none"
                          />
                          <span className="text-xs">%</span>
                          <button
                            onClick={handleSaveCommission}
                            disabled={!canManageCommissions}
                            className="text-brand-600 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <Save className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCommission({
                              id: prof.id,
                              pct: String(prof.commission_pct),
                            });
                          }}
                          disabled={!canManageCommissions}
                          className="text-sm font-bold text-brand-600 hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {prof.commission_pct}%
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditUser(prof);
                        }}
                        disabled={!canManageTeam}
                        className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteUserConfirm(prof.id);
                        }}
                        disabled={!canManageTeam || prof.role === "admin"}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Modal
            isOpen={showUserModal}
            onClose={() => setShowUserModal(false)}
            title="Novo Usuário"
          >
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Nome
                </label>
                <input
                  type="text"
                  value={newUserForm.name}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none"
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none"
                  placeholder="email@clinica.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Telefone
                </label>
                <input
                  type="text"
                  value={newUserForm.phone}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Perfil
                </label>
                <select
                  value={newUserForm.role}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      role: e.target.value as UserRole,
                    }))
                  }
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none"
                >
                  <option value="receptionist">Recepção</option>
                  <option value="dentist">Dentista</option>
                  <option value="aesthetician">Esteticista</option>
                  <option value="financial">Financeiro</option>
                  <option value="admin">Admin/Dono</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Senha (opcional)
                </label>
                <input
                  type="text"
                  value={newUserForm.password}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none"
                  placeholder="Se vazio, geramos automaticamente"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Comissão (%)
                </label>
                <input
                  type="number"
                  value={newUserForm.commission_pct}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      commission_pct: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none"
                />
              </div>
              <button
                onClick={handleCreateUser}
                disabled={!canManageTeam}
                className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Criar Usuário
              </button>
            </div>
          </Modal>

          {/* Modal de Edição de Usuário */}
          <Modal
            isOpen={showEditUserModal}
            onClose={() => {
              setShowEditUserModal(false);
              setEditingUser(null);
            }}
            title="Editar Membro da Equipe"
          >
            {editingUser && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) =>
                      setEditingUser((prev) =>
                        prev ? { ...prev, name: e.target.value } : null,
                      )
                    }
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none"
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) =>
                      setEditingUser((prev) =>
                        prev ? { ...prev, email: e.target.value } : null,
                      )
                    }
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none"
                    placeholder="email@clinica.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={editingUser.phone}
                    onChange={(e) =>
                      setEditingUser((prev) =>
                        prev ? { ...prev, phone: e.target.value } : null,
                      )
                    }
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Perfil
                  </label>
                  <select
                    value={editingUser.role}
                    onChange={(e) =>
                      setEditingUser((prev) =>
                        prev
                          ? { ...prev, role: e.target.value as UserRole }
                          : null,
                      )
                    }
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none"
                  >
                    <option value="receptionist">Recepção</option>
                    <option value="dentist">Dentista</option>
                    <option value="aesthetician">Esteticista</option>
                    <option value="financial">Financeiro</option>
                    <option value="admin">Admin/Dono</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Comissão (%)
                  </label>
                  <input
                    type="number"
                    value={editingUser.commission_pct}
                    onChange={(e) =>
                      setEditingUser((prev) =>
                        prev
                          ? { ...prev, commission_pct: e.target.value }
                          : null,
                      )
                    }
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none"
                  />
                </div>
                <button
                  onClick={handleSaveEditUser}
                  disabled={!canManageTeam}
                  className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Salvar Alterações
                </button>
              </div>
            )}
          </Modal>

          {/* Confirmação de Exclusão de Usuário */}
          <ConfirmDialog
            isOpen={!!deleteUserConfirm}
            onClose={() => setDeleteUserConfirm(null)}
            onConfirm={() =>
              deleteUserConfirm && handleDeleteUser(deleteUserConfirm)
            }
            title="Excluir Membro da Equipe"
            message="Tem certeza que deseja excluir este membro da equipe? Esta ação não pode ser desfeita."
            confirmLabel="Excluir"
            variant="danger"
          />

          {/* Professional Stats */}
          <div className="space-y-6">
            {selectedProfessional && profStats ? (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-brand-500" />
                  Estatísticas
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Atendimentos
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {profStats.appointments}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Receita
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {formatCurrency(profStats.revenue)}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Ticket Médio
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {formatCurrency(profStats.ticketMedio)}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Comparecimento
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {profStats.attendanceRate.toFixed(0)}%
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Faltas
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {profStats.noShows}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Comissão
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {formatCurrency(commissionValue)}
                    </p>
                  </div>
                </div>
                {profStats.topProcedures.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                      Top Procedimentos
                    </p>
                    {profStats.topProcedures.map((p) => (
                      <div
                        key={p.name}
                        className="flex items-center justify-between text-sm py-1"
                      >
                        <span className="text-slate-600">{p.name}</span>
                        <span className="font-bold text-slate-900">
                          {p.count}x
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  Selecione um profissional para ver estatísticas
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Services */}
      {activeSubTab === "servicos" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Serviços e Procedimentos
            </h2>
            <button
              onClick={() => {
                setEditingService(null);
                setSvcForm({
                  name: "",
                  category: "Consulta",
                  base_price: "",
                  avg_duration_min: "60",
                  estimated_cost: "0",
                });
                setSvcMaterials([]);
                setSvcProfPrices({});
                setShowServiceModal(true);
              }}
              disabled={!canManageSettings}
              className="px-4 py-2 bg-brand-600 text-white text-sm font-bold rounded-xl hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Novo Serviço
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Serviço
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Duração
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Preço
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clinicServices.map((svc) => (
                  <tr key={svc.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">
                        {svc.name}
                      </p>
                      {(svc.materials || []).length > 0 && (
                        <p className="text-[10px] text-slate-400">
                          {(svc.materials || []).length} material(is)
                          vinculado(s)
                        </p>
                      )}
                      {svc.professional_prices &&
                        Object.keys(svc.professional_prices || {}).length >
                          0 && (
                          <p className="text-[10px] text-brand-500 font-medium">
                            Preços por profissional configurados
                          </p>
                        )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">
                        {svc.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {svc.avg_duration_min} min
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">
                      {formatCurrency(svc.base_price)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEditService(svc)}
                        disabled={!canManageSettings}
                        className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(svc.id)}
                        disabled={!canManageSettings}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Service Modal */}
          <Modal
            isOpen={showServiceModal}
            onClose={() => {
              setShowServiceModal(false);
              setEditingService(null);
            }}
            title={editingService ? "Editar Serviço" : "Novo Serviço"}
            maxWidth="max-w-2xl"
          >
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  value={svcForm.name}
                  onChange={(e) =>
                    setSvcForm({ ...svcForm, name: e.target.value })
                  }
                  disabled={!canManageSettings}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none disabled:opacity-60"
                  placeholder="Ex: Restauração em Resina"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Categoria
                  </label>
                  <input
                    list="service-categories"
                    type="text"
                    value={svcForm.category}
                    onChange={(e) =>
                      setSvcForm({ ...svcForm, category: e.target.value })
                    }
                    disabled={!canManageSettings}
                    placeholder="Selecione ou digite..."
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none disabled:opacity-60"
                  />
                  <datalist id="service-categories">
                    {[
                      "Consulta",
                      "Preventivo",
                      "Restaurador",
                      "Cirúrgico",
                      "Ortodontia",
                      "Estética",
                      "Implante"
                    ].map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Duração (min)
                  </label>
                  <input
                    type="number"
                    value={svcForm.avg_duration_min}
                    onChange={(e) =>
                      setSvcForm({
                        ...svcForm,
                        avg_duration_min: e.target.value,
                      })
                    }
                    disabled={!canManageSettings}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none disabled:opacity-60"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Preço Base (R$) *
                  </label>
                  <input
                    type="text"
                    value={svcForm.base_price}
                    onChange={(e) =>
                      setSvcForm({ ...svcForm, base_price: e.target.value })
                    }
                    disabled={!canManageSettings}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none disabled:opacity-60"
                    placeholder="250,00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Custo Estimado (R$)
                  </label>
                  <input
                    type="text"
                    value={svcForm.estimated_cost}
                    onChange={(e) =>
                      setSvcForm({ ...svcForm, estimated_cost: e.target.value })
                    }
                    disabled={!canManageSettings}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none disabled:opacity-60"
                    placeholder="50,00"
                  />
                </div>
              </div>

              {/* Professional Pricing */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-3 h-3" />
                  Preço por Profissional
                </label>
                <p className="text-[10px] text-slate-400 -mt-1">
                  Defina preços específicos para cada profissional. Se vazio, o
                  preço base será utilizado.
                </p>
                <div className="space-y-2">
                  {clinicProfessionals
                    .filter((p) => p.role !== "receptionist")
                    .map((prof) => (
                      <div key={prof.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {prof.name.charAt(0)}
                        </div>
                        <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">
                          {prof.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">R$</span>
                          <input
                            type="text"
                            value={svcProfPrices[prof.id] || ""}
                            onChange={(e) =>
                              setSvcProfPrices((prev) => ({
                                ...prev,
                                [prof.id]: e.target.value,
                              }))
                            }
                            placeholder={svcForm.base_price || "0"}
                            disabled={!canManageSettings}
                            className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none text-right disabled:opacity-60 focus:border-brand-400"
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Materials Linking */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Materiais Vinculados
                  </label>
                  <button
                    onClick={() =>
                      setSvcMaterials((prev) => [
                        ...prev,
                        {
                          stock_item_id: clinicStockItems[0]?.id || "",
                          stock_item_name: clinicStockItems[0]?.name || "",
                          qty_per_use: 1,
                        },
                      ])
                    }
                    disabled={!canManageSettings}
                    className="text-xs text-brand-600 font-bold hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    + Adicionar
                  </button>
                </div>
                {svcMaterials.map((m, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select
                      value={m.stock_item_id}
                      onChange={(e) => {
                        const items = [...svcMaterials];
                        const item = clinicStockItems.find(
                          (s) => s.id === e.target.value,
                        );
                        items[i] = {
                          stock_item_id: e.target.value,
                          stock_item_name: item?.name || "",
                          qty_per_use: items[i].qty_per_use,
                        };
                        setSvcMaterials(items);
                      }}
                      disabled={!canManageSettings}
                      className="flex-1 px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none disabled:opacity-60"
                    >
                      {clinicStockItems.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={m.qty_per_use}
                      onChange={(e) => {
                        const items = [...svcMaterials];
                        items[i].qty_per_use = Number(e.target.value);
                        setSvcMaterials(items);
                      }}
                      disabled={!canManageSettings}
                      className="w-16 px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none text-center disabled:opacity-60"
                    />
                    <button
                      onClick={() =>
                        setSvcMaterials((prev) =>
                          prev.filter((_, j) => j !== i),
                        )
                      }
                      disabled={!canManageSettings}
                      className="text-red-400 hover:text-red-600 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveService}
                disabled={
                  !svcForm.name || !svcForm.base_price || !canManageSettings
                }
                className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-50 mt-4"
              >
                Salvar Serviço
              </button>
            </div>
          </Modal>

          <ConfirmDialog
            isOpen={!!deleteConfirm}
            onClose={() => setDeleteConfirm(null)}
            onConfirm={() => {
              if (deleteConfirm) {
                deleteService(deleteConfirm);
                setDeleteConfirm(null);
                toast("Serviço excluído!");
              }
            }}
            title="Excluir Serviço?"
            message="Tem certeza? Agendamentos existentes não serão afetados."
            confirmLabel="Excluir"
            variant="danger"
          />
        </motion.div>
      )}

      {/* Permissions */}
      {activeSubTab === "permissoes" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6"
        >
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            Matriz de Permissões
          </h2>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <p className="text-xs text-slate-500">
              Clique nos indicadores para liberar ou bloquear. As alterações são
              salvas automaticamente.
            </p>
            <button
              onClick={handleResetPermissions}
              disabled={!canManageSettings}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Restaurar padrão
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase">
                    Ação
                  </th>
                  {permissionRoles.map((role) => (
                    <th
                      key={role.key}
                      className="py-3 px-4 text-xs font-bold text-slate-400 uppercase text-center"
                    >
                      {role.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {permissionRows.map((row) => (
                  <tr key={row.key}>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {row.label}
                    </td>
                    {permissionRoles.map((role) => {
                      const allowed = (
                        permissionMatrix[row.key] || []
                      ).includes(role.key);
                      return (
                        <td key={role.key} className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleTogglePermission(row.key, role.key)
                            }
                            disabled={!canManageSettings}
                            className={cn(
                              "inline-flex w-6 h-6 rounded-full text-white text-xs items-center justify-center mx-auto transition-colors",
                              allowed
                                ? "bg-emerald-500 hover:bg-emerald-600"
                                : "bg-slate-200 hover:bg-slate-300",
                              !canManageSettings &&
                                "opacity-60 cursor-not-allowed hover:bg-slate-200",
                            )}
                            aria-pressed={allowed}
                            aria-label={`${row.label} - ${role.label}`}
                            title={allowed ? "Permitido" : "Bloqueado"}
                          >
                            {allowed ? (
                              <Check className="w-4 h-4 text-white" />
                            ) : (
                              <X className="w-4 h-4 text-slate-500" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Notifications */}
      {activeSubTab === "notificacoes" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            Preferências de Notificação
          </h2>
          {[
            {
              key: "agendaConfirmation",
              label: "Confirmação de Agendamento",
              desc: "Enviar confirmação via WhatsApp para o paciente",
            },
            {
              key: "patientReminder",
              label: "Lembrete de Consulta",
              desc: "Lembrar paciente 24h antes da consulta",
            },
            {
              key: "stockAlert",
              label: "Alerta de Estoque Baixo",
              desc: "Notificar quando um item atingir o mínimo",
            },
            {
              key: "paymentReceived",
              label: "Pagamento Recebido",
              desc: "Notificar ao receber um pagamento",
            },
            {
              key: "newPatient",
              label: "Novo Paciente Cadastrado",
              desc: "Notificar quando um novo paciente é cadastrado",
            },
            {
              key: "noShow",
              label: "Paciente Faltou",
              desc: "Notificar quando um paciente não compareceu",
            },
            {
              key: "dailySummary",
              label: "Resumo Diário",
              desc: "Enviar resumo do dia ao final do expediente",
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0"
            >
              <div>
                <p className="text-sm font-bold text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <button
                onClick={() =>
                  setNotificationPref(item.key, !notificationPrefs[item.key])
                }
                disabled={!canManageSettings}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  notificationPrefs[item.key] ? "bg-brand-500" : "bg-slate-200",
                  !canManageSettings && "opacity-60 cursor-not-allowed",
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all",
                    notificationPrefs[item.key] ? "left-6" : "left-0.5",
                  )}
                />
              </button>
            </div>
          ))}
          <button
            onClick={async () => {
              try {
                await store.saveNotificationPrefs();
                toast("Preferências de notificação salvas!");
              } catch (e) {
                toast("Erro ao salvar preferências.");
              }
            }}
            disabled={!canManageSettings}
            className="px-6 py-2 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Salvar Preferências
          </button>
        </motion.div>
      )}

      {/* Subscription with Upgrade */}
      {activeSubTab === "assinatura" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-600" />
              Plano e Assinatura
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Gerencie seu plano atual e faça upgrade quando precisar de mais
              recursos.
            </p>
          </div>

          {/* Current Plan Card */}
          <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-3xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80">Plano Atual</p>
                <p className="text-2xl font-black capitalize">
                  {clinic?.plan || "basico"}
                </p>
                <p className="text-sm text-white/70 mt-1">
                  Próxima cobrança:{" "}
                  {new Date(
                    new Date().getFullYear(),
                    new Date().getMonth() + 1,
                    1,
                  ).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black">
                  R$
                  {clinic?.plan === "profissional"
                    ? integrationConfig?.plan_price_profissional || 197
                    : clinic?.plan === "premium"
                      ? integrationConfig?.plan_price_premium || 397
                      : integrationConfig?.plan_price_basico || 17}
                </p>
                <p className="text-sm text-white/70">/mês</p>
              </div>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                id: "basico",
                name: "Básico",
                price: integrationConfig?.plan_price_basico || 17,
                desc: "Ideal para clínicas iniciantes",
                features: [
                  "1 profissional",
                  "500 pacientes",
                  "200 consultas/mês",
                  "Prontuário digital",
                  "WhatsApp integrado",
                  "Suporte por email",
                ],
                color: "cyan",
              },
              {
                id: "profissional",
                name: "Profissional",
                price: integrationConfig?.plan_price_profissional || 197,
                desc: "Para clínicas em crescimento",
                features: [
                  "5 profissionais",
                  "2.000 pacientes",
                  "1.000 consultas/mês",
                  "Financeiro completo",
                  "Estoque",
                  "Marketing",
                  "Relatórios avançados",
                  "Suporte prioritário",
                ],
                color: "blue",
                popular: true,
              },
              {
                id: "premium",
                name: "Premium",
                price: integrationConfig?.plan_price_premium || 397,
                desc: "Máximo desempenho",
                features: [
                  "Profissionais ilimitados",
                  "Pacientes ilimitados",
                  "Consultas ilimitadas",
                  "Tudo do Profissional",
                  "Multi-unidades",
                  "API integrada",
                  "Personalização total",
                  "SLA 99.9%",
                ],
                color: "purple",
              },
            ].map((plan) => {
              const isCurrent = clinic?.plan === plan.id;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "p-6 rounded-3xl border-2 transition-all relative",
                    isCurrent
                      ? "bg-white border-brand-500 shadow-lg shadow-brand-100"
                      : "bg-white border-slate-100 hover:border-slate-300",
                  )}
                >
                  {plan.popular && !isCurrent && (
                    <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                      Popular
                    </span>
                  )}
                  {isCurrent && (
                    <span className="absolute -top-2.5 right-4 bg-brand-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                      PLANO ATUAL
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-slate-900">
                    {plan.name}
                  </h3>
                  <p className="text-3xl font-black text-slate-900 mt-2">
                    R$ {plan.price}
                    <span className="text-sm font-normal text-slate-400">
                      /mês
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1 mb-6">
                    {plan.desc}
                  </p>
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="text-slate-600 flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <button
                      onClick={() =>
                        setUpgradeModal({ plan: plan.name, price: plan.price })
                      }
                      className="w-full mt-6 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      {["basico", "profissional", "premium"].indexOf(plan.id) >
                      ["basico", "profissional", "premium"].indexOf(
                        clinic?.plan || "basico",
                      )
                        ? "Fazer Upgrade"
                        : "Mudar Plano"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Upgrade Confirmation Modal */}
          <Modal
            isOpen={!!upgradeModal}
            onClose={() => setUpgradeModal(null)}
            title="Confirmar Mudança de Plano"
          >
            {upgradeModal &&
              (() => {
                const planMap: Record<string, string> = {
                  Básico: "basico",
                  Profissional: "profissional",
                  Premium: "premium",
                };
                const planId = planMap[upgradeModal.plan] || "profissional";
                const priceMap: Record<string, number> = {
                  basico: integrationConfig?.plan_price_basico || 17,
                  profissional:
                    integrationConfig?.plan_price_profissional || 197,
                  premium: integrationConfig?.plan_price_premium || 397,
                };
                const currentPrice = priceMap[clinic?.plan || "basico"] || 17;
                const newPrice = priceMap[planId] || 197;
                const today = new Date();
                const daysInMonth = new Date(
                  today.getFullYear(),
                  today.getMonth() + 1,
                  0,
                ).getDate();
                const daysRemaining = daysInMonth - today.getDate();
                const diff = newPrice - currentPrice;
                const proportionalAmount =
                  diff > 0
                    ? Math.max(0, (diff / daysInMonth) * daysRemaining)
                    : 0;
                const totalCharge =
                  proportionalAmount > 0 ? proportionalAmount : newPrice;

                return (
                  <div className="space-y-4">
                    <div className="bg-brand-50 p-4 rounded-2xl">
                      <p className="text-sm text-slate-700">
                        Upgrade para{" "}
                        <strong className="text-brand-600">
                          {upgradeModal.plan}
                        </strong>
                      </p>
                      <p className="text-2xl font-black text-slate-900 mt-2">
                        R$ {upgradeModal.price}
                        <span className="text-sm font-normal text-slate-400">
                          /mês
                        </span>
                      </p>
                    </div>
                    {proportionalAmount > 0 && (
                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                        <p className="text-sm font-bold text-amber-800">
                          Cobrança proporcional
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          Diferença: R${diff.toFixed(2)} × {daysRemaining} dias
                          restantes ={" "}
                          <strong>R${proportionalAmount.toFixed(2)}</strong>
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          A partir do próximo mês, será cobrado R$
                          {upgradeModal.price}/mês.
                        </p>
                      </div>
                    )}
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Valor agora:</span>
                        <span className="font-bold text-slate-800">
                          R${totalCharge.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setUpgradeModal(null)}
                        className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleUpgrade(planId)}
                        className="flex-1 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Confirmar e Pagar
                      </button>
                    </div>
                  </div>
                );
              })()}
          </Modal>
        </motion.div>
      )}

      {/* Asaas Integration */}
      {activeSubTab === "asaas" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Status Card */}
          <div
            className={cn(
              "bg-white rounded-3xl border shadow-sm p-6 flex items-center gap-4",
              asaasConnected ? "border-emerald-200" : "border-slate-100",
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                asaasConnected ? "bg-emerald-50" : "bg-slate-50",
              )}
            >
              {asaasConnected ? (
                <Wifi className="w-6 h-6 text-emerald-500" />
              ) : (
                <WifiOff className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">
                Asaas — Gateway de Pagamentos
              </p>
              <p className="text-xs text-slate-500">
                {asaasConnected
                  ? `Conectado em ${new Date(asaasConfig.connected_at || "").toLocaleString("pt-BR")}`
                  : "Não conectado. Configure suas credenciais abaixo."}
              </p>
            </div>
            <span
              className={cn(
                "text-xs font-bold px-3 py-1 rounded-full",
                asaasConnected
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500",
              )}
            >
              {asaasConnected ? "Conectado" : "Desconectado"}
            </span>
          </div>

          {/* Configuration Form */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-bold text-slate-900">
              Credenciais da API
            </h2>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Chave de API (API Key) *
                </label>
                <input
                  type="password"
                  value={asaasConfig.api_key}
                  onChange={(e) =>
                    setAsaasConfig((prev) => ({
                      ...prev,
                      api_key: e.target.value,
                    }))
                  }
                  placeholder="$aact_YTU5YTE0M2M2MWM2..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-mono focus:border-brand-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Wallet ID
                  </label>
                  <input
                    type="text"
                    value={asaasConfig.wallet_id}
                    onChange={(e) =>
                      setAsaasConfig((prev) => ({
                        ...prev,
                        wallet_id: e.target.value,
                      }))
                    }
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-mono focus:border-brand-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Ambiente
                  </label>
                  <select
                    value={asaasConfig.environment}
                    onChange={(e) =>
                      setAsaasConfig((prev) => ({
                        ...prev,
                        environment: e.target.value as "sandbox" | "production",
                      }))
                    }
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-400"
                  >
                    <option value="sandbox">Sandbox (Teste)</option>
                    <option value="production">Produção</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Webhook URL (opcional)
                </label>
                <input
                  type="text"
                  value={asaasConfig.webhook_url || ""}
                  onChange={(e) =>
                    setAsaasConfig((prev) => ({
                      ...prev,
                      webhook_url: e.target.value,
                    }))
                  }
                  placeholder="https://suaapi.com/webhooks/asaas"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-400"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleTestAsaas}
                disabled={!asaasConfig.api_key || asaasTesting}
                className={cn(
                  "flex-1 py-3 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2",
                  asaasTesting
                    ? "bg-slate-100 text-slate-400"
                    : "bg-gradient-to-r from-brand-600 to-brand-600 text-white hover:opacity-90 shadow-sm shadow-brand-200",
                )}
              >
                {asaasTesting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                    Testando Conexão...
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4" />
                    Testar Conexão
                  </>
                )}
              </button>
              <button
                onClick={handleSaveAsaasCredentials}
                disabled={!asaasConfig.api_key}
                className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl text-sm hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4 inline mr-2" />
                Salvar Credenciais
              </button>
            </div>
          </div>

          {/* Integration Features */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Funcionalidades Integradas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  label: "Cobranças via PIX",
                  desc: "Gere QR codes PIX diretamente no financeiro",
                  enabled: asaasConnected,
                },
                {
                  label: "Boleto Bancário",
                  desc: "Envie boletos por email/WhatsApp para pacientes",
                  enabled: asaasConnected,
                },
                {
                  label: "Cartão de Crédito",
                  desc: "Aceite pagamentos via cartão de crédito",
                  enabled: asaasConnected,
                },
                {
                  label: "Link de Pagamento",
                  desc: "Compartilhe links de pagamento personalizados",
                  enabled: asaasConnected,
                },
                {
                  label: "Cobranças Recorrentes",
                  desc: "Configure assinaturas para tratamentos prolongados",
                  enabled: asaasConnected,
                },
                {
                  label: "Notificações de Pagamento",
                  desc: "Receba webhooks quando um pagamento for confirmado",
                  enabled: asaasConnected && !!asaasConfig.webhook_url,
                },
              ].map((feature) => (
                <div
                  key={feature.label}
                  className={cn(
                    "p-4 rounded-2xl border transition-all",
                    feature.enabled
                      ? "border-emerald-200 bg-emerald-50/30"
                      : "border-slate-100 bg-slate-50/30",
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {feature.enabled ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                    )}
                    <p className="text-sm font-bold text-slate-900">
                      {feature.label}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 pl-6">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Segurança */}
      {activeSubTab === "seguranca" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Alterar Senha */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Alterar Senha
                </h2>
                <p className="text-sm text-slate-500">
                  Mantenha sua conta segura
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Senha Atual
                </label>
                <input
                  type="password"
                  value={passwordForm.current}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      current: e.target.value,
                    })
                  }
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
              <div></div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={passwordForm.new}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, new: e.target.value })
                  }
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirm: e.target.value,
                    })
                  }
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
              <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">
                  Requisitos de senha:
                </p>
                <ul className="text-xs text-amber-700 mt-1 grid grid-cols-2 gap-1">
                  <li className="flex items-center gap-1">
                    <Check className="w-3 h-3" /> Mínimo 8 caracteres
                  </li>
                  <li className="flex items-center gap-1">
                    <Check className="w-3 h-3" /> Letra maiúscula
                  </li>
                  <li className="flex items-center gap-1">
                    <Check className="w-3 h-3" /> Letra minúscula
                  </li>
                  <li className="flex items-center gap-1">
                    <Check className="w-3 h-3" /> Número
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={handleChangePassword}
              disabled={passwordLoading}
              className="px-6 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-70 flex items-center gap-2"
            >
              {passwordLoading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {passwordLoading ? "Alterando..." : "Atualizar Senha"}
            </button>
          </div>

          {/* Autenticação 2FA */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Autenticação em Dois Fatores (2FA)
                  </h3>
                  <p className="text-sm text-slate-500">
                    Camada adicional de segurança
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full ${twoFactorEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
              >
                {twoFactorEnabled ? "Ativado" : "Desativado"}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Status: {twoFactorEnabled ? "Ativado" : "Desativado"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Proteja sua conta com 2FA via aplicativo autenticador
                  </p>
                </div>
                <button
                  onClick={handleToggle2FA}
                  disabled={twoFactorLoading}
                  className={
                    twoFactorEnabled
                      ? "px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-70"
                      : "px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-70"
                  }
                >
                  {twoFactorLoading
                    ? " processando..."
                    : twoFactorEnabled
                      ? "Desativar 2FA"
                      : "Ativar 2FA"}
                </button>
              </div>
            </div>
          </div>

          {/* 2FA Setup Modal */}
          <Modal
            isOpen={showTwoFAModal}
            onClose={() => {
              setShowTwoFAModal(false);
              setTwoFAQrCode("");
              setTwoFASecret("");
            }}
            title="Configurar 2FA"
            maxWidth="max-w-md"
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-600 text-center">
                Escaneie o QR Code com seu aplicativo autenticador (Google
                Authenticator, Authy, etc.)
              </p>

              {twoFAQrCode && (
                <div className="bg-white p-4 rounded-xl inline-block border">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(twoFAQrCode)}`}
                    alt="QR Code 2FA"
                    className="w-48 h-48 mx-auto"
                  />
                </div>
              )}

              {twoFASecret && (
                <div className="mt-4 p-3 bg-slate-100 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">
                    Ou digite esta chave:
                  </p>
                  <p className="font-mono text-sm font-bold text-slate-700">
                    {twoFASecret}
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Código
                </label>
                <input
                  type="text"
                  value={twoFAVerifyCode}
                  onChange={(e) =>
                    setTwoFAVerifyCode(
                      e.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-2xl font-bold tracking-widest outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {twoFAError && (
                <p className="text-sm text-red-600 text-center">{twoFAError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTwoFAModal(false);
                    setTwoFAQrCode("");
                    setTwoFASecret("");
                  }}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleVerify2FA}
                  disabled={twoFactorLoading || twoFAVerifyCode.length !== 6}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {twoFactorLoading && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  Ativar
                </button>
              </div>
            </div>
          </Modal>

          {/* API Keys */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">API Keys</h3>
                  <p className="text-sm text-slate-500">
                    Gerencie chaves para integrações
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Nome da API Key
                </label>
                <input
                  type="text"
                  value={newApiKeyName}
                  onChange={(e) => setNewApiKeyName(e.target.value)}
                  placeholder="Ex: Produção, Homologação..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>
              <button
                onClick={handleGenerateApiKey}
                disabled={generatingKey}
                className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors flex items-center gap-2 disabled:opacity-70"
              >
                {generatingKey && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <Plus className="w-4 h-4" /> Gerar Key
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 text-xs font-bold text-slate-400 uppercase">
                      Nome
                    </th>
                    <th className="pb-3 text-xs font-bold text-slate-400 uppercase">
                      Chave
                    </th>
                    <th className="pb-3 text-xs font-bold text-slate-400 uppercase">
                      Criado em
                    </th>
                    <th className="pb-3 text-xs font-bold text-slate-400 uppercase">
                      Último uso
                    </th>
                    <th className="pb-3 text-xs font-bold text-slate-400 uppercase">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((key) => (
                    <tr key={key.id} className="border-b border-slate-50">
                      <td className="py-3 text-sm font-bold text-slate-900">
                        {key.name}
                      </td>
                      <td className="py-3 text-sm font-mono text-slate-500">
                        {key.key}
                      </td>
                      <td className="py-3 text-sm text-slate-600">
                        {key.created}
                      </td>
                      <td className="py-3 text-sm text-slate-600">
                        {key.lastUsed}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(key.key);
                              toast("Chave copiada!");
                            }}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Copiar"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteApiKey(key.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {apiKeys.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 text-center text-slate-400"
                      >
                        Nenhuma API Key encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Auditoria */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Auditoria de Segurança
                </h3>
                <p className="text-sm text-slate-500">
                  Histórico de atividades da conta
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 text-xs font-bold text-slate-400 uppercase">
                      Data
                    </th>
                    <th className="pb-3 text-xs font-bold text-slate-400 uppercase">
                      Ação
                    </th>
                    <th className="pb-3 text-xs font-bold text-slate-400 uppercase">
                      IP
                    </th>
                    <th className="pb-3 text-xs font-bold text-slate-400 uppercase">
                      Dispositivo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {store.auditLogs
                    .filter((log) => log.user_id === user?.id || user?.role === 'super_admin')
                    .slice(0, 10)
                    .map((log) => {
                      const actionInfo = (() => {
                        switch (log.action) {
                          case "LOGIN":
                            return {
                              label: "Login",
                              color: "bg-emerald-50 text-emerald-700",
                            };
                          case "LOGOUT":
                            return {
                              label: "Logout",
                              color: "bg-slate-50 text-slate-700",
                            };
                          case "PASSWORD_CHANGE":
                            return {
                              label: "Alteração de senha",
                              color: "bg-amber-50 text-amber-700",
                            };
                          case "2FA_ENABLE":
                            return {
                              label: "Ativação 2FA",
                              color: "bg-emerald-50 text-emerald-700",
                            };
                          case "2FA_DISABLE":
                            return {
                              label: "Desativação 2FA",
                              color: "bg-red-50 text-red-700",
                            };
                          case "UPDATE_PERMISSIONS":
                            return {
                              label: "Permissões",
                              color: "bg-brand-50 text-brand-700",
                            };
                          default:
                            return {
                              label: log.action,
                              color: "bg-slate-50 text-slate-700",
                            };
                        }
                      })();

                      const deviceData = log.new_data?.device_info;
                      const deviceLabel = (() => {
                        if (!deviceData?.ua) return "Sistema";
                        const ua = deviceData.ua;
                        if (ua.includes("Chrome")) return "Chrome / Windows";
                        if (ua.includes("Safari")) return "Safari / macOS";
                        if (ua.includes("iPhone")) return "iPhone / iOS";
                        if (ua.includes("Android")) return "Android";
                        return "Navegador Web";
                      })();

                      return (
                        <tr key={log.id} className="border-b border-slate-50">
                          <td className="py-3 text-sm text-slate-600">
                            {new Date(log.created_at).toLocaleString("pt-BR")}
                          </td>
                          <td className="py-3">
                            <span
                              className={cn(
                                "px-2 py-1 text-xs font-bold rounded-full",
                                actionInfo.color,
                              )}
                            >
                              {actionInfo.label}
                            </span>
                          </td>
                          <td className="py-3 text-sm text-slate-500">
                            {log.ip || "Local"}
                          </td>
                          <td className="py-3 text-sm text-slate-500">
                            {deviceLabel}
                          </td>
                        </tr>
                      );
                    })}
                  {store.auditLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-10 text-center text-slate-400"
                      >
                        Nenhum histórico disponível
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {activeSubTab === "integracoes" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Integrations />
        </motion.div>
      )}

      {activeSubTab === "nfe" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <NFeSettings />
        </motion.div>
      )}

      {activeSubTab === "sistema" && user?.role === "super_admin" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              Configurações Globais do Sistema
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Integrações usadas pelo sistema para funcionalidades globais
            </p>
          </div>
          <SystemWhatsAppConfig />

          {/* Planos e Preços */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Planos e Preços
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Defina os preços dos planos. Alterações refletem imediatamente no
              cadastro de novas clínicas.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(
                [
                  { id: "basico", name: "Básico", color: "cyan" },
                  { id: "profissional", name: "Profissional", color: "blue" },
                  { id: "premium", name: "Premium", color: "purple" },
                ] as const
              ).map((plan) => (
                <div key={plan.id} className="bg-slate-50 rounded-xl p-4">
                  <p className="font-bold text-slate-800 mb-2">{plan.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">R$</span>
                    <input
                      type="number"
                      value={integrationForm[`plan_price_${plan.id}`] || ""}
                      onChange={(e) =>
                        setIntegrationForm({
                          ...integrationForm,
                          [`plan_price_${plan.id}`]: e.target.value,
                        })
                      }
                      className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-lg text-lg font-bold text-center outline-none focus:border-emerald-400"
                    />
                    <span className="text-sm text-slate-500">/mês</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={async () => {
                try {
                  const { getSupabaseSession } = await import("@/lib/supabase");

                  const supabaseUrl = SUPABASE_URL;
                  const supabaseKey = SUPABASE_PUBLISHABLE_KEY;

                  const session = getSupabaseSession
                    ? getSupabaseSession()
                    : null;
                  if (!supabaseKey)
                    throw new Error(
                      "VITE_SUPABASE_PUBLISHABLE_KEY não configurada",
                    );
                  const headers: Record<string, string> = {
                    "Content-Type": "application/json",
                    apikey: supabaseKey,
                    Authorization: session?.access_token
                      ? `Bearer ${session.access_token}`
                      : `Bearer ${supabaseKey}`,
                    Prefer: "resolution=merge-duplicates,return=representation",
                  };

                  const parsedBasico = parseFloat(
                    integrationForm.plan_price_basico,
                  );
                  const parsedProfissional = parseFloat(
                    integrationForm.plan_price_profissional,
                  );
                  const parsedPremium = parseFloat(
                    integrationForm.plan_price_premium,
                  );
                  if (!Number.isFinite(parsedBasico) || parsedBasico <= 0)
                    throw new Error("Preço Básico inválido");
                  if (
                    !Number.isFinite(parsedProfissional) ||
                    parsedProfissional <= 0
                  )
                    throw new Error("Preço Profissional inválido");
                  if (!Number.isFinite(parsedPremium) || parsedPremium <= 0)
                    throw new Error("Preço Premium inválido");
                  const planData = {
                    id: SYSTEM_GLOBAL_CLINIC_ID,
                    clinic_id: SYSTEM_GLOBAL_CLINIC_ID,
                    plan_price_basico: parsedBasico,
                    plan_price_profissional: parsedProfissional,
                    plan_price_premium: parsedPremium,
                    mp_access_token: integrationForm.mp_access_token,
                    mp_public_key: integrationForm.mp_public_key,
                    mp_webhook_secret: integrationForm.mp_webhook_secret,
                  };

                  const upsertRes = await fetch(
                    `${supabaseUrl}/rest/v1/integration_config`,
                    {
                      method: "POST",
                      headers,
                      body: JSON.stringify(planData),
                    },
                  );
                  if (!upsertRes.ok) {
                    const details = await upsertRes.text();
                    throw new Error(
                      `Erro ao salvar (${upsertRes.status}): ${details}`,
                    );
                  }

                  setIntegrationForm((prev) => ({
                    ...prev,
                    plan_price_basico: String(parsedBasico),
                    plan_price_profissional: String(parsedProfissional),
                    plan_price_premium: String(parsedPremium),
                  }));
                  setIntegrationConfig({
                    plan_price_basico: parsedBasico,
                    plan_price_profissional: parsedProfissional,
                    plan_price_premium: parsedPremium,
                    mp_access_token: integrationForm.mp_access_token,
                    mp_public_key: integrationForm.mp_public_key,
                    mp_webhook_secret: integrationForm.mp_webhook_secret,
                  });
                  toast("Preços e credenciais salvos com sucesso!");
                } catch (e: any) {
                  toast("Erro ao salvar: " + e.message, "error");
                }
              }}
              className="mt-4 px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all"
            >
              Salvar Preços
            </button>
          </div>

          {/* Mercado Pago Config */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-brand-600" />
              Mercado Pago - Pagamentos
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Credenciais para gerar cobranças Pix e cartão via Mercado Pago
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Access Token
                </label>
                <input
                  type="password"
                  value={integrationForm.mp_access_token || ""}
                  onChange={(e) =>
                    setIntegrationForm({
                      ...integrationForm,
                      mp_access_token: e.target.value,
                    })
                  }
                  placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Public Key
                </label>
                <input
                  type="text"
                  value={integrationForm.mp_public_key || ""}
                  onChange={(e) =>
                    setIntegrationForm({
                      ...integrationForm,
                      mp_public_key: e.target.value,
                    })
                  }
                  placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Webhook Secret
                </label>
                <input
                  type="password"
                  value={integrationForm.mp_webhook_secret || ""}
                  onChange={(e) =>
                    setIntegrationForm({
                      ...integrationForm,
                      mp_webhook_secret: e.target.value,
                    })
                  }
                  placeholder="Webhook secret do Mercado Pago"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-mono text-sm"
                />
              </div>
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-3">
                <p className="text-xs text-brand-700">
                  <strong>Como obter:</strong> Acesse{" "}
                  <a
                    href="https://www.mercadopago.com.br/developers/panel/app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Mercado Pago Developers
                  </a>{" "}
                  → Crie uma aplicação → Copie o Access Token e Public Key.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      const { supabase } = await import("@/lib/supabase");
                      if (!supabase)
                        throw new Error("Supabase não configurado");
                      const { data: existing } = await supabase
                        .from("integration_config")
                        .select("clinic_id")
                        .eq("clinic_id", SYSTEM_GLOBAL_CLINIC_ID)
                        .single();

                      let error;
                      if (existing) {
                        ({ error } = await supabase
                          .from("integration_config")
                          .update({
                            mp_access_token: integrationForm.mp_access_token,
                            mp_public_key: integrationForm.mp_public_key,
                            mp_webhook_secret: integrationForm.mp_webhook_secret,
                          })
                          .eq("clinic_id", SYSTEM_GLOBAL_CLINIC_ID));
                      } else {
                        ({ error } = await supabase
                          .from("integration_config")
                          .insert({
                            clinic_id: SYSTEM_GLOBAL_CLINIC_ID,
                            mp_access_token: integrationForm.mp_access_token,
                            mp_public_key: integrationForm.mp_public_key,
                            mp_webhook_secret: integrationForm.mp_webhook_secret,
                          }));
                      }
                      if (error) throw error;
                      setIntegrationConfig({
                        mp_access_token: integrationForm.mp_access_token,
                        mp_public_key: integrationForm.mp_public_key,
                        mp_webhook_secret: integrationForm.mp_webhook_secret,
                      });
                      toast("Credenciais do Mercado Pago salvas!");
                    } catch (e: any) {
                      toast("Erro ao salvar: " + e.message, "error");
                    }
                  }}
                  className="px-6 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-all"
                >
                  Salvar Credenciais
                </button>
                <button
                  onClick={async () => {
                    try {
                      const isDev = import.meta.env.DEV;
                      const API_BASE = isDev
                        ? ""
                        : import.meta.env.VITE_API_BASE_URL ||
                          "https://clinxia-backend.onrender.com";
                      const res = await fetch(
                        `${API_BASE}/api/mercadopago/create-preference`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            clinicName: "Teste Clinxia",
                            email: "teste@teste.com",
                            name: "Usuario Teste",
                            phone: "11999999999",
                            plan: "basico",
                            amount: integrationConfig?.plan_price_basico || 97,
                            clinicId: SYSTEM_GLOBAL_CLINIC_ID,
                          }),
                        },
                      );
                      const data = await res.json();
                      if (!data.ok)
                        throw new Error(
                          data.error || "Erro ao gerar preferência",
                        );
                      toast(
                        `QR Code gerado com sucesso! Link: ${data.init_point}`,
                        "success",
                      );
                      if (data.init_point)
                        window.open(data.init_point, "_blank");
                    } catch (e: any) {
                      toast("Erro no teste: " + e.message, "error");
                    }
                  }}
                  className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all"
                >
                  Testar Geração QR Code
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
