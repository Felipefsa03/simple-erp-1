import crypto from 'node:crypto';

export const CommissionTypes = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
};

const commissionRules = [];
const commissionEntries = [];

const makeId = (prefix) => `${prefix}-${crypto.randomUUID()}`;

const resolveRule = ({ professionalId, categoryId }) => {
  return (
    commissionRules.find(rule => rule.active && rule.professionalId && rule.professionalId === professionalId) ||
    commissionRules.find(rule => rule.active && rule.categoryId && rule.categoryId === categoryId) ||
    commissionRules.find(rule => rule.active) ||
    null
  );
};

export function createCommissionRule(input) {
  const rule = {
    id: makeId('rule'),
    name: input.name || 'Regra padrão',
    type: input.type || CommissionTypes.PERCENTAGE,
    professionalId: input.professionalId || null,
    categoryId: input.categoryId || null,
    percentage: Number(input.percentage || 30),
    fixedValue: Number(input.fixedValue || 0),
    active: input.active ?? true,
    createdAt: new Date().toISOString(),
  };
  commissionRules.push(rule);
  return rule;
}

export function calculateCommission(professionalId, procedureId, categoryId, grossValue, clinicId) {
  const value = Number(grossValue || 0);
  const rule = resolveRule({ professionalId, categoryId });
  const percentage = rule?.type === CommissionTypes.FIXED
    ? 0
    : Number(rule?.percentage ?? 30);
  const commission = rule?.type === CommissionTypes.FIXED
    ? Number(rule.fixedValue || 0)
    : Number(((value * percentage) / 100).toFixed(2));

  return {
    clinicId,
    professionalId,
    procedureId,
    categoryId,
    ruleId: rule?.id || null,
    grossValue: value,
    percentage,
    commission,
    netValue: Number((value - commission).toFixed(2)),
  };
}

export function generateCommissionEntry(payload) {
  const calc = calculateCommission(
    payload.professionalId,
    payload.procedureId,
    payload.categoryId,
    payload.value,
    payload.clinicId,
  );

  const entry = {
    id: makeId('commission'),
    clinicId: payload.clinicId,
    professionalId: payload.professionalId,
    patientId: payload.patientId || null,
    procedureId: payload.procedureId || null,
    procedureName: payload.procedureName || 'Procedimento',
    categoryId: payload.categoryId || null,
    grossValue: calc.grossValue,
    commissionValue: calc.commission,
    percentage: calc.percentage,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  commissionEntries.push(entry);
  return entry;
}

export function getProfessionalCommissions(professionalId, clinicId) {
  return commissionEntries.filter(entry =>
    entry.professionalId === professionalId && (!clinicId || entry.clinicId === clinicId)
  );
}
