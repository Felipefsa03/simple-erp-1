import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserRole, Clinic, PlanType } from "@/types";
import { PLAN_LIMITS } from "@/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { isSupabaseEnvConfigured } from "@/lib/supabaseConfig";
import { SupabaseSync } from "@/lib/supabaseSync";

const useRealData = isSupabaseEnvConfigured();

interface AuthState {
  user: User | null;
  clinic: Clinic | null;
  loading: boolean;
  twoFARequired: boolean;
  twoFAPendingUserId: string | null;
  login: (email: string, password: string) => Promise<boolean | "need_2fa">;
  logout: () => Promise<void>;
  hasPermission: (action: string) => boolean;
  permissions: Record<string, UserRole[]>;
  setPermission: (action: string, role: UserRole, allowed: boolean) => void;
  resetPermissions: () => void;
  customUsers: {
    email: string;
    password: string;
    user: User;
    clinic: Clinic | null;
  }[];
  createClinicUser: (
    data: Omit<User, "id" | "created_at">,
    password: string,
    clinic: Clinic | null,
  ) => boolean;
  updateClinic: (data: Partial<Clinic>) => void;
  updateUser: (data: Partial<User>) => void;
  checkSession: () => Promise<void>;
  getClinicId: () => string;
  getPlan: () => PlanType;
  hasFeature: (feature: keyof typeof PLAN_LIMITS.basico) => boolean;
  checkLimit: (
    type: "maxProfessionals" | "maxPatients" | "maxAppointmentsPerMonth",
    current: number,
  ) => boolean;
  confirm2FALogin: (code: string) => Promise<boolean>;
  cancelTwoFA: () => void;
  switchClinic: (clinicId: string) => Promise<void>;
}

const GLOBAL_CLINIC_ID = "00000000-0000-0000-0000-000000000001";

const isValidUuid = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id || "",
  );

const getNormalizedClinicId = (clinicId: string | undefined): string => {
  if (!clinicId) {
    // Usuário deslogado/inicialização: usar fallback sem poluir o console.
    return GLOBAL_CLINIC_ID;
  }
  if (isValidUuid(clinicId)) {
    return clinicId;
  }
  console.error(
    "[Auth] clinic_id inválido:",
    clinicId,
    "- usando fallback para global",
  );
  return GLOBAL_CLINIC_ID;
};

const DEFAULT_PERMISSIONS: Record<string, UserRole[]> = {
  create_appointment: [
    "super_admin",
    "admin",
    "dentist",
    "receptionist",
    "aesthetician",
  ],
  edit_record: ["super_admin", "admin", "dentist", "aesthetician"],
  finalize_appointment: ["super_admin", "admin", "dentist", "aesthetician"],
  view_financial: ["super_admin", "admin", "financial", "receptionist"],
  manage_financial: ["super_admin", "admin", "financial"],
  delete_patient: ["super_admin", "admin"],
  manage_patients: ["super_admin", "admin", "receptionist"],
  import_patients: ["super_admin", "admin", "receptionist"],
  manage_settings: ["super_admin", "admin"],
  manage_commissions: ["super_admin", "admin"],
  manage_team: ["super_admin", "admin"],
  access_all_clinics: ["super_admin"],
  view_dashboard: [
    "super_admin",
    "admin",
    "dentist",
    "receptionist",
    "aesthetician",
    "financial",
  ],
  manage_stock: ["super_admin", "admin", "receptionist"],
  view_patients: [
    "super_admin",
    "admin",
    "dentist",
    "receptionist",
    "aesthetician",
  ],
  manage_integrations: ["super_admin", "admin", "receptionist"],
};

const clonePermissions = () =>
  Object.fromEntries(
    Object.entries(DEFAULT_PERMISSIONS).map(([key, roles]) => [
      key,
      [...roles],
    ]),
  ) as Record<string, UserRole[]>;

// Dados demo (fallback quando Supabase não está configurado)
const DEMO_USERS: {
  email: string;
  password: string;
  user: User;
  clinic: Clinic | null;
}[] = [
  {
    email: "admin@luminaflow.com.br",
    password: "admin123",
    user: {
      id: "super-admin-1",
      name: "Administrador Lumina",
      email: "admin@luminaflow.com.br",
      role: "super_admin",
      phone: "(11) 3333-0000",
      commission_pct: 0,
      cro: undefined,
      avatar_url: undefined,
      created_at: "2024-01-01T00:00:00.000Z",
    },
    clinic: null,
  },
  {
    email: "clinica@luminaflow.com.br",
    password: "clinica123",
    user: {
      id: "admin-clinic-1",
      name: "Dr. Lucas Silva",
      email: "clinica@luminaflow.com.br",
      role: "admin",
      clinic_id: "clinic-1",
      phone: "(11) 98765-4321",
      commission_pct: 40,
      cro: "CRO-SP 12345",
      avatar_url: undefined,
      created_at: "2024-06-15T00:00:00.000Z",
    },
    clinic: {
      id: "clinic-1",
      name: "Lumina Odontologia",
      cnpj: "45.678.901/0001-23",
      phone: "(11) 3456-7890",
      email: "contato@luminaodonto.com.br",
      address: {
        street: "Av. Paulista, 1500, Sala 201",
        city: "São Paulo",
        state: "SP",
        zipCode: "01310-200",
      },
      plan: "profissional",
      status: "active",
      owner_email: "contato@luminaodonto.com.br",
      segment: "odontologia",
      created_at: new Date().toISOString(),
    },
  },
  {
    email: "dentista@luminaflow.com.br",
    password: "dentista123",
    user: {
      id: "dentist-1",
      name: "Dra. Julia Paiva",
      email: "dentista@luminaflow.com.br",
      role: "dentist",
      clinic_id: "clinic-1",
      phone: "(11) 99876-5432",
      commission_pct: 35,
      cro: "CRO-SP 54321",
      avatar_url: undefined,
      created_at: "2024-07-20T00:00:00.000Z",
    },
    clinic: {
      id: "clinic-1",
      name: "Lumina Odontologia",
      cnpj: "45.678.901/0001-23",
      phone: "(11) 3456-7890",
      email: "contato@luminaodonto.com.br",
      address: {
        street: "Av. Paulista, 1500, Sala 201",
        city: "São Paulo",
        state: "SP",
        zipCode: "01310-200",
      },
      plan: "profissional",
      status: "active",
      owner_email: "contato@luminaodonto.com.br",
      segment: "odontologia",
      created_at: new Date().toISOString(),
    },
  },
  {
    email: "recepcao@luminaflow.com.br",
    password: "recepcao123",
    user: {
      id: "recep-1",
      name: "Fernanda Lima",
      email: "recepcao@luminaflow.com.br",
      role: "receptionist",
      clinic_id: "clinic-1",
      phone: "(11) 98765-0001",
      commission_pct: 0,
      cro: undefined,
      avatar_url: undefined,
      created_at: "2024-08-01T00:00:00.000Z",
    },
    clinic: {
      id: "clinic-1",
      name: "Lumina Odontologia",
      cnpj: "45.678.901/0001-23",
      phone: "(11) 3456-7890",
      email: "contato@luminaodonto.com.br",
      address: {
        street: "Av. Paulista, 1500, Sala 201",
        city: "São Paulo",
        state: "SP",
        zipCode: "01310-200",
      },
      plan: "profissional",
      status: "active",
      owner_email: "contato@luminaodonto.com.br",
      segment: "odontologia",
      created_at: new Date().toISOString(),
    },
  },
  {
    email: "lucas@lumina.com.br",
    password: "lucas123",
    user: {
      id: "user-lucas-1",
      name: "Dr. Lucas Silva",
      email: "lucas@lumina.com.br",
      role: "admin",
      clinic_id: "clinic-1",
      phone: "5575991517196",
      commission_pct: 40,
      cro: "CRO-SP 99999",
      avatar_url: undefined,
      created_at: "2024-06-15T00:00:00.000Z",
    },
    clinic: {
      id: "clinic-1",
      name: "Lumina Odontologia",
      cnpj: "45.678.901/0001-23",
      phone: "(11) 3456-7890",
      email: "contato@luminaodonto.com.br",
      address: {
        street: "Av. Paulista, 1500, Sala 201",
        city: "São Paulo",
        state: "SP",
        zipCode: "01310-200",
      },
      plan: "profissional",
      status: "active",
      owner_email: "contato@luminaodonto.com.br",
      segment: "odontologia",
      created_at: new Date().toISOString(),
    },
  },
];

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      clinic: null,
      loading: true,
      twoFARequired: false,
      twoFAPendingUserId: null,
      permissions: clonePermissions(),
      customUsers: [],

      // Login com Supabase (ou fallback demo)
      login: async (email: string, password: string) => {
        set({ loading: true });

        // Tentar Supabase primeiro
        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await supabase!.auth.signInWithPassword({
              email,
              password,
            });

            if (!error && data.user) {
              // Buscar dados do usuário no banco
              const { data: userData } = await supabase!
                .from("users")
                .select("*, clinic_id")
                .eq("email", email)
                .single();

              if (userData) {
                // Buscar dados da clínica
                let clinic = null;
                if (userData.clinic_id) {
                  const { data: clinicData } = await supabase!
                    .from("clinics")
                    .select("*")
                    .eq("id", userData.clinic_id)
                    .single();
                  clinic = clinicData;

                  // DEBUG: Log do plano carregado
                  console.log(
                    "[Auth] Clinic loaded:",
                    clinic?.name,
                    "plan:",
                    clinic?.plan,
                    "status:",
                    clinic?.status,
                  );

                  if (clinic?.permissions && Object.keys(clinic.permissions).length > 0) {
                    const defaultPerms = clonePermissions();
                    set({ permissions: { ...defaultPerms, ...clinic.permissions } });
                  }
                }

                const user: User = {
                  id: userData.id,
                  name: userData.name,
                  email: userData.email,
                  role: userData.role,
                  clinic_id: userData.clinic_id,
                  phone: userData.phone,
                  commission_pct: userData.commission || 0,
                  cro: userData.cro,
                  avatar_url: userData.avatar,
                  created_at: userData.created_at,
                };

                // Verificar se 2FA está ativo para este usuário
                const API_BASE = import.meta.env.DEV
                  ? ""
                  : import.meta.env.VITE_API_BASE_URL ||
                    "https://clinxia-backend.onrender.com";
                try {
                  const twoFaRes = await fetch(
                    `${API_BASE}/api/2fa/status?userId=${userData.id}`,
                    {
                      headers: {
                        Authorization: `Bearer ${data.session?.access_token || ""}`,
                      },
                    },
                  );
                  const twoFaData = await twoFaRes.json();
                  if (twoFaData.ok && twoFaData.enabled) {
                    // 2FA obrigatório - NÃO completar login ainda
                    set({
                      loading: false,
                      twoFARequired: true,
                      twoFAPendingUserId: userData.id,
                    });
                    return "need_2fa";
                  }
                } catch (_e) {
                  // Se falhar a checagem de 2FA, prosseguir sem 2FA (fail open)
                }

                set({ user, clinic, loading: false });

                // Sincronizar dados após login bem-sucedido
                if (user?.clinic_id) {
                  let clinicId = user.clinic_id;
                  if (
                    !user.clinic_id.match(
                      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
                    )
                  ) {
                    clinicId = "00000000-0000-0000-0000-000000000001";
                  }
                  import("../stores/clinicStore").then(({ useClinicStore }) => {
                    const store = useClinicStore.getState();
                    store.syncWithSupabase();
                    store.addAuditLog({
                      clinic_id: clinicId,
                      user_id: user.id,
                      action: "LOGIN",
                      entity: "auth",
                      entity_id: user.id,
                    });
                  });
                }

                return true;
              }
            }
          } catch (err: unknown) {
            console.log(
              "[Auth] Supabase login failed, trying demo mode",
              err instanceof Error ? err.message : "",
            );
          }
        }

        // Em produção, nunca cair para modo demo silenciosamente.
        if (import.meta.env.PROD) {
          set({ loading: false });
          return false;
        }

        // Fallback para modo demo (somente desenvolvimento)
        const allUsers = [...DEMO_USERS, ...get().customUsers];
        const passwordToCheck = password;
        const found = allUsers.find(
          (u) =>
            u.email.toLowerCase() === email.toLowerCase() &&
            u.password === passwordToCheck,
        );

        if (found) {
          set({ user: found.user, clinic: found.clinic, loading: false });

          // Sincronizar dados após login bem-sucedido
          if (useRealData && found.user?.clinic_id) {
            const userClinicId = found.user.clinic_id;
            let clinicId = userClinicId;
            if (
              !userClinicId.match(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
              )
            ) {
              clinicId = "00000000-0000-0000-0000-000000000001";
            }
            import("../stores/clinicStore").then(({ useClinicStore }) => {
              useClinicStore.getState().syncWithSupabase();
            });
          }

          return true;
        }

        set({ loading: false });
        return false;
      },

      logout: async () => {
        const { user, clinic } = get();
        if (user) {
          import("../stores/clinicStore").then(({ useClinicStore }) => {
            useClinicStore.getState().addAuditLog({
              clinic_id: clinic?.id || user.clinic_id || "00000000-0000-0000-0000-000000000001",
              user_id: user.id,
              action: "LOGOUT",
              entity: "auth",
              entity_id: user.id,
            });
          });
        }
        if (isSupabaseConfigured()) {
          await supabase!.auth.signOut();
        }
        set({ user: null, clinic: null, loading: false });
      },

      confirm2FALogin: async (code: string) => {
        const { twoFAPendingUserId } = get();
        if (!twoFAPendingUserId || !isSupabaseConfigured()) return false;
        try {
          const {
            data: { session },
          } = await supabase!.auth.getSession();
          const API_BASE = import.meta.env.DEV
            ? ""
            : import.meta.env.VITE_API_BASE_URL ||
              "https://clinxia-backend.onrender.com";
          const res = await fetch(`${API_BASE}/api/2fa/verify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token || ""}`,
            },
            body: JSON.stringify({ userId: twoFAPendingUserId, code }),
          });
          const result = await res.json();
          if (!result.ok) return false;

          // Buscar dados completos do usuário e clínica para completar login
          const { data: userData } = await supabase!
            .from("users")
            .select("*, clinic_id")
            .eq("id", twoFAPendingUserId)
            .single();

          if (!userData) return false;

          let clinic = null;
          if (userData.clinic_id) {
            const { data: clinicData } = await supabase!
              .from("clinics")
              .select("*")
              .eq("id", userData.clinic_id)
              .single();
            clinic = clinicData;
          }

          const user: User = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            clinic_id: userData.clinic_id,
            phone: userData.phone,
            commission_pct: userData.commission || 0,
            cro: userData.cro,
            avatar_url: userData.avatar,
            created_at: userData.created_at,
          };

          set({
            user,
            clinic,
            loading: false,
            twoFARequired: false,
            twoFAPendingUserId: null,
          });
          return true;
        } catch (_e) {
          return false;
        }
      },

      cancelTwoFA: () => {
        if (isSupabaseConfigured()) supabase!.auth.signOut();
        set({ twoFARequired: false, twoFAPendingUserId: null, loading: false });
      },

      hasPermission: (action: string) => {
        const state = get();
        if (!state.user) return false;
        if (state.user.role === "super_admin") return true;
        const allowed = state.permissions[action] || [];
        return allowed.includes(state.user.role);
      },

      setPermission: (action: string, role: UserRole, allowed: boolean) => {
        set((state) => {
          const perms = { ...state.permissions };
          const roles = new Set(perms[action] || []);
          if (allowed) roles.add(role);
          else roles.delete(role);
          perms[action] = [...roles] as UserRole[];

          // Sync to Supabase
          if (isSupabaseConfigured() && state.clinic?.id) {
            supabase?.from('clinics')
              .update({ permissions: perms })
              .eq('id', state.clinic.id)
              .then(({ error }: { error: { message: string } | null }) => {
                if (error) console.error('[Auth] Failed to sync permissions:', error.message);
                else {
                    console.log('[Auth] Permissions synced to Supabase successfully');
                    import("../stores/clinicStore").then(({ useClinicStore }) => {
                        useClinicStore.getState().addAuditLog({
                            clinic_id: state.clinic!.id,
                            user_id: state.user!.id,
                            action: "UPDATE_PERMISSIONS",
                            entity: "settings",
                            entity_id: state.clinic!.id,
                            new_data: { action, role, allowed }
                        });
                    });
                }
              });
          }

          return { permissions: perms };
        });
      },

      resetPermissions: () => {
        const defaultPerms = clonePermissions();
        set({ permissions: defaultPerms });
        const state = get();
        if (isSupabaseConfigured() && state.clinic?.id) {
          supabase?.from('clinics')
            .update({ permissions: defaultPerms })
            .eq('id', state.clinic.id)
            .then(({ error }: { error: { message: string } | null }) => {
              if (error) console.error('[Auth] Failed to reset permissions in DB:', error.message);
              else console.log('[Auth] Permissions reset successfully in DB');
            });
        }
      },

      createClinicUser: (data, password, clinic) => {
        const id = "user-" + Date.now();
        const user: User = {
          ...data,
          id,
          created_at: new Date().toISOString(),
        };
        set((state) => ({
          customUsers: [
            ...state.customUsers,
            { email: data.email, password, user, clinic },
          ],
        }));
        return true;
      },

      updateClinic: (data) => {
        set((state) => {
          const updated = state.clinic ? { ...state.clinic, ...data } : null;
          if (updated && useRealData) {
            SupabaseSync.updateClinicSettings(updated.id, data).catch(e => 
              console.error('[AuthStore] Error updating clinic:', e)
            );
          }
          return { clinic: updated };
        });
      },

      updateUser: (data) => {
        set((state) => {
          const updated = state.user ? { ...state.user, ...data } : null;
          if (updated && useRealData) {
            SupabaseSync.updateProfessional(updated.id, data).catch(e => 
              console.error('[AuthStore] Error updating user:', e)
            );
          }
          return { user: updated };
        });
      },

      switchClinic: async (clinicId: string) => {
        const { data: clinic } = await SupabaseSync.loadClinic(clinicId);
        if (clinic) {
          set({ clinic });
          // Import dynamicamente para evitar circular dependencies e forçar sync
          import("../stores/clinicStore").then(({ useClinicStore }) => {
            useClinicStore.getState().syncWithSupabase();
          });
        }
      },

      // Verificar sessão existente
      checkSession: async () => {
        if (isSupabaseConfigured()) {
          try {
            const {
              data: { session },
            } = await supabase!.auth.getSession();
            if (session?.user) {
              const { data: userData } = await supabase!
                .from("users")
                .select("*")
                .eq("id", session.user.id)
                .single();

              if (userData) {
                let clinic = null;
                if (userData.clinic_id) {
                  const { data: clinicData } = await supabase!
                    .from("clinics")
                    .select("*")
                    .eq("id", userData.clinic_id)
                    .single();
                  clinic = clinicData;

                  if (clinic?.permissions && Object.keys(clinic.permissions).length > 0) {
                    const defaultPerms = clonePermissions();
                    set({ permissions: { ...defaultPerms, ...clinic.permissions } });
                  }
                }

                set({
                  user: {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    role: userData.role,
                    clinic_id: userData.clinic_id,
                    phone: userData.phone,
                    commission_pct: userData.commission || 0,
                    created_at: userData.created_at,
                  },
                  clinic,
                  loading: false,
                });

                // Sync ClinicStore after session restore
                if (useRealData && userData.clinic_id) {
                  let clinicId = userData.clinic_id;
                  if (
                    !userData.clinic_id.match(
                      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
                    )
                  ) {
                    clinicId = "00000000-0000-0000-0000-000000000001";
                  }
                  import("../stores/clinicStore").then(({ useClinicStore }) => {
                    useClinicStore.getState().syncWithSupabase();
                  });
                }
                return;
              }
            }
          } catch (err: unknown) {
            console.log(
              "[Auth] Session check failed",
              err instanceof Error ? err.message : "",
            );
          }
        }
        set({ loading: false });
      },

      getClinicId: () => {
        // Prioritizar a clínica atual no estado (para suportar troca de filial)
        const currentClinicId = get().clinic?.id;
        const userClinicId = get().user?.clinic_id;
        return getNormalizedClinicId(currentClinicId || userClinicId);
      },
      getPlan: () => {
        // Tentar ler de múltiplas fontes para garantir o plano correto
        const clinic = get().clinic;

        // 1. Tentar subscription_plan primeiro (mais atual)
        let plan = clinic?.subscription_plan as PlanType;
        if (plan && plan !== "basico") {
          console.log("[Auth] getPlan from subscription_plan:", plan);
          return plan;
        }

        // 2. Tentar plan
        plan = clinic?.plan as PlanType;
        if (plan && plan !== "basico") {
          console.log("[Auth] getPlan from plan:", plan);
          return plan;
        }

        // 3. Tentar status da subscription
        if (
          clinic?.subscription_status === "active" &&
          clinic?.subscription_plan
        ) {
          plan = clinic?.subscription_plan as PlanType;
          console.log(
            "[Auth] getPlan from subscription_status active, using subscription_plan:",
            plan,
          );
          return plan || "profissional";
        }

        console.log(
          "[Auth] getPlan - fallback to professional (no premium found)",
        );
        return "profissional";
      },
      hasFeature: (feature) => {
        const plan = (get().clinic?.plan as PlanType) || "basico";
        const hasIt = Boolean(PLAN_LIMITS[plan]?.[feature]);
        console.log(
          "[Auth] hasFeature:",
          feature,
          "plan:",
          plan,
          "result:",
          hasIt,
        );
        return hasIt;
      },
      checkLimit: (type, current) => {
      const plan = (get().clinic?.plan as PlanType) || "basico";
      const limit = PLAN_LIMITS[plan]?.[type] ?? 0;
      return current < limit;
    },
  }),
  {
    name: "auth-storage",
    partialize: (state) => ({
      user: state.user,
      clinic: state.clinic,
      permissions: state.permissions,
      customUsers: state.customUsers,
    }),
  }
));
