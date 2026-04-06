import crypto from 'node:crypto';

export const CashFlowType = {
  INFLOW: 'inflow',
  OUTFLOW: 'outflow',
};

export const CashFlowCategory = {
  CONSULTATION: 'consultation',
  PROCEDURE: 'procedure',
  SALARY: 'salary',
  RENT: 'rent',
  OTHER: 'other',
};

const cashFlowEntries = [];

const toCurrency = (value) => Number(Number(value || 0).toFixed(2));

const getEntries = (clinicId) => cashFlowEntries.filter((item) => item.clinicId === clinicId);

export function createCashFlowEntry(payload) {
  const entry = {
    id: `cashflow-${crypto.randomUUID()}`,
    clinicId: payload.clinicId,
    type: payload.type || CashFlowType.INFLOW,
    category: payload.category || CashFlowCategory.OTHER,
    amount: toCurrency(payload.amount),
    date: payload.date || new Date().toISOString().slice(0, 10),
    paymentMethod: payload.paymentMethod || 'not_informed',
    description: payload.description || '',
    createdAt: new Date().toISOString(),
  };

  cashFlowEntries.push(entry);
  return entry;
}

export function getCurrentBalance(clinicId) {
  const entries = getEntries(clinicId);
  const inflow = entries
    .filter((item) => item.type === CashFlowType.INFLOW)
    .reduce((acc, item) => acc + item.amount, 0);
  const outflow = entries
    .filter((item) => item.type === CashFlowType.OUTFLOW)
    .reduce((acc, item) => acc + item.amount, 0);

  return toCurrency(inflow - outflow);
}

export function getDailyCashFlow(clinicId, date) {
  const entries = getEntries(clinicId).filter((item) => item.date === date);
  const inflowEntries = entries.filter((item) => item.type === CashFlowType.INFLOW);
  const outflowEntries = entries.filter((item) => item.type === CashFlowType.OUTFLOW);

  const inflowTotal = toCurrency(inflowEntries.reduce((acc, item) => acc + item.amount, 0));
  const outflowTotal = toCurrency(outflowEntries.reduce((acc, item) => acc + item.amount, 0));

  return {
    date,
    inflow: {
      total: inflowTotal,
      count: inflowEntries.length,
      entries: inflowEntries,
    },
    outflow: {
      total: outflowTotal,
      count: outflowEntries.length,
      entries: outflowEntries,
    },
    net: toCurrency(inflowTotal - outflowTotal),
  };
}

export function getCashFlowSummary(clinicId, startDate, endDate) {
  const entries = getEntries(clinicId).filter((item) => {
    if (!startDate && !endDate) return true;
    if (startDate && item.date < startDate) return false;
    if (endDate && item.date > endDate) return false;
    return true;
  });

  const inflow = entries
    .filter((item) => item.type === CashFlowType.INFLOW)
    .reduce((acc, item) => acc + item.amount, 0);
  const outflow = entries
    .filter((item) => item.type === CashFlowType.OUTFLOW)
    .reduce((acc, item) => acc + item.amount, 0);

  return {
    clinicId,
    period: { startDate: startDate || null, endDate: endDate || null },
    totals: {
      inflow: toCurrency(inflow),
      outflow: toCurrency(outflow),
      net: toCurrency(inflow - outflow),
    },
    count: entries.length,
  };
}

