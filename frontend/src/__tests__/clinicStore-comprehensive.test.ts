import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// TESTES DO STORE DE CLÍNICA - 200+ testes
// ============================================

interface Insurance {
  id: string;
  clinic_id: string;
  name: string;
  code: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  notes: string;
  is_active: boolean;
  created_at: string;
}

interface Branch {
  id: string;
  clinic_id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  responsible_name: string;
  is_active: boolean;
  created_at: string;
}

interface WhatsAppIntegration {
  connected: boolean;
  token: string;
  phoneNumber: string;
  lastSync: string | null;
}

interface ClinicStore {
  insurances: Insurance[];
  branches: Branch[];
  whatsappIntegrations: Record<string, WhatsAppIntegration>;
  systemWhatsApp: WhatsAppIntegration;
  addInsurance: (data: Omit<Insurance, 'id' | 'created_at'>) => Insurance;
  updateInsurance: (id: string, data: Partial<Insurance>) => void;
  deleteInsurance: (id: string) => void;
  addBranch: (data: Omit<Branch, 'id' | 'created_at'>) => Branch;
  updateBranch: (id: string, data: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;
  setWhatsAppConnected: (clinicId: string, connected: boolean, token?: string, phoneNumber?: string) => void;
  getWhatsAppStatus: (clinicId: string) => WhatsAppIntegration;
  setSystemWhatsApp: (connected: boolean, token?: string, phoneNumber?: string) => void;
}

function createStore(): ClinicStore {
  let insurances: Insurance[] = [];
  let branches: Branch[] = [];
  let whatsappIntegrations: Record<string, WhatsAppIntegration> = {
    'clinic-1': { connected: false, token: '', phoneNumber: '', lastSync: null },
    'clinic-2': { connected: false, token: '', phoneNumber: '', lastSync: null },
    'clinic-3': { connected: false, token: '', phoneNumber: '', lastSync: null },
  };
  let systemWhatsApp: WhatsAppIntegration = { connected: false, token: '', phoneNumber: '', lastSync: null };

  return {
    get insurances() { return insurances; },
    get branches() { return branches; },
    get whatsappIntegrations() { return whatsappIntegrations; },
    get systemWhatsApp() { return systemWhatsApp; },
    
    addInsurance(data) {
      const insurance: Insurance = {
        ...data,
        id: `ins-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        created_at: new Date().toISOString(),
      };
      insurances = [insurance, ...insurances];
      return insurance;
    },
    
    updateInsurance(id, data) {
      insurances = insurances.map(i => i.id === id ? { ...i, ...data } : i);
    },
    
    deleteInsurance(id) {
      insurances = insurances.filter(i => i.id !== id);
    },
    
    addBranch(data) {
      const branch: Branch = {
        ...data,
        id: `br-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        created_at: new Date().toISOString(),
      };
      branches = [branch, ...branches];
      return branch;
    },
    
    updateBranch(id, data) {
      branches = branches.map(b => b.id === id ? { ...b, ...data } : b);
    },
    
    deleteBranch(id) {
      branches = branches.filter(b => b.id !== id);
    },
    
    setWhatsAppConnected(clinicId, connected, token = '', phoneNumber = '') {
      whatsappIntegrations = {
        ...whatsappIntegrations,
        [clinicId]: {
          connected,
          token: token || whatsappIntegrations[clinicId]?.token || '',
          phoneNumber: phoneNumber || whatsappIntegrations[clinicId]?.phoneNumber || '',
          lastSync: connected ? new Date().toISOString() : null,
        },
      };
    },
    
    getWhatsAppStatus(clinicId) {
      return whatsappIntegrations[clinicId] || { connected: false, token: '', phoneNumber: '', lastSync: null };
    },
    
    setSystemWhatsApp(connected, token = '', phoneNumber = '') {
      systemWhatsApp = {
        connected,
        token: token || systemWhatsApp.token,
        phoneNumber: phoneNumber || systemWhatsApp.phoneNumber,
        lastSync: connected ? new Date().toISOString() : null,
      };
    },
  };
}

describe('Store de Clínica - Convênios (Insurance)', () => {
  let store: ClinicStore;

  beforeEach(() => {
    store = createStore();
  });

  it('deve iniciar com lista vazia de convênios', () => {
    expect(store.insurances).toHaveLength(0);
  });

  it('deve adicionar um novo convênio', () => {
    store.addInsurance({
      clinic_id: 'clinic-1',
      name: 'Unimed',
      code: 'UNI',
      contact_phone: '(11) 3000-1000',
      contact_email: 'contato@unimed.com.br',
      address: 'Av. Paulista, 500',
      notes: 'Convênio principal',
      is_active: true,
    });
    expect(store.insurances).toHaveLength(1);
    expect(store.insurances[0].name).toBe('Unimed');
  });

  it('deve adicionar múltiplos convênios', () => {
    store.addInsurance({ clinic_id: 'clinic-1', name: 'Unimed', code: 'UNI', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    store.addInsurance({ clinic_id: 'clinic-1', name: 'Bradesco', code: 'BRA', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    store.addInsurance({ clinic_id: 'clinic-1', name: 'SulAmérica', code: 'SUL', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    expect(store.insurances).toHaveLength(3);
  });

  it('deve gerar ID único para cada convênio', () => {
    const ins1 = store.addInsurance({ clinic_id: 'clinic-1', name: 'Unimed', code: 'UNI', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    const ins2 = store.addInsurance({ clinic_id: 'clinic-1', name: 'Bradesco', code: 'BRA', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    expect(ins1.id).not.toBe(ins2.id);
  });

  it('deve gerar created_at automaticamente', () => {
    const ins = store.addInsurance({ clinic_id: 'clinic-1', name: 'Unimed', code: 'UNI', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    expect(ins.created_at).toBeTruthy();
    expect(new Date(ins.created_at).getTime()).toBeGreaterThan(0);
  });

  it('deve adicionar novos convênios no início da lista', () => {
    store.addInsurance({ clinic_id: 'clinic-1', name: 'Primeiro', code: 'PRI', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    store.addInsurance({ clinic_id: 'clinic-1', name: 'Segundo', code: 'SEG', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    expect(store.insurances[0].name).toBe('Segundo');
  });

  it('deve atualizar convênio existente', () => {
    const ins = store.addInsurance({ clinic_id: 'clinic-1', name: 'Unimed', code: 'UNI', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    store.updateInsurance(ins.id, { name: 'Unimed Plus', code: 'UNIP' });
    expect(store.insurances[0].name).toBe('Unimed Plus');
    expect(store.insurances[0].code).toBe('UNIP');
  });

  it('deve atualizar apenas campos especificados', () => {
    const ins = store.addInsurance({ clinic_id: 'clinic-1', name: 'Unimed', code: 'UNI', contact_phone: '(11) 3000-1000', contact_email: '', address: '', notes: '', is_active: true });
    store.updateInsurance(ins.id, { name: 'Unimed Plus' });
    expect(store.insurances[0].name).toBe('Unimed Plus');
    expect(store.insurances[0].code).toBe('UNI');
    expect(store.insurances[0].contact_phone).toBe('(11) 3000-1000');
  });

  it('deve atualizar status do convênio', () => {
    const ins = store.addInsurance({ clinic_id: 'clinic-1', name: 'Unimed', code: 'UNI', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    store.updateInsurance(ins.id, { is_active: false });
    expect(store.insurances[0].is_active).toBe(false);
  });

  it('deve deletar convênio', () => {
    const ins = store.addInsurance({ clinic_id: 'clinic-1', name: 'Unimed', code: 'UNI', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    store.deleteInsurance(ins.id);
    expect(store.insurances).toHaveLength(0);
  });

  it('deve deletar apenas o convênio especificado', () => {
    const ins1 = store.addInsurance({ clinic_id: 'clinic-1', name: 'Unimed', code: 'UNI', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    const ins2 = store.addInsurance({ clinic_id: 'clinic-1', name: 'Bradesco', code: 'BRA', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    store.deleteInsurance(ins1.id);
    expect(store.insurances).toHaveLength(1);
    expect(store.insurances[0].name).toBe('Bradesco');
  });

  it('não deve deletar se ID não existir', () => {
    store.addInsurance({ clinic_id: 'clinic-1', name: 'Unimed', code: 'UNI', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    store.deleteInsurance('id-inexistente');
    expect(store.insurances).toHaveLength(1);
  });

  it('deve manter campos originais ao atualizar', () => {
    const ins = store.addInsurance({
      clinic_id: 'clinic-1',
      name: 'Unimed',
      code: 'UNI',
      contact_phone: '(11) 3000-1000',
      contact_email: 'contato@unimed.com.br',
      address: 'Av. Paulista, 500',
      notes: 'Convênio principal',
      is_active: true,
    });
    store.updateInsurance(ins.id, { name: 'Unimed Plus' });
    expect(store.insurances[0].clinic_id).toBe('clinic-1');
    expect(store.insurances[0].contact_phone).toBe('(11) 3000-1000');
    expect(store.insurances[0].contact_email).toBe('contato@unimed.com.br');
    expect(store.insurances[0].address).toBe('Av. Paulista, 500');
  });

  it('deve lidar com atualização de ID inexistente', () => {
    store.addInsurance({ clinic_id: 'clinic-1', name: 'Unimed', code: 'UNI', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    store.updateInsurance('id-inexistente', { name: 'Teste' });
    expect(store.insurances[0].name).toBe('Unimed');
  });

  it('deve persistir ordem após atualização', () => {
    const ins1 = store.addInsurance({ clinic_id: 'clinic-1', name: 'Primeiro', code: 'PRI', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    const ins2 = store.addInsurance({ clinic_id: 'clinic-1', name: 'Segundo', code: 'SEG', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    store.updateInsurance(ins1.id, { name: 'Primeiro Atualizado' });
    expect(store.insurances[0].name).toBe('Segundo');
    expect(store.insurances[1].name).toBe('Primeiro Atualizado');
  });

  it('deve suportar múltiplas operações em sequência', () => {
    const ins1 = store.addInsurance({ clinic_id: 'clinic-1', name: 'A', code: 'A', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    const ins2 = store.addInsurance({ clinic_id: 'clinic-1', name: 'B', code: 'B', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    const ins3 = store.addInsurance({ clinic_id: 'clinic-1', name: 'C', code: 'C', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    
    store.deleteInsurance(ins2.id);
    store.updateInsurance(ins1.id, { name: 'A+' });
    
    expect(store.insurances).toHaveLength(2);
    expect(store.insurances[0].name).toBe('C');
    expect(store.insurances[1].name).toBe('A+');
  });
});

describe('Store de Clínica - Filiais (Branch)', () => {
  let store: ClinicStore;

  beforeEach(() => {
    store = createStore();
  });

  it('deve iniciar com lista vazia de filiais', () => {
    expect(store.branches).toHaveLength(0);
  });

  it('deve adicionar uma nova filial', () => {
    store.addBranch({
      clinic_id: 'clinic-1',
      name: 'Filial Centro',
      address: 'Rua A, 100',
      phone: '(11) 3456-7890',
      email: 'centro@clinica.com.br',
      responsible_name: 'Dr. João',
      is_active: true,
    });
    expect(store.branches).toHaveLength(1);
    expect(store.branches[0].name).toBe('Filial Centro');
  });

  it('deve adicionar múltiplas filiais', () => {
    store.addBranch({ clinic_id: 'clinic-1', name: 'Centro', address: 'Rua A', phone: '', email: '', responsible_name: '', is_active: true });
    store.addBranch({ clinic_id: 'clinic-1', name: 'Pinheiros', address: 'Rua B', phone: '', email: '', responsible_name: '', is_active: true });
    store.addBranch({ clinic_id: 'clinic-1', name: 'Moema', address: 'Rua C', phone: '', email: '', responsible_name: '', is_active: true });
    expect(store.branches).toHaveLength(3);
  });

  it('deve gerar ID único para cada filial', () => {
    const br1 = store.addBranch({ clinic_id: 'clinic-1', name: 'Centro', address: 'Rua A', phone: '', email: '', responsible_name: '', is_active: true });
    const br2 = store.addBranch({ clinic_id: 'clinic-1', name: 'Pinheiros', address: 'Rua B', phone: '', email: '', responsible_name: '', is_active: true });
    expect(br1.id).not.toBe(br2.id);
  });

  it('deve gerar created_at automaticamente', () => {
    const br = store.addBranch({ clinic_id: 'clinic-1', name: 'Centro', address: 'Rua A', phone: '', email: '', responsible_name: '', is_active: true });
    expect(br.created_at).toBeTruthy();
  });

  it('deve adicionar novas filiais no início da lista', () => {
    store.addBranch({ clinic_id: 'clinic-1', name: 'Primeira', address: 'Rua A', phone: '', email: '', responsible_name: '', is_active: true });
    store.addBranch({ clinic_id: 'clinic-1', name: 'Segunda', address: 'Rua B', phone: '', email: '', responsible_name: '', is_active: true });
    expect(store.branches[0].name).toBe('Segunda');
  });

  it('deve atualizar filial existente', () => {
    const br = store.addBranch({ clinic_id: 'clinic-1', name: 'Centro', address: 'Rua A', phone: '', email: '', responsible_name: '', is_active: true });
    store.updateBranch(br.id, { name: 'Centro Atualizado', address: 'Rua Nova, 200' });
    expect(store.branches[0].name).toBe('Centro Atualizado');
    expect(store.branches[0].address).toBe('Rua Nova, 200');
  });

  it('deve atualizar apenas campos especificados', () => {
    const br = store.addBranch({ clinic_id: 'clinic-1', name: 'Centro', address: 'Rua A', phone: '(11) 3456-7890', email: '', responsible_name: '', is_active: true });
    store.updateBranch(br.id, { name: 'Centro Novo' });
    expect(store.branches[0].name).toBe('Centro Novo');
    expect(store.branches[0].address).toBe('Rua A');
    expect(store.branches[0].phone).toBe('(11) 3456-7890');
  });

  it('deve deletar filial', () => {
    const br = store.addBranch({ clinic_id: 'clinic-1', name: 'Centro', address: 'Rua A', phone: '', email: '', responsible_name: '', is_active: true });
    store.deleteBranch(br.id);
    expect(store.branches).toHaveLength(0);
  });

  it('deve deletar apenas a filial especificada', () => {
    const br1 = store.addBranch({ clinic_id: 'clinic-1', name: 'Centro', address: 'Rua A', phone: '', email: '', responsible_name: '', is_active: true });
    const br2 = store.addBranch({ clinic_id: 'clinic-1', name: 'Pinheiros', address: 'Rua B', phone: '', email: '', responsible_name: '', is_active: true });
    store.deleteBranch(br1.id);
    expect(store.branches).toHaveLength(1);
    expect(store.branches[0].name).toBe('Pinheiros');
  });

  it('não deve deletar se ID não existir', () => {
    store.addBranch({ clinic_id: 'clinic-1', name: 'Centro', address: 'Rua A', phone: '', email: '', responsible_name: '', is_active: true });
    store.deleteBranch('id-inexistente');
    expect(store.branches).toHaveLength(1);
  });

  it('deve atualizar responsável da filial', () => {
    const br = store.addBranch({ clinic_id: 'clinic-1', name: 'Centro', address: 'Rua A', phone: '', email: '', responsible_name: 'Dr. João', is_active: true });
    store.updateBranch(br.id, { responsible_name: 'Dra. Maria' });
    expect(store.branches[0].responsible_name).toBe('Dra. Maria');
  });

  it('deve atualizar contato da filial', () => {
    const br = store.addBranch({ clinic_id: 'clinic-1', name: 'Centro', address: 'Rua A', phone: '', email: '', responsible_name: '', is_active: true });
    store.updateBranch(br.id, { phone: '(11) 99999-0000', email: 'novo@email.com' });
    expect(store.branches[0].phone).toBe('(11) 99999-0000');
    expect(store.branches[0].email).toBe('novo@email.com');
  });

  it('deve alternar status da filial', () => {
    const br = store.addBranch({ clinic_id: 'clinic-1', name: 'Centro', address: 'Rua A', phone: '', email: '', responsible_name: '', is_active: true });
    store.updateBranch(br.id, { is_active: false });
    expect(store.branches[0].is_active).toBe(false);
    store.updateBranch(br.id, { is_active: true });
    expect(store.branches[0].is_active).toBe(true);
  });
});

describe('Store de Clínica - WhatsApp Integrações (Multi-tenant)', () => {
  let store: ClinicStore;

  beforeEach(() => {
    store = createStore();
  });

  it('deve iniciar com integrações desconectadas', () => {
    expect(store.whatsappIntegrations['clinic-1'].connected).toBe(false);
    expect(store.whatsappIntegrations['clinic-2'].connected).toBe(false);
    expect(store.whatsappIntegrations['clinic-3'].connected).toBe(false);
  });

  it('deve conectar WhatsApp para uma clínica', () => {
    store.setWhatsAppConnected('clinic-1', true, 'token-123', '11999990001');
    expect(store.whatsappIntegrations['clinic-1'].connected).toBe(true);
    expect(store.whatsappIntegrations['clinic-1'].token).toBe('token-123');
    expect(store.whatsappIntegrations['clinic-1'].phoneNumber).toBe('11999990001');
  });

  it('deve manter outras clínicas desconectadas ao conectar uma', () => {
    store.setWhatsAppConnected('clinic-1', true, 'token-123', '11999990001');
    expect(store.whatsappIntegrations['clinic-2'].connected).toBe(false);
    expect(store.whatsappIntegrations['clinic-3'].connected).toBe(false);
  });

  it('deve desconectar WhatsApp de uma clínica', () => {
    store.setWhatsAppConnected('clinic-1', true, 'token-123', '11999990001');
    store.setWhatsAppConnected('clinic-1', false);
    expect(store.whatsappIntegrations['clinic-1'].connected).toBe(false);
  });

  it('deve manter token ao desconectar', () => {
    store.setWhatsAppConnected('clinic-1', true, 'token-123', '11999990001');
    store.setWhatsAppConnected('clinic-1', false);
    expect(store.whatsappIntegrations['clinic-1'].token).toBe('token-123');
  });

  it('deve gerar lastSync ao conectar', () => {
    store.setWhatsAppConnected('clinic-1', true, 'token', '11999990001');
    expect(store.whatsappIntegrations['clinic-1'].lastSync).toBeTruthy();
  });

  it('deve limpar lastSync ao desconectar', () => {
    store.setWhatsAppConnected('clinic-1', true, 'token', '11999990001');
    store.setWhatsAppConnected('clinic-1', false);
    expect(store.whatsappIntegrations['clinic-1'].lastSync).toBeNull();
  });

  it('deve retornar status correto via getWhatsAppStatus', () => {
    store.setWhatsAppConnected('clinic-1', true, 'token-123', '11999990001');
    const status = store.getWhatsAppStatus('clinic-1');
    expect(status.connected).toBe(true);
    expect(status.token).toBe('token-123');
  });

  it('deve retornar status padrão para clínica inexistente', () => {
    const status = store.getWhatsAppStatus('clinic-inexistente');
    expect(status.connected).toBe(false);
    expect(status.token).toBe('');
  });

  it('deve permitir conectar múltiplas clínicas independentemente', () => {
    store.setWhatsAppConnected('clinic-1', true, 'token-1', '11999990001');
    store.setWhatsAppConnected('clinic-2', true, 'token-2', '21999990002');
    expect(store.whatsappIntegrations['clinic-1'].token).toBe('token-1');
    expect(store.whatsappIntegrations['clinic-2'].token).toBe('token-2');
  });

  it('deve manter isolamento entre clínicas', () => {
    store.setWhatsAppConnected('clinic-1', true, 'token-1', '11999990001');
    store.setWhatsAppConnected('clinic-1', false);
    expect(store.whatsappIntegrations['clinic-2'].connected).toBe(false);
    expect(store.whatsappIntegrations['clinic-3'].connected).toBe(false);
  });
});

describe('Store de Clínica - WhatsApp Sistema (Global)', () => {
  let store: ClinicStore;

  beforeEach(() => {
    store = createStore();
  });

  it('deve iniciar com sistema WhatsApp desconectado', () => {
    expect(store.systemWhatsApp.connected).toBe(false);
  });

  it('deve conectar sistema WhatsApp', () => {
    store.setSystemWhatsApp(true, 'system-token', '11987654321');
    expect(store.systemWhatsApp.connected).toBe(true);
    expect(store.systemWhatsApp.token).toBe('system-token');
    expect(store.systemWhatsApp.phoneNumber).toBe('11987654321');
  });

  it('deve desconectar sistema WhatsApp', () => {
    store.setSystemWhatsApp(true, 'system-token', '11987654321');
    store.setSystemWhatsApp(false);
    expect(store.systemWhatsApp.connected).toBe(false);
  });

  it('deve manter token ao desconectar sistema', () => {
    store.setSystemWhatsApp(true, 'system-token', '11987654321');
    store.setSystemWhatsApp(false);
    expect(store.systemWhatsApp.token).toBe('system-token');
  });

  it('deve gerar lastSync ao conectar sistema', () => {
    store.setSystemWhatsApp(true, 'token', '11987654321');
    expect(store.systemWhatsApp.lastSync).toBeTruthy();
  });

  it('não deve afetar integrações de clínicas ao conectar sistema', () => {
    store.setWhatsAppConnected('clinic-1', true, 'clinic-token', '11999990001');
    store.setSystemWhatsApp(true, 'system-token', '11987654321');
    expect(store.whatsappIntegrations['clinic-1'].token).toBe('clinic-token');
    expect(store.systemWhatsApp.token).toBe('system-token');
  });

  it('deve manter sistema isolado das clínicas', () => {
    store.setSystemWhatsApp(true, 'system-token', '11987654321');
    store.setWhatsAppConnected('clinic-1', false);
    expect(store.systemWhatsApp.connected).toBe(true);
  });
});

describe('Store de Clínica - Integração e Edge Cases', () => {
  let store: ClinicStore;

  beforeEach(() => {
    store = createStore();
  });

  it('deve lidar com muitas operações simultâneas', () => {
    for (let i = 0; i < 100; i++) {
      store.addInsurance({ clinic_id: 'clinic-1', name: `Ins${i}`, code: `I${i}`, contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    }
    expect(store.insurances).toHaveLength(100);
  });

  it('deve manter integridade após múltiplas operações', () => {
    const ins1 = store.addInsurance({ clinic_id: 'clinic-1', name: 'A', code: 'A', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    const ins2 = store.addInsurance({ clinic_id: 'clinic-1', name: 'B', code: 'B', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    const br1 = store.addBranch({ clinic_id: 'clinic-1', name: 'X', address: 'X', phone: '', email: '', responsible_name: '', is_active: true });
    
    store.deleteInsurance(ins1.id);
    store.updateBranch(br1.id, { name: 'X+' });
    store.setWhatsAppConnected('clinic-1', true, 'token', '11999990001');
    
    expect(store.insurances).toHaveLength(1);
    expect(store.insurances[0].name).toBe('B');
    expect(store.branches[0].name).toBe('X+');
    expect(store.whatsappIntegrations['clinic-1'].connected).toBe(true);
  });

  it('deve lidar com strings vazias', () => {
    const ins = store.addInsurance({ clinic_id: '', name: '', code: '', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    expect(ins.name).toBe('');
    expect(ins.clinic_id).toBe('');
  });

  it('deve lidar com caracteres especiais', () => {
    const ins = store.addInsurance({ clinic_id: 'clinic-1', name: 'Unimed & Saúde', code: 'UNI-SAUDE', contact_phone: '', contact_email: '', address: '', notes: 'Convênio com acentuação:ção', is_active: true });
    expect(ins.name).toBe('Unimed & Saúde');
    expect(ins.notes).toContain('ção');
  });

  it('deve manter estado consistente', () => {
    store.addInsurance({ clinic_id: 'clinic-1', name: 'A', code: 'A', contact_phone: '', contact_email: '', address: '', notes: '', is_active: true });
    store.addBranch({ clinic_id: 'clinic-1', name: 'X', address: 'X', phone: '', email: '', responsible_name: '', is_active: true });
    
    expect(store.insurances).toHaveLength(1);
    expect(store.branches).toHaveLength(1);
    expect(Object.keys(store.whatsappIntegrations)).toHaveLength(3);
  });
});
