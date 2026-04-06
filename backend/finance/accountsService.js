import crypto from 'node:crypto';

export const AccountTypes = {
  RECEIVABLE: 'receivable',
  PAYABLE: 'payable',
};

export const AccountStatus = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
};

const accounts = [];

const makeId = () => `account-${crypto.randomUUID()}`;

const toCurrency = (value) => Number(Number(value || 0).toFixed(2));

const getAccountById = (accountId) => {
  const account = accounts.find((item) => item.id === accountId);
  if (!account) {
    throw new Error('Conta nao encontrada.');
  }
  return account;
};

export function createAccount(payload) {
  const value = toCurrency(payload.value);
  const account = {
    id: makeId(),
    type: payload.type || AccountTypes.RECEIVABLE,
    clinicId: payload.clinicId,
    patientId: payload.patientId || null,
    providerId: payload.providerId || null,
    description: payload.description || '',
    category: payload.category || 'general',
    dueDate: payload.dueDate || null,
    value,
    remainingValue: value,
    status: AccountStatus.PENDING,
    payments: [],
    createdAt: new Date().toISOString(),
  };

  accounts.push(account);
  return account;
}

const applyPayment = (accountId, payment) => {
  const account = getAccountById(accountId);
  const paymentValue = toCurrency(payment.value);
  const nextRemaining = toCurrency(Math.max(account.remainingValue - paymentValue, 0));

  account.remainingValue = nextRemaining;
  account.payments.push({
    id: `payment-${crypto.randomUUID()}`,
    value: paymentValue,
    method: payment.method || 'unknown',
    paidAt: payment.paidAt || new Date().toISOString(),
  });

  if (account.remainingValue <= 0) {
    account.status = AccountStatus.PAID;
  } else {
    account.status = AccountStatus.PARTIAL;
  }

  account.updatedAt = new Date().toISOString();
  return account;
};

export function receivePayment(accountId, payment) {
  const account = getAccountById(accountId);
  if (account.type !== AccountTypes.RECEIVABLE) {
    throw new Error('Somente contas a receber aceitam receivePayment.');
  }
  return applyPayment(accountId, payment);
}

export function makePayment(accountId, payment) {
  const account = getAccountById(accountId);
  if (account.type !== AccountTypes.PAYABLE) {
    throw new Error('Somente contas a pagar aceitam makePayment.');
  }
  return applyPayment(accountId, payment);
}

export function getAccountSummary(clinicId) {
  const clinicAccounts = accounts.filter((item) => item.clinicId === clinicId);
  const receivables = clinicAccounts.filter((item) => item.type === AccountTypes.RECEIVABLE);
  const payables = clinicAccounts.filter((item) => item.type === AccountTypes.PAYABLE);

  const sum = (collection, field) =>
    toCurrency(collection.reduce((acc, item) => acc + Number(item[field] || 0), 0));

  return {
    clinicId,
    receivables: {
      total: sum(receivables, 'remainingValue'),
      gross: sum(receivables, 'value'),
      count: receivables.length,
    },
    payables: {
      total: sum(payables, 'remainingValue'),
      gross: sum(payables, 'value'),
      count: payables.length,
    },
  };
}

