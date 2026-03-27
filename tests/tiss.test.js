// ============================================
// LuminaFlow - Testes Unitários - Módulo TISS
// ============================================

import { 
  generateTISS, 
  validateTISS, 
  getTISSVersion,
  getSupportedOperators 
} from '../backend/tissService.js';

describe('TISS Module', () => {
  
  describe('generateTISS', () => {
    test('should generate valid TISS XML', () => {
      const data = {
        prestador: {
          cnpj: '12345678000100',
          nome: 'Clínica Teste',
          codigo: '123456'
        },
        beneficiario: {
          codigo: 'BEN001',
          nome: 'João Silva',
          carteira: '123456789',
          validade: '2026-12-31'
        },
        procedimento: {
          tabela: '22',
          codigo: '10101012',
          descricao: 'Consulta Odontológica',
          hora: '14:00',
          horaFinal: '15:00'
        },
        valor: 150.00,
        dataExecucao: '2026-03-24'
      };

      const result = generateTISS(data);
      
      expect(result).toHaveProperty('xml');
      expect(result).toHaveProperty('protocol');
      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('version');
      expect(result.version).toBe('3.05.00');
      
      expect(result.xml).toContain('<ans:cnpjPrestador>12345678000100</ans:cnpjPrestador>');
      expect(result.xml).toContain('<ans:nomeBeneficiario>João Silva</ans:nomeBeneficiario>');
      expect(result.xml).toContain('<ans:valorTotal>150</ans:valorTotal>');
    });

    test('should use default values when not provided', () => {
      const result = generateTISS({ valor: 100 });
      
      expect(result.xml).toContain('<ans:codigoPrestador>000000</ans:codigoPrestador>');
      expect(result.xml).toContain('<ans:quantidadeExecutada>1</ans:quantidadeExecutada>');
    });

    test('should generate unique protocol', () => {
      const result1 = generateTISS({ valor: 100, procedimento: { descricao: 'Test 1' } });
      const result2 = generateTISS({ valor: 100, procedimento: { descricao: 'Test 2' } });
      
      expect(result1.protocol).not.toBe(result2.protocol);
    });
  });

  describe('validateTISS', () => {
    test('should validate complete TISS XML', () => {
      const data = {
        prestador: { cnpj: '123', codigo: '123' },
        beneficiario: { nome: 'Test' },
        procedimento: { descricao: 'Test' }
      };
      
      const { xml } = generateTISS(data);
      const result = validateTISS(xml);
      
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    test('should detect missing fields', () => {
      const xml = '<ans:tissXml><ans:prestador>test</ans:prestador></ans:tissXml>';
      const result = validateTISS(xml);
      
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('beneficiario');
      expect(result.missing).toContain('procedimentos');
    });
  });

  describe('getTISSVersion', () => {
    test('should return correct version', () => {
      expect(getTISSVersion()).toBe('3.05.00');
    });
  });

  describe('getSupportedOperators', () => {
    test('should return list of Brazilian operators', () => {
      const operators = getSupportedOperators();
      
      expect(operators).toBeInstanceOf(Array);
      expect(operators.length).toBeGreaterThan(0);
      expect(operators[0]).toHaveProperty('codigo');
      expect(operators[0]).toHaveProperty('nome');
      
      const unimed = operators.find(o => o.nome === 'Unimed');
      expect(unimed).toBeDefined();
    });
  });
});
