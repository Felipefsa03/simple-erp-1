// ============================================
// LuminaFlow - Módulo de Alertas de Segurança
// Detecção e notificação de eventos de segurança
// ============================================

import pino from 'pino';

const ALERT_LOG_FILE = process.env.ALERT_LOG_FILE || './security-alerts.json';

const alertLogger = pino({ level: 'warn' });

const ALERT_THRESHOLDS = {
  failedLoginAttempts: 5,
  rateLimitExceeded: 10,
  sensitiveDataAccess: 3,
  unauthorizedAccess: 1,
  dataExfiltration: 100,
};

const activeAlerts = new Map();

const shouldThrottle = (alertKey, thresholdMinutes = 15) => {
  const lastAlert = activeAlerts.get(alertKey);
  if (lastAlert) {
    const timeSinceLastAlert = Date.now() - lastAlert;
    if (timeSinceLastAlert < thresholdMinutes * 60 * 1000) {
      return true;
    }
  }
  activeAlerts.set(alertKey, Date.now());
  return false;
};

const logSecurityAlert = async (alertType, details, severity = 'medium') => {
  const alertEntry = {
    timestamp: new Date().toISOString(),
    alertType,
    severity,
    ...details,
    environment: process.env.NODE_ENV || 'development',
  };

  alertLogger.warn(alertEntry);

  try {
    const fs = await import('fs');
    
    let existingAlerts = [];
    try {
      if (fs.existsSync(ALERT_LOG_FILE)) {
        const content = fs.readFileSync(ALERT_LOG_FILE, 'utf8');
        existingAlerts = JSON.parse(content);
      }
    } catch (_e) {
      existingAlerts = [];
    }

    existingAlerts.push(alertEntry);

    const maxAlerts = 1000;
    if (existingAlerts.length > maxAlerts) {
      existingAlerts = existingAlerts.slice(-maxAlerts);
    }

    fs.writeFileSync(ALERT_LOG_FILE, JSON.stringify(existingAlerts, null, 2));
  } catch (error) {
    console.error('[SECURITY ALERT] Failed to write alert:', error.message);
  }

  return alertEntry;
};

export const securityAlerts = {
  failedLogin: (email, ip, attempts) => {
    const alertKey = `failed_login_${email}_${ip}`;
    if (attempts >= ALERT_THRESHOLDS.failedLoginAttempts && !shouldThrottle(alertKey)) {
      return logSecurityAlert('FAILED_LOGIN_THRESHOLD', {
        email: email?.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
        ip: ip?.substring(0, 8) + '...',
        attempts,
        message: `Múltiplas tentativas de login falhas para ${email}`,
      }, 'high');
    }
    return null;
  },

  rateLimitExceeded: (ip, endpoint, count) => {
    const alertKey = `rate_limit_${ip}_${endpoint}`;
    if (count >= ALERT_THRESHOLDS.rateLimitExceeded && !shouldThrottle(alertKey)) {
      return logSecurityAlert('RATE_LIMIT_EXCEEDED', {
        ip: ip?.substring(0, 8) + '...',
        endpoint,
        count,
        message: `Limite de requisições excedido para ${endpoint}`,
      }, 'medium');
    }
    return null;
  },

  unauthorizedAccess: (userId, resource, ip) => {
    const alertKey = `unauthorized_${userId}_${resource}`;
    if (!shouldThrottle(alertKey, 60)) {
      return logSecurityAlert('UNAUTHORIZED_ACCESS', {
        userId,
        resource,
        ip: ip?.substring(0, 8) + '...',
        message: `Acesso não autorizado a ${resource}`,
      }, 'high');
    }
    return null;
  },

  sensitiveDataAccess: (userId, dataType, patientId, count) => {
    const alertKey = `sensitive_data_${userId}_${patientId}`;
    if (count >= ALERT_THRESHOLDS.sensitiveDataAccess && !shouldThrottle(alertKey)) {
      return logSecurityAlert('SENSITIVE_DATA_ACCESS', {
        userId,
        dataType,
        patientId,
        accessCount: count,
        message: `Acesso excessivo a dados sensíveis: ${dataType}`,
      }, 'high');
    }
    return null;
  },

  dataExfiltration: (userId, recordsAccessed) => {
    const alertKey = `data_exfiltration_${userId}`;
    if (recordsAccessed >= ALERT_THRESHOLDS.dataExfiltration && !shouldThrottle(alertKey)) {
      return logSecurityAlert('DATA_EXFILTRATION', {
        userId,
        recordsAccessed,
        message: `Possível exfiltração de dados: ${recordsAccessed} registros`,
      }, 'critical');
    }
    return null;
  },

  suspiciousActivity: (userId, activity, details) => {
    const alertKey = `suspicious_${userId}_${activity}`;
    if (!shouldThrottle(alertKey, 30)) {
      return logSecurityAlert('SUSPICIOUS_ACTIVITY', {
        userId,
        activity,
        ...details,
        message: `Atividade suspeita detectada: ${activity}`,
      }, 'medium');
    }
    return null;
  },

  credentialChange: (userId, changeType, ip) => {
    const alertKey = `credential_change_${userId}`;
    if (!shouldThrottle(alertKey, 60)) {
      return logSecurityAlert('CREDENTIAL_CHANGE', {
        userId,
        changeType,
        ip: ip?.substring(0, 8) + '...',
        message: `Alteração de credenciais: ${changeType}`,
      }, 'medium');
    }
    return null;
  },

  adminAction: (userId, action, targetUser) => {
    const alertKey = `admin_action_${userId}_${action}`;
    if (!shouldThrottle(alertKey, 60)) {
      return logSecurityAlert('ADMIN_ACTION', {
        userId,
        action,
        targetUser,
        message: `Ação administrativa: ${action}`,
      }, 'low');
    }
    return null;
  },
};

export const getActiveAlerts = () => {
  return Array.from(activeAlerts.entries()).map(([key, timestamp]) => ({
    alertKey: key,
    lastTriggered: new Date(timestamp).toISOString(),
  }));
};

export const clearAlertHistory = () => {
  activeAlerts.clear();
};

export default securityAlerts;