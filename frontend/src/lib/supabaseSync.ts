// ============================================
// Supabase Sync - Sincronização de dados
// ============================================

import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  isProductionBuild,
  isSupabaseEnvConfigured,
} from '@/lib/supabaseConfig';

const SUPABASE_KEY = SUPABASE_PUBLISHABLE_KEY;

const isConfigured = isSupabaseEnvConfigured();

console.log('[SupabaseSync] Using key: PUBLISHABLE_KEY (RLS allows public read)');

const ensureSupabaseConfigured = (operation: string) => {
  if (isConfigured) return;
  const message = `[SupabaseSync] Supabase não configurado para ${operation}. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (ou VITE_SUPABASE_ANON_KEY).`;
  if (isProductionBuild) {
    throw new Error(message);
  }
  console.warn(message);
};

// Obter token JWT do usuário logado - múltiplas tentativas
const getAuthToken = (): string | null => {
  try {
    // Tentar 1: clinxia_supabase_session (criado pelo supabase.ts)
    const clinxiaSession = localStorage.getItem('clinxia_supabase_session');
    if (clinxiaSession) {
      const parsed = JSON.parse(clinxiaSession);
      if (parsed?.access_token) {
        return parsed.access_token;
      }
    }
    
    // Tentar 2: supabase.auth.token (padrão @supabase/supabase-js)
    const supabaseSession = localStorage.getItem('supabase.auth.token');
    if (supabaseSession) {
      const parsed = JSON.parse(supabaseSession);
      if (parsed?.access_token) {
        return parsed.access_token;
      }
    }
    
    // Tentar 3: Zustand store (luminaflow-auth)
    const authData = localStorage.getItem('luminaflow-auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      if (parsed?.state?.user?.access_token) {
        return parsed.state.user.access_token;
      }
    }
  } catch (e) {
    console.log('[SupabaseSync] Error getting auth token:', e);
  }
  return null;
};

const getHeaders = (method?: string) => {
  const token = getAuthToken();
  const hasServiceKey = Boolean(SUPABASE_SERVICE_ROLE_KEY && SUPABASE_SERVICE_ROLE_KEY.length > 10);
  
  // Se tem JWT, usa ele. Se não tem JWT mas tem service role key, usa service role key.
  // Para writes (POST/PATCH/DELETE), tenta usar service key se disponível.
  let apiKey: string;
  let authHeader: string;
  
  if (token) {
    apiKey = SUPABASE_KEY;
    authHeader = token;
    console.log('[SupabaseSync] Auth: JWT do usuário');
  } else if (hasServiceKey) {
    apiKey = SUPABASE_SERVICE_ROLE_KEY;
    authHeader = SUPABASE_SERVICE_ROLE_KEY;
    console.log('[SupabaseSync] Auth: Service Role Key');
  } else {
    apiKey = SUPABASE_KEY;
    authHeader = SUPABASE_KEY;
    console.log('[SupabaseSync] Auth: PublIc Key (sem JWT)');
  }
  
  return {
    'Content-Type': 'application/json',
    'apikey': apiKey,
    'Authorization': `Bearer ${authHeader}`,
    'Prefer': 'return=representation',
  };
};

const getBaseUrl = () => `${SUPABASE_URL}/rest/v1`;

async function supabaseFetch(table: string, options: {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: any;
  filters?: string;
} = {}) {
  const { method = 'GET', body, filters } = options;
  ensureSupabaseConfigured(`${method} ${table}`);
  if (!isConfigured) {
    return { data: null, error: 'Not configured' };
  }

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/${table}${filters || ''}`;
  console.log('[SupabaseSync] Fetch URL:', url);

  try {
    const response = await fetch(url, {
      method,
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log('[SupabaseSync] Response status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error(`[SupabaseSync] Erro ${method} ${table}:`, error);
      return { data: null, error };
    }

    const data = await response.json();
    console.log('[SupabaseSync] Data received:', Array.isArray(data) ? data.length : data);
    return { data, error: null };
  } catch (err: any) {
    console.error(`[SupabaseSync] Exception ${method} ${table}:`, err.message);
    return { data: null, error: err.message };
  }
}

// UUID da clínica padrão (Lumina Odontologia)
const DEFAULT_CLINIC_ID = '00000000-0000-0000-0000-000000000001';

const getClinicId = (clinicId?: string) => {
  // Log para debug
  console.log('[SupabaseSync] getClinicId called with:', clinicId);
  
  if (!clinicId) {
    console.log('[SupabaseSync] No clinicId, using DEFAULT:', DEFAULT_CLINIC_ID);
    return DEFAULT_CLINIC_ID;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(clinicId)) {
    console.log('[SupabaseSync] Valid UUID, using:', clinicId);
    return clinicId;
  }
  
  if (clinicId === 'clinic-1') {
    console.log('[SupabaseSync] clinic-1, using DEFAULT:', DEFAULT_CLINIC_ID);
    return DEFAULT_CLINIC_ID;
  }
  
  console.log('[SupabaseSync] Unknown format, using DEFAULT:', DEFAULT_CLINIC_ID);
  return DEFAULT_CLINIC_ID;
};

// Mapper para converter dados do Supabase para formato do app
const mapPatient = (p: any) => ({
  id: p.id,
  clinic_id: p.clinic_id,
  name: p.name || '',
  phone: p.phone || '',
  email: p.email || '',
  cpf: p.cpf || '',
  birth_date: (() => {
    if (!p.birth) return '';
    const d = new Date(p.birth);
    if (isNaN(d.getTime()) || d.getFullYear() < 1900 || d.getFullYear() > new Date().getFullYear()) return '';
    return d.toISOString().split('T')[0];
  })(),
  gender: p.gender || '',
  address: p.address || '',
  city: p.city || '',
  state: p.state || '',
  cep: p.zip || '',
  notes: p.notes || '',
  allergies: p.allergies ? p.allergies.split(',').map((s: string) => s.trim()) : [],
  status: p.active ? 'active' : 'inactive',
  created_at: p.created_at,
});

// Professionals - Busca nome do usuário
const mapProfessional = async (p: any): Promise<any> => {
  let name = 'Profissional';
  try {
    if (p.user_id) {
      const { data: userData } = await supabaseFetch('users', {
        filters: `?id=eq.${p.user_id}&select=name`,
      });
      if (userData && userData[0]?.name) {
        name = userData[0].name;
      }
    }
  } catch (e) {
    console.warn('[SupabaseSync] Could not fetch user name:', e);
  }
  return {
    id: p.id,
    clinic_id: p.clinic_id,
    name: name,
    email: '',
    phone: '',
    role: 'dentist',
    cro: p.cro || '',
    specialty: p.specialty || '',
    commission_pct: Number(p.commission) || 0,
    active: p.active !== false,
    created_at: p.created_at,
  };
};

const mapAppointment = (a: any, patients: any[] = [], professionals: any[] = []) => {
  const patient = patients.find(p => p.id === a.patient_id);
  const professional = professionals.find(p => p.id === a.professional_id);
  return {
    id: a.id,
    clinic_id: a.clinic_id,
    patient_id: a.patient_id,
    patient_name: patient?.name || 'Paciente',
    professional_id: a.professional_id,
    professional_name: professional?.name || 'Profissional',
    service_id: a.service_id,
    scheduled_at: a.scheduled ? new Date(a.scheduled).toISOString() : '',
    duration_min: a.duration || 30,
    status: a.status || 'scheduled',
    notes: a.notes || '',
    confirmed: a.confirmed || false,
    created_at: a.created_at,
  };
};

const mapService = (s: any) => ({
  id: s.id,
  clinic_id: s.clinic_id,
  name: s.name || '',
  category: s.category || '',
  description: s.description || '',
  avg_duration_min: s.duration || 30,
  base_price: Number(s.price) || 0,
  estimated_cost: Number(s.cost) || 0,
  active: s.active !== false,
  created_at: s.created_at,
});

const mapStockItem = (s: any) => ({
  id: s.id,
  clinic_id: s.clinic_id,
  name: s.name || '',
  category: s.category || '',
  quantity: Number(s.qty) || 0,
  min_quantity: Number(s.min_qty) || 0,
  unit: s.unit || 'un',
  unit_cost: Number(s.cost) || 0,
  supplier: s.supplier || '',
  active: s.active !== false,
  created_at: s.created_at,
});

const mapTransaction = (t: any) => ({
  id: t.id,
  clinic_id: t.clinic_id,
  appointment_id: t.appointment_id,
  patient_id: t.patient_id,
  professional_id: t.professional_id,
  type: t.type || 'income',
  category: t.category || '',
  description: t.description || '',
  amount: Number(t.amount) || 0,
  status: t.status || 'pending',
  payment_method: t.method || '',
  reference: t.reference || '',
  pix_code: t.pix || '',
  asaas_payment_id: t.asaas_id || '',
  due_date: t.due || '',
  paid_at: t.paid_at || '',
  created_at: t.created_at,
});

export const SupabaseSync = {
  getAuthToken,
  
  async loadPatients(clinicId: string) {
    const uuid = getClinicId(clinicId);
    console.log('[SupabaseSync] loadPatients with clinicId:', clinicId, '-> uuid:', uuid);
    
    // Tentar primeiro com deleted_at, se não retornar, tentar sem
    let { data, error } = await supabaseFetch('patients', {
      filters: `?clinic_id=eq.${uuid}&select=*&order=created_at.desc`,
    });
    
    // Se 返回 0，试 sem filtro de deleted_at
    if (!data || data.length === 0) {
      ({ data, error } = await supabaseFetch('patients', {
        filters: `?clinic_id=eq.${uuid}&select=*&order=created_at.desc`,
      }));
    }
    
    console.log('[SupabaseSync] patients loaded:', data?.length || 0, 'error:', error);
    if (error || !data) return [];
    return data.map(mapPatient);
  },

  async loadProfessionals(clinicId: string) {
    const uuid = getClinicId(clinicId);
    console.log('[SupabaseSync] loadProfessionals with clinicId:', clinicId, '-> uuid:', uuid);
    
    const { data, error } = await supabaseFetch('professionals', {
      filters: `?clinic_id=eq.${uuid}&select=*&order=created_at.asc`,
    });
    console.log('[SupabaseSync] professionals loaded:', data?.length || 0, 'error:', error);
    if (error || !data) return [];
    
    // Batch-fetch all users at once to avoid N+1 queries
    const userIds = data.map((p: any) => p.user_id).filter(Boolean);
    let usersMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabaseFetch('users', {
        filters: `?id=in.(${userIds.join(',')})&select=id,name`,
      });
      if (users) {
        users.forEach((u: any) => { usersMap[u.id] = u.name; });
      }
    }
    
    return data.map((p: any) => ({
      id: p.id,
      clinic_id: p.clinic_id,
      name: p.user_id ? (usersMap[p.user_id] || 'Profissional') : 'Profissional',
      email: '',
      phone: '',
      role: 'dentist',
      cro: p.cro || '',
      specialty: p.specialty || '',
      commission_pct: Number(p.commission) || 0,
      active: p.active !== false,
      created_at: p.created_at,
    }));
  },

  async loadAppointments(clinicId: string) {
    const uuid = getClinicId(clinicId);
    const { data, error } = await supabaseFetch('appointments', {
      filters: `?clinic_id=eq.${uuid}&select=*&deleted_at=is.null&order=scheduled.desc`,
    });
    if (error || !data) return [];
    
    // Buscar pacientes e profissionais para popular nomes
    const { data: patients } = await supabaseFetch('patients', {
      filters: `?clinic_id=eq.${uuid}&select=id,name`,
    });
    const { data: professionals } = await supabaseFetch('professionals', {
      filters: `?clinic_id=eq.${uuid}&select=id,user_id`,
    });
    
    // Buscar nomes dos profissionais via users
    if (professionals && professionals.length > 0) {
      const userIds = professionals.map((p: any) => p.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const { data: users } = await supabaseFetch('users', {
          filters: `?id=in.(${userIds.join(',')})&select=id,name`,
        });
        if (users) {
          professionals.forEach((p: any) => {
            const user = users.find((u: any) => u.id === p.user_id);
            if (user) p.name = user.name;
          });
        }
      }
    }
    
    return data.map((a: any) => mapAppointment(a, patients || [], professionals || []));
  },

  async loadServices(clinicId: string) {
    const uuid = getClinicId(clinicId);
    const { data, error } = await supabaseFetch('services', {
      filters: `?clinic_id=eq.${uuid}&select=*&deleted_at=is.null&order=name.asc`,
    });
    if (error || !data) return [];
    return data.map(mapService);
  },

  async loadStock(clinicId: string) {
    const uuid = getClinicId(clinicId);
    const { data, error } = await supabaseFetch('stock_items', {
      filters: `?clinic_id=eq.${uuid}&select=*&order=name.asc`,
    });
    if (error || !data) return [];
    return data.map(mapStockItem);
  },

  async loadIntegrationConfig(clinicId: string) {
    const uuid = getClinicId(clinicId);
    const { data, error } = await supabaseFetch('integration_config', {
      filters: `?clinic_id=eq.${uuid}&select=*`,
    });
    if (error || !data || data.length === 0) return null;
    return data[0];
  },

  async loadMedicalRecords() {
    const clinicId = getClinicId('00000000-0000-0000-0000-000000000001');
    const { data, error } = await supabaseFetch('medical_records', {
      filters: `?clinic_id=eq.${clinicId}&select=patient_id,clinic_id,anamnese,updated_at&limit=100`,
    });
    if (error || !data) return { data: null, error };
    return { data, error: null };
  },

  async saveIntegrationConfig(config: any) {
    const { data: existing } = await supabaseFetch('integration_config', {
      filters: `?clinic_id=eq.${getClinicId(config.clinic_id)}&select=clinic_id`,
    });
    if (existing && existing.length > 0) {
      return supabaseFetch(`integration_config?clinic_id=eq.${getClinicId(config.clinic_id)}`, { method: 'PATCH', body: config });
    }
    return supabaseFetch('integration_config', { method: 'POST', body: config });
  },

  async loadTransactions(clinicId: string) {
    const uuid = getClinicId(clinicId);
    const { data, error } = await supabaseFetch('transactions', {
      filters: `?clinic_id=eq.${uuid}&select=*&deleted_at=is.null&order=created_at.desc`,
    });
    if (error || !data) return [];
    return data.map(mapTransaction);
  },

  async savePatient(patient: any) {
    const body = {
      id: patient.id,
      clinic_id: getClinicId(patient.clinic_id),
      name: patient.name,
      phone: patient.phone,
      email: patient.email,
      cpf: patient.cpf,
      birth: patient.birth_date || null,
      gender: patient.gender || null,
      address: patient.address || null,
      city: patient.city || null,
      state: patient.state || null,
      zip: patient.cep || null,
      notes: patient.notes || null,
      allergies: patient.allergies?.join(', ') || null,
      meds: patient.meds || null,
      history: patient.history || null,
      active: patient.status === 'active',
    };
    return supabaseFetch('patients', { method: 'POST', body });
  },

  async updatePatient(id: string, patient: any) {
    const body: any = {
      name: patient.name,
      phone: patient.phone,
      email: patient.email,
      cpf: patient.cpf,
      birth: patient.birth_date || null,
      gender: patient.gender || null,
      address: patient.address || null,
      city: patient.city || null,
      state: patient.state || null,
      zip: patient.cep || null,
      notes: patient.notes || null,
      allergies: patient.allergies?.join(', ') || null,
      meds: patient.meds || null,
      active: patient.status === 'active',
      updated_at: new Date().toISOString(),
    };
    return supabaseFetch(`patients?id=eq.${id}`, { method: 'PATCH', body });
  },

  async saveProfessional(professional: any) {
    const body = {
      id: professional.id,
      clinic_id: getClinicId(professional.clinic_id),
      cro: professional.cro || null,
      specialty: professional.specialty || null,
      commission: professional.commission_pct || 0,
      active: professional.active !== false,
    };
    return supabaseFetch('professionals', { method: 'POST', body });
  },

  async updateProfessional(id: string, professional: any) {
    const body = {
      cro: professional.cro || null,
      specialty: professional.specialty || null,
      commission: professional.commission_pct || 0,
      active: professional.active,
    };
    return supabaseFetch(`professionals?id=eq.${id}`, { method: 'PATCH', body });
  },

  async deleteProfessional(id: string) {
    return supabaseFetch(`professionals?id=eq.${id}`, { method: 'DELETE' });
  },

  async saveAppointment(appointment: any) {
    const body = {
      id: appointment.id,
      clinic_id: getClinicId(appointment.clinic_id),
      patient_id: appointment.patient_id || null,
      professional_id: appointment.professional_id || null,
      service_id: appointment.service_id || null,
      scheduled: appointment.scheduled_at || null,
      duration: appointment.duration_min || 30,
      status: appointment.status || 'scheduled',
      notes: appointment.notes || null,
    };
    return supabaseFetch('appointments', { method: 'POST', body });
  },

  async updateAppointment(id: string, appointment: any) {
    const body: any = {
      scheduled: appointment.scheduled_at || null,
      duration: appointment.duration_min || 30,
      status: appointment.status || 'scheduled',
      notes: appointment.notes || null,
      confirmed: appointment.confirmed || false,
      updated_at: new Date().toISOString(),
    };
    return supabaseFetch(`appointments?id=eq.${id}`, { method: 'PATCH', body });
  },

  async saveService(service: any) {
    const body = {
      id: service.id,
      clinic_id: getClinicId(service.clinic_id),
      name: service.name,
      category: service.category || null,
      description: service.description || null,
      price: service.base_price || 0,
      duration: service.avg_duration_min || 30,
      cost: service.estimated_cost || 0,
      active: service.active !== false,
    };
    return supabaseFetch('services', { method: 'POST', body });
  },

  async updateService(id: string, service: any) {
    const body = {
      name: service.name,
      category: service.category || null,
      description: service.description || null,
      price: service.base_price || 0,
      duration: service.avg_duration_min || 30,
      cost: service.estimated_cost || 0,
      active: service.active,
    };
    return supabaseFetch(`services?id=eq.${id}`, { method: 'PATCH', body });
  },

  async deleteService(id: string) {
    return supabaseFetch(`services?id=eq.${id}`, { method: 'DELETE' });
  },

  async saveStockItem(item: any) {
    const body = {
      id: item.id,
      clinic_id: getClinicId(item.clinic_id),
      name: item.name,
      category: item.category || null,
      unit: item.unit || 'un',
      qty: item.quantity || 0,
      min_qty: item.min_quantity || 0,
      cost: item.unit_cost || 0,
      supplier: item.supplier || null,
      active: item.active !== false,
    };
    return supabaseFetch('stock_items', { method: 'POST', body });
  },

  async updateStockItem(id: string, item: any) {
    const body = {
      name: item.name,
      category: item.category || null,
      unit: item.unit || 'un',
      qty: item.quantity || 0,
      min_qty: item.min_quantity || 0,
      cost: item.unit_cost || 0,
      supplier: item.supplier || null,
      active: item.active,
      updated_at: new Date().toISOString(),
    };
    return supabaseFetch(`stock_items?id=eq.${id}`, { method: 'PATCH', body });
  },

  async deleteStockItem(id: string) {
    return supabaseFetch(`stock_items?id=eq.${id}`, { method: 'DELETE' });
  },

  async saveTransaction(transaction: any) {
    const body = {
      id: transaction.id,
      clinic_id: getClinicId(transaction.clinic_id),
      appointment_id: transaction.appointment_id || null,
      patient_id: transaction.patient_id || null,
      professional_id: transaction.professional_id || null,
      type: transaction.type || 'income',
      category: transaction.category || null,
      description: transaction.description || null,
      amount: transaction.amount || 0,
      status: transaction.status || 'pending',
      method: transaction.payment_method || null,
      reference: transaction.reference || null,
      pix: transaction.pix_code || null,
      due: transaction.due_date || null,
      paid_at: transaction.paid_at || null,
    };
    return supabaseFetch('transactions', { method: 'POST', body });
  },

  async updateTransaction(id: string, transaction: any) {
    const body: any = {
      status: transaction.status || 'pending',
      method: transaction.payment_method || null,
      reference: transaction.reference || null,
      due: transaction.due_date || null,
      paid_at: transaction.paid_at || null,
    };
    return supabaseFetch(`transactions?id=eq.${id}`, { method: 'PATCH', body });
  },
};

console.log('[SupabaseSync] Módulo carregado, isConfigured:', isConfigured);
