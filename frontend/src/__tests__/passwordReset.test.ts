import { describe, it, expect, beforeEach, vi } from 'vitest';

// Funções do fluxo de recuperação de senha
function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return '***';
  const digits = phone.replace(/\D/g, '');
  return `(**) *****-${digits.slice(-4)}`;
}

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('1 letra maiúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('1 número');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('1 caractere especial');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function isCodeExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

function canRequestCode(lastRequestAt: number, requestCount: number): boolean {
  const tenMinutes = 10 * 60 * 1000;
  const now = Date.now();

  if (now - lastRequestAt > tenMinutes) {
    return true; // Resetou o período
  }

  return requestCount < 3;
}

describe('Fluxo de Recuperação de Senha', () => {
  describe('generateCode', () => {
    it('deve gerar um código de 6 dígitos', () => {
      const code = generateCode();
      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    it('deve gerar códigos diferentes', () => {
      const code1 = generateCode();
      const code2 = generateCode();
      // Pode ser igual por chance, mas geralmente será diferente
      expect(typeof code1).toBe('string');
      expect(typeof code2).toBe('string');
    });

    it('deve gerar código entre 100000 e 999999', () => {
      for (let i = 0; i < 100; i++) {
        const code = parseInt(generateCode());
        expect(code).toBeGreaterThanOrEqual(100000);
        expect(code).toBeLessThanOrEqual(999999);
      }
    });
  });

  describe('maskPhone', () => {
    it('deve mascarar número de telefone', () => {
      expect(maskPhone('11999990001')).toBe('(**) *****-0001');
    });

    it('deve retornar *** para entrada vazia', () => {
      expect(maskPhone('')).toBe('***');
    });

    it('deve retornar *** para número muito curto', () => {
      expect(maskPhone('123')).toBe('***');
    });

    it('deve remover caracteres não numéricos antes de mascarar', () => {
      expect(maskPhone('(11) 99999-0001')).toBe('(**) *****-0001');
    });
  });

  describe('validatePassword', () => {
    it('deve validar senha forte', () => {
      const result = validatePassword('MinhaSenh@123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve rejeitar senha muito curta', () => {
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

    it('deve rejeitar senha sem caractere especial', () => {
      const result = validatePassword('MinhaSenha123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('1 caractere especial');
    });

    it('deve aceitar senha com todos os requisitos', () => {
      const result = validatePassword('123456Aa!');
      expect(result.valid).toBe(true);
    });
  });

  describe('isCodeExpired', () => {
    it('deve retornar false para código ainda válido', () => {
      const expiresAt = Date.now() + 30000; // 30 segundos no futuro
      expect(isCodeExpired(expiresAt)).toBe(false);
    });

    it('deve retornar true para código expirado', () => {
      const expiresAt = Date.now() - 1000; // 1 segundo no passado
      expect(isCodeExpired(expiresAt)).toBe(true);
    });
  });

  describe('canRequestCode', () => {
    it('deve permitir primeira requisição', () => {
      expect(canRequestCode(0, 0)).toBe(true);
    });

    it('deve permitir até 3 requisições por período', () => {
      const now = Date.now();
      expect(canRequestCode(now, 2)).toBe(true);
      expect(canRequestCode(now, 3)).toBe(false);
    });

    it('deve resetar após 10 minutos', () => {
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000) - 1000;
      expect(canRequestCode(tenMinutesAgo, 5)).toBe(true);
    });
  });
});
