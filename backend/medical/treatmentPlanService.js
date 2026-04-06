import crypto from 'node:crypto';

export const PlanStatus = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const treatmentPlans = [];

const toCurrency = (value) => Number(Number(value || 0).toFixed(2));

const getPlan = (planId) => {
  const plan = treatmentPlans.find((item) => item.id === planId);
  if (!plan) throw new Error('Plano nao encontrado.');
  return plan;
};

export function createTreatmentPlan(payload) {
  const plan = {
    id: `plan-${crypto.randomUUID()}`,
    clinicId: payload.clinicId,
    patientId: payload.patientId,
    professionalId: payload.professionalId,
    name: payload.name || 'Plano de tratamento',
    diagnosis: payload.diagnosis || '',
    status: PlanStatus.DRAFT,
    procedures: [],
    totalValue: 0,
    createdAt: new Date().toISOString(),
  };

  treatmentPlans.push(plan);
  return plan;
}

export function addProcedureToPlan(planId, procedureInput) {
  const plan = getPlan(planId);
  const quantity = Number(procedureInput.quantity || 1);
  const unitValue = toCurrency(procedureInput.value || 0);
  const procedure = {
    id: `procedure-${crypto.randomUUID()}`,
    name: procedureInput.name || 'Procedimento',
    category: procedureInput.category || 'general',
    quantity,
    value: unitValue,
    totalValue: toCurrency(unitValue * quantity),
    createdAt: new Date().toISOString(),
  };

  plan.procedures.push(procedure);
  plan.totalValue = toCurrency(plan.procedures.reduce((acc, item) => acc + item.totalValue, 0));
  plan.updatedAt = new Date().toISOString();
  return procedure;
}

export function approveTreatmentPlan(planId) {
  const plan = getPlan(planId);
  plan.status = PlanStatus.APPROVED;
  plan.approvedAt = new Date().toISOString();
  return plan;
}

export function getTreatmentPlanSummary(planId) {
  const plan = getPlan(planId);
  return {
    id: plan.id,
    status: plan.status,
    procedures: {
      total: plan.procedures.length,
      items: plan.procedures,
    },
    financials: {
      total: plan.totalValue,
    },
  };
}

