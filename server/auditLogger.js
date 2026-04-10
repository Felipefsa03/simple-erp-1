// ============================================
// LuminaFlow ERP - Módulo de Auditoria LGPD
// Logging de segurança e conformidade LGPD
// ============================================

import pino from 'pino';

const AUDIT_LOG_FILE = process.env.AUDIT_LOG_FILE || './audit-logs.json';

const auditLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino/file',
    options: { destination: 1 }
  } : undefined,
});

const SENSITIVE_FIELDS = [
  'password', 'token', 'secret', 'access_token', 'refresh_token',
  'cpf', 'rg', 'credit_card', 'cvv', 'api_key', 'private_key'
];

const maskSensitiveData = (data) => {
  if (!data) return data;
  
  if (typeof data === 'string') {
    const lowerData = data.toLowerCase();
    for (const field of SENSITIVE_FIELDS) {
      if (lowerData.includes(field)) {
        return '***REDACTED***';
      }
    }
    return data;
  }
  
  if (typeof data === 'object') {
    const masked = {};
    for (const [key, value] of Object.entries(data)) {
      const isSensitive = SENSITIVE_FIELDS.some(field => 
        key.toLowerCase().includes(field)
      );
      masked[key] = isSensitive ? '***REDACTED***' : maskSensitiveData(value);
    }
    return masked;
  }
  
  return data;
};

const logAuditEvent = async (eventType, details) => {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    ...maskSensitiveData(details),
    environment: process.env.NODE_ENV || 'development',
  };
  
  try {
    const fs = await import('fs');
    
    let existingLogs = [];
    try {
      if (fs.existsSync(AUDIT_LOG_FILE)) {
        const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf8');
        existingLogs = JSON.parse(content);
      }
    } catch (_e) {
      existingLogs = [];
    }
    
    existingLogs.push(auditEntry);
    
    const maxLogs = 10000;
    if (existingLogs.length > maxLogs) {
      existingLogs = existingLogs.slice(-maxLogs);
    }
    
    fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(existingLogs, null, 2));
  } catch (error) {
    console.error('[AUDIT] Failed to write audit log:', error.message);
  }
  
  auditLogger.info(auditEntry);
};

export const auditLog = {
  login: (userId, email, success, ip) => 
    logAuditEvent('LOGIN_ATTEMPT', { userId, email: email?.replace(/(.{2})(.*)(@.*)/, '$1***$3'), success, ip }),
  
  logout: (userId) => 
    logAuditEvent('LOGOUT', { userId }),
  
  dataAccess: (userId, resource, resourceId, action) => 
    logAuditEvent('DATA_ACCESS', { userId, resource, resourceId, action }),
  
  dataModification: (userId, resource, resourceId, oldValue, newValue) => 
    logAuditEvent('DATA_MODIFICATION', { userId, resource, resourceId, action: 'UPDATE' }),
  
  dataCreation: (userId, resource, resourceId) => 
    logAuditEvent('DATA_CREATION', { userId, resource, resourceId }),
  
  dataDeletion: (userId, resource, resourceId) => 
    logAuditEvent('DATA_DELETION', { userId, resource, resourceId }),
  
  authorizationFailure: (userId, resource, reason) => 
    logAuditEvent('AUTHORIZATION_FAILURE', { userId, resource, reason }),
  
  sensitiveDataAccess: (userId, dataType, patientId) => 
    logAuditEvent('SENSITIVE_DATA_ACCESS', { userId, dataType, patientId }),
  
  apiKeyUsage: (keyId, endpoint, method) => 
    logAuditEvent('API_KEY_USAGE', { keyId: keyId?.substring(0, 8) + '...', endpoint, method }),
  
  securityEvent: (event, details) => 
    logAuditEvent('SECURITY_EVENT', { event, ...details }),
  
  rateLimitExceeded: (ip, endpoint, count) => 
    logAuditEvent('RATE_LIMIT_EXCEEDED', { ip: ip?.substring(0, 8) + '...', endpoint, count }),
  
  paymentProcessed: (userId, amount, method, status) => 
    logAuditEvent('PAYMENT_PROCESSED', { userId, amount, method, status }),
  
  personalDataExport: (userId, requesterId, scope) => 
    logAuditEvent('PERSONAL_DATA_EXPORT', { userId, requesterId, scope }),
  
  consentUpdate: (userId, consentType, granted) => 
    logAuditEvent('CONSENT_UPDATE', { userId, consentType, granted }),
};

export default auditLogger;