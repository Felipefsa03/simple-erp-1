// ============================================
// LuminaFlow - Módulo de Segurança
// Funções utilitárias para criptografia, hash e masking
// ============================================

const crypto = require('crypto');

const DEFAULT_KEY = process.env.SECURITY_KEY || 'dev-only-key-do-not-use-in-prod';
if (!DEFAULT_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('[SECURITY] SECURITY_KEY environment variable is required in production');
}

const ALGORITHM = 'aes-256-gcm';

const encrypt = (text, key = DEFAULT_KEY) => {
  if (!text) return text;
  
  try {
    const iv = crypto.randomBytes(16);
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('[Security] Encrypt error:', error.message);
    return null;
  }
};

const decrypt = (encryptedText, key = DEFAULT_KEY) => {
  if (!encryptedText) return encryptedText;
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return null;
    
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[Security] Decrypt error:', error.message);
    return null;
  }
};

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, hashedPassword) => {
  try {
    const [salt, hash] = hashedPassword.split(':');
    const newHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return hash === newHash;
  } catch (error) {
    console.error('[Security] Verify password error:', error.message);
    return false;
  }
};

const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

const generateSessionToken = () => {
  return generateToken(48);
};

const maskSensitiveData = (data) => {
  if (!data) return data;
  
  if (typeof data === 'string') {
    if (data.includes('@')) {
      const [local, domain] = data.split('@');
      if (local && domain) {
        return `${local.substring(0, 2)}***@${domain}`;
      }
    }
    
    const cpfMatch = data.match(/^(\d{3})\.(\d{3})\.(\d{3})-(\d{2})$/);
    if (cpfMatch) {
      return `${cpfMatch[1].padEnd(3, '*')}.***.***-${cpfMatch[4]}`;
    }
    
    const phoneMatch = data.match(/^(\d{2})(\d{8,9})$/);
    if (phoneMatch) {
      return `${phoneMatch[1]}****${phoneMatch[2].slice(-4)}`;
    }
    
    if (data.length >= 8) {
      return data.substring(0, 2) + '*'.repeat(data.length - 4) + data.substring(data.length - 2);
    }
    
    return data;
  }
  
  if (typeof data === 'object') {
    const masked = {};
    const sensitiveFields = ['email', 'cpf', 'phone', 'password', 'token', 'secret', 'access_token'];
    
    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        masked[key] = maskSensitiveData(value);
      } else if (typeof value === 'object') {
        masked[key] = maskSensitiveData(value);
      } else {
        masked[key] = value;
      }
    }
    
    return masked;
  }
  
  return data;
};

module.exports = {
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateToken,
  generateSessionToken,
  maskSensitiveData,
};
