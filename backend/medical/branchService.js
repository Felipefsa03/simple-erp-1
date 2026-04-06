import crypto from 'node:crypto';

export const BranchStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

const branches = [];

const getBranch = (branchId) => {
  const branch = branches.find((item) => item.id === branchId);
  if (!branch) throw new Error('Filial nao encontrada.');
  return branch;
};

export function createBranch(payload) {
  const branch = {
    id: `branch-${crypto.randomUUID()}`,
    parentClinicId: payload.parentClinicId,
    name: payload.name || '',
    fantasyName: payload.fantasyName || '',
    cnpj: payload.cnpj || '',
    status: BranchStatus.PENDING,
    createdAt: new Date().toISOString(),
  };

  branches.push(branch);
  return branch;
}

export function activateBranch(branchId) {
  const branch = getBranch(branchId);
  branch.status = BranchStatus.ACTIVE;
  branch.activatedAt = new Date().toISOString();
  return branch;
}

export function getMultiBranchStats(parentClinicId) {
  const filtered = branches.filter((item) => item.parentClinicId === parentClinicId);
  return {
    total: filtered.length,
    active: filtered.filter((item) => item.status === BranchStatus.ACTIVE).length,
    pending: filtered.filter((item) => item.status === BranchStatus.PENDING).length,
    inactive: filtered.filter((item) => item.status === BranchStatus.INACTIVE).length,
  };
}

