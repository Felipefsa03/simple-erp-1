import crypto from 'node:crypto';

export const AuthorizationStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const insurances = [];
const plans = [];
const authorizations = [];

const findAuthorization = (authorizationId) => {
  const authorization = authorizations.find((item) => item.id === authorizationId);
  if (!authorization) throw new Error('Autorizacao nao encontrada.');
  return authorization;
};

export function createInsurance(payload) {
  const insurance = {
    id: `insurance-${crypto.randomUUID()}`,
    clinicId: payload.clinicId,
    name: payload.name || '',
    code: payload.code || '',
    ansCode: payload.ansCode || '',
    active: payload.active ?? true,
    createdAt: new Date().toISOString(),
  };
  insurances.push(insurance);
  return insurance;
}

export function createPlan(payload) {
  const plan = {
    id: `insurance-plan-${crypto.randomUUID()}`,
    clinicId: payload.clinicId,
    insuranceId: payload.insuranceId,
    name: payload.name || 'Plano',
    code: payload.code || '',
    active: payload.active ?? true,
    createdAt: new Date().toISOString(),
  };
  plans.push(plan);
  return plan;
}

export function createAuthorization(payload) {
  const authorization = {
    id: `authorization-${crypto.randomUUID()}`,
    clinicId: payload.clinicId,
    insuranceId: payload.insuranceId,
    planId: payload.planId || null,
    patientName: payload.patientName || '',
    patientCpf: payload.patientCpf || '',
    patientCard: payload.patientCard || '',
    procedure: payload.procedure || '',
    procedureCode: payload.procedureCode || '',
    status: AuthorizationStatus.PENDING,
    createdAt: new Date().toISOString(),
  };
  authorizations.push(authorization);
  return authorization;
}

export function approveAuthorization(authorizationId, payload) {
  const authorization = findAuthorization(authorizationId);
  authorization.status = AuthorizationStatus.APPROVED;
  authorization.authorizationNumber = payload.authorizationNumber || '';
  authorization.expirationDate = payload.expirationDate || null;
  authorization.updatedAt = new Date().toISOString();
  return authorization;
}

export function getAuthorizationStats(clinicId) {
  const filtered = authorizations.filter((item) => item.clinicId === clinicId);
  return {
    total: filtered.length,
    pending: filtered.filter((item) => item.status === AuthorizationStatus.PENDING).length,
    approved: filtered.filter((item) => item.status === AuthorizationStatus.APPROVED).length,
    rejected: filtered.filter((item) => item.status === AuthorizationStatus.REJECTED).length,
  };
}

