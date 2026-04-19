import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole, Clinic, PlanType } from '@/types';
import { PLAN_LIMITS } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isSupabaseEnvConfigured } from '@/lib/supabaseConfig';

const useRealData = isSupabaseEnvConfigured();

interface AuthState {
  user: User | null;
  clinic: Clinic | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasPermission: (action: string) => boolean;
  permissions: Record<string, UserRole[]>;
  setPermission: (action: string, role: UserRole, allowed: boolean) => void;
  resetPermissions: () => void;
  customUsers: { email: string; password: string; user: User; clinic: Clinic | null }[];
  createClinicUser: (data: Omit<User, 'id' | 'created_at'>, password: string, clinic: Clinic | null) => boolean;
  updateClinic: (data: Partial<Clinic>) => void;
  updateUser: (data: Partial<User>) => void;
  checkSession: () => Promise<void>;
  getClinicId: () => string;
  getPlan: () => PlanType;
  hasFeature: (feature: keyof typeof PLAN_LIMITS.basico) => boolean;
  checkLimit: (type: 'maxProfessionals' | 'maxPatients' | 'maxAppointmentsPerMonth', current: number) => boolean;
}

const GLOBAL_CLINIC_ID = '00000000-0000-0000-0000-000000000001';

const isValidUuid = (id: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');

const getNormalizedClinicId = (clinicId: string | undefined): string => {
  if (!clinicId) {
    console.error('[Auth] clinic_id inválido ou ausente - usando fallback para global');
    return GLOBAL_CLINIC_ID;
  }
  if (isValidUuid(clinicId)) {
    return clinicId;
  }
  console.error('[Auth] clinic_id inválido:', clinicId, '- usando fallback para global');
  return GLOBAL_CLINIC_ID;
};

const DEFAULT_PERMISSIONS: Record<string, UserRole[]> = {
  'create_appointment': ['super_admin', 'admin', 'dentist', 'receptionist', 'aesthetician'],
  'edit_record': ['super_admin', 'admin', 'dentist', 'aesthetician'],
  'finalize_appointment': ['super_admin', 'admin', 'dentist', 'aesthetician'],
  'view_financial': ['super_admin', 'admin', 'financial', 'receptionist'],
  'manage_financial': ['super_admin', 'admin', 'financial'],
  'delete_patient': ['super_admin', 'admin'],
  'manage_patients': ['super_admin', 'admin', 'receptionist'],
  'import_patients': ['super_admin', 'admin', 'receptionist'],
  'manage_settings': ['super_admin', 'admin'],
  'manage_commissions': ['super_admin', 'admin'],
  'manage_team': ['super_admin', 'admin'],
  'access_all_clinics': ['super_admin'],
  'view_dashboard': ['super_admin', 'admin', 'dentist', 'receptionist', 'aesthetician', 'financial'],
  'manage_stock': ['super_admin', 'admin', 'receptionist'],
  'view_patients': ['super_admin', 'admin', 'dentist', 'receptionist', 'aesthetician'],
  'manage_integrations': ['super_admin', 'admin', 'receptionist'],
};

const clonePermissions = () =>
  Object.fromEntries(
    Object.entries(DEFAULT_PERMISSIONS).map(([key, roles]) => [key, [...roles]])
  ) as Record<string, UserRole[]>;

// Dados demo (fallback quando Supabase não está configurado)
const DEMO_USERS: { email: string; password: string; user: User; clinic: Clinic | null }[] = [
  {
    email: 'admin@luminaflow.com.br',
    password: 'admin123',
    user: {
      id: 'super-admin-1',
      name: 'Administrador Lumina',
      email: 'admin@luminaflow.com.br',
      role: 'super_admin',
      phone: '(11) 3333-0000',
      commission_pct: 0,
      cro: undefined,
      avatar_url: undefined,
      created_at: '2024-01-01T00:00:00.000Z',
    },
    clinic: null,
  },
  {
    email: 'clinica@luminaflow.com.br',
    password: 'clinica123',
    user: {
      id: 'admin-clinic-1',
      name: 'Dr. Lucas Silva',
      email: 'clinica@luminaflow.com.br',
      role: 'admin',
      clinic_id: 'clinic-1',
      phone: '(11) 98765-4321',
      commission_pct: 40,
      cro: 'CRO-SP 12345',
      avatar_url: undefined,
      created_at: '2024-06-15T00:00:00.000Z',
    },
    clinic: {
      id: 'clinic-1',
      name: 'Lumina Odontologia',
      cnpj: '45.678.901/0001-23',
      phone: '(11) 3456-7890',
      email: 'contato@luminaodonto.com.br',
      address: { street: 'Av. Paulista, 1500, Sala 201', city: 'São Paulo', state: 'SP', zipCode: '01310-200' },
      plan: 'profissional',
      status: 'active',
      owner_email: 'contato@luminaodonto.com.br',
      segment: 'odontologia',
      created_at: new Date().toISOString(),
    },
  },
  {
    email: 'dentista@luminaflow.com.br',
    password: 'dentista123',
    user: {
      id: 'dentist-1',
      name: 'Dra. Julia Paiva',
      email: 'dentista@luminaflow.com.br',
      role: 'dentist',
      clinic_id: 'clinic-1',
      phone: '(11) 99876-5432',
      commission_pct: 35,
      cro: 'CRO-SP 54321',
      avatar_url: undefined,
      created_at: '2024-07-20T00:00:00.000Z',
    },
    clinic: {
      id: 'clinic-1',
      name: 'Lumina Odontologia',
      cnpj: '45.678.901/0001-23',
      phone: '(11) 3456-7890',
      email: 'contato@luminaodonto.com.br',
      address: { street: 'Av. Paulista, 1500, Sala 201', city: 'São Paulo', state: 'SP', zipCode: '01310-200' },
      plan: 'profissional',
      status: 'active',
      owner_email: 'contato@luminaodonto.com.br',
      segment: 'odontologia',
      created_at: new Date().toISOString(),
    },
  },
  {
    email: 'recepcao@luminaflow.com.br',
    password: 'recepcao123',
    user: {
      id: 'recep-1',
      name: 'Fernanda Lima',
      email: 'recepcao@luminaflow.com.br',
      role: 'receptionist',
      clinic_id: 'clinic-1',
      phone: '(11) 98765-0001',
      commission_pct: 0,
      cro: undefined,
      avatar_url: undefined,
      created_at: '2024-08-01T00:00:00.000Z',
    },
    clinic: {
      id: 'clinic-1',
      name: 'Lumina Odontologia',
      cnpj: '45.678.901/0001-23',
      phone: '(11) 3456-7890',
      email: 'contato@luminaodonto.com.br',
      address: { street: 'Av. Paulista, 1500, Sala 201', city: 'São Paulo', state: 'SP', zipCode: '01310-200' },
      plan: 'profissional',
      status: 'active',
      owner_email: 'contato@luminaodonto.com.br',
      segment: 'odontologia',
      created_at: new Date().toISOString(),
    },
  },
  {
    email: 'lucas@lumina.com.br',
    password: 'lucas123',
    user: {
      id: 'user-lucas-1',
      name: 'Dr. Lucas Silva',
      email: 'lucas@lumina.com.br',
      role: 'admin',
      clinic_id: 'clinic-1',
      phone: '5575991517196',
      commission_pct: 40,
      cro: 'CRO-SP 99999',
      avatar_url: undefined,
      created_at: '2024-06-15T00:00:00.000Z',
    },
    clinic: {
      id: 'clinic-1',
      name: 'Lumina Odontologia',
      cnpj: '45.678.901/0001-23',
      phone: '(11) 3456-7890',
      email: 'contato@luminaodonto.com.br',
      address: { street: 'Av. Paulista, 1500, Sala 201', city: 'São Paulo', state: 'SP', zipCode: '01310-200' },
      plan: 'profissional',
      status: 'active',
      owner_email: 'contato@luminaodonto.com.br',
      segment: 'odontologia',
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
                .from('users')
                .select('*, clinic_id')
                .eq('email', email)
                .single();

              if (userData) {
                // Buscar dados da clínica
                let clinic = null;
                if (userData.clinic_id) {
                  const { data: clinicData } = await supabase!
                    .from('clinics')
                    .select('*')
                    .eq('id', userData.clinic_id)
                    .single();
                  clinic = clinicData;
                  
                  // DEBUG: Log do plano carregado
                  console.log('[Auth] Clinic loaded:', clinic?.name, 'plan:', clinic?.plan, 'status:', clinic?.status);
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

                set({ user, clinic, loading: false });
                
                // Sincronizar dados após login bem-sucedido
                if (user?.clinic_id) {
                  let clinicId = user.clinic_id;
                  if (!user.clinic_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                    clinicId = '00000000-0000-0000-0000-000000000001';
                  }
                  import('../stores/clinicStore').then(({ useClinicStore }) => {
                    useClinicStore.getState().syncWithSupabase();
                  });
                }
                
                return true;
              }
            }
          } catch (err: unknown) {
            console.log('[Auth] Supabase login failed, trying demo mode', err instanceof Error ? err.message : '');
          }
        }

        // Em produção, nunca cair para modo demo silenciosamente.
        if (import.meta.env.PROD) {
          set({ loading: false });
          return false;
        }

        // Fallback para modo demo (somente desenvolvimento)
        const allUsers = [...DEMO_USERS, ...get().customUsers];
        const updatedPasswords = localStorage.getItem('luminaflow-reset-passwords');
        let passwords: Record<string, string> = {};
        try {
          passwords = updatedPasswords ? (JSON.parse(updatedPasswords) as Record<string, string>) : {};
        } catch (_e: unknown) { /* corrupted localStorage data — ignore */ }

        const passwordToCheck = passwords[email.toLowerCase()] || password;
        const found = allUsers.find(
          u => u.email.toLowerCase() === email.toLowerCase() && u.password === passwordToCheck
        );

        if (found) {
          set({ user: found.user, clinic: found.clinic, loading: false });
          
          // Sincronizar dados após login bem-sucedido
          if (useRealData && found.user?.clinic_id) {
            const userClinicId = found.user.clinic_id;
            let clinicId = userClinicId;
            if (!userClinicId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
              clinicId = '00000000-0000-0000-0000-000000000001';
            }
            import('../stores/clinicStore').then(({ useClinicStore }) => {
              useClinicStore.getState().syncWithSupabase();
            });
          }
          
          return true;
        }

        set({ loading: false });
        return false;
      },

      logout: async () => {
        if (isSupabaseConfigured()) {
          await supabase!.auth.signOut();
        }
        set({ user: null, clinic: null });
      },

      hasPermission: (action: string) => {
        const state = get();
        if (!state.user) return false;
        if (state.user.role === 'super_admin') return true;
        const allowed = state.permissions[action] || [];
        return allowed.includes(state.user.role);
      },

      setPermission: (action: string, role: UserRole, allowed: boolean) => {
        set(state => {
          const perms = { ...state.permissions };
          const roles = new Set(perms[action] || []);
          if (allowed) roles.add(role); else roles.delete(role);
          perms[action] = [...roles] as UserRole[];
          return { permissions: perms };
        });
      },

      resetPermissions: () => set({ permissions: clonePermissions() }),

      createClinicUser: (data, password, clinic) => {
        const id = 'user-' + Date.now();
        const user: User = { ...data, id, created_at: new Date().toISOString() };
        set(state => ({
          customUsers: [...state.customUsers, { email: data.email, password, user, clinic }],
        }));
        return true;
      },

      updateClinic: (data) => {
        set(state => ({ clinic: state.clinic ? { ...state.clinic, ...data } : null }));
      },

      updateUser: (data) => {
        set(state => ({ user: state.user ? { ...state.user, ...data } : null }));
      },

      // Verificar sessão existente
      checkSession: async () => {
        if (isSupabaseConfigured()) {
          try {
            const { data: { session } } = await supabase!.auth.getSession();
            if (session?.user) {
              const { data: userData } = await supabase!
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

              if (userData) {
                let clinic = null;
                if (userData.clinic_id) {
                  const { data: clinicData } = await supabase!
                    .from('clinics')
                    .select('*')
                    .eq('id', userData.clinic_id)
                    .single();
                  clinic = clinicData;
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
                  if (!userData.clinic_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                    clinicId = '00000000-0000-0000-0000-000000000001';
                  }
                  import('../stores/clinicStore').then(({ useClinicStore }) => {
                    useClinicStore.getState().syncWithSupabase();
                  });
                }
                return;
              }
            }
          } catch (err: unknown) {
            console.log('[Auth] Session check failed', err instanceof Error ? err.message : '');
          }
        }
        set({ loading: false });
      },

      getClinicId: () => {
        const userClinicId = get().user?.clinic_id;
        return getNormalizedClinicId(userClinicId);
      },
      getPlan: () => {
        // Garantir que o plano sempre tenha um valor válido
        const plan = (get().clinic?.plan as PlanType) || 'basico';
        console.log('[Auth] getPlan called, clinic:', get().clinic?.name, 'plan:', plan);
        return plan;
      },
      hasFeature: (feature) => {
        const plan = (get().clinic?.plan as PlanType) || 'basico';
        const hasIt = Boolean(PLAN_LIMITS[plan]?.[feature]);
        console.log('[Auth] hasFeature:', feature, 'plan:', plan, 'result:', hasIt);
        return hasIt;
      },
      checkLimit: (type, current) => {
        const plan = (get().clinic?.plan as PlanType) || 'basico';
        const limit = PLAN_LIMITS[plan]?.[type] ?? 0;
        return current < limit;
      },
    }),
    {
      name: 'luminaflow-auth',
      partialize: (state) => ({
        user: state.user,
        clinic: state.clinic,
        customUsers: state.customUsers,
        permissions: state.permissions,
      }),
    }
  )
);
