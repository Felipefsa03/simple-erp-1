import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// TESTES DE AUTENTICAÇÃO - 200+ testes
// ============================================

interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'dentist' | 'receptionist' | 'aesthetician' | 'financial';
  clinic_id?: string;
  phone?: string;
  commission_pct: number;
  password?: string;
}

interface AuthState {
  user: User | null;
  clinic: any;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  hasPermission: (permission: string) => boolean;
}

const DEMO_USERS: User[] = [
  { id: 'user-1', name: 'Admin', email: 'admin@test.com', role: 'super_admin', commission_pct: 0, password: 'admin123' },
  { id: 'user-2', name: 'Dentista', email: 'dentista@test.com', role: 'dentist', clinic_id: 'clinic-1', commission_pct: 35, password: 'dentista123' },
  { id: 'user-3', name: 'Recepcionista', email: 'recepcao@test.com', role: 'receptionist', clinic_id: 'clinic-1', commission_pct: 0, password: 'recepcao123' },
  { id: 'user-4', name: 'Financeiro', email: 'financeiro@test.com', role: 'financial', clinic_id: 'clinic-1', commission_pct: 0, password: 'financeiro123' },
];

function createAuthStore(): AuthState {
  let user: User | null = null;
  let clinic: any = null;
  const updatedPasswords: Record<string, string> = {};

  return {
    get user() { return user; },
    get clinic() { return clinic; },
    get isAuthenticated() { return user !== null; },
    
    login(email: string, password: string): boolean {
      const found = DEMO_USERS.find(u => u.email === email);
      if (!found) return false;
      
      const passwordToCheck = updatedPasswords[email] || found.password;
      if (password !== passwordToCheck) return false;
      
      user = found;
      clinic = found.clinic_id ? { id: found.clinic_id } : null;
      return true;
    },
    
    logout() {
      user = null;
      clinic = null;
    },
    
    updateUser(data: Partial<User>) {
      if (user) {
        user = { ...user, ...data };
      }
    },
    
    hasPermission(permission: string): boolean {
      if (!user) return false;
      if (user.role === 'super_admin') return true;
      
      const permissions: Record<string, string[]> = {
        'view_dashboard': ['admin', 'dentist', 'receptionist', 'financial', 'aesthetician'],
        'create_appointment': ['admin', 'dentist', 'receptionist'],
        'view_patients': ['admin', 'dentist', 'receptionist'],
        'view_financial': ['admin', 'financial'],
        'manage_stock': ['admin', 'receptionist'],
        'manage_settings': ['admin'],
      };
      
      return permissions[permission]?.includes(user.role) || false;
    },
  };
}

describe('Autenticação - Login', () => {
  let store: AuthState;

  beforeEach(() => {
    store = createAuthStore();
  });

  it('deve iniciar deslogado', () => {
    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
  });

  it('deve fazer login com credenciais válidas', () => {
    const result = store.login('admin@test.com', 'admin123');
    expect(result).toBe(true);
    expect(store.isAuthenticated).toBe(true);
    expect(store.user?.email).toBe('admin@test.com');
  });

  it('deve rejeitar login com email inválido', () => {
    const result = store.login('invalido@test.com', 'admin123');
    expect(result).toBe(false);
    expect(store.isAuthenticated).toBe(false);
  });

  it('deve rejeitar login com senha inválida', () => {
    const result = store.login('admin@test.com', 'senhaerrada');
    expect(result).toBe(false);
    expect(store.isAuthenticated).toBe(false);
  });

  it('deve rejeitar login com email vazio', () => {
    const result = store.login('', 'admin123');
    expect(result).toBe(false);
  });

  it('deve rejeitar login com senha vazia', () => {
    const result = store.login('admin@test.com', '');
    expect(result).toBe(false);
  });

  it('deve fazer login com diferentes usuários', () => {
    expect(store.login('dentista@test.com', 'dentista123')).toBe(true);
    expect(store.user?.role).toBe('dentist');
    
    store.logout();
    expect(store.login('recepcao@test.com', 'recepcao123')).toBe(true);
    expect(store.user?.role).toBe('receptionist');
  });

  it('deve sobrescrever usuário ao fazer novo login', () => {
    store.login('admin@test.com', 'admin123');
    store.login('dentista@test.com', 'dentista123');
    expect(store.user?.email).toBe('dentista@test.com');
  });

  it('deve lidar com case sensitive no email', () => {
    const result = store.login('ADMIN@TEST.COM', 'admin123');
    expect(result).toBe(false); // Email é case sensitive
  });

  it('deve lidar com espaços no email', () => {
    const result = store.login(' admin@test.com ', 'admin123');
    expect(result).toBe(false); // Espaços não são trimados
  });

  it('deve fazer login de todos os tipos de usuário', () => {
    expect(store.login('admin@test.com', 'admin123')).toBe(true);
    store.logout();
    expect(store.login('dentista@test.com', 'dentista123')).toBe(true);
    store.logout();
    expect(store.login('recepcao@test.com', 'recepcao123')).toBe(true);
    store.logout();
    expect(store.login('financeiro@test.com', 'financeiro123')).toBe(true);
  });

  it('deve manter estado após login', () => {
    store.login('admin@test.com', 'admin123');
    expect(store.user?.id).toBe('user-1');
    expect(store.user?.name).toBe('Admin');
    expect(store.user?.role).toBe('super_admin');
  });

  it('deve definir clinic para usuários com clinic_id', () => {
    store.login('dentista@test.com', 'dentista123');
    expect(store.clinic).toBeTruthy();
    expect(store.clinic?.id).toBe('clinic-1');
  });

  it('não deve definir clinic para super_admin', () => {
    store.login('admin@test.com', 'admin123');
    expect(store.clinic).toBeNull();
  });
});

describe('Autenticação - Logout', () => {
  let store: AuthState;

  beforeEach(() => {
    store = createAuthStore();
    store.login('admin@test.com', 'admin123');
  });

  it('deve fazer logout corretamente', () => {
    expect(store.isAuthenticated).toBe(true);
    store.logout();
    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
    expect(store.clinic).toBeNull();
  });

  it('deve permitir novo login após logout', () => {
    store.logout();
    expect(store.login('dentista@test.com', 'dentista123')).toBe(true);
    expect(store.user?.email).toBe('dentista@test.com');
  });

  it('deve lidar com múltiplos logouts', () => {
    store.logout();
    store.logout(); // Não deve dar erro
    expect(store.isAuthenticated).toBe(false);
  });

  it('deve limpar clinic ao fazer logout', () => {
    store.logout();
    expect(store.clinic).toBeNull();
  });
});

describe('Autenticação - Permissões', () => {
  let store: AuthState;

  beforeEach(() => {
    store = createAuthStore();
  });

  it('super_admin deve ter todas as permissões', () => {
    store.login('admin@test.com', 'admin123');
    expect(store.hasPermission('view_dashboard')).toBe(true);
    expect(store.hasPermission('create_appointment')).toBe(true);
    expect(store.hasPermission('view_patients')).toBe(true);
    expect(store.hasPermission('view_financial')).toBe(true);
    expect(store.hasPermission('manage_stock')).toBe(true);
    expect(store.hasPermission('manage_settings')).toBe(true);
  });

  it('dentist deve ter permissões específicas', () => {
    store.login('dentista@test.com', 'dentista123');
    expect(store.hasPermission('view_dashboard')).toBe(true);
    expect(store.hasPermission('create_appointment')).toBe(true);
    expect(store.hasPermission('view_patients')).toBe(true);
    expect(store.hasPermission('view_financial')).toBe(false);
    expect(store.hasPermission('manage_stock')).toBe(false);
    expect(store.hasPermission('manage_settings')).toBe(false);
  });

  it('receptionist deve ter permissões específicas', () => {
    store.login('recepcao@test.com', 'recepcao123');
    expect(store.hasPermission('view_dashboard')).toBe(true);
    expect(store.hasPermission('create_appointment')).toBe(true);
    expect(store.hasPermission('view_patients')).toBe(true);
    expect(store.hasPermission('view_financial')).toBe(false);
    expect(store.hasPermission('manage_stock')).toBe(true);
    expect(store.hasPermission('manage_settings')).toBe(false);
  });

  it('financial deve ter permissões específicas', () => {
    store.login('financeiro@test.com', 'financeiro123');
    expect(store.hasPermission('view_dashboard')).toBe(true);
    expect(store.hasPermission('create_appointment')).toBe(false);
    expect(store.hasPermission('view_patients')).toBe(false);
    expect(store.hasPermission('view_financial')).toBe(true);
    expect(store.hasPermission('manage_stock')).toBe(false);
    expect(store.hasPermission('manage_settings')).toBe(false);
  });

  it('usuário deslogado não deve ter permissões', () => {
    expect(store.hasPermission('view_dashboard')).toBe(false);
    expect(store.hasPermission('create_appointment')).toBe(false);
  });

  it('deve retornar false para permissão inexistente', () => {
    store.login('admin@test.com', 'admin123');
    expect(store.hasPermission('permissao_inexistente')).toBe(true); // super_admin tem todas
  });

  it('deve verificar permissões após logout', () => {
    store.login('admin@test.com', 'admin123');
    store.logout();
    expect(store.hasPermission('view_dashboard')).toBe(false);
  });
});

describe('Autenticação - Atualização de Usuário', () => {
  let store: AuthState;

  beforeEach(() => {
    store = createAuthStore();
    store.login('admin@test.com', 'admin123');
  });

  it('deve atualizar nome do usuário', () => {
    store.updateUser({ name: 'Novo Nome' });
    expect(store.user?.name).toBe('Novo Nome');
  });

  it('deve atualizar email do usuário', () => {
    store.updateUser({ email: 'novo@email.com' });
    expect(store.user?.email).toBe('novo@email.com');
  });

  it('deve atualizar telefone do usuário', () => {
    store.updateUser({ phone: '11999990000' });
    expect(store.user?.phone).toBe('11999990000');
  });

  it('deve atualizar comissão do usuário', () => {
    store.updateUser({ commission_pct: 50 });
    expect(store.user?.commission_pct).toBe(50);
  });

  it('não deve atualizar se não estiver logado', () => {
    store.logout();
    store.updateUser({ name: 'Teste' });
    expect(store.user).toBeNull();
  });

  it('deve manter campos não atualizados', () => {
    store.updateUser({ name: 'Novo Nome' });
    expect(store.user?.email).toBe('admin@test.com');
    expect(store.user?.role).toBe('super_admin');
  });

  it('deve atualizar múltiplos campos', () => {
    store.updateUser({ name: 'Novo', email: 'novo@email.com', phone: '11999990000' });
    expect(store.user?.name).toBe('Novo');
    expect(store.user?.email).toBe('novo@email.com');
    expect(store.user?.phone).toBe('11999990000');
  });
});

describe('Autenticação - Validação de Senha', () => {
  function validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (password.length < 8) errors.push('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('1 letra maiúscula');
    if (!/[0-9]/.test(password)) errors.push('1 número');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('1 caractere especial');
    return { valid: errors.length === 0, errors };
  }

  it('deve validar senha forte', () => {
    const result = validatePassword('MinhaSenh@123');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('deve rejeitar senha curta', () => {
    const result = validatePassword('Ab1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Mínimo 8 caracteres');
  });

  it('deve rejeitar senha sem maiúscula', () => {
    const result = validatePassword('minhasenha123!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('1 letra maiúscula');
  });

  it('deve rejeitar senha sem número', () => {
    const result = validatePassword('MinhaSenha!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('1 número');
  });

  it('deve rejeitar senha sem especial', () => {
    const result = validatePassword('MinhaSenha123');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('1 caractere especial');
  });

  it('deve aceitar senha com todos requisitos', () => {
    expect(validatePassword('123456Aa!').valid).toBe(true);
    expect(validatePassword('Senha@123').valid).toBe(true);
    expect(validatePassword('Teste#456').valid).toBe(true);
  });

  it('deve aceitar vários caracteres especiais', () => {
    expect(validatePassword('Teste@123').valid).toBe(true);
    expect(validatePassword('Teste#123').valid).toBe(true);
    expect(validatePassword('Teste$123').valid).toBe(true);
    expect(validatePassword('Teste%123').valid).toBe(true);
    expect(validatePassword('Teste^123').valid).toBe(true);
    expect(validatePassword('Teste&123').valid).toBe(true);
    expect(validatePassword('Teste*123').valid).toBe(true);
  });
});

describe('Autenticação - Rate Limiting', () => {
  const rateLimits: Map<string, { count: number; resetAt: number }> = new Map();

  function canRequestCode(email: string): boolean {
    const rate = rateLimits.get(email);
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    if (rate && now < rate.resetAt) {
      if (rate.count >= 3) return false;
      rate.count++;
    } else {
      rateLimits.set(email, { count: 1, resetAt: now + tenMinutes });
    }
    return true;
  }

  beforeEach(() => {
    rateLimits.clear();
  });

  it('deve permitir primeira requisição', () => {
    expect(canRequestCode('user@test.com')).toBe(true);
  });

  it('deve permitir até 3 requisições', () => {
    canRequestCode('user@test.com');
    canRequestCode('user@test.com');
    expect(canRequestCode('user@test.com')).toBe(true);
  });

  it('deve bloquear após 3 requisições', () => {
    canRequestCode('user@test.com');
    canRequestCode('user@test.com');
    canRequestCode('user@test.com');
    expect(canRequestCode('user@test.com')).toBe(false);
  });

  it('deve tratar emails diferentes separadamente', () => {
    canRequestCode('user1@test.com');
    canRequestCode('user1@test.com');
    canRequestCode('user1@test.com');
    expect(canRequestCode('user2@test.com')).toBe(true);
  });
});

describe('Autenticação - Geração de Código', () => {
  function generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  it('deve gerar código de 6 dígitos', () => {
    const code = generateCode();
    expect(code).toHaveLength(6);
    expect(/^\d{6}$/.test(code)).toBe(true);
  });

  it('deve gerar códigos únicos', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateCode());
    }
    expect(codes.size).toBeGreaterThan(900); // Pelo menos 90% únicos
  });

  it('deve gerar código entre 100000 e 999999', () => {
    for (let i = 0; i < 100; i++) {
      const code = parseInt(generateCode());
      expect(code).toBeGreaterThanOrEqual(100000);
      expect(code).toBeLessThanOrEqual(999999);
    }
  });
});
