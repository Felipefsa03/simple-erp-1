import { describe, it, expect } from 'vitest';

// Funções utilitárias do sistema
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

function uid() {
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR');
}

function formatPhoneForWhatsApp(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  digits = digits.replace(/^0+/, '');
  if (!digits) return '';
  if (digits.length === 13 && digits.startsWith('55')) return digits;
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const number = digits.slice(4);
    return '55' + ddd + '9' + number;
  }
  if (digits.length === 11) return '55' + digits;
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const number = digits.slice(2);
    return '55' + ddd + '9' + number;
  }
  if (!digits.startsWith('55')) return '55' + digits;
  return digits;
}

describe('Funções Utilitárias', () => {
  describe('cn', () => {
    it('deve concatenar classes CSS', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('deve filtrar valores falsy', () => {
      expect(cn('class1', null, 'class2', undefined, false)).toBe('class1 class2');
    });

    it('deve retornar string vazia se não houver classes', () => {
      expect(cn()).toBe('');
    });
  });

  describe('uid', () => {
    it('deve gerar um ID único', () => {
      const id1 = uid();
      const id2 = uid();
      expect(id1).not.toBe(id2);
    });

    it('deve retornar uma string', () => {
      const id = uid();
      expect(typeof id).toBe('string');
    });

    it('deve ter formato esperado', () => {
      const id = uid();
      expect(id).toMatch(/^id-\d+-[a-f0-9]+$/);
    });
  });

  describe('formatCurrency', () => {
    it('deve formatar valor monetário em Real', () => {
      expect(formatCurrency(1000)).toBe('R$ 1.000,00');
      expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
      expect(formatCurrency(0)).toBe('R$ 0,00');
    });

    it('deve formatar valores negativos', () => {
      expect(formatCurrency(-500)).toBe('-R$ 500,00');
    });
  });

  describe('formatDateBR', () => {
    it('deve formatar data para formato brasileiro', () => {
      const result = formatDateBR('2026-03-25');
      expect(result).toMatch(/25\/03\/2026|25\/3\/2026/);
    });

    it('deve retornar string vazia para data vazia', () => {
      expect(formatDateBR('')).toBe('');
    });

    it('deve retornar a string original para data inválida', () => {
      expect(formatDateBR('data-invalida')).toBe('data-invalida');
    });
  });

  describe('formatPhoneForWhatsApp', () => {
    it('deve formatar número com 11 dígitos', () => {
      expect(formatPhoneForWhatsApp('11999990001')).toBe('5511999990001');
    });

    it('deve formatar número com 10 dígitos', () => {
      expect(formatPhoneForWhatsApp('1199990001')).toBe('5511999990001');
    });

    it('deve manter número já formatado com 13 dígitos', () => {
      expect(formatPhoneForWhatsApp('5511999990001')).toBe('5511999990001');
    });

    it('deve remover caracteres não numéricos', () => {
      expect(formatPhoneForWhatsApp('(11) 99999-0001')).toBe('5511999990001');
    });

    it('deve retornar string vazia para entrada vazia', () => {
      expect(formatPhoneForWhatsApp('')).toBe('');
    });
  });
});
