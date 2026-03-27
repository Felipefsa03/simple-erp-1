import { describe, it, expect, beforeEach } from 'vitest';

// Mock do Zustand store para testes
interface ClinicStore {
  insurances: Array<{ id: string; name: string; code: string; isActive: boolean }>;
  branches: Array<{ id: string; name: string; address: string; isActive: boolean }>;
  whatsappIntegrations: Record<string, { connected: boolean; token: string }>;
  addInsurance: (data: any) => void;
  updateInsurance: (id: string, data: any) => void;
  deleteInsurance: (id: string) => void;
  addBranch: (data: any) => void;
  updateBranch: (id: string, data: any) => void;
  deleteBranch: (id: string) => void;
}

function createMockStore(): ClinicStore {
  let insurances: any[] = [];
  let branches: any[] = [];
  let whatsappIntegrations: Record<string, any> = {};

  return {
    get insurances() { return insurances; },
    get branches() { return branches; },
    get whatsappIntegrations() { return whatsappIntegrations; },
    addInsurance(data) {
      insurances.push({ ...data, id: `ins-${Date.now()}` });
    },
    updateInsurance(id, data) {
      insurances = insurances.map(i => i.id === id ? { ...i, ...data } : i);
    },
    deleteInsurance(id) {
      insurances = insurances.filter(i => i.id !== id);
    },
    addBranch(data) {
      branches.push({ ...data, id: `br-${Date.now()}` });
    },
    updateBranch(id, data) {
      branches = branches.map(b => b.id === id ? { ...b, ...data } : b);
    },
    deleteBranch(id) {
      branches = branches.filter(b => b.id !== id);
    },
  };
}

describe('Store de Clínica - Integrações Multi-tenant', () => {
  let store: ClinicStore;

  beforeEach(() => {
    store = createMockStore();
  });

  describe('Convênios (Insurance)', () => {
    it('deve adicionar um novo convênio', () => {
      store.addInsurance({ name: 'Unimed', code: 'UNI', isActive: true });
      expect(store.insurances).toHaveLength(1);
      expect(store.insurances[0].name).toBe('Unimed');
    });

    it('deve atualizar um convênio existente', () => {
      store.addInsurance({ name: 'Unimed', code: 'UNI', isActive: true });
      const id = store.insurances[0].id;
      store.updateInsurance(id, { name: 'Unimed Plus' });
      expect(store.insurances[0].name).toBe('Unimed Plus');
    });

    it('deve deletar um convênio', () => {
      store.addInsurance({ name: 'Unimed', code: 'UNI', isActive: true });
      const id = store.insurances[0].id;
      store.deleteInsurance(id);
      expect(store.insurances).toHaveLength(0);
    });

    it('deve manter convênios isolados', () => {
      store.addInsurance({ name: 'Unimed', code: 'UNI', isActive: true });
      store.addInsurance({ name: 'Bradesco', code: 'BRA', isActive: true });
      expect(store.insurances).toHaveLength(2);
      expect(store.insurances[0].name).not.toBe(store.insurances[1].name);
    });
  });

  describe('Filiais (Branch)', () => {
    it('deve adicionar uma nova filial', () => {
      store.addBranch({ name: 'Filial Centro', address: 'Rua A, 100', isActive: true });
      expect(store.branches).toHaveLength(1);
      expect(store.branches[0].name).toBe('Filial Centro');
    });

    it('deve atualizar uma filial existente', () => {
      store.addBranch({ name: 'Filial Centro', address: 'Rua A, 100', isActive: true });
      const id = store.branches[0].id;
      store.updateBranch(id, { name: 'Filial Centro Atualizada' });
      expect(store.branches[0].name).toBe('Filial Centro Atualizada');
    });

    it('deve deletar uma filial', () => {
      store.addBranch({ name: 'Filial Centro', address: 'Rua A, 100', isActive: true });
      const id = store.branches[0].id;
      store.deleteBranch(id);
      expect(store.branches).toHaveLength(0);
    });
  });
});
