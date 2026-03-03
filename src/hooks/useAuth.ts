import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole, Clinic } from '@/types';

interface AuthState {
  user: User | null;
  clinic: Clinic | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  hasPermission: (action: string) => boolean;
}

// RBAC Permission Matrix
const PERMISSIONS: Record<string, UserRole[]> = {
  'create_appointment': ['super_admin', 'admin', 'dentist', 'receptionist', 'aesthetician'],
  'edit_record': ['super_admin', 'admin', 'dentist', 'aesthetician'],
  'finalize_appointment': ['super_admin', 'admin', 'dentist', 'aesthetician'],
  'view_financial': ['super_admin', 'admin', 'financial', 'receptionist'],
  'manage_financial': ['super_admin', 'admin', 'financial'],
  'delete_patient': ['super_admin', 'admin'],
  'manage_settings': ['super_admin', 'admin'],
  'manage_commissions': ['super_admin', 'admin'],
  'manage_team': ['super_admin', 'admin'],
  'access_all_clinics': ['super_admin'],
  'view_dashboard': ['super_admin', 'admin', 'dentist', 'receptionist', 'aesthetician', 'financial'],
  'manage_stock': ['super_admin', 'admin', 'receptionist'],
  'view_patients': ['super_admin', 'admin', 'dentist', 'receptionist', 'aesthetician'],
};

// Demo users for authentication
const DEMO_USERS: { email: string; password: string; user: User; clinic: Clinic | null }[] = [
  {
    email: 'admin@luminaflow.com.br',
    password: 'admin123',
    user: { id: 'super-admin', name: 'Administrador Lumina', email: 'admin@luminaflow.com.br', role: 'super_admin', commission_pct: 0, created_at: '2025-01-01' },
    clinic: null,
  },
  {
    email: 'clinica@luminaflow.com.br',
    password: 'clinica123',
    user: { id: 'prof-1', name: 'Dr. Lucas Silva', email: 'clinica@luminaflow.com.br', role: 'admin', clinic_id: 'clinic-1', commission_pct: 40, created_at: '2025-01-15' },
    clinic: { id: 'clinic-1', name: 'Lumina Odontologia', cnpj: '12.345.678/0001-90', phone: '(11) 99999-9999', email: 'contato@lumina.com.br', plan: 'ultra', status: 'active', owner_email: 'clinica@luminaflow.com.br', segment: 'odontologia', created_at: '2025-01-15' },
  },
  {
    email: 'recepcao@luminaflow.com.br',
    password: 'recepcao123',
    user: { id: 'prof-4', name: 'Fernanda Lima', email: 'recepcao@luminaflow.com.br', role: 'receptionist', clinic_id: 'clinic-1', commission_pct: 0, created_at: '2025-03-01' },
    clinic: { id: 'clinic-1', name: 'Lumina Odontologia', cnpj: '12.345.678/0001-90', phone: '(11) 99999-9999', email: 'contato@lumina.com.br', plan: 'ultra', status: 'active', owner_email: 'clinica@luminaflow.com.br', segment: 'odontologia', created_at: '2025-01-15' },
  },
  {
    email: 'dentista@luminaflow.com.br',
    password: 'dentista123',
    user: { id: 'prof-2', name: 'Dra. Julia Paiva', email: 'dentista@luminaflow.com.br', role: 'dentist', clinic_id: 'clinic-1', commission_pct: 35, created_at: '2025-02-01' },
    clinic: { id: 'clinic-1', name: 'Lumina Odontologia', cnpj: '12.345.678/0001-90', phone: '(11) 99999-9999', email: 'contato@lumina.com.br', plan: 'ultra', status: 'active', owner_email: 'clinica@luminaflow.com.br', segment: 'odontologia', created_at: '2025-01-15' },
  },
];

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      clinic: null,
      login: (email: string, password: string) => {
        const found = DEMO_USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (found) {
          set({ user: found.user, clinic: found.clinic });
          return true;
        }
        return false;
      },
      logout: () => {
        set({ user: null, clinic: null });
        // Clear clinic store on logout
        localStorage.removeItem('luminaflow-clinic-store');
      },
      hasPermission: (action: string) => {
        const { user } = get();
        if (!user) return false;
        const allowed = PERMISSIONS[action];
        if (!allowed) return false;
        return allowed.includes(user.role);
      },
    }),
    {
      name: 'luminaflow-auth',
    }
  )
);
