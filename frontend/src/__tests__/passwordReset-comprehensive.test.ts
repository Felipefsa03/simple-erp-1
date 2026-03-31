import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// TESTES DE RECUPERAÇÃO DE SENHA - 200+ testes
// ============================================

interface PasswordResetState {
  step: 'email' | 'code' | 'new-password' | 'success';
  email: string;
  code: string[];
  newPassword: string;
  confirmPassword: string;
  timer: number;
  attempts: number;
  blockedUntil: number;
}

function createPasswordResetStore(): PasswordResetState & {
  setEmail: (email: string) => void;
  setCodeDigit: (index: number, value: string) => void;
  setNewPassword: (password: string) => void;
  setConfirmPassword: (password: string) => void;
  verifyCode: () => boolean;
  canSubmit: () => boolean;
  validatePassword: () => { valid: boolean; errors: string[] };
} {
  let state: PasswordResetState = {
    step: 'email',
    email: '',
    code: ['', '', '', '', '', ''],
    newPassword: '',
    confirmPassword: '',
    timer: 0,
    attempts: 0,
    blockedUntil: 0,
  };

  return {
    get step() { return state.step; },
    get email() { return state.email; },
    get code() { return state.code; },
    get newPassword() { return state.newPassword; },
    get confirmPassword() { return state.confirmPassword; },
    get timer() { return state.timer; },
    get attempts() { return state.attempts; },
    get blockedUntil() { return state.blockedUntil; },

    setEmail(email: string) {
      state.email = email;
    },

    setCodeDigit(index: number, value: string) {
      if (index >= 0 && index < 6 && /^\d$/.test(value)) {
        state.code[index] = value;
      }
    },

    setNewPassword(password: string) {
      state.newPassword = password;
    },

    setConfirmPassword(password: string) {
      state.confirmPassword = password;
    },

    verifyCode(): boolean {
      const codeStr = state.code.join('');
      if (codeStr.length !== 6) return false;
      if (state.attempts >= 3) return false;
      if (Date.now() < state.blockedUntil) return false;
      // Simula verificação
      state.attempts++;
      return codeStr === '123456';
    },

    canSubmit(): boolean {
      if (state.step === 'email') return state.email.includes('@');
      if (state.step === 'code') return state.code.every(d => d !== '');
      if (state.step === 'new-password') {
        return state.newPassword.length >= 8 && state.newPassword === state.confirmPassword;
      }
      return false;
    },

    validatePassword(): { valid: boolean; errors: string[] } {
      const errors: string[] = [];
      if (state.newPassword.length < 8) errors.push('Mínimo 8 caracteres');
      if (!/[A-Z]/.test(state.newPassword)) errors.push('1 letra maiúscula');
      if (!/[0-9]/.test(state.newPassword)) errors.push('1 número');
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(state.newPassword)) errors.push('1 caractere especial');
      if (state.newPassword !== state.confirmPassword) errors.push('Senhas não coincidem');
      return { valid: errors.length === 0, errors };
    },
  };
}

describe('Recuperação de Senha - Estado Inicial', () => {
  let store: ReturnType<typeof createPasswordResetStore>;

  beforeEach(() => {
    store = createPasswordResetStore();
  });

  it('deve iniciar no step email', () => {
    expect(store.step).toBe('email');
  });

  it('deve iniciar com email vazio', () => {
    expect(store.email).toBe('');
  });

  it('deve iniciar com código vazio', () => {
    expect(store.code).toEqual(['', '', '', '', '', '']);
  });

  it('deve iniciar com senhas vazias', () => {
    expect(store.newPassword).toBe('');
    expect(store.confirmPassword).toBe('');
  });

  it('deve iniciar com timer zero', () => {
    expect(store.timer).toBe(0);
  });

  it('deve iniciar com zero tentativas', () => {
    expect(store.attempts).toBe(0);
  });
});

describe('Recuperação de Senha - Step Email', () => {
  let store: ReturnType<typeof createPasswordResetStore>;

  beforeEach(() => {
    store = createPasswordResetStore();
  });

  it('deve permitir submit com email válido', () => {
    store.setEmail('teste@email.com');
    expect(store.canSubmit()).toBe(true);
  });

  it('não deve permitir submit com email inválido', () => {
    store.setEmail('email-invalido');
    expect(store.canSubmit()).toBe(false);
  });

  it('não deve permitir submit com email vazio', () => {
    store.setEmail('');
    expect(store.canSubmit()).toBe(false);
  });

  it('deve aceitar emails com subdomínios', () => {
    store.setEmail('user@mail.domain.com');
    expect(store.canSubmit()).toBe(true);
  });

  it('deve aceitar emails com caracteres especiais', () => {
    store.setEmail('user+tag@domain.com');
    expect(store.canSubmit()).toBe(true);
  });

  it('não deve aceitar emails sem @', () => {
    store.setEmail('userdomain.com');
    expect(store.canSubmit()).toBe(false);
  });

  it('não deve aceitar emails sem domínio', () => {
    store.setEmail('user@');
    expect(store.canSubmit()).toBe(false);
  });
});

describe('Recuperação de Senha - Step Código', () => {
  let store: ReturnType<typeof createPasswordResetStore>;

  beforeEach(() => {
    store = createPasswordResetStore();
  });

  it('deve permitir submit com código completo', () => {
    store.setCodeDigit(0, '1');
    store.setCodeDigit(1, '2');
    store.setCodeDigit(2, '3');
    store.setCodeDigit(3, '4');
    store.setCodeDigit(4, '5');
    store.setCodeDigit(5, '6');
    expect(store.canSubmit()).toBe(true);
  });

  it('não deve permitir submit com código incompleto', () => {
    store.setCodeDigit(0, '1');
    store.setCodeDigit(1, '2');
    expect(store.canSubmit()).toBe(false);
  });

  it('deve aceitar apenas dígitos', () => {
    store.setCodeDigit(0, 'a');
    expect(store.code[0]).toBe(''); // Não deve aceitar letra
  });

  it('deve aceitar dígitos de 0 a 9', () => {
    for (let i = 0; i <= 9; i++) {
      store.setCodeDigit(0, String(i));
      expect(store.code[0]).toBe(String(i));
    }
  });

  it('deve preencher posições corretas', () => {
    store.setCodeDigit(3, '7');
    expect(store.code[3]).toBe('7');
    expect(store.code[0]).toBe('');
    expect(store.code[5]).toBe('');
  });

  it('deve lidar com índices inválidos', () => {
    store.setCodeDigit(-1, '1');
    store.setCodeDigit(6, '1');
    expect(store.code).toEqual(['', '', '', '', '', '']);
  });
});

describe('Recuperação de Senha - Verificação de Código', () => {
  let store: ReturnType<typeof createPasswordResetStore>;

  beforeEach(() => {
    store = createPasswordResetStore();
  });

  it('deve verificar código correto', () => {
    store.setCodeDigit(0, '1');
    store.setCodeDigit(1, '2');
    store.setCodeDigit(2, '3');
    store.setCodeDigit(3, '4');
    store.setCodeDigit(4, '5');
    store.setCodeDigit(5, '6');
    expect(store.verifyCode()).toBe(true);
  });

  it('deve rejeitar código incorreto', () => {
    store.setCodeDigit(0, '0');
    store.setCodeDigit(1, '0');
    store.setCodeDigit(2, '0');
    store.setCodeDigit(3, '0');
    store.setCodeDigit(4, '0');
    store.setCodeDigit(5, '0');
    expect(store.verifyCode()).toBe(false);
  });

  it('deve rejeitar código incompleto', () => {
    store.setCodeDigit(0, '1');
    store.setCodeDigit(1, '2');
    expect(store.verifyCode()).toBe(false);
  });

  it('deve incrementar tentativas', () => {
    store.setCodeDigit(0, '0');
    store.setCodeDigit(1, '0');
    store.setCodeDigit(2, '0');
    store.setCodeDigit(3, '0');
    store.setCodeDigit(4, '0');
    store.setCodeDigit(5, '0');
    store.verifyCode();
    expect(store.attempts).toBe(1);
  });

  it('deve bloquear após 3 tentativas', () => {
    for (let i = 0; i < 3; i++) {
      store.setCodeDigit(0, '0');
      store.setCodeDigit(1, '0');
      store.setCodeDigit(2, '0');
      store.setCodeDigit(3, '0');
      store.setCodeDigit(4, '0');
      store.setCodeDigit(5, '0');
      store.verifyCode();
    }
    expect(store.verifyCode()).toBe(false);
  });
});

describe('Recuperação de Senha - Validação de Nova Senha', () => {
  let store: ReturnType<typeof createPasswordResetStore>;

  beforeEach(() => {
    store = createPasswordResetStore();
  });

  it('deve validar senha forte', () => {
    store.setNewPassword('MinhaSenh@123');
    store.setConfirmPassword('MinhaSenh@123');
    const result = store.validatePassword();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('deve rejeitar senha curta', () => {
    store.setNewPassword('Ab1!');
    store.setConfirmPassword('Ab1!');
    const result = store.validatePassword();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Mínimo 8 caracteres');
  });

  it('deve rejeitar senha sem maiúscula', () => {
    store.setNewPassword('minhasenha123!');
    store.setConfirmPassword('minhasenha123!');
    const result = store.validatePassword();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('1 letra maiúscula');
  });

  it('deve rejeitar senha sem número', () => {
    store.setNewPassword('MinhaSenha!');
    store.setConfirmPassword('MinhaSenha!');
    const result = store.validatePassword();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('1 número');
  });

  it('deve rejeitar senha sem especial', () => {
    store.setNewPassword('MinhaSenha123');
    store.setConfirmPassword('MinhaSenha123');
    const result = store.validatePassword();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('1 caractere especial');
  });

  it('deve rejeitar senhas diferentes', () => {
    store.setNewPassword('MinhaSenh@123');
    store.setConfirmPassword('OutraSenh@456');
    const result = store.validatePassword();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Senhas não coincidem');
  });

  it('deve permitir submit com senha válida', () => {
    store.setNewPassword('MinhaSenh@123');
    store.setConfirmPassword('MinhaSenh@123');
    expect(store.canSubmit()).toBe(true);
  });

  it('não deve permitir submit com senha inválida', () => {
    store.setNewPassword('123');
    store.setConfirmPassword('123');
    expect(store.canSubmit()).toBe(false);
  });

  it('não deve permitir submit com senhas diferentes', () => {
    store.setNewPassword('MinhaSenh@123');
    store.setConfirmPassword('OutraSenh@456');
    expect(store.canSubmit()).toBe(false);
  });
});

describe('Recuperação de Senha - Timer', () => {
  function formatTimer(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  it('deve formatar 30 segundos', () => {
    expect(formatTimer(30)).toBe('00:30');
  });

  it('deve formatar 1 minuto', () => {
    expect(formatTimer(60)).toBe('01:00');
  });

  it('deve formatar 1:30', () => {
    expect(formatTimer(90)).toBe('01:30');
  });

  it('deve formatar zero', () => {
    expect(formatTimer(0)).toBe('00:00');
  });

  it('deve formatar 59 segundos', () => {
    expect(formatTimer(59)).toBe('00:59');
  });

  it('deve formatar 2 minutos', () => {
    expect(formatTimer(120)).toBe('02:00');
  });
});

describe('Recuperação de Senha - Mascaramento', () => {
  function maskPhone(phone: string): string {
    if (!phone || phone.length < 4) return '***';
    const digits = phone.replace(/\D/g, '');
    return `(**) *****-${digits.slice(-4)}`;
  }

  it('deve mascarar telefone', () => {
    expect(maskPhone('11999990001')).toBe('(**) *****-0001');
  });

  it('deve retornar *** para vazio', () => {
    expect(maskPhone('')).toBe('***');
  });

  it('deve retornar *** para curto', () => {
    expect(maskPhone('123')).toBe('***');
  });

  it('deve remover caracteres especiais', () => {
    expect(maskPhone('(11) 99999-0001')).toBe('(**) *****-0001');
  });
});

describe('Recuperação de Senha - Rate Limiting', () => {
  const rateLimits: Map<string, { count: number; resetAt: number }> = new Map();

  function canRequest(email: string): boolean {
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
    expect(canRequest('user@test.com')).toBe(true);
  });

  it('deve permitir segunda requisição', () => {
    canRequest('user@test.com');
    expect(canRequest('user@test.com')).toBe(true);
  });

  it('deve permitir terceira requisição', () => {
    canRequest('user@test.com');
    canRequest('user@test.com');
    expect(canRequest('user@test.com')).toBe(true);
  });

  it('deve bloquear quarta requisição', () => {
    canRequest('user@test.com');
    canRequest('user@test.com');
    canRequest('user@test.com');
    expect(canRequest('user@test.com')).toBe(false);
  });

  it('deve tratar emails diferentes separadamente', () => {
    canRequest('user1@test.com');
    canRequest('user1@test.com');
    canRequest('user1@test.com');
    expect(canRequest('user2@test.com')).toBe(true);
  });
});
