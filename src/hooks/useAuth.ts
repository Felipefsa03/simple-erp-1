import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'dentist' | 'receptionist' | 'aesthetician';
  clinic_id?: string;
}

interface Clinic {
  id: string;
  name: string;
  plan: 'basic' | 'pro' | 'ultra';
  status: 'active' | 'inactive' | 'trial';
  owner_email: string;
  created_at: string;
}

interface AuthState {
  user: User | null;
  clinic: Clinic | null;
  login: (email: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  clinic: null,
  login: (email) => {
    // Super Admin login
    if (email === 'admin@luminaflow.com.br') {
      set({
        user: {
          id: 'super-admin',
          name: 'Administrador Lumina',
          email: email,
          role: 'super_admin',
        },
        clinic: null,
      });
      return;
    }

    // Mock clinic login for demo
    set({
      user: {
        id: 'user-1',
        name: 'Dr. Lucas Silva',
        email: email,
        role: 'dentist',
        clinic_id: 'clinic-1',
      },
      clinic: {
        id: 'clinic-1',
        name: 'Lumina Odontologia',
        plan: 'ultra',
        status: 'active',
        owner_email: email,
        created_at: '2025-01-15',
      },
    });
  },
  logout: () => set({ user: null, clinic: null }),
}));
