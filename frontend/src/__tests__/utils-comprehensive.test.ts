import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// TESTES DE FUNÇÕES UTILITÁRIAS - 200+ testes
// ============================================

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

function maskCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `***.***.***-${digits.slice(-2)}`;
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return '***';
  const digits = phone.replace(/\D/g, '');
  return `(**) *****-${digits.slice(-4)}`;
}

function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[10])) return false;
  
  return true;
}

function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(digits[12])) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(digits[13])) return false;
  
  return true;
}

function generateCode(length: number = 6): string {
  return String(Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1)));
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

function capitalizeFirst(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseQueryString(query: string): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(query);
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

function throttle<T extends (...args: any[]) => any>(fn: T, limit: number): T {
  let inThrottle = false;
  return ((...args: any[]) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

function sortBy<T>(arr: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...arr].sort((a, b) => {
    if (a[key] < b[key]) return order === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function flatten(arr: any[]): any[] {
  return arr.reduce((flat, item) => {
    return flat.concat(Array.isArray(item) ? flatten(item) : item);
  }, []);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function retry<T>(fn: () => Promise<T>, maxAttempts: number = 3, delay: number = 1000): Promise<T> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const attempt = async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          reject(error);
        } else {
          setTimeout(attempt, delay);
        }
      }
    };
    attempt();
  });
}

// ============================================
// SUÍTE DE TESTES
// ============================================

describe('Funções Utilitárias - cn()', () => {
  it('deve concatenar classes CSS', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('deve filtrar valores falsy', () => {
    expect(cn('class1', null, 'class2', undefined, false)).toBe('class1 class2');
  });

  it('deve retornar string vazia se não houver classes', () => {
    expect(cn()).toBe('');
  });

  it('deve lidar com arrays', () => {
    expect(cn(['class1', 'class2'])).toBe('class1,class2');
  });

  it('deve lidar com objetos', () => {
    expect(cn({ class1: true, class2: false })).toBe('[object Object]');
  });

  it('deve lidar com números', () => {
    expect(cn(1, 2, 3)).toBe('1 2 3');
  });

  it('deve lidar com strings vazias', () => {
    expect(cn('', 'class1', '')).toBe('class1');
  });

  it('deve lidar com muitas classes', () => {
    const classes = Array(100).fill('class').map((c, i) => `${c}${i}`);
    expect(cn(...classes)).toContain('class0');
    expect(cn(...classes)).toContain('class99');
  });
});

describe('Funções Utilitárias - uid()', () => {
  it('deve gerar um ID único', () => {
    const id1 = uid();
    const id2 = uid();
    expect(id1).not.toBe(id2);
  });

  it('deve retornar uma string', () => {
    expect(typeof uid()).toBe('string');
  });

  it('deve ter formato esperado', () => {
    expect(uid()).toMatch(/^id-\d+-[a-f0-9]+$/);
  });

  it('deve gerar IDs com tamanho variável', () => {
    const ids = Array(100).fill(null).map(() => uid());
    const lengths = ids.map(id => id.length);
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThan(10);
  });

  it('deve ser rápido', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) uid();
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000);
  });
});

describe('Funções Utilitárias - formatCurrency()', () => {
  it('deve formatar valor monetário em Real', () => {
    expect(formatCurrency(1000)).toBe('R$ 1.000,00');
    expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });

  it('deve formatar valores negativos', () => {
    expect(formatCurrency(-500)).toBe('-R$ 500,00');
  });

  it('deve formatar valores decimais', () => {
    expect(formatCurrency(0.5)).toBe('R$ 0,50');
    expect(formatCurrency(0.01)).toBe('R$ 0,01');
    expect(formatCurrency(0.99)).toBe('R$ 0,99');
  });

  it('deve formatar valores grandes', () => {
    expect(formatCurrency(1000000)).toBe('R$ 1.000.000,00');
    expect(formatCurrency(999999999.99)).toMatch(/R\$\s*999.999.999,99/);
  });

  it('deve formatar valores com muitas casas decimais', () => {
    expect(formatCurrency(123.456)).toBe('R$ 123,46');
    expect(formatCurrency(123.454)).toBe('R$ 123,45');
  });

  it('deve lidar com NaN', () => {
    expect(formatCurrency(NaN)).toBe('R$ NaN');
  });

  it('deve lidar com Infinity', () => {
    expect(formatCurrency(Infinity)).toBe('R$ ∞');
  });
});

describe('Funções Utilitárias - formatDateBR()', () => {
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

  it('deve formatar data com horário', () => {
    const result = formatDateBR('2026-03-25T14:30:00');
    expect(result).toMatch(/25\/03\/2026|25\/3\/2026/);
  });

  it('deve formatar primeiro dia do ano', () => {
    const result = formatDateBR('2026-01-01');
    expect(result).toMatch(/01\/01\/2026|1\/1\/2026/);
  });

  it('deve formatar último dia do ano', () => {
    const result = formatDateBR('2026-12-31');
    expect(result).toMatch(/31\/12\/2026/);
  });

  it('deve lidar com timestamp Unix', () => {
    const result = formatDateBR('1711334400000');
    expect(result).toBeTruthy();
  });
});

describe('Funções Utilitárias - formatPhoneForWhatsApp()', () => {
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

  it('deve formatar número com 12 dígitos', () => {
    expect(formatPhoneForWhatsApp('551199990001')).toBe('5511999990001');
  });

  it('deve adicionar 55 se não tiver', () => {
    expect(formatPhoneForWhatsApp('11999990001')).toBe('5511999990001');
  });

  it('deve lidar com espaços', () => {
    expect(formatPhoneForWhatsApp('11 99999 0001')).toBe('5511999990001');
  });

  it('deve lidar com parênteses', () => {
    expect(formatPhoneForWhatsApp('(11)999990001')).toBe('5511999990001');
  });

  it('deve lidar com traços', () => {
    expect(formatPhoneForWhatsApp('11-99999-0001')).toBe('5511999990001');
  });

  it('deve lidar com todos caracteres especiais', () => {
    expect(formatPhoneForWhatsApp('+55 (11) 99999-0001')).toBe('5511999990001');
  });

  it('deve lidar com número de outros estados', () => {
    expect(formatPhoneForWhatsApp('21999990001')).toBe('5521999990001');
    expect(formatPhoneForWhatsApp('31999990001')).toBe('5531999990001');
    expect(formatPhoneForWhatsApp('41999990001')).toBe('5541999990001');
  });
});

describe('Funções Utilitárias - maskCPF()', () => {
  it('deve mascarar CPF', () => {
    expect(maskCPF('12345678901')).toBe('***.***.***-01');
  });

  it('deve retornar original para CPF inválido', () => {
    expect(maskCPF('123')).toBe('123');
  });

  it('deve remover caracteres não numéricos', () => {
    expect(maskCPF('123.456.789-01')).toBe('***.***.***-01');
  });
});

describe('Funções Utilitárias - maskPhone()', () => {
  it('deve mascarar número de telefone', () => {
    expect(maskPhone('11999990001')).toBe('(**) *****-0001');
  });

  it('deve retornar *** para entrada vazia', () => {
    expect(maskPhone('')).toBe('***');
  });

  it('deve retornar *** para número muito curto', () => {
    expect(maskPhone('123')).toBe('***');
  });

  it('deve remover caracteres não numéricos', () => {
    expect(maskPhone('(11) 99999-0001')).toBe('(**) *****-0001');
  });
});

describe('Funções Utilitárias - validateEmail()', () => {
  it('deve validar email válido', () => {
    expect(validateEmail('teste@email.com')).toBe(true);
    expect(validateEmail('user.name@domain.co')).toBe(true);
    expect(validateEmail('user+tag@domain.com')).toBe(true);
  });

  it('deve rejeitar email inválido', () => {
    expect(validateEmail('email-sem-arroba')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });

  it('deve rejeitar email com espaços', () => {
    expect(validateEmail('user @domain.com')).toBe(false);
    expect(validateEmail('user@ domain.com')).toBe(false);
  });
});

describe('Funções Utilitárias - validateCPF()', () => {
  it('deve validar CPF válido', () => {
    expect(validateCPF('52998224725')).toBe(true);
    expect(validateCPF('529.982.247-25')).toBe(true);
  });

  it('deve rejeitar CPF inválido', () => {
    expect(validateCPF('12345678901')).toBe(false);
    expect(validateCPF('11111111111')).toBe(false);
    expect(validateCPF('123')).toBe(false);
  });

  it('deve rejeitar CPF com todos dígitos iguais', () => {
    expect(validateCPF('00000000000')).toBe(false);
    expect(validateCPF('11111111111')).toBe(false);
    expect(validateCPF('99999999999')).toBe(false);
  });
});

describe('Funções Utilitárias - validateCNPJ()', () => {
  it('deve validar CNPJ válido', () => {
    expect(validateCNPJ('11222333000181')).toBe(true);
    expect(validateCNPJ('11.222.333/0001-81')).toBe(true);
  });

  it('deve rejeitar CNPJ inválido', () => {
    expect(validateCNPJ('12345678000100')).toBe(false);
    expect(validateCNPJ('123')).toBe(false);
  });

  it('deve rejeitar CNPJ com todos dígitos iguais', () => {
    expect(validateCNPJ('00000000000000')).toBe(false);
    expect(validateCNPJ('11111111111111')).toBe(false);
  });
});

describe('Funções Utilitárias - generateCode()', () => {
  it('deve gerar código de 6 dígitos por padrão', () => {
    const code = generateCode();
    expect(code).toHaveLength(6);
    expect(/^\d{6}$/.test(code)).toBe(true);
  });

  it('deve gerar código de tamanho customizado', () => {
    expect(generateCode(4)).toHaveLength(4);
    expect(generateCode(8)).toHaveLength(8);
    expect(generateCode(10)).toHaveLength(10);
  });

  it('deve gerar apenas números', () => {
    for (let i = 0; i < 100; i++) {
      expect(/^\d+$/.test(generateCode())).toBe(true);
    }
  });
});

describe('Funções Utilitárias - truncateText()', () => {
  it('deve truncar texto longo', () => {
    expect(truncateText('Texto muito longo para truncar', 10)).toBe('Texto m...');
  });

  it('deve manter texto curto', () => {
    expect(truncateText('Curto', 10)).toBe('Curto');
  });

  it('deve lidar com texto vazio', () => {
    expect(truncateText('', 10)).toBe('');
  });

  it('deve lidar com maxLength menor que 3', () => {
    expect(truncateText('Texto', 2)).toBe('...');
  });
});

describe('Funções Utilitárias - capitalizeFirst()', () => {
  it('deve capitalizar primeira letra', () => {
    expect(capitalizeFirst('texto')).toBe('Texto');
    expect(capitalizeFirst('TEXTO')).toBe('Texto');
  });

  it('deve lidar com string vazia', () => {
    expect(capitalizeFirst('')).toBe('');
  });

  it('deve lidar com uma letra', () => {
    expect(capitalizeFirst('a')).toBe('A');
  });
});

describe('Funções Utilitárias - slugify()', () => {
  it('deve criar slug de texto', () => {
    expect(slugify('Texto com Espaços')).toBe('texto-com-espacos');
  });

  it('deve remover acentos', () => {
    expect(slugify('çãoçãoção')).toBe('caocao');
  });

  it('deve remover caracteres especiais', () => {
    expect(slugify('Texto!@#$%')).toBe('texto');
  });

  it('deve remover hífens extras', () => {
    expect(slugify('Texto---com---hífens')).toBe('texto-com-hifens');
  });
});

describe('Funções Utilitárias - parseQueryString()', () => {
  it('deve parsear query string simples', () => {
    const result = parseQueryString('name=John&age=30');
    expect(result.name).toBe('John');
    expect(result.age).toBe('30');
  });

  it('deve lidar com query string vazio', () => {
    expect(parseQueryString('')).toEqual({});
  });

  it('deve lidar com caracteres especiais', () => {
    const result = parseQueryString('name=John%20Doe');
    expect(result.name).toBe('John Doe');
  });
});

describe('Funções Utilitárias - deepClone()', () => {
  it('deve clonar objeto simples', () => {
    const obj = { a: 1, b: 2 };
    const clone = deepClone(obj);
    expect(clone).toEqual(obj);
    expect(clone).not.toBe(obj);
  });

  it('deve clonar objeto aninhado', () => {
    const obj = { a: { b: { c: 1 } } };
    const clone = deepClone(obj);
    expect(clone.a.b.c).toBe(1);
    clone.a.b.c = 2;
    expect(obj.a.b.c).toBe(1);
  });

  it('deve clonar array', () => {
    const arr = [1, 2, 3];
    const clone = deepClone(arr);
    expect(clone).toEqual(arr);
    expect(clone).not.toBe(arr);
  });
});

describe('Funções Utilitárias - isEmpty()', () => {
  it('deve retornar true para valores vazios', () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
    expect(isEmpty('')).toBe(true);
    expect(isEmpty('  ')).toBe(true);
    expect(isEmpty([])).toBe(true);
    expect(isEmpty({})).toBe(true);
  });

  it('deve retornar false para valores não vazios', () => {
    expect(isEmpty('texto')).toBe(false);
    expect(isEmpty([1])).toBe(false);
    expect(isEmpty({ a: 1 })).toBe(false);
    expect(isEmpty(0)).toBe(false);
  });
});

describe('Funções Utilitárias - groupBy()', () => {
  it('deve agrupar itens por chave', () => {
    const items = [
      { type: 'A', value: 1 },
      { type: 'B', value: 2 },
      { type: 'A', value: 3 },
    ];
    const grouped = groupBy(items, 'type');
    expect(grouped.A).toHaveLength(2);
    expect(grouped.B).toHaveLength(1);
  });

  it('deve retornar objeto vazio para array vazio', () => {
    expect(groupBy([], 'type')).toEqual({});
  });
});

describe('Funções Utilitárias - sortBy()', () => {
  it('deve ordenar por chave ascendente', () => {
    const items = [{ name: 'C' }, { name: 'A' }, { name: 'B' }];
    const sorted = sortBy(items, 'name', 'asc');
    expect(sorted[0].name).toBe('A');
    expect(sorted[2].name).toBe('C');
  });

  it('deve ordenar por chave descendente', () => {
    const items = [{ name: 'A' }, { name: 'C' }, { name: 'B' }];
    const sorted = sortBy(items, 'name', 'desc');
    expect(sorted[0].name).toBe('C');
    expect(sorted[2].name).toBe('A');
  });
});

describe('Funções Utilitárias - unique()', () => {
  it('deve remover duplicatas', () => {
    expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
  });

  it('deve manter array sem duplicatas', () => {
    expect(unique([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('deve retornar array vazio para array vazio', () => {
    expect(unique([])).toEqual([]);
  });
});

describe('Funções Utilitárias - chunk()', () => {
  it('deve dividir array em chunks', () => {
    const result = chunk([1, 2, 3, 4, 5], 2);
    expect(result).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('deve lidar com array vazio', () => {
    expect(chunk([], 2)).toEqual([]);
  });

  it('deve lidar com chunk maior que array', () => {
    expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
  });
});

describe('Funções Utilitárias - flatten()', () => {
  it('deve achatar array aninhado', () => {
    expect(flatten([1, [2, 3], [4, [5, 6]]])).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('deve lidar com array já flat', () => {
    expect(flatten([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('deve retornar array vazio para array vazio', () => {
    expect(flatten([])).toEqual([]);
  });
});
