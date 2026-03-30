// ============================================
// Supabase Sync - Sincronização de dados
// ============================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gzcimnredlffqyogxzqq.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-NOExiRGRb1XcRAMEgkTzQ_9d1AGmtK';

const isConfigured = !!(SUPABASE_URL && SUPABASE_KEY);

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Prefer': 'return=representation',
});

const getBaseUrl = () => `${SUPABASE_URL}/rest/v1`;

// Generic fetch wrapper
async function supabaseFetch(table: string, options: {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: any;
  filters?: string;
} = {}) {
  if (!isConfigured) {
    console.warn('[SupabaseSync] Supabase não configurado');
    return { data: null, error: 'Not configured' };
  }

  const { method = 'GET', body, filters } = options;
  const url = `${getBaseUrl()}/${table}${filters || ''}`;

  try {
    const response = await fetch(url, {
      method,
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[SupabaseSync] Erro ${method} ${table}:`, error);
      return { data: null, error };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err: any) {
    console.error(`[SupabaseSync] Exception ${method} ${table}:`, err.message);
    return { data: null, error: err.message };
  }
}

// ============================================
// Tabelas do Supabase
// ============================================

export const SupabaseSync = {
  // ---------- PATIENTS ----------
  async loadPatients(clinicId: string) {
    const { data, error } = await supabaseFetch('patients', {
      filters: `?clinic_id=eq.${clinicId}&select=*&order=created_at.desc`,
    });
    if (error) return [];
    return data || [];
  },

  async savePatient(patient: any) {
    const { data, error } = await supabaseFetch('patients', {
      method: 'POST',
      body: patient,
    });
    return { data, error };
  },

  async updatePatient(id: string, patient: any) {
    const { data, error } = await supabaseFetch(`patients?id=eq.${id}`, {
      method: 'PATCH',
      body: patient,
    });
    return { data, error };
  },

  async deletePatient(id: string) {
    const { data, error } = await supabaseFetch(`patients?id=eq.${id}`, {
      method: 'DELETE',
    });
    return { data, error };
  },

  // ---------- PROFESSIONALS ----------
  async loadProfessionals(clinicId: string) {
    const { data, error } = await supabaseFetch('professionals', {
      filters: `?clinic_id=eq.${clinicId}&select=*&order=name.asc`,
    });
    if (error) return [];
    return data || [];
  },

  async saveProfessional(professional: any) {
    const { data, error } = await supabaseFetch('professionals', {
      method: 'POST',
      body: professional,
    });
    return { data, error };
  },

  async updateProfessional(id: string, professional: any) {
    const { data, error } = await supabaseFetch(`professionals?id=eq.${id}`, {
      method: 'PATCH',
      body: professional,
    });
    return { data, error };
  },

  async deleteProfessional(id: string) {
    const { data, error } = await supabaseFetch(`professionals?id=eq.${id}`, {
      method: 'DELETE',
    });
    return { data, error };
  },

  // ---------- APPOINTMENTS ----------
  async loadAppointments(clinicId: string) {
    const { data, error } = await supabaseFetch('appointments', {
      filters: `?clinic_id=eq.${clinicId}&select=*&order=scheduled_at.desc`,
    });
    if (error) return [];
    return data || [];
  },

  async saveAppointment(appointment: any) {
    const { data, error } = await supabaseFetch('appointments', {
      method: 'POST',
      body: appointment,
    });
    return { data, error };
  },

  async updateAppointment(id: string, appointment: any) {
    const { data, error } = await supabaseFetch(`appointments?id=eq.${id}`, {
      method: 'PATCH',
      body: appointment,
    });
    return { data, error };
  },

  async deleteAppointment(id: string) {
    const { data, error } = await supabaseFetch(`appointments?id=eq.${id}`, {
      method: 'DELETE',
    });
    return { data, error };
  },

  // ---------- SERVICES ----------
  async loadServices(clinicId: string) {
    const { data, error } = await supabaseFetch('services', {
      filters: `?clinic_id=eq.${clinicId}&select=*&order=name.asc`,
    });
    if (error) return [];
    return data || [];
  },

  async saveService(service: any) {
    const { data, error } = await supabaseFetch('services', {
      method: 'POST',
      body: service,
    });
    return { data, error };
  },

  async updateService(id: string, service: any) {
    const { data, error } = await supabaseFetch(`services?id=eq.${id}`, {
      method: 'PATCH',
      body: service,
    });
    return { data, error };
  },

  async deleteService(id: string) {
    const { data, error } = await supabaseFetch(`services?id=eq.${id}`, {
      method: 'DELETE',
    });
    return { data, error };
  },

  // ---------- STOCK ----------
  async loadStock(clinicId: string) {
    const { data, error } = await supabaseFetch('stock_items', {
      filters: `?clinic_id=eq.${clinicId}&select=*&order=name.asc`,
    });
    if (error) return [];
    return data || [];
  },

  async saveStockItem(item: any) {
    const { data, error } = await supabaseFetch('stock_items', {
      method: 'POST',
      body: item,
    });
    return { data, error };
  },

  async updateStockItem(id: string, item: any) {
    const { data, error } = await supabaseFetch(`stock_items?id=eq.${id}`, {
      method: 'PATCH',
      body: item,
    });
    return { data, error };
  },

  async deleteStockItem(id: string) {
    const { data, error } = await supabaseFetch(`stock_items?id=eq.${id}`, {
      method: 'DELETE',
    });
    return { data, error };
  },

  // ---------- TRANSACTIONS ----------
  async loadTransactions(clinicId: string) {
    const { data, error } = await supabaseFetch('transactions', {
      filters: `?clinic_id=eq.${clinicId}&select=*&order=date.desc`,
    });
    if (error) return [];
    return data || [];
  },

  async saveTransaction(transaction: any) {
    const { data, error } = await supabaseFetch('transactions', {
      method: 'POST',
      body: transaction,
    });
    return { data, error };
  },

  async updateTransaction(id: string, transaction: any) {
    const { data, error } = await supabaseFetch(`transactions?id=eq.${id}`, {
      method: 'PATCH',
      body: transaction,
    });
    return { data, error };
  },

  async deleteTransaction(id: string) {
    const { data, error } = await supabaseFetch(`transactions?id=eq.${id}`, {
      method: 'DELETE',
    });
    return { data, error };
  },

  // ---------- MEDICAL RECORDS ----------
  async loadMedicalRecords(clinicId: string) {
    const { data, error } = await supabaseFetch('medical_records', {
      filters: `?clinic_id=eq.${clinicId}&select=*`,
    });
    if (error) return [];
    return data || [];
  },

  async saveMedicalRecord(record: any) {
    const { data, error } = await supabaseFetch('medical_records', {
      method: 'POST',
      body: record,
    });
    return { data, error };
  },

  async updateMedicalRecord(id: string, record: any) {
    const { data, error } = await supabaseFetch(`medical_records?id=eq.${id}`, {
      method: 'PATCH',
      body: record,
    });
    return { data, error };
  },

  // ---------- ANAMNESE ----------
  async loadAnamnese(clinicId: string) {
    const { data, error } = await supabaseFetch('anamnese', {
      filters: `?clinic_id=eq.${clinicId}&select=*`,
    });
    if (error) return [];
    return data || [];
  },

  async saveAnamnese(anamnese: any) {
    const { data, error } = await supabaseFetch('anamnese', {
      method: 'POST',
      body: anamnese,
    });
    return { data, error };
  },

  async updateAnamnese(id: string, anamnese: any) {
    const { data, error } = await supabaseFetch(`anamnese?id=eq.${id}`, {
      method: 'PATCH',
      body: anamnese,
    });
    return { data, error };
  },
};

console.log('[SupabaseSync] Módulo carregado, isConfigured:', isConfigured);
