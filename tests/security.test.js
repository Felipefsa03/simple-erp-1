// ============================================
// LuminaFlow - Testes Unitários - Módulo de Segurança
// ============================================

import { 
  encrypt, 
  decrypt, 
  hashPassword, 
  verifyPassword, 
  generateToken, 
  generateSessionToken,
  maskSensitiveData 
} from '../backend/security.js';

describe('Security Module', () => {
  
  describe('encrypt/decrypt', () => {
    test('should encrypt and decrypt text correctly', () => {
      const original = 'Hello World';
      const encrypted = encrypt(original, 'test-password');
      
      expect(encrypted).not.toBe(original);
      expect(encrypted).toContain(':');
      
      const decrypted = decrypt(encrypted, 'test-password');
      expect(decrypted).toBe(original);
    });

    test('should return null for invalid password', () => {
      const original = 'Secret data';
      const encrypted = encrypt(original, 'correct-password');
      
      const decrypted = decrypt(encrypted, 'wrong-password');
      expect(decrypted).toBeNull();
    });

    test('should handle empty string', () => {
      const encrypted = encrypt('', 'password');
      const decrypted = decrypt(encrypted, 'password');
      expect(decrypted).toBe('');
    });

    test('should handle special characters', () => {
      const original = 'Special chars: @#$%^&*()';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });
  });

  describe('hashPassword/verifyPassword', () => {
    test('should hash and verify password correctly', () => {
      const password = 'mySecurePassword123';
      const hashed = hashPassword(password);
      
      expect(hashed).not.toBe(password);
      expect(hashed).toContain(':');
      
      const isValid = verifyPassword(password, hashed);
      expect(isValid).toBe(true);
    });

    test('should reject wrong password', () => {
      const password = 'correctPassword';
      const hashed = hashPassword(password);
      
      const isValid = verifyPassword('wrongPassword', hashed);
      expect(isValid).toBe(false);
    });
  });

  describe('generateToken', () => {
    test('should generate token of default length', () => {
      const token = generateToken();
      expect(token).toHaveLength(64);
    });

    test('should generate token of custom length', () => {
      const token = generateToken(16);
      expect(token).toHaveLength(32);
    });

    test('should generate unique tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateSessionToken', () => {
    test('should generate session token of correct length', () => {
      const token = generateSessionToken();
      expect(token).toHaveLength(96);
    });

    test('should generate unique session tokens', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('maskSensitiveData', () => {
    test('should mask email correctly', () => {
      const email = 'test@example.com';
      const masked = maskSensitiveData(email);
      expect(masked).toBe('te***@example.com');
    });

    test('should mask CPF correctly', () => {
      const cpf = '123.456.789-00';
      const masked = maskSensitiveData(cpf);
      expect(masked).toBe('123.***.***-00');
    });

    test('should mask phone correctly', () => {
      const phone = '11999999999';
      const masked = maskSensitiveData(phone);
      expect(masked).toBe('11****9999');
    });

    test('should mask object fields correctly', () => {
      const data = {
        email: 'test@example.com',
        cpf: '12345678900',
        phone: '11999999999'
      };
      const masked = maskSensitiveData(data);
      expect(masked.email).toBe('te***@example.com');
      expect(masked.cpf).toContain('***');
    });

    test('should return same value for non-sensitive data', () => {
      const value = 'John Doe';
      const masked = maskSensitiveData(value);
      expect(masked).toBe('John Doe');
    });
  });
});
