// ============================================
// LuminaFlow - Testes - Módulos Financeiros e Médicos
// ============================================

import { generateDRE, getDREComparison } from '../backend/finance/dreService.js';
import { 
  createCommissionRule, 
  calculateCommission, 
  generateCommissionEntry,
  getProfessionalCommissions,
  CommissionTypes
} from '../backend/finance/commissionService.js';
import { 
  createAccount, 
  receivePayment, 
  makePayment,
  getAccountSummary,
  AccountTypes,
  AccountStatus
} from '../backend/finance/accountsService.js';
import { 
  createCashFlowEntry, 
  getDailyCashFlow, 
  getCashFlowSummary,
  getCurrentBalance,
  CashFlowType,
  CashFlowCategory
} from '../backend/finance/cashFlowService.js';
import { 
  createTreatmentPlan, 
  addProcedureToPlan, 
  approveTreatmentPlan,
  getTreatmentPlanSummary,
  PlanStatus
} from '../backend/medical/treatmentPlanService.js';
import { 
  createContract, 
  signContract, 
  activateContract,
  getContractStats,
  ContractType,
  ContractStatus
} from '../backend/medical/contractService.js';
import { 
  createInsurance, 
  createPlan, 
  createAuthorization,
  approveAuthorization,
  getAuthorizationStats,
  AuthorizationStatus
} from '../backend/medical/insuranceService.js';
import { 
  createBranch, 
  activateBranch, 
  getMultiBranchStats,
  BranchStatus
} from '../backend/medical/branchService.js';

describe('DRE Service', () => {
  test('should generate DRE report', () => {
    const dre = generateDRE('clinic-1', '2026-01-01', '2026-01-31');
    
    expect(dre).toHaveProperty('revenue');
    expect(dre).toHaveProperty('cogs');
    expect(dre).toHaveProperty('grossProfit');
    expect(dre).toHaveProperty('operatingExpenses');
    expect(dre).toHaveProperty('netProfit');
    expect(dre.revenue.total).toBeGreaterThan(0);
    expect(dre.netProfit.margin).toBeDefined();
  });

  test('should calculate profit margins correctly', () => {
    const dre = generateDRE('clinic-1', '2026-01-01', '2026-01-31');
    
    expect(dre.grossProfit.margin).toBeGreaterThan(0);
    expect(dre.operatingProfit.margin).toBeGreaterThan(-100);
    expect(dre.netProfit.margin).toBeGreaterThan(-100);
  });
});

describe('Commission Service', () => {
  test('should create commission rule', () => {
    const rule = createCommissionRule({
      name: 'Dentista padrão',
      type: CommissionTypes.PERCENTAGE,
      professionalId: 'dr-1',
      percentage: 30
    });
    
    expect(rule.id).toBeDefined();
    expect(rule.percentage).toBe(30);
    expect(rule.active).toBe(true);
  });

  test('should calculate commission correctly', () => {
    createCommissionRule({
      name: 'Dentista',
      type: CommissionTypes.PERCENTAGE,
      percentage: 30
    });
    
    const commission = calculateCommission('dr-1', 'proc-1', 'cat-1', 1000, 'clinic-1');
    
    expect(commission.grossValue).toBe(1000);
    expect(commission.commission).toBe(300);
    expect(commission.percentage).toBe(30);
  });

  test('should generate commission entry', () => {
    const entry = generateCommissionEntry({
      clinicId: 'clinic-1',
      professionalId: 'dr-1',
      patientId: 'patient-1',
      procedureId: 'proc-1',
      procedureName: 'Limpeza',
      categoryId: 'cat-1',
      value: 500
    });
    
    expect(entry.id).toBeDefined();
    expect(entry.commissionValue).toBeGreaterThan(0);
    expect(entry.status).toBeDefined();
  });
});

describe('Accounts Service', () => {
  test('should create receivable account', () => {
    const account = createAccount({
      type: AccountTypes.RECEIVABLE,
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      description: 'Consulta',
      value: 200,
      dueDate: '2026-04-30',
      category: 'consultation'
    });
    
    expect(account.id).toBeDefined();
    expect(account.type).toBe(AccountTypes.RECEIVABLE);
    expect(account.status).toBe(AccountStatus.PENDING);
    expect(account.remainingValue).toBe(200);
  });

  test('should receive payment', () => {
    const account = createAccount({
      type: AccountTypes.RECEIVABLE,
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      value: 200,
      dueDate: '2026-04-30'
    });
    
    const paid = receivePayment(account.id, {
      value: 100,
      method: 'pix'
    });
    
    expect(paid.remainingValue).toBe(100);
    expect(paid.status).toBe(AccountStatus.PARTIAL);
  });

  test('should get account summary', () => {
    createAccount({
      type: AccountTypes.RECEIVABLE,
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      value: 100,
      dueDate: '2026-03-01'
    });
    
    createAccount({
      type: AccountTypes.PAYABLE,
      clinicId: 'clinic-1',
      providerId: 'provider-1',
      value: 50,
      dueDate: '2026-03-15'
    });
    
    const summary = getAccountSummary('clinic-1');
    
    expect(summary.receivables.total).toBeGreaterThan(0);
    expect(summary.payables.total).toBeGreaterThan(0);
  });
});

describe('Cash Flow Service', () => {
  test('should create cash flow entry', () => {
    const entry = createCashFlowEntry({
      clinicId: 'clinic-1',
      type: CashFlowType.INFLOW,
      category: CashFlowCategory.CONSULTATION,
      amount: 300,
      date: '2026-03-24',
      paymentMethod: 'pix'
    });
    
    expect(entry.id).toBeDefined();
    expect(entry.amount).toBe(300);
  });

  test('should calculate current balance', () => {
    createCashFlowEntry({
      clinicId: 'clinic-2',
      type: CashFlowType.INFLOW,
      category: CashFlowCategory.CONSULTATION,
      amount: 1000,
      date: '2026-03-24'
    });
    
    createCashFlowEntry({
      clinicId: 'clinic-2',
      type: CashFlowType.OUTFLOW,
      category: CashFlowCategory.SALARY,
      amount: 400,
      date: '2026-03-24'
    });
    
    const balance = getCurrentBalance('clinic-2');
    expect(balance).toBe(600);
  });

  test('should get daily cash flow', () => {
    createCashFlowEntry({
      clinicId: 'clinic-3',
      type: CashFlowType.INFLOW,
      category: CashFlowCategory.PROCEDURE,
      amount: 500,
      date: '2026-03-24'
    });
    
    const daily = getDailyCashFlow('clinic-3', '2026-03-24');
    
    expect(daily.date).toBe('2026-03-24');
    expect(daily.inflow.total).toBe(500);
  });
});

describe('Treatment Plan Service', () => {
  test('should create treatment plan', () => {
    const plan = createTreatmentPlan({
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      professionalId: 'dr-1',
      name: 'Tratamento Odontológico',
      diagnosis: 'Cárie'
    });
    
    expect(plan.id).toBeDefined();
    expect(plan.status).toBe(PlanStatus.DRAFT);
    expect(plan.totalValue).toBe(0);
  });

  test('should add procedure to plan', () => {
    const plan = createTreatmentPlan({
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      professionalId: 'dr-1',
      name: 'Tratamento'
    });
    
    const procedure = addProcedureToPlan(plan.id, {
      name: 'Restauração',
      category: 'odontologia',
      value: 300,
      quantity: 2
    });
    
    expect(procedure.id).toBeDefined();
    expect(procedure.totalValue).toBe(600);
    
    const updated = getTreatmentPlanSummary(plan.id);
    expect(updated.procedures.total).toBe(1);
    expect(updated.financials.total).toBe(600);
  });
});

describe('Contract Service', () => {
  test('should create contract', () => {
    const contract = createContract({
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      type: ContractType.TREATMENT,
      title: 'Contrato de Tratamento',
      patientName: 'João Silva',
      value: 5000,
      startDate: '2026-03-01',
      endDate: '2026-12-31'
    });
    
    expect(contract.id).toBeDefined();
    expect(contract.status).toBe(ContractStatus.DRAFT);
  });

  test('should sign and activate contract', () => {
    const contract = createContract({
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      type: ContractType.TREATMENT,
      title: 'Contrato',
      patientName: 'João',
      value: 1000,
      startDate: '2099-01-01'
    });
    
    const signed = signContract(contract.id, {
      name: 'João',
      role: 'patient',
      email: 'joao@example.com'
    });
    
    expect(signed.status).toBe(ContractStatus.SIGNED);
    expect(signed.signatures.length).toBe(1);
  });

  test('should get contract stats', () => {
    createContract({
      clinicId: 'clinic-2',
      patientId: 'patient-1',
      type: ContractType.TREATMENT,
      title: 'Contrato 1',
      patientName: 'Paciente',
      value: 1000,
      startDate: '2026-01-01'
    });
    
    const stats = getContractStats('clinic-2');
    expect(stats.total).toBeGreaterThan(0);
  });
});

describe('Insurance Service', () => {
  test('should create insurance', () => {
    const insurance = createInsurance({
      clinicId: 'clinic-1',
      name: 'Unimed',
      code: '001',
      ansCode: '123456'
    });
    
    expect(insurance.id).toBeDefined();
    expect(insurance.name).toBe('Unimed');
    expect(insurance.active).toBe(true);
  });

  test('should create authorization', () => {
    const insurance = createInsurance({
      clinicId: 'clinic-1',
      name: 'Bradesco',
      code: '002'
    });
    
    const auth = createAuthorization({
      clinicId: 'clinic-1',
      insuranceId: insurance.id,
      planId: 'plan-1',
      patientName: 'Maria',
      patientCpf: '12345678900',
      patientCard: '12345678',
      procedure: 'Consulta',
      procedureCode: '10101012'
    });
    
    expect(auth.id).toBeDefined();
    expect(auth.status).toBe(AuthorizationStatus.PENDING);
  });

  test('should approve authorization', () => {
    const insurance = createInsurance({
      clinicId: 'clinic-1',
      name: 'Amil',
      code: '003'
    });
    
    const auth = createAuthorization({
      clinicId: 'clinic-1',
      insuranceId: insurance.id,
      patientName: 'Carlos',
      patientCpf: '98765432100',
      procedure: 'Tratamento'
    });
    
    const approved = approveAuthorization(auth.id, {
      authorizationNumber: 'AUTH123456',
      expirationDate: '2026-12-31'
    });
    
    expect(approved.status).toBe(AuthorizationStatus.APPROVED);
    expect(approved.authorizationNumber).toBe('AUTH123456');
  });
});

describe('Branch Service', () => {
  test('should create branch', () => {
    const branch = createBranch({
      parentClinicId: 'main-clinic',
      name: 'Filial Centro',
      fantasyName: 'LuminaFlow Centro',
      cnpj: '12345678000100'
    });
    
    expect(branch.id).toBeDefined();
    expect(branch.status).toBe(BranchStatus.PENDING);
  });

  test('should activate branch', () => {
    const branch = createBranch({
      parentClinicId: 'main-clinic',
      name: 'Filial Sul',
      cnpj: '12345678000200'
    });
    
    const activated = activateBranch(branch.id);
    expect(activated.status).toBe(BranchStatus.ACTIVE);
  });

  test('should get branch stats', () => {
    createBranch({
      parentClinicId: 'clinic-abc',
      name: 'Filial 1',
      cnpj: '11111111000100'
    });
    
    createBranch({
      parentClinicId: 'clinic-abc',
      name: 'Filial 2',
      cnpj: '22222222000200'
    });
    
    const stats = getMultiBranchStats('clinic-abc');
    expect(stats.total).toBe(2);
    expect(stats.active).toBe(0);
    expect(stats.pending).toBe(2);
  });
});
