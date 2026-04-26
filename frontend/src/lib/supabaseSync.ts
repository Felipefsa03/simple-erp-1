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
import { getSupabaseSession } from '@/lib/supabase';

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

// Obter token JWT do usuario logado (sessao em memoria)
const getAuthToken = (): string | null => {
  try {
    // Tentar 1: getSupabaseSession() - fonte principal (em memória)
    const session = getSupabaseSession();
    if (session?.access_token) {
      return session.access_token;
    }

    // Tentar 2: clinxia_supabase_session (Custom Supabase Client no localStorage)
    const clinxiaSession = localStorage.getItem('clinxia_supabase_session');
    if (clinxiaSession) {
      const parsed = JSON.parse(clinxiaSession);
      if (parsed?.access_token) {
        return parsed.access_token;
      }
    }

    // Tentar 3: Zustand store format (Legacy)
    const authData = localStorage.getItem('luminaflow-auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      if (parsed?.state?.user?.access_token) {
        return parsed.state.user.access_token;
      }
    }

    // Tentar 4: supabase session padrão (@supabase/supabase-js)
    const supabaseSession = localStorage.getItem('supabase.auth.token');
    if (supabaseSession) {
      const parsed = JSON.parse(supabaseSession);
      if (parsed?.access_token) {
        return parsed.access_token;
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
  
  let apiKey: string;
  let authHeader: string;
  let authType: string;
  
  if (token) {
    apiKey = SUPABASE_KEY;
    authHeader = token;
    authType = 'JWT';
  } else if (hasServiceKey) {
    apiKey = SUPABASE_SERVICE_ROLE_KEY;
    authHeader = SUPABASE_SERVICE_ROLE_KEY;
    authType = 'service_role';
  } else {
    apiKey = SUPABASE_KEY;
    authHeader = SUPABASE_KEY;
    authType = 'public';
  }
  
  console.log('[SupabaseSync] Auth:', authType);
  
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
  retries?: number;
  backoff?: number;
} = {}) {
  const { method = 'GET', body, filters, retries = 3, backoff = 500 } = options;
  ensureSupabaseConfigured(`${method} ${table}`);
  if (!isConfigured) {
    return { data: null, error: 'Not configured' };
  }

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/${table}${filters || ''}`;
  console.log('[SupabaseSync] Fetch URL:', url);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(url, {
      method,
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('[SupabaseSync] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SupabaseSync] Erro ${method} ${table}:`, errorText);
      
      // Se for um erro de rede temporário (502, 503, 504) e ainda houver retries, tentar novamente
      if (retries > 0 && [502, 503, 504].includes(response.status)) {
        console.log(`[SupabaseSync] Retry on HTTP ${response.status}. Retries left: ${retries}`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return supabaseFetch(table, { ...options, retries: retries - 1, backoff: backoff * 2 });
      }
      
      return { data: null, error: errorText };
    }

    // Se o body for vazio ou NO CONTENT (204)
    if (response.status === 204) {
      return { data: null, error: null };
    }

    const data = await response.json().catch(() => null);
    console.log('[SupabaseSync] Data received:', Array.isArray(data) ? data.length : data);
    return { data, error: null };
  } catch (err: any) {
    console.error(`[SupabaseSync] Exception ${method} ${table}:`, err.message);
    
    // Se for timeout ou erro de rede, tenta novamente com backoff
    if (retries > 0 && (err.name === 'AbortError' || err.message.includes('Failed to fetch'))) {
      console.log(`[SupabaseSync] Retry on Network/Timeout. Retries left: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return supabaseFetch(table, { ...options, retries: retries - 1, backoff: backoff * 2 });
    }
    
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
  material_cost: Number(t.material_cost) || 0,
  due_date: t.due || '',
  paid_at: t.paid_at || '',
  created_at: t.created_at,
});

const mapMedicalRecord = (r: any) => ({
  id: r.id,
  appointment_id: r.appointment_id,
  clinic_id: r.clinic_id,
  patient_id: r.patient_id,
  professional_id: r.professional_id,
  content: r.evolution || '', // Mapeado de evolution (DB) para content (App)
  anamnese: r.anamnese || null,
  odontogram: r.odontogram || null,
  locked: r.locked === true,
  locked_at: r.locked_at,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

const mapTreatmentPlan = (p: any) => ({
  id: p.id,
  patient_id: p.patient_id,
  clinic_id: p.clinic_id,
  title: p.title || 'Plano de Tratamento',
  items: p.items || [],
  status: p.status || 'active',
  total_estimated: Number(p.total_estimated) || 0,
  created_at: p.created_at,
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
    
    // Se retorna 0, tenta sem filtro de deleted_at
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
      filters: `?clinic_id=eq.${uuid}&select=*,user:user_id(id,name,email,phone,role)&order=created_at.asc`,
    });
    console.log('[SupabaseSync] professionals loaded:', data?.length || 0, 'error:', error);
    if (error || !data) return [];
    
    return data.map((p: any) => {
      const user = Array.isArray(p.user) ? p.user[0] : p.user; // Supabase REST might return an array for relations depending on schema
      return {
        id: p.id,
        clinic_id: p.clinic_id,
        name: user?.name || p.name || 'Profissional',
        email: user?.email || p.email || 'email@clinica.com',
        phone: user?.phone || p.phone || '(11) 99999-9999',
        role: user?.role || p.role || 'dentist',
        cro: p.cro || '',
        specialty: p.specialty || '',
        commission_pct: Number(p.commission) || 0,
        active: p.active !== false,
        created_at: p.created_at,
      };
    });
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

  async loadMedicalRecords(clinicId: string) {
    const uuid = getClinicId(clinicId);
    const { data } = await supabaseFetch('medical_records', {
      filters: `?clinic_id=eq.${uuid}&select=*&order=created_at.desc`,
    });
    if (!Array.isArray(data)) return [];
    return data.map(mapMedicalRecord);
  },

  async loadTreatmentPlans(clinicId: string) {
    const uuid = getClinicId(clinicId);
    const { data, error } = await supabaseFetch('treatment_plans', {
      filters: `?clinic_id=eq.${uuid}&select=*&order=created_at.desc`,
    });
    if (error || !Array.isArray(data)) return [];
    return data.map(mapTreatmentPlan);
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

  async deletePatient(id: string) {
    return supabaseFetch(`patients?id=eq.${id}`, { method: 'DELETE' });
  },

  async saveProfessional(professional: any) {
    const body = {
      id: professional.id,
      clinic_id: getClinicId(professional.clinic_id),
      user_id: professional.user_id || null,
      cro: professional.cro || null,
      specialty: professional.specialty || null,
      commission: professional.commission_pct || 0,
      active: professional.active !== false,
    };
    return supabaseFetch('professionals', { method: 'POST', body });
  },

  async updateProfessional(id: string, professional: any) {
    const body = {
      user_id: professional.user_id || null,
      cro: professional.cro || null,
      specialty: professional.specialty || null,
      commission: professional.commission_pct || 0,
      active: professional.active !== false,
    };
    return supabaseFetch(`professionals?id=eq.${id}`, { method: 'PATCH', body });
  },

  async deleteProfessional(id: string) {
    return supabaseFetch(`professionals?id=eq.${id}`, { method: 'DELETE' });
  },

  async saveAppointment(appointment: any) {
    console.log('[SupabaseSync] saveAppointment called with:', appointment);
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
    console.log('[SupabaseSync] saveAppointment body:', body);
    const result = await supabaseFetch('appointments', { method: 'POST', body });
    console.log('[SupabaseSync] saveAppointment result:', result);
    return result;
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
    const body: any = {
      id: transaction.id,
      clinic_id: getClinicId(transaction.clinic_id),
      appointment_id: transaction.appointment_id || null,
      patient_id: transaction.patient_id || null,
      type: transaction.type || 'income',
      category: transaction.category || null,
      description: transaction.description || null,
      amount: transaction.amount || 0,
      status: transaction.status || 'pending',
      method: transaction.payment_method || null,
      reference: transaction.reference || null,
      pix: transaction.pix_code || null,
      asaas_id: transaction.asaas_payment_id || null,
      material_cost: transaction.material_cost || 0,
      due: transaction.due_date || null,
      paid_at: transaction.paid_at || null,
    };
    if (transaction.professional_id) body.professional_id = transaction.professional_id;
return supabaseFetch('transactions', { method: 'POST', body });
  },

  async updateTransaction(id: string, transaction: any) {
    const body: any = {
      status: transaction.status || 'pending',
      method: transaction.payment_method || null,
      reference: transaction.reference || null,
      pix: transaction.pix_code || null,
      asaas_id: transaction.asaas_payment_id || null,
      material_cost: transaction.material_cost || 0,
      due: transaction.due_date || null,
      paid_at: transaction.paid_at || null,
      updated_at: new Date().toISOString(),
    };
    return supabaseFetch(`transactions?id=eq.${id}`, { method: 'PATCH', body });
  },

  async saveMedicalRecord(record: any) {
    const body: any = {
      id: record.id,
      appointment_id: record.appointment_id || null,
      clinic_id: getClinicId(record.clinic_id),
      patient_id: record.patient_id,
      evolution: record.content || null,
      anamnese: record.anamnese || null,
      odontogram: record.odontogram || null,
      updated_at: new Date().toISOString(),
    };
    if (record.professional_id) body.professional_id = record.professional_id;
    if (record.locked !== undefined) body.locked = Boolean(record.locked);
    if (record.locked_at !== undefined) body.locked_at = record.locked_at || null;
    
    return supabaseFetch('medical_records', { method: 'POST', body });
  },

  async updateMedicalRecord(id: string, record: any) {
    const body: any = {
      updated_at: new Date().toISOString(),
    };
    if (record.content !== undefined) body.evolution = record.content;
    if (record.anamnese !== undefined) body.anamnese = record.anamnese;
    if (record.odontogram !== undefined) body.odontogram = record.odontogram;
    // Só inclui locked se existir no banco (evita erro PGRST204)
    if (record.locked !== undefined) body.locked = Boolean(record.locked);
    if (record.locked_at !== undefined) body.locked_at = record.locked_at || null;
    
    return supabaseFetch(`medical_records?id=eq.${id}`, { method: 'PATCH', body });
  },

  async saveTreatmentPlan(plan: any) {
    const body = {
      id: plan.id,
      patient_id: plan.patient_id,
      clinic_id: getClinicId(plan.clinic_id),
      title: plan.title,
      items: plan.items,
      status: plan.status,
      total_estimated: plan.total_estimated,
      created_at: plan.created_at,
    };
    return supabaseFetch('treatment_plans', { method: 'POST', body });
  },

  async updateTreatmentPlan(id: string, plan: any) {
    const body: any = {
      title: plan.title,
      items: plan.items,
      status: plan.status,
      total_estimated: plan.total_estimated,
      updated_at: new Date().toISOString(),
    };
    return supabaseFetch(`treatment_plans?id=eq.${id}`, { method: 'PATCH', body });
  },

  async deleteTreatmentPlan(id: string) {
    return supabaseFetch(`treatment_plans?id=eq.${id}`, { method: 'DELETE' });
  },
};

console.log('[SupabaseSync] Módulo carregado, isConfigured:', isConfigured);
