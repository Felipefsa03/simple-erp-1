import crypto from 'node:crypto';

export const ContractType = {
  TREATMENT: 'treatment',
  SERVICE: 'service',
};

export const ContractStatus = {
  DRAFT: 'draft',
  SIGNED: 'signed',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

const contracts = [];

const findContract = (contractId) => {
  const contract = contracts.find((item) => item.id === contractId);
  if (!contract) {
    throw new Error('Contrato nao encontrado.');
  }
  return contract;
};

export function createContract(payload) {
  const contract = {
    id: `contract-${crypto.randomUUID()}`,
    clinicId: payload.clinicId,
    patientId: payload.patientId,
    type: payload.type || ContractType.TREATMENT,
    title: payload.title || 'Contrato',
    patientName: payload.patientName || '',
    value: Number(payload.value || 0),
    startDate: payload.startDate || null,
    endDate: payload.endDate || null,
    status: ContractStatus.DRAFT,
    signatures: [],
    createdAt: new Date().toISOString(),
  };

  contracts.push(contract);
  return contract;
}

export function signContract(contractId, signer) {
  const contract = findContract(contractId);
  contract.signatures.push({
    id: `signature-${crypto.randomUUID()}`,
    name: signer.name || '',
    role: signer.role || 'patient',
    email: signer.email || '',
    signedAt: new Date().toISOString(),
  });
  contract.status = ContractStatus.SIGNED;
  contract.updatedAt = new Date().toISOString();
  return contract;
}

export function activateContract(contractId) {
  const contract = findContract(contractId);
  contract.status = ContractStatus.ACTIVE;
  contract.activatedAt = new Date().toISOString();
  return contract;
}

export function getContractStats(clinicId) {
  const filtered = contracts.filter((item) => item.clinicId === clinicId);
  return {
    total: filtered.length,
    draft: filtered.filter((item) => item.status === ContractStatus.DRAFT).length,
    signed: filtered.filter((item) => item.status === ContractStatus.SIGNED).length,
    active: filtered.filter((item) => item.status === ContractStatus.ACTIVE).length,
  };
}

