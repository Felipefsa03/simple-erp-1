// ============================================
// Clinxia ERP — Main Clinic Store (Zustand)
// ============================================
import { create } from 'zustand';
import type {
    Patient, Appointment, AppointmentStatus, MedicalRecord,
    StockItem, StockMovement, FinancialTransaction, TransactionStatus,
    Service, AuditLog, OdontogramEntry, AnamneseData,
    TreatmentPlan, TreatmentPlanItem, NavigationContext, User, AppointmentMaterial, DomainEventType,
    WaitingListEntry, AppointmentRecurrence, AppointmentConfirmation, AnamneseFormLink,
    DigitalSignature, ClinicalDocument, AutomationRule, AutomationRun, Lead, FunnelStage, IntegrationConfig,
    Insurance, Branch, Account, Invoice, FinancialCategory, AccountStatus, InvoiceStatus
} from '@/types';
import { useEventBus } from '@/stores/eventBus';
import { useAuth } from '@/hooks/useAuth';
import { uid, now } from '@/lib/utils';
import { SupabaseSync } from '@/lib/supabaseSync';
import { isSupabaseConfigured } from '@/lib/supabase';
import { isSupabaseEnvConfigured } from '@/lib/supabaseConfig';
import { toast } from '@/hooks/useShared';

// Proxy handles routing: Vite dev proxy in dev, Vercel rewrites in production
const CLINIC_API_BASE = import.meta.env.VITE_URL_BASE_API_VITE || '';

// Formatar telefone para padrão brasileiro WhatsApp (55 + DDD + 9 + Numero)
const formatPhoneForWhatsApp = (phone: string | undefined | null): string => {
    if (!phone) return '';
    
    // Remove tudo que não é número
    let digits = phone.replace(/\D/g, '');
    
    // Remove zeros à esquerda
    digits = digits.replace(/^0+/, '');
    
    // Se vazio após limpeza
    if (!digits) return '';
    
    // Se já tem 13 dígitos e começa com 55
    if (digits.length === 13 && digits.startsWith('55')) {
        // Verifica se o 9 está na posição correta (após o DDD)
        const afterDdd = digits.slice(4);
        // Se o primeiro dígito após DDD não é 9, insere o 9
        if (!afterDdd.startsWith('9')) {
            const ddd = digits.slice(2, 4);
            return '55' + ddd + '9' + afterDdd.slice(1);
        }
        return digits;
    }
    
    // Se tem 12 dígitos e começa com 55, precisa inserir o 9
    if (digits.length === 12 && digits.startsWith('55')) {
        const ddd = digits.slice(2, 4);
        const number = digits.slice(4);
        return '55' + ddd + '9' + number;
    }
    
    // Se tem 11 dígitos (DDD + 9 + 8 números), adiciona 55
    if (digits.length === 11) {
        const ddd = digits.slice(0, 2);
        const afterDdd = digits.slice(2);
        if (afterDdd.startsWith('9')) {
            return '55' + digits;
        }
        // Se não tem 9, insere após o DDD
        return '55' + ddd + '9' + afterDdd.slice(1);
    }
    
    // Se tem 10 dígitos (DDD + 8 números sem 9), adiciona 55 e insere o 9
    if (digits.length === 10) {
        const ddd = digits.slice(0, 2);
        const number = digits.slice(2);
        return '55' + ddd + '9' + number;
    }
    
    // Para outros casos com pelo menos 8 dígitos
    if (digits.length >= 8) {
        if (!digits.startsWith('55')) {
            return '55' + digits;
        }
        return digits;
    }
    
    return digits;
};
const EMPTY_NAV_CONTEXT: NavigationContext = {};
const emitEvent = (type: DomainEventType, payload: Record<string, any>) => {
    useEventBus.getState().emit(type, payload);
};

const ensureArray = <T,>(value: unknown, fallback: T[] = []): T[] => (
    Array.isArray(value) ? value as T[] : fallback
);

const normalizePatients = (value: unknown): Patient[] =>
    ensureArray<Patient>(value).map(p => ({
        ...p,
        phone: formatPhoneForWhatsApp(p.phone), // Formatar telefone automaticamente
        tags: Array.isArray(p.tags) ? p.tags : [],
        allergies: Array.isArray(p.allergies) ? p.allergies : [],
    }));

const ensureObject = <T extends Record<string, any>>(value: unknown, fallback: T): T => (
    value && typeof value === 'object' ? value as T : fallback
);

// ============================================
// Supabase Sync - Funções de sincronização
// ============================================

let lastSyncedClinicId = '';

const syncWithSupabaseInternal = async (clinicId: string, set: any, get: any) => {
    // Só pular se já sincronizou esta clínica específica
    if (lastSyncedClinicId === clinicId) {
        console.log('[ClinicStore] ⏭️ Já sincronizado para esta clínica, pulando...');
        return;
    }
    // Marcar como sincronizado no início para evitar race conditions
    lastSyncedClinicId = clinicId;
    
    console.log('[ClinicStore] 🔄 Iniciando sincronização com Supabase para:', clinicId);
    
    try {
        // Carregar info da clínica para checar se é filial
        const { data: clinicInfo } = await SupabaseSync.loadClinic(clinicId);
        const parentId = clinicInfo?.parent_id;

        // Carregar pacientes - Se for filial, carrega do pai
        const patients = await SupabaseSync.loadPatients(clinicId, parentId);
        set({ patients: normalizePatients(patients) });
        console.log('[ClinicStore] ✅ Pacientes carregados:', patients.length, parentId ? '(compartilhados)' : '');

        // Carregar filiais (apenas se for a matriz)
        if (!parentId) {
            const branches = await SupabaseSync.loadBranches(clinicId);
            set({ branches });
            console.log('[ClinicStore] ✅ Filiais carregadas:', branches.length);
        } else {
            set({ branches: [] });
        }

        // Carregar profissionais - SEMPRE sobrescrever
        const professionals = await SupabaseSync.loadProfessionals(clinicId);
        set({ professionals });
        console.log('[ClinicStore] ✅ Profissionais carregados:', professionals.length);

        // Carregar agendamentos - SEMPRE sobrescrever
        const appointments = await SupabaseSync.loadAppointments(clinicId);
        set({ appointments });
        console.log('[ClinicStore] ✅ Agendamentos carregados:', appointments.length);

        // Carregar serviços - SEMPRE sobrescrever
        const services = await SupabaseSync.loadServices(clinicId);
        set({ services });
        console.log('[ClinicStore] ✅ Serviços carregados:', services.length);

        // Carregar estoque - SEMPRE sobrescrever
        const stockItems = await SupabaseSync.loadStock(clinicId);
        set({ stockItems });
        console.log('[ClinicStore] ✅ Estoque carregado:', stockItems.length);

        // Carregar transações
        const transactions = await SupabaseSync.loadTransactions(clinicId);
        set({ transactions });
        console.log('[ClinicStore] ✅ Transações carregadas:', transactions.length);

        // Carregar contas a pagar/receber
        const accounts = await SupabaseSync.loadAccounts(clinicId);
        set({ accounts });
        console.log('[ClinicStore] ✅ Contas carregadas:', accounts.length);

        // Carregar notas fiscais
        const invoices = await SupabaseSync.loadInvoices(clinicId);
        set({ invoices });
        console.log('[ClinicStore] ✅ Notas fiscais carregadas:', invoices.length);

        // Carregar categorias financeiras
        const financialCategories = await SupabaseSync.loadFinancialCategories(clinicId);
        set({ financialCategories });
        console.log('[ClinicStore] ✅ Categorias financeiras carregadas:', financialCategories.length);


        // Carregar prontuários
        const medicalRecords = await SupabaseSync.loadMedicalRecords(clinicId);
        set({ medicalRecords });
        
        // Carregar planos de tratamento
        const treatmentPlans = await SupabaseSync.loadTreatmentPlans(clinicId);
        set({ treatmentPlans });
        console.log('[ClinicStore] ✅ Planos de tratamento carregados:', treatmentPlans.length);

        // Carregar movimentos de estoque
        const stockMovements = await SupabaseSync.loadStockMovements(clinicId);
        set({ stockMovements });
        console.log('[ClinicStore] ✅ Movimentos de estoque carregados:', stockMovements.length);

        // Carregar logs de auditoria
        const auditLogs = await SupabaseSync.loadAuditLogs(clinicId);
        set({ auditLogs });
        console.log('[ClinicStore] ✅ Logs de auditoria carregados:', auditLogs.length);

        // Carregar dados da clínica (preferências de notificação)
        try {
            const { data: clinicData } = await SupabaseSync.loadClinic(clinicId);
            if (clinicData?.notification_settings) {
                set({ notificationPrefs: clinicData.notification_settings });
                console.log('[ClinicStore] ✅ Preferências de notificação carregadas');
            }
        } catch (e) {
            console.error('[ClinicStore] Erro ao carregar dados da clínica:', e);
        }
        
        // Mapear dados específicos de prontuário para o estado local
        const anamneseData: Record<string, any> = {};
        const odontogramData: Record<string, any> = {};
        medicalRecords.forEach(r => {
            if (r.anamnese) anamneseData[r.patient_id] = r.anamnese;
            if (r.odontogram) odontogramData[r.patient_id] = r.odontogram;
        });
        set({ anamneseData, odontogramData });
        
        console.log('[ClinicStore] ✅ Prontuários carregados:', medicalRecords.length);

        // Carregar integração config
        const integrationConfig = await SupabaseSync.loadIntegrationConfig(clinicId);
        if (integrationConfig) {
            set({ integrationConfig });
            console.log('[ClinicStore] ✅ Configuração de integração carregada');
        }

        console.log('[ClinicStore] ✅ Sincronização completa!');
    } catch (error) {
        console.error('[ClinicStore] ❌ Erro na sincronização:', error);
    }
};

// Wrapper para salvar no Supabase e atualizar estado local
const saveToSupabase = async (type: 'patient' | 'professional' | 'appointment' | 'service' | 'stock' | 'transaction' | 'medical_record' | 'treatment_plan' | 'stock_movement' | 'audit_log' | 'account' | 'invoice' | 'financial_category', data: any, isNew: boolean = true, isDelete: boolean = false) => {
    try {
        let result: any = null;
        
        switch (type) {
            case 'patient':
                if (isDelete) result = await SupabaseSync.deletePatient(data.id);
                else result = isNew ? await SupabaseSync.savePatient(data) : await SupabaseSync.updatePatient(data.id, data);
                break;
            case 'professional':
                if (isDelete) result = await SupabaseSync.deleteProfessional(data.id);
                else result = isNew ? await SupabaseSync.saveProfessional(data) : await SupabaseSync.updateProfessional(data.id, data);
                break;
            case 'appointment':
                if (isDelete) result = await SupabaseSync.deleteAppointment(data.id);
                else result = isNew ? await SupabaseSync.saveAppointment(data) : await SupabaseSync.updateAppointment(data.id, data);
                break;
            case 'service':
                if (isDelete) result = await SupabaseSync.deleteService(data.id);
                else result = isNew ? await SupabaseSync.saveService(data) : await SupabaseSync.updateService(data.id, data);
                break;
            case 'stock':
                if (isDelete) result = await SupabaseSync.deleteStockItem(data.id);
                else result = isNew ? await SupabaseSync.saveStockItem(data) : await SupabaseSync.updateStockItem(data.id, data);
                break;
            case 'transaction':
                if (isDelete) result = await SupabaseSync.deleteTransaction(data.id);
                else result = isNew ? await SupabaseSync.saveTransaction(data) : await SupabaseSync.updateTransaction(data.id, data);
                break;
            case 'medical_record':
                if (isDelete) result = await SupabaseSync.deleteMedicalRecord(data.id);
                else result = isNew ? await SupabaseSync.saveMedicalRecord(data) : await SupabaseSync.updateMedicalRecord(data.id, data);
                break;
            case 'treatment_plan':
                if (isDelete) result = await SupabaseSync.deleteTreatmentPlan(data.id);
                else result = isNew ? await SupabaseSync.saveTreatmentPlan(data) : await SupabaseSync.updateTreatmentPlan(data.id, data);
                break;
            case 'stock_movement':
                result = await SupabaseSync.saveStockMovement(data);
                break;
            case 'audit_log':
                result = await SupabaseSync.saveAuditLog(data);
                break;
            case 'account':
                if (isDelete) result = await SupabaseSync.deleteAccount(data.id);
                else result = isNew ? await SupabaseSync.saveAccount(data) : await SupabaseSync.updateAccount(data.id, data);
                break;
            case 'invoice':
                if (isDelete) result = await SupabaseSync.deleteInvoice(data.id);
                else result = isNew ? await SupabaseSync.saveInvoice(data) : await SupabaseSync.updateInvoice(data.id, data);
                break;
            case 'financial_category':
                if (isDelete) result = await SupabaseSync.deleteFinancialCategory(data.id);
                else result = isNew ? await SupabaseSync.saveFinancialCategory(data) : { error: 'Update not implemented' };
                break;
            default:
                break;
        }

        if (result?.error) {
            // Notificar usuário sobre a falha para não ocorrer erro silencioso
            toast(`Erro de sincronização: Não foi possível salvar no servidor. Os dados podem estar inconsistentes.`, 'error');
            console.error(`[ClinicStore] Erro retornado ao salvar ${type}:`, result.error);
            // Aqui poderíamos disparar rollback de estado se fosse uma store centralizada com state history
            return { error: result.error };
        }
        
        return result;
    } catch (error) {
        console.error(`[ClinicStore] Erro fatal ao salvar ${type} no Supabase:`, error);
        toast(`Erro crítico ao conectar com o servidor. Verifique sua internet.`, 'error');
        
        // Disparar evento para uma fila de retry offline
        useEventBus.getState().emit('SYNC_ERROR', { type, data, isNew, isDelete, error });
        
        return { error };
    }
};

// ---- DEMO DATA ----
const DEMO_PROFESSIONALS: User[] = [
    { id: 'prof-1', name: 'Dr. Lucas Silva', email: 'lucas@lumina.com.br', role: 'dentist', clinic_id: 'clinic-1', commission_pct: 40, created_at: '2025-01-15' },
    { id: 'prof-2', name: 'Dra. Julia Paiva', email: 'julia@lumina.com.br', role: 'dentist', clinic_id: 'clinic-1', commission_pct: 35, created_at: '2025-02-01' },
    { id: 'prof-3', name: 'Mariana Costa', email: 'mariana@lumina.com.br', role: 'aesthetician', clinic_id: 'clinic-1', commission_pct: 30, created_at: '2025-02-15' },
    { id: 'prof-4', name: 'Fernanda Lima', email: 'fernanda@lumina.com.br', role: 'receptionist', clinic_id: 'clinic-1', commission_pct: 0, created_at: '2025-03-01' },
];

const DEMO_PATIENTS: Patient[] = [
    { id: 'pat-1', clinic_id: 'clinic-1', name: 'Ana Paula Souza', cpf: '123.456.789-00', phone: '(11) 98765-4321', email: 'ana.paula@email.com', birth_date: '1998-05-15', allergies: ['Penicilina', 'Corantes'], tags: ['Ortodontia', 'Premium'], status: 'active', last_visit: '2026-02-12', created_at: '2025-06-10' },
    { id: 'pat-2', clinic_id: 'clinic-1', name: 'Carlos Eduardo Lima', cpf: '987.654.321-00', phone: '(11) 91234-5678', email: 'carlos.edu@email.com', birth_date: '1985-11-20', allergies: [], tags: ['Limpeza'], status: 'inactive', last_visit: '2026-01-28', created_at: '2025-07-01' },
    { id: 'pat-3', clinic_id: 'clinic-1', name: 'Juliana Mendes', phone: '(11) 99887-7665', email: 'ju.mendes@email.com', birth_date: '1992-03-08', allergies: [], tags: ['Estética', 'Botox'], status: 'active', last_visit: '2026-02-05', created_at: '2025-08-15' },
    { id: 'pat-4', clinic_id: 'clinic-1', name: 'Ricardo Oliveira', phone: '(11) 97766-5544', email: 'ricardo.o@email.com', birth_date: '1978-09-30', allergies: ['Dipirona'], tags: ['Implante'], status: 'risk', last_visit: '2025-12-15', created_at: '2025-05-20' },
    { id: 'pat-5', clinic_id: 'clinic-1', name: 'Beatriz Santos', phone: '(11) 96655-4433', email: 'beatriz.s@email.com', birth_date: '2001-01-12', allergies: [], tags: ['Ortodontia'], status: 'active', last_visit: '2026-02-20', created_at: '2025-09-01' },
];

const DEMO_SERVICES: Service[] = [
    { id: 'svc-1', clinic_id: 'clinic-1', name: 'Consulta de Avaliação', category: 'Consulta', avg_duration_min: 30, base_price: 150, estimated_cost: 20, materials: [], active: true },
    { id: 'svc-2', clinic_id: 'clinic-1', name: 'Limpeza e Profilaxia', category: 'Preventivo', avg_duration_min: 60, base_price: 250, estimated_cost: 45, materials: [{ stock_item_id: 'stk-5', stock_item_name: 'Sugador Descartável', qty_per_use: 2 }], active: true },
    { id: 'svc-3', clinic_id: 'clinic-1', name: 'Restauração em Resina', category: 'Restaurador', avg_duration_min: 45, base_price: 350, estimated_cost: 95, materials: [{ stock_item_id: 'stk-1', stock_item_name: 'Resina Composta A2', qty_per_use: 1 }, { stock_item_id: 'stk-3', stock_item_name: 'Anestésico Lidocaína', qty_per_use: 2 }], active: true },
    { id: 'svc-4', clinic_id: 'clinic-1', name: 'Botox', category: 'Estética', avg_duration_min: 120, base_price: 1800, estimated_cost: 400, materials: [], active: true },
    { id: 'svc-5', clinic_id: 'clinic-1', name: 'Alinhadores Invisíveis', category: 'Ortodontia', avg_duration_min: 60, base_price: 1200, estimated_cost: 300, materials: [], active: true },
    { id: 'svc-6', clinic_id: 'clinic-1', name: 'Implante Dentário', category: 'Implante', avg_duration_min: 90, base_price: 3500, estimated_cost: 1200, materials: [], active: true },
];

const todayStr = new Date().toISOString().split('T')[0];
const DEMO_APPOINTMENTS: Appointment[] = [
    { id: 'apt-1', clinic_id: 'clinic-1', patient_id: 'pat-1', patient_name: 'Ana Paula Souza', professional_id: 'prof-1', professional_name: 'Dr. Lucas Silva', service_id: 'svc-2', service_name: 'Limpeza e Profilaxia', scheduled_at: `${todayStr}T09:00:00`, duration_min: 60, status: 'confirmed', base_value: 250, created_at: '2026-02-25' },
    { id: 'apt-2', clinic_id: 'clinic-1', patient_id: 'pat-2', patient_name: 'Carlos Eduardo Lima', professional_id: 'prof-1', professional_name: 'Dr. Lucas Silva', service_id: 'svc-1', service_name: 'Consulta de Avaliação', scheduled_at: `${todayStr}T10:30:00`, duration_min: 45, status: 'scheduled', base_value: 150, created_at: '2026-02-26' },
    { id: 'apt-3', clinic_id: 'clinic-1', patient_id: 'pat-3', patient_name: 'Juliana Mendes', professional_id: 'prof-3', professional_name: 'Mariana Costa', service_id: 'svc-4', service_name: 'Botox', scheduled_at: `${todayStr}T14:00:00`, duration_min: 120, status: 'confirmed', base_value: 1800, created_at: '2026-02-27' },
    { id: 'apt-4', clinic_id: 'clinic-1', patient_id: 'pat-4', patient_name: 'Ricardo Oliveira', professional_id: 'prof-2', professional_name: 'Dra. Julia Paiva', service_id: 'svc-6', service_name: 'Implante Dentário', scheduled_at: `${todayStr}T16:30:00`, duration_min: 90, status: 'confirmed', base_value: 3500, created_at: '2026-02-28' },
];

const DEMO_STOCK: StockItem[] = [
    { id: 'stk-1', clinic_id: 'clinic-1', name: 'Resina Composta A2', category: 'Consumíveis', quantity: 45, min_quantity: 10, unit: 'un', unit_cost: 85, created_at: '2025-06-01' },
    { id: 'stk-2', clinic_id: 'clinic-1', name: 'Luvas de Procedimento (M)', category: 'EPI', quantity: 12, min_quantity: 20, unit: 'caixas', unit_cost: 45, created_at: '2025-06-01' },
    { id: 'stk-3', clinic_id: 'clinic-1', name: 'Anestésico Lidocaína', category: 'Medicamentos', quantity: 8, min_quantity: 15, unit: 'caixas', unit_cost: 120, created_at: '2025-06-01' },
    { id: 'stk-4', clinic_id: 'clinic-1', name: 'Máscara Descartável', category: 'EPI', quantity: 150, min_quantity: 50, unit: 'un', unit_cost: 1.50, created_at: '2025-06-01' },
    { id: 'stk-5', clinic_id: 'clinic-1', name: 'Sugador Descartável', category: 'Consumíveis', quantity: 500, min_quantity: 100, unit: 'un', unit_cost: 0.25, created_at: '2025-06-01' },
];

const DEMO_TRANSACTIONS: FinancialTransaction[] = [
    { id: 'txn-1', clinic_id: 'clinic-1', patient_id: 'pat-1', patient_name: 'Ana Paula Souza', professional_id: 'prof-1', professional_name: 'Dr. Lucas Silva', type: 'income', category: 'Procedimento', description: 'Ana Paula Souza - Alinhadores', amount: 1200, status: 'paid', idempotency_key: uid(), created_at: todayStr, paid_at: todayStr },
    { id: 'txn-2', clinic_id: 'clinic-1', type: 'expense', category: 'Material', description: 'Dental Cremer - Resinas', amount: 450, status: 'paid', idempotency_key: uid(), created_at: todayStr, paid_at: todayStr },
    { id: 'txn-3', clinic_id: 'clinic-1', patient_id: 'pat-2', patient_name: 'Carlos Eduardo Lima', type: 'income', category: 'Procedimento', description: 'Carlos Eduardo - Avaliação', amount: 150, status: 'pending', idempotency_key: uid(), created_at: '2026-03-01' },
    { id: 'txn-4', clinic_id: 'clinic-1', type: 'expense', category: 'Aluguel', description: 'Condomínio Ed. Medical', amount: 2800, status: 'paid', idempotency_key: uid(), created_at: '2026-02-05', paid_at: '2026-02-05' },
    { id: 'txn-5', clinic_id: 'clinic-1', patient_id: 'pat-3', patient_name: 'Juliana Mendes', professional_id: 'prof-3', professional_name: 'Mariana Costa', type: 'income', category: 'Procedimento', description: 'Juliana Mendes - Botox', amount: 1800, status: 'paid', idempotency_key: uid(), created_at: '2026-02-04', paid_at: '2026-02-04' },
];

const DEMO_FUNNEL_STAGES: FunnelStage[] = [
    { id: 'funnel-1', clinic_id: 'clinic-1', name: 'Novo Lead', order: 1, color: '#2563eb' },
    { id: 'funnel-2', clinic_id: 'clinic-1', name: 'Contato Realizado', order: 2, color: '#0891b2' },
    { id: 'funnel-3', clinic_id: 'clinic-1', name: 'Orcamento Enviado', order: 3, color: '#f59e0b' },
    { id: 'funnel-4', clinic_id: 'clinic-1', name: 'Fechado', order: 4, color: '#10b981' },
];

const DEMO_AUTOMATION_RULES: AutomationRule[] = [
    {
        id: 'rule-1',
        clinic_id: 'clinic-1',
        name: 'NPS pos-consulta',
        type: 'nps',
        channel: 'whatsapp',
        enabled: true,
        trigger: { event: 'appointment_done', delay_hours: 24 },
        template: 'Ola {{nome}}, como foi sua experiencia hoje? Responda com uma nota de 0 a 10.',
        created_at: '2026-02-10',
    },
    {
        id: 'rule-2',
        clinic_id: 'clinic-1',
        name: 'Reativacao 90 dias',
        type: 'reactivation',
        channel: 'whatsapp',
        enabled: true,
        trigger: { event: 'patient_inactive', inactivity_days: 90 },
        template: 'Sentimos sua falta, {{nome}}. Temos horarios disponiveis para seu retorno.',
        created_at: '2026-02-10',
    },
];

const DEMO_LEADS: Lead[] = [
    {
        id: 'lead-1',
        clinic_id: 'clinic-1',
        name: 'Patricia Campos',
        phone: '(11) 98888-0001',
        email: 'patricia.campos@email.com',
        source: 'instagram',
        interested_service: 'Clareamento',
        score: 78,
        owner_id: 'prof-4',
        stage_id: 'funnel-1',
        created_at: '2026-03-01',
        updated_at: '2026-03-01',
    },
    {
        id: 'lead-2',
        clinic_id: 'clinic-1',
        name: 'Rafael Prado',
        phone: '(11) 97777-0002',
        email: 'rafael.prado@email.com',
        source: 'google_ads',
        interested_service: 'Implante',
        score: 90,
        owner_id: 'prof-1',
        stage_id: 'funnel-3',
        created_at: '2026-03-02',
        updated_at: '2026-03-03',
    },
];

// ---- STORE INTERFACE ----
interface ClinicStore {
    // Data
    professionals: User[];
    patients: Patient[];
    appointments: Appointment[];
    services: Service[];
    stockItems: StockItem[];
    stockMovements: StockMovement[];
    transactions: FinancialTransaction[];
    medicalRecords: MedicalRecord[];
    odontogramData: Record<string, OdontogramEntry[]>; // keyed by patient_id
    anamneseData: Record<string, AnamneseData>; // keyed by patient_id
    treatmentPlans: TreatmentPlan[];
    auditLogs: AuditLog[];
    appointmentMaterials: Record<string, AppointmentMaterial[]>; // keyed by appointment_id
    finalizingAppointments: Record<string, boolean>;
    notificationPrefs: Record<string, boolean>;
    patientPhotos: Record<string, string[]>; // keyed by patient_id
    waitingList: WaitingListEntry[];
    recurrences: AppointmentRecurrence[];
    appointmentConfirmations: AppointmentConfirmation[];
    anamneseLinks: AnamneseFormLink[];
    signatures: DigitalSignature[];
    clinicalDocuments: ClinicalDocument[];
    automationRules: AutomationRule[];
    automationRuns: AutomationRun[];
    leads: Lead[];
    funnelStages: FunnelStage[];
    integrationConfig: IntegrationConfig;
    accounts: Account[];
    invoices: Invoice[];
    financialCategories: FinancialCategory[];
    navigationContext: NavigationContext;

    // Patient Actions
    addPatient: (p: Omit<Patient, 'id' | 'created_at'>) => Patient;
    updatePatient: (id: string, data: Partial<Patient>) => void;
    deletePatient: (id: string) => void;
    importPatients: (patients: Omit<Patient, 'id' | 'created_at'>[]) => number;
    getPatient: (id: string) => Patient | undefined;

    // Sync Actions
    syncWithSupabase: () => void;
    clearSyncCache: () => void;
    loadAllData: () => Promise<void>;

    // Appointment Actions
    addAppointment: (a: Omit<Appointment, 'id' | 'created_at'>) => Appointment | null;
    updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
    deleteAppointment: (id: string) => void;
    startAppointment: (id: string) => void;
    finalizeAppointment: (id: string, userId: string, userName: string, treatmentItems?: TreatmentPlanItem[]) => boolean;
    createRecurringAppointments: (input: {
        base: Omit<Appointment, 'id' | 'created_at' | 'scheduled_at'>;
        startDateTime: string;
        frequency: 'weekly' | 'biweekly' | 'monthly';
        occurrences: number;
    }) => Appointment[];
    addToWaitingList: (entry: Omit<WaitingListEntry, 'id' | 'created_at' | 'updated_at' | 'status'>) => WaitingListEntry;
    updateWaitingListStatus: (id: string, status: WaitingListEntry['status']) => void;
    fitWaitingListEntry: (id: string, scheduledAt: string, durationMin?: number) => Appointment | null;
    queueAppointmentConfirmation: (appointmentId: string, channel: AppointmentConfirmation['channel'], message: string) => AppointmentConfirmation | null;
    markAppointmentConfirmation: (confirmationId: string, status: 'sent' | 'failed', providerResponse?: string) => void;

    // Medical Record Actions
    saveEvolution: (appointmentId: string | undefined, patientId: string, clinicId: string, professionalId: string, content: string) => void;
    getRecordsForPatient: (patientId: string) => MedicalRecord[];
    setOdontogramEntry: (patientId: string, entry: OdontogramEntry) => void;
    getOdontogramData: (patientId: string) => OdontogramEntry[];
    saveAnamnese: (data: AnamneseData) => void;
    getAnamnese: (patientId: string) => AnamneseData | undefined;
    generateAnamneseLink: (patientId: string, createdBy?: string, hoursValid?: number) => AnamneseFormLink;
    submitAnamneseByToken: (token: string, data: Omit<AnamneseData, 'patient_id' | 'clinic_id' | 'updated_at'>) => boolean;
    addSignature: (data: Omit<DigitalSignature, 'id' | 'signed_at'>) => DigitalSignature;
    createClinicalDocument: (doc: Omit<ClinicalDocument, 'id' | 'created_at'>) => ClinicalDocument;
    getDocumentsForPatient: (patientId: string) => ClinicalDocument[];

    // Treatment Plan Actions
    addTreatmentPlan: (plan: Omit<TreatmentPlan, 'id' | 'created_at'>) => void;
    updateTreatmentPlan: (planId: string, items: TreatmentPlanItem[]) => void;
    getPlansForPatient: (patientId: string) => TreatmentPlan[];

    // Stock Actions
    addStockItem: (item: Omit<StockItem, 'id' | 'created_at'>) => StockItem;
    updateStockItem: (id: string, data: Partial<StockItem>) => void;
    deleteStockItem: (id: string) => void;
    consumeStock: (items: { stock_item_id: string; qty: number }[], appointmentId: string, userId: string) => void;
    addStockMovement: (movement: Omit<StockMovement, 'id' | 'created_at'>) => void;

    // Financial Actions
    addTransaction: (t: Omit<FinancialTransaction, 'id' | 'created_at'> & { idempotency_key?: string }) => FinancialTransaction;
    processPayment: (id: string, method?: string) => void;
    generatePayment: (id: string, method: string, installments?: number) => void;
    setTransactionAsaasData: (id: string, data: Partial<Pick<FinancialTransaction, 'asaas_payment_id' | 'asaas_status' | 'payment_reference' | 'payment_url' | 'pix_code'>>) => void;
    reconcileTransaction: (id: string, nextStatus: TransactionStatus, payload?: { asaas_status?: string; paid_at?: string }) => void;
    getMonthlyIncome: (clinicId?: string) => number;
    getMonthlyExpenses: (clinicId?: string) => number;
    getBalance: (clinicId?: string) => number;
    
    // Account Actions
    addAccount: (account: Omit<Account, 'id' | 'created_at'>) => Account;
    updateAccount: (id: string, data: Partial<Account>) => void;
    deleteAccount: (id: string) => void;
    markAccountPaid: (id: string, paidAmount?: number) => void;

    // Invoice Actions
    addInvoice: (invoice: Omit<Invoice, 'id' | 'created_at'>) => Invoice;
    updateInvoice: (id: string, data: Partial<Invoice>) => void;
    deleteInvoice: (id: string) => void;

    // Financial Category Actions
    addFinancialCategory: (category: Omit<FinancialCategory, 'id'>) => FinancialCategory;
    deleteFinancialCategory: (id: string) => void;

    // Service Actions
    addService: (s: Omit<Service, 'id'>) => Service;
    updateService: (id: string, data: Partial<Service>) => void;
    deleteService: (id: string) => void;

    // Professional Actions
    addProfessional: (p: Omit<User, 'id' | 'created_at'> & { password?: string }) => User | null;
    updateProfessional: (id: string, data: Partial<User>) => void;
    deleteProfessional: (id: string) => void;
    getProfessionalCommissions: (professionalId: string, month?: string) => { total_produced: number; commission_amount: number; appointment_count: number; pending_commission: number };
    getClinicDRE: (clinicId: string, month: string) => {
        total_income: number;
        total_expenses: number;
        net_profit: number;
        margin_pct: number;
        expenses_by_category: { label: string; value: number; color: string }[];
    };
    getProfessionalStats: (id: string, clinicId?: string) => { appointments: number; revenue: number; ticketMedio: number; noShows: number; attendanceRate: number; topProcedures: { name: string; count: number }[] };

    // Insurance (Convênios) Actions
    insurances: Insurance[];
    addInsurance: (data: Omit<Insurance, 'id' | 'created_at'>) => Insurance;
    updateInsurance: (id: string, data: Partial<Insurance>) => void;
    deleteInsurance: (id: string) => void;

    // Branch (Filiais) Actions
    branches: Branch[];
    addBranch: (data: Omit<Branch, 'id' | 'created_at'>) => Branch;
    updateBranch: (id: string, data: Partial<Branch>) => void;
    deleteBranch: (id: string) => void;

    // WhatsApp Integrations per Clinic (Multi-tenant)
    whatsappIntegrations: Record<string, { connected: boolean; token: string; phoneNumber: string; lastSync: string | null }>;
    setWhatsAppConnected: (clinicId: string, connected: boolean, token?: string, phoneNumber?: string) => void;
    getWhatsAppStatus: (clinicId: string) => { connected: boolean; token: string; phoneNumber: string; lastSync: string | null };

    // WhatsApp System Integration (Global - for password reset, etc.)
    systemWhatsApp: { connected: boolean; token: string; phoneNumber: string; lastSync: string | null };
    setSystemWhatsApp: (connected: boolean, token?: string, phoneNumber?: string) => void;

    // Navigation
    setNavigationContext: (ctx: NavigationContext) => void;
    clearNavigationContext: () => void;

    // Appointment Materials
    setAppointmentMaterials: (appointmentId: string, items: AppointmentMaterial[]) => void;
    getAppointmentMaterials: (appointmentId: string) => AppointmentMaterial[];

    // Notifications
    setNotificationPrefs: (prefs: Record<string, boolean>) => void;
    setNotificationPref: (key: string, value: boolean) => void;
    saveNotificationPrefs: () => Promise<void>;
    setIntegrationConfig: (config: Partial<IntegrationConfig>) => void;

    // Photos
    addPatientPhoto: (patientId: string, dataUrl: string) => void;
    removePatientPhoto: (patientId: string, index: number) => void;

    // Audit
    addAuditLog: (log: Omit<AuditLog, 'id' | 'created_at'>) => void;

    // CRM & Automation
    addAutomationRule: (rule: Omit<AutomationRule, 'id' | 'created_at'>) => AutomationRule;
    updateAutomationRule: (id: string, data: Partial<AutomationRule>) => void;
    addAutomationRun: (run: Omit<AutomationRun, 'id' | 'created_at'>) => AutomationRun;
    addLead: (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => Lead;
    moveLeadStage: (leadId: string, stageId: string) => void;

    // Anamnese Sync
    syncAnamneseWithServer: () => Promise<boolean>;
}

// Debug: Log demo data on load
console.log('[ClinicStore] Loading demo data - professionals:', DEMO_PROFESSIONALS.length, 'patients:', DEMO_PATIENTS.length);

const useRealData = isSupabaseEnvConfigured();
const useDemoData = !useRealData && import.meta.env.DEV;

// Dados reais ou demo baseado na configuração
const INITIAL_DATA = useRealData ? {
    professionals: [],
    patients: [],
    appointments: [],
    services: DEMO_SERVICES,
    stockItems: DEMO_STOCK,
    transactions: [],
} : useDemoData ? {
    professionals: DEMO_PROFESSIONALS,
    patients: DEMO_PATIENTS,
    appointments: DEMO_APPOINTMENTS,
    services: DEMO_SERVICES,
    stockItems: DEMO_STOCK,
    transactions: DEMO_TRANSACTIONS,
} : {
    professionals: [],
    patients: [],
    appointments: [],
    services: [],
    stockItems: [],
    transactions: [],
    accounts: [],
    invoices: [],
    financialCategories: [],
};

console.log(
    '[ClinicStore] Modo:',
    useRealData ? 'REAL (Supabase)' : (useDemoData ? 'DEMO (DEV)' : 'SEM-SUPABASE (PROD)'),
    '- Patients:',
    useRealData ? 'vai carregar do banco' : INITIAL_DATA.patients.length
);

// @ts-ignore - Zustand StateCreator incompatibility with async addAppointment
export const useClinicStore = create<ClinicStore>()(
        (set, get) => {
            // A sincronização é chamada via syncWithSupabase() após login bem-sucedido
            
            return {
            // Initial data - based on Supabase configuration
            professionals: INITIAL_DATA.professionals,
            patients: INITIAL_DATA.patients,
            appointments: INITIAL_DATA.appointments,
            services: INITIAL_DATA.services,
            stockItems: INITIAL_DATA.stockItems,
            stockMovements: [],
            transactions: INITIAL_DATA.transactions,
            accounts: INITIAL_DATA.accounts || [],
            invoices: INITIAL_DATA.invoices || [],
            financialCategories: INITIAL_DATA.financialCategories || [],
            medicalRecords: [],
            odontogramData: {},
            anamneseData: {},
            treatmentPlans: [],
            auditLogs: [],
            appointmentMaterials: {},
            finalizingAppointments: {},
            notificationPrefs: {
                agendaConfirmation: true,
                patientReminder: true,
                stockAlert: true,
                paymentReceived: true,
                newPatient: true,
                noShow: false,
                dailySummary: true,
            },
            patientPhotos: {},
            waitingList: [],
            recurrences: [],
            appointmentConfirmations: [],
            anamneseLinks: [],
            signatures: [],
            clinicalDocuments: [],
            automationRules: DEMO_AUTOMATION_RULES,
            automationRuns: [],
            leads: DEMO_LEADS,
            funnelStages: DEMO_FUNNEL_STAGES,
            integrationConfig: {},
            navigationContext: {},
            insurances: [],
            branches: [],
            whatsappIntegrations: {},
            systemWhatsApp: { connected: false, token: '', phoneNumber: '', lastSync: null },

            // ---- Insurance (Convênios) ----
            addInsurance: (data) => {
                const insurance: Insurance = { ...data, id: uid(), created_at: now() };
                set(s => ({ insurances: [insurance, ...s.insurances] }));
                return insurance;
            },
            updateInsurance: (id, data) => {
                set(s => ({ insurances: s.insurances.map(i => i.id === id ? { ...i, ...data } : i) }));
            },
            deleteInsurance: (id) => {
                set(s => ({ insurances: s.insurances.filter(i => i.id !== id) }));
            },

            // ---- Branch (Filiais) ----
            addBranch: (data) => {
                const branch: Branch = { ...data, id: uid(), created_at: now() };
                set(s => ({ branches: [branch, ...s.branches] }));
                
                SupabaseSync.saveBranch(data).then(({ data: saved }) => {
                    if (saved?.[0]) {
                        set(s => ({ 
                            branches: s.branches.map(b => b.id === branch.id ? { ...b, id: saved[0].id } : b) 
                        }));
                    }
                }).catch(e => console.error('[ClinicStore] Error saving branch:', e));
                
                return branch;
            },
            updateBranch: (id, data) => {
                set(s => ({ branches: s.branches.map(b => b.id === id ? { ...b, ...data } : b) }));
                SupabaseSync.updateBranch(id, data).catch(e => 
                    console.error('[ClinicStore] Error updating branch:', e)
                );
            },
            deleteBranch: (id) => {
                set(s => ({ branches: s.branches.filter(b => b.id !== id) }));
                SupabaseSync.deleteBranch(id).catch(e => 
                    console.error('[ClinicStore] Error deleting branch:', e)
                );
            },

            // ---- WhatsApp Integrations (Multi-tenant) ----
            setWhatsAppConnected: (clinicId, connected, token = '', phoneNumber = '') => {
                set(s => ({
                    whatsappIntegrations: {
                        ...s.whatsappIntegrations,
                        [clinicId]: {
                            connected,
                            token: token || s.whatsappIntegrations[clinicId]?.token || '',
                            phoneNumber: phoneNumber || s.whatsappIntegrations[clinicId]?.phoneNumber || '',
                            lastSync: connected ? new Date().toISOString() : null,
                        },
                    },
                }));
            },
            getWhatsAppStatus: (clinicId) => {
                const state = get();
                return state.whatsappIntegrations[clinicId] || { connected: false, token: '', phoneNumber: '', lastSync: null };
            },
            setSystemWhatsApp: (connected, token = '', phoneNumber = '') => {
                set(s => ({
                    systemWhatsApp: {
                        connected,
                        token: token || s.systemWhatsApp.token,
                        phoneNumber: phoneNumber || s.systemWhatsApp.phoneNumber,
                        lastSync: connected ? new Date().toISOString() : null,
                    },
                }));
            },

            // ---- Patients ----
            addPatient: (p) => {
                const clinic_id = p.clinic_id || useAuth.getState().user?.clinic_id || 'clinic-1';
                const formattedPhone = formatPhoneForWhatsApp(p.phone);
                const patient: Patient = { ...p, phone: formattedPhone, clinic_id, id: uid(), created_at: now() };
                set(s => ({ patients: [patient, ...s.patients] }));
                emitEvent('PATIENT_CREATED', { patient_id: patient.id, clinic_id: patient.clinic_id });
                
                // Supabase save with rollback
                saveToSupabase('patient', patient, true).catch(e => {
                    console.error('[ClinicStore] Erro ao salvar paciente, revertendo...', e);
                    set(s => ({ patients: s.patients.filter(p => p.id !== patient.id) }));
                });
                
                return patient;
            },
            updatePatient: (id, data) => {
                const oldPatient = get().patients.find(p => p.id === id);
                const updatedData = data.phone ? { ...data, phone: formatPhoneForWhatsApp(data.phone) } : data;
                
                set(s => ({ patients: s.patients.map(p => p.id === id ? { ...p, ...updatedData } : p) }));
                
                // Supabase update with rollback
                const patient = get().patients.find(p => p.id === id);
                if (patient) {
                    saveToSupabase('patient', { ...patient, ...updatedData }, false).catch(e => {
                        console.error('[ClinicStore] Erro ao atualizar paciente, revertendo...', e);
                        if (oldPatient) {
                            set(s => ({ patients: s.patients.map(p => p.id === id ? oldPatient : p) }));
                        }
                    });
                    
                    // Audit Log
                    const user = useAuth.getState().user;
                    if (user && oldPatient) {
                        get().addAuditLog({
                            clinic_id: patient.clinic_id,
                            user_id: user.id,
                            user_name: user.name,
                            action: 'UPDATE_PATIENT',
                            entity_type: 'patient',
                            entity_id: id,
                            details: `Paciente atualizado: ${patient.name}`,
                            old_data: oldPatient,
                            new_data: updatedData,
                        });
                    }
                }
            },
            deletePatient: (id) => {
                const patient = get().patients.find(p => p.id === id);
                set(s => ({ patients: s.patients.filter(p => p.id !== id) }));
                
                if (patient) {
                    // Supabase delete with rollback
                    saveToSupabase('patient', { id }, false, true).catch(e => {
                        console.error('[ClinicStore] Erro ao excluir paciente, revertendo...', e);
                        // Re-insere o paciente no array se falhar
                        set(s => ({ patients: [...s.patients, patient] }));
                    });
                    
                    // Audit Log
                    const user = useAuth.getState().user;
                    if (user) {
                        get().addAuditLog({
                            clinic_id: patient.clinic_id,
                            user_id: user.id,
                            user_name: user.name,
                            action: 'DELETE_PATIENT',
                            entity_type: 'patient',
                            entity_id: id,
                            details: `Paciente excluído: ${patient.name} (CPF: ${patient.cpf || 'N/A'})`,
                            old_data: patient,
                        });
                    }
                }
            },
            importPatients: (patients) => {
                const newPatients = patients.map(p => ({ ...p, id: uid(), created_at: now(), phone: formatPhoneForWhatsApp(p.phone) }));
                set(s => ({ patients: [...newPatients, ...s.patients] }));
                emitEvent('PATIENTS_IMPORTED', { clinic_id: patients[0]?.clinic_id, count: newPatients.length });
                return newPatients.length;
            },
            getPatient: (id) => get().patients.find(p => p.id === id),

            // ---- Sync ----
            syncWithSupabase: () => {
                const clinicId = useAuth.getState().getClinicId();
                console.log('[ClinicStore] 🔄 Sincronização chamada para:', clinicId);
                syncWithSupabaseInternal(clinicId, set, get);
            },
            clearSyncCache: () => {
                lastSyncedClinicId = '';
                console.log('[ClinicStore] 🗑️ Cache de sincronização limpo');
            },
            loadAllData: async () => {
                const clinicId = useAuth.getState().getClinicId();
                if (!isSupabaseConfigured()) {
                    console.log('[ClinicStore] Supabase NOT configured. Using demo data.');
                    return;
                }
                
                try {
                    console.log('[ClinicStore] 🔄 Loading all data from Supabase for clinic:', clinicId);
                    
                    const [patients, professionals, appointments, services, stock, medicalRecords, treatmentPlans, transactions] = await Promise.all([
                        SupabaseSync.loadPatients(clinicId),
                        SupabaseSync.loadProfessionals(clinicId),
                        SupabaseSync.loadAppointments(clinicId),
                        SupabaseSync.loadServices(clinicId),
                        SupabaseSync.loadStock(clinicId),
                        SupabaseSync.loadMedicalRecords(clinicId),
                        SupabaseSync.loadTreatmentPlans(clinicId),
                        SupabaseSync.loadTransactions(clinicId)
                    ]);

                    set({
                        patients,
                        professionals,
                        appointments,
                        services,
                        stockItems: stock,
                        medicalRecords,
                        treatmentPlans,
                        transactions
                    });
                    console.log('[ClinicStore] ✅ Data loaded successfully');
                } catch (error) {
                    console.error('[ClinicStore] ❌ Error loading data:', error);
                }
            },

            // ---- Appointments ----
            addAppointment: (a) => {
                const state = get();
                const clinic_id = a.clinic_id || useAuth.getState().user?.clinic_id || 'clinic-1';
                const newStart = new Date(a.scheduled_at).getTime();
                const newEnd = newStart + (a.duration_min || 0) * 60000;
                const conflict = state.appointments.some(existing => {
                    if (existing.professional_id !== a.professional_id) return false;
                    if (existing.status === 'cancelled') return false;
                    const existingStart = new Date(existing.scheduled_at).getTime();
                    const existingEnd = existingStart + existing.duration_min * 60000;
                    return newStart < existingEnd && newEnd > existingStart;
                });
                if (conflict) return null;

                const scheduled_at = new Date(a.scheduled_at).toISOString();
                const appointment: Appointment = { 
                  ...a, 
                  scheduled_at,
                  clinic_id, 
                  source: a.source || 'internal', 
                  id: uid(), 
                  created_at: now() 
                };
                set(s => ({ appointments: [...s.appointments, appointment] }));

                // Sync to Supabase with rollback
                if (isSupabaseConfigured()) {
                    SupabaseSync.saveAppointment(appointment).catch((e: unknown) => {
                        console.error('[ClinicStore] Erro ao salvar agendamento, revertendo...', e);
                        set(s => ({ appointments: s.appointments.filter(a => a.id !== appointment.id) }));
                    });
                }

                emitEvent('APPOINTMENT_CREATED', {
                    appointment_id: appointment.id,
                    clinic_id: appointment.clinic_id,
                    patient_id: appointment.patient_id,
                    professional_id: appointment.professional_id,
                });
                if (get().notificationPrefs.agendaConfirmation) {
                    const msg = `Ola ${appointment.patient_name}, seu agendamento para ${appointment.service_name || 'consulta'} foi criado para ${new Date(appointment.scheduled_at).toLocaleString('pt-BR')}.`;
                    get().queueAppointmentConfirmation(appointment.id, 'whatsapp', msg);
                    get().queueAppointmentConfirmation(appointment.id, 'email', msg);
                }
                return appointment;
            },
            updateAppointmentStatus: (id, status) => {
                const oldApt = get().appointments.find(a => a.id === id);
                set(s => ({ appointments: s.appointments.map(a => a.id === id ? { ...a, status } : a) }));
                const apt = get().appointments.find(a => a.id === id);
                if (apt) {
                    saveToSupabase('appointment', apt, false).catch(e => {
                        console.error('[ClinicStore] Erro ao atualizar status, revertendo...', e);
                        if (oldApt) {
                            set(s => ({ appointments: s.appointments.map(a => a.id === id ? oldApt : a) }));
                        }
                    });
                }
            },
            deleteAppointment: (id) => {
                const apt = get().appointments.find(a => a.id === id);
                set(s => ({ appointments: s.appointments.filter(a => a.id !== id) }));
                
                if (apt) {
                    saveToSupabase('appointment', { id }, false, true).catch(e => {
                        console.error('[ClinicStore] Erro ao excluir agendamento, revertendo...', e);
                        set(s => ({ appointments: [...s.appointments, apt] }));
                    });
                    
                    // Audit log
                    const user = useAuth.getState().user;
                    if (user) {
                        get().addAuditLog({
                            clinic_id: apt.clinic_id,
                            user_id: user.id,
                            user_name: user.name,
                            action: 'DELETE_APPOINTMENT',
                            entity_type: 'appointment',
                            entity_id: id,
                            details: `Agendamento excluído: ${apt.patient_name} - ${apt.service_name || 'Consulta'} em ${new Date(apt.scheduled_at).toLocaleString('pt-BR')}`,
                            old_data: apt,
                        });
                    }
                }
            },
            startAppointment: (id) => {
                const state = get();
                const appointment = state.appointments.find(a => a.id === id);
                if (!appointment) return;
                if (appointment.status === 'done' || appointment.status === 'in_progress') return;
                if (appointment.status === 'cancelled' || appointment.status === 'no_show') return;
                set(s => ({
                    appointments: s.appointments.map(a =>
                        a.id === id ? { ...a, status: 'in_progress' as AppointmentStatus, started_at: now() } : a
                    ),
                }));
                const updated = get().appointments.find(a => a.id === id);
                if (updated) {
                    saveToSupabase('appointment', updated, false).catch(e => console.error('[ClinicStore] Erro ao iniciar agendamento:', e));
                }
                emitEvent('APPOINTMENT_STARTED', {
                    appointment_id: id,
                    clinic_id: appointment.clinic_id,
                    patient_id: appointment.patient_id,
                    professional_id: appointment.professional_id,
                });
            },
            finalizeAppointment: (id, userId, userName, treatmentItems = []) => {
                const state = get();
                const appointment = state.appointments.find(a => a.id === id);
                if (!appointment || appointment.status === 'done') return false;
                if (appointment.status !== 'in_progress') return false;
                if (state.finalizingAppointments[id]) return false;

                set(s => ({
                    finalizingAppointments: { ...s.finalizingAppointments, [id]: true },
                }));

                const serviceTimeMin = appointment.started_at
                    ? Math.max(1, Math.round((Date.now() - new Date(appointment.started_at).getTime()) / 60000))
                    : appointment.duration_min;

                // 1. Lock appointment
                set(s => ({
                    appointments: s.appointments.map(a =>
                        a.id === id ? { ...a, status: 'done' as AppointmentStatus, finished_at: now(), service_time_min: serviceTimeMin } : a
                    ),
                }));
                const finalApt = get().appointments.find(a => a.id === id);
                if (finalApt) {
                    saveToSupabase('appointment', finalApt, false).catch(e => console.error('[ClinicStore] Erro ao finalizar agendamento:', e));
                }

                // 2. Lock medical records for this appointment
                set(s => ({
                    medicalRecords: s.medicalRecords.map(r =>
                        r.appointment_id === id ? { ...r, locked: true, locked_at: now() } : r
                    ),
                }));
                const affectedRecord = get().medicalRecords.find(r => r.appointment_id === id);
                if (affectedRecord) {
                    saveToSupabase('medical_record', affectedRecord, false).catch(e => console.error('[ClinicStore] Erro ao bloquear prontuário:', e));
                }
                emitEvent('RECORD_LOCKED', { appointment_id: id, clinic_id: appointment.clinic_id });

                // 2.5 Mark treatment items as done if provided
                if (treatmentItems.length > 0) {
                    treatmentItems.forEach(item => {
                        // Find which plan this item belongs to
                        const plan = state.treatmentPlans.find(p => p.items.some(i => i.id === item.id));
                        if (plan) {
                            const newItems = plan.items.map(i => i.id === item.id ? { ...i, status: 'done' as const } : i);
                            get().updateTreatmentPlan(plan.id, newItems);
                        }
                    });
                }

                // 3. Consume stock if service has materials
                const service = state.services.find(svc => svc.id === appointment.service_id);
                const appointmentMaterials = state.appointmentMaterials[id] || [];
                const materialsToConsume = appointmentMaterials.length > 0
                    ? appointmentMaterials
                    : (service?.materials || []).map(m => ({
                        stock_item_id: m.stock_item_id,
                        stock_item_name: m.stock_item_name,
                        qty: m.qty_per_use,
                    }));
                if (materialsToConsume.length > 0) {
                    get().consumeStock(materialsToConsume.map(m => ({ stock_item_id: m.stock_item_id, qty: m.qty })), id, userId);
                }

                // 4. Generate financial transaction (use professional-specific price if configured)
                const existingTxn = state.transactions.find(
                    t => t.appointment_id === id && t.type === 'income'
                );
                if (!existingTxn) {
                    const materialCost = materialsToConsume.reduce((sum, m) => {
                        const item = state.stockItems.find(s => s.id === m.stock_item_id);
                        return sum + (item ? item.unit_cost * m.qty : 0);
                    }, 0);

                    // Check for professional-specific pricing
                    let chargeAmount = appointment.base_value || 0;
                    if (service?.professional_prices && appointment.professional_id) {
                        const profPrice = service.professional_prices[appointment.professional_id];
                        if (profPrice !== undefined && profPrice > 0) {
                            chargeAmount = profPrice;
                        }
                    }

                    // ADD treatment items value
                    const treatmentValue = treatmentItems.reduce((sum, i) => sum + i.estimated_price, 0);
                    chargeAmount += treatmentValue;

                    get().addTransaction({
                        clinic_id: appointment.clinic_id,
                        appointment_id: id,
                        patient_id: appointment.patient_id,
                        patient_name: appointment.patient_name,
                        professional_id: appointment.professional_id,
                        professional_name: appointment.professional_name,
                        type: 'income',
                        category: 'Atendimento',
                        description: `${appointment.patient_name} - ${appointment.service_name || 'Consulta'}`,
                        amount: chargeAmount,
                        status: 'awaiting_payment',
                        items: materialsToConsume.map(m => m.stock_item_name),
                        material_cost: materialCost,
                        service_time_min: serviceTimeMin,
                        idempotency_key: `apt:${id}:income`,
                    });

                    // If material cost > 0, also log expense
                    if (materialCost > 0) {
                        get().addTransaction({
                            clinic_id: appointment.clinic_id,
                            appointment_id: id,
                            type: 'expense',
                            category: 'Material Consumido',
                            description: `Materiais - ${appointment.patient_name} - ${appointment.service_name}`,
                            amount: materialCost,
                            status: 'paid',
                            material_cost: materialCost,
                            idempotency_key: `apt:${id}:expense`,
                        });
                    }
                }

                // 5. Update patient last_visit
                get().updatePatient(appointment.patient_id, { last_visit: now().split('T')[0] });

                // 6. Audit log
                get().addAuditLog({
                    clinic_id: appointment.clinic_id,
                    user_id: userId,
                    user_name: userName,
                    action: 'FINALIZE_APPOINTMENT',
                    entity_type: 'appointment',
                    entity_id: id,
                    details: `Atendimento finalizado: ${appointment.patient_name} - ${appointment.service_name}`,
                    old_data: appointment,
                    new_data: { service_time_min: serviceTimeMin, finished_at: finalApt?.finished_at },
                });

                emitEvent('APPOINTMENT_FINISHED', {
                    appointment_id: id,
                    clinic_id: appointment.clinic_id,
                    patient_id: appointment.patient_id,
                    professional_id: appointment.professional_id,
                });

                const automationRules = get().automationRules.filter(
                    rule => rule.clinic_id === appointment.clinic_id && rule.enabled && rule.trigger.event === 'appointment_done'
                );
                automationRules.forEach((rule) => {
                    const message = rule.template.replace('{{nome}}', appointment.patient_name);
                    const queued = get().queueAppointmentConfirmation(appointment.id, rule.channel, message);
                    get().addAutomationRun({
                        clinic_id: appointment.clinic_id,
                        rule_id: rule.id,
                        target_id: appointment.patient_id,
                        channel: rule.channel,
                        status: queued ? 'queued' : 'failed',
                        response: queued ? undefined : 'queue_failed',
                    });
                    emitEvent('NPS_REQUESTED', {
                        clinic_id: appointment.clinic_id,
                        rule_id: rule.id,
                        appointment_id: appointment.id,
                        patient_id: appointment.patient_id,
                    });
                });

                set(s => ({
                    finalizingAppointments: { ...s.finalizingAppointments, [id]: false },
                }));

                return true;
            },
            createRecurringAppointments: ({ base, startDateTime, frequency, occurrences }) => {
                const recurrenceId = uid();
                const created: Appointment[] = [];
                const start = new Date(startDateTime);
                const stepDays = frequency === 'weekly' ? 7 : frequency === 'biweekly' ? 14 : 30;
                const safeOccurrences = Math.min(Math.max(1, occurrences), 48);
                for (let i = 0; i < safeOccurrences; i++) {
                    const scheduled = new Date(start);
                    scheduled.setDate(start.getDate() + (i * stepDays));
                    const apt = get().addAppointment({
                        ...base,
                        scheduled_at: scheduled.toISOString(),
                        recurrence_id: recurrenceId,
                    });
                    if (apt) created.push(apt);
                }
                if (created.length > 0) {
                    const first = created[0];
                    const recurrence: AppointmentRecurrence = {
                        id: recurrenceId,
                        clinic_id: first.clinic_id,
                        patient_id: first.patient_id,
                        professional_id: first.professional_id,
                        service_id: first.service_id,
                        start_date: first.scheduled_at.split('T')[0],
                        frequency,
                        occurrences: created.length,
                        created_at: now(),
                    };
                    set(s => ({ recurrences: [recurrence, ...s.recurrences] }));
                }
                return created;
            },
            addToWaitingList: (entry) => {
                const waiting: WaitingListEntry = {
                    ...entry,
                    id: uid(),
                    status: 'waiting',
                    created_at: now(),
                    updated_at: now(),
                };
                set(s => ({ waitingList: [waiting, ...s.waitingList] }));
                return waiting;
            },
            updateWaitingListStatus: (id, status) => {
                set(s => ({
                    waitingList: s.waitingList.map(item => item.id === id ? { ...item, status, updated_at: now() } : item),
                }));
            },
            fitWaitingListEntry: (id, scheduledAt, durationMin = 60) => {
                const state = get();
                const entry = state.waitingList.find(w => w.id === id);
                if (!entry || entry.status === 'cancelled') return null;
                const patient = state.patients.find(p => p.id === entry.patient_id);
                const service = state.services.find(s => s.id === entry.service_id);
                const professional = state.professionals.find(
                    p => p.clinic_id === entry.clinic_id && p.role !== 'receptionist'
                );
                if (!patient || !professional) return null;
                const appointment = get().addAppointment({
                    clinic_id: entry.clinic_id,
                    patient_id: patient.id,
                    patient_name: patient.name,
                    professional_id: professional.id,
                    professional_name: professional.name,
                    service_id: service?.id,
                    service_name: service?.name || entry.service_name || 'Consulta',
                    scheduled_at: scheduledAt,
                    duration_min: service?.avg_duration_min || durationMin,
                    status: 'scheduled',
                    base_value: service?.base_price || 0,
                    source: 'internal',
                });
                if (appointment) {
                    get().updateWaitingListStatus(entry.id, 'scheduled');
                    emitEvent('WAITING_LIST_CONTACTED', { entry_id: entry.id, appointment_id: appointment.id, clinic_id: entry.clinic_id });
                }
                return appointment;
            },
            queueAppointmentConfirmation: (appointmentId, channel, message) => {
                const appointment = get().appointments.find(a => a.id === appointmentId);
                if (!appointment) return null;
                const confirmation: AppointmentConfirmation = {
                    id: uid(),
                    clinic_id: appointment.clinic_id,
                    appointment_id: appointment.id,
                    patient_id: appointment.patient_id,
                    channel,
                    message,
                    status: 'queued',
                    created_at: now(),
                };
                set(s => ({ appointmentConfirmations: [confirmation, ...s.appointmentConfirmations] }));
                return confirmation;
            },
            markAppointmentConfirmation: (confirmationId, status, providerResponse) => {
                let updated: AppointmentConfirmation | undefined;
                set(s => ({
                    appointmentConfirmations: s.appointmentConfirmations.map(item => {
                        if (item.id !== confirmationId) return item;
                        updated = {
                            ...item,
                            status,
                            provider_response: providerResponse,
                            sent_at: status === 'sent' ? now() : item.sent_at,
                        };
                        return updated;
                    }),
                }));
                if (updated && status === 'sent') {
                    emitEvent('APPOINTMENT_REMINDER_SENT', {
                        confirmation_id: confirmationId,
                        appointment_id: updated.appointment_id,
                        clinic_id: updated.clinic_id,
                        channel: updated.channel,
                    });
                }
            },

            // ---- Medical Records ----
            saveEvolution: (appointmentId, patientId, clinicId, professionalId, content) => {
                if (appointmentId) {
                    const existing = get().medicalRecords.find(r => r.appointment_id === appointmentId);
                    if (existing) {
                        if (existing.locked) return;
                        set(s => ({
                            medicalRecords: s.medicalRecords.map(r =>
                                r.appointment_id === appointmentId ? { ...r, content, updated_at: now() } : r
                            ),
                        }));
                        const updated = get().medicalRecords.find(r => r.appointment_id === appointmentId);
                        if (updated) {
                            saveToSupabase('medical_record', updated, false).catch(e => console.error('[ClinicStore] Erro ao atualizar prontuário:', e));
                        }
                        return;
                    }
                }
                // Create new record (standalone or appointment-linked)
                set(s => {
                    const newRecord = {
                        id: uid(), appointment_id: appointmentId || undefined, clinic_id: clinicId,
                        patient_id: patientId, professional_id: professionalId,
                        content, locked: false, created_at: now(), updated_at: now(),
                    };
                    saveToSupabase('medical_record', newRecord, true).catch(e => console.error('[ClinicStore] Erro ao salvar novo prontuário:', e));
                    return { medicalRecords: [...s.medicalRecords, newRecord] };
                });
            },
            getRecordsForPatient: (patientId) => get().medicalRecords.filter(r => r.patient_id === patientId),
            setOdontogramEntry: (patientId, entry) => {
                set(s => {
                    const existing = s.odontogramData[patientId] || [];
                    const filtered = existing.filter(e => e.tooth_number !== entry.tooth_number);
                    const next = [...filtered, entry];
                    
                    const existingRec = s.medicalRecords.find(r => r.patient_id === patientId && r.odontogram);
                    let newRec = null;
                    
                    if (existingRec) {
                        saveToSupabase('medical_record', { ...existingRec, odontogram: next }, false);
                    } else {
                        newRec = {
                            id: uid(), clinic_id: 'clinic-1', patient_id: patientId, professional_id: 'prof-1',
                            odontogram: next, content: null, locked: false, created_at: now(), updated_at: now()
                        };
                        saveToSupabase('medical_record', newRec, true);
                    }
                    
                    const medicalRecords = existingRec 
                        ? s.medicalRecords.map(r => r.id === existingRec.id ? { ...r, odontogram: next } : r)
                        : [...s.medicalRecords, newRec];
                    
                    return { 
                        odontogramData: { ...s.odontogramData, [patientId]: next },
                        medicalRecords: medicalRecords as any
                    };
                });
            },
            getOdontogramData: (patientId) => get().odontogramData[patientId] || [],
            saveAnamnese: (data) => {
                const existing = get().medicalRecords.find(r => r.patient_id === data.patient_id && r.anamnese);
                if (existing) {
                    saveToSupabase('medical_record', { ...existing, anamnese: data }, false);
                    set(s => ({ 
                        anamneseData: { ...s.anamneseData, [data.patient_id]: data },
                        medicalRecords: s.medicalRecords.map(r => r.id === existing.id ? { ...r, anamnese: data } : r)
                    }));
                } else {
                    const newRec = {
                        id: uid(), clinic_id: data.clinic_id || useAuth.getState().user?.clinic_id || 'clinic-1', patient_id: data.patient_id, professional_id: useAuth.getState().user?.id,
                        anamnese: data, content: null, locked: false, created_at: now(), updated_at: now()
                    };
                    saveToSupabase('medical_record', newRec, true);
                    set(s => ({ 
                        anamneseData: { ...s.anamneseData, [data.patient_id]: data },
                        medicalRecords: [...s.medicalRecords, newRec as any] 
                    }));
                }
            },
            getAnamnese: (patientId) => get().anamneseData[patientId],
            // ---- Anamnese Links & Public Forms ----
            syncAnamneseWithServer: async () => {
                try {
                    const clinicId = useAuth.getState().user?.clinic_id || 'clinic-1';
                    const records = await SupabaseSync.loadMedicalRecords(clinicId);
                    
                    if (Array.isArray(records) && records.length > 0) {
                        records.forEach((item: any) => {
                            if (item.anamnese) {
                                set(s => ({ 
                                    anamneseData: { ...s.anamneseData, [item.patient_id]: item.anamnese } 
                                }));
                            }
                        });
                        return true;
                    }
                    return false;
                } catch (e) {
                    console.error('[ClinicStore] Erro ao sincronizar anamnese:', e);
                    return false;
                }
            },


            generateAnamneseLink: (patientId, createdBy, hoursValid = 72) => {
                const patient = get().patients.find(p => p.id === patientId);
                const clinic_id = patient?.clinic_id || useAuth.getState().user?.clinic_id || 'clinic-1';
                const expires_at = new Date(Date.now() + Math.max(1, hoursValid) * 3600 * 1000).toISOString();

                // Stateless Token: b64({ p: patientId, c: clinicId, e: expiry, s: random })
                const payload = {
                    p: patientId,
                    c: clinic_id,
                    e: expires_at,
                    s: Math.random().toString(36).substring(7)
                };
                const token = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

                const link: AnamneseFormLink = {
                    id: uid(),
                    clinic_id,
                    patient_id: patientId,
                    token,
                    status: 'active',
                    created_by: createdBy,
                    created_at: now(),
                    expires_at,
                };
                set(s => ({ anamneseLinks: [link, ...s.anamneseLinks] }));
                emitEvent('ANAMNESE_LINK_CREATED', { clinic_id, patient_id: patientId, link_id: link.id });
                return link;
            },
            submitAnamneseByToken: (token, data) => {
                const state = get();
                const link = state.anamneseLinks.find(item => item.token === token && item.status === 'active');
                if (!link) return false;
                if (new Date(link.expires_at).getTime() < Date.now()) {
                    set(s => ({
                        anamneseLinks: s.anamneseLinks.map(item => item.id === link.id ? { ...item, status: 'expired' } : item),
                    }));
                    return false;
                }
                get().saveAnamnese({
                    ...data,
                    patient_id: link.patient_id,
                    clinic_id: link.clinic_id,
                    updated_at: now(),
                });
                set(s => ({
                    anamneseLinks: s.anamneseLinks.map(item =>
                        item.id === link.id ? { ...item, status: 'submitted', submitted_at: now() } : item
                    ),
                }));
                return true;
            },
            addSignature: (data) => {
                const signature: DigitalSignature = {
                    ...data,
                    id: uid(),
                    signed_at: now(),
                };
                set(s => ({ signatures: [signature, ...s.signatures] }));
                return signature;
            },
            createClinicalDocument: (doc) => {
                const next: ClinicalDocument = {
                    ...doc,
                    id: uid(),
                    created_at: now(),
                };
                set(s => ({ clinicalDocuments: [next, ...s.clinicalDocuments] }));
                emitEvent('DOCUMENT_CREATED', { clinic_id: next.clinic_id, patient_id: next.patient_id, document_id: next.id });
                return next;
            },
            getDocumentsForPatient: (patientId) => get().clinicalDocuments.filter(doc => doc.patient_id === patientId),

            // ---- Treatment Plans ----
            addTreatmentPlan: (plan) => {
                const newPlan = { ...plan, id: uid(), created_at: now() };
                set(s => ({ treatmentPlans: [...s.treatmentPlans, newPlan] }));
                saveToSupabase('treatment_plan', newPlan, true).catch(e => console.error('[ClinicStore] Erro ao salvar plano de tratamento:', e));
            },
            updateTreatmentPlan: (planId, items) => {
                set(s => {
                    const plan = s.treatmentPlans.find(p => p.id === planId);
                    if (!plan) return s;
                    
                    const updated = { 
                        ...plan, 
                        items, 
                        total_estimated: items.reduce((sum, i) => sum + i.estimated_price, 0) 
                    };
                    
                    saveToSupabase('treatment_plan', updated, false).catch(e => console.error('[ClinicStore] Erro ao atualizar plano de tratamento:', e));
                    
                    return {
                        treatmentPlans: s.treatmentPlans.map(p => p.id === planId ? updated : p),
                    };
                });
            },
            getPlansForPatient: (patientId) => get().treatmentPlans.filter(p => p.patient_id === patientId),

            // ---- Appointment Materials ----
            setAppointmentMaterials: (appointmentId, items) => {
                set(s => ({ appointmentMaterials: { ...s.appointmentMaterials, [appointmentId]: items } }));
            },
            getAppointmentMaterials: (appointmentId) => get().appointmentMaterials[appointmentId] || [],

            // ---- Stock ----
            addStockItem: (item) => {
                const clinic_id = item.clinic_id || useAuth.getState().user?.clinic_id || 'clinic-1';
                const newItem: StockItem = { ...item, clinic_id, id: uid(), created_at: now() };
                set(s => ({ stockItems: [newItem, ...s.stockItems] }));
                saveToSupabase('stock', newItem, true).catch(e => console.error('[ClinicStore] Erro ao salvar estoque:', e));
                return newItem;
            },
            updateStockItem: (id, data) => {
                set(s => ({ stockItems: s.stockItems.map(i => i.id === id ? { ...i, ...data } : i) }));
                const item = get().stockItems.find(i => i.id === id);
                if (item) {
                    saveToSupabase('stock', { ...item, ...data }, false).catch(e => console.error('[ClinicStore] Erro ao atualizar estoque:', e));
                }
            },
            deleteStockItem: (id) => {
                set(s => ({ stockItems: s.stockItems.filter(i => i.id !== id) }));
                SupabaseSync.deleteStockItem(id).catch(e => console.error('[ClinicStore] Erro ao deletar estoque:', e));
            },
            consumeStock: (items, appointmentId, userId) => {
                const insufficient: { stock_item_id: string; required: number; available: number }[] = [];
                items.forEach(({ stock_item_id, qty }) => {
                    const state = get();
                    const item = state.stockItems.find(s => s.id === stock_item_id);
                    if (!item) return;
                    if (item.quantity < qty) {
                        insufficient.push({ stock_item_id, required: qty, available: item.quantity });
                    }
                    const newQty = Math.max(0, item.quantity - qty);
                    set(s => ({ stockItems: s.stockItems.map(i => i.id === stock_item_id ? { ...i, quantity: newQty } : i) }));
                    get().addStockMovement({
                        clinic_id: item.clinic_id,
                        stock_item_id,
                        stock_item_name: item.name,
                        appointment_id: appointmentId,
                        type: 'out',
                        qty,
                        note: `Consumo em atendimento`,
                        created_by: userId,
                    });
                });
                const appointment = get().appointments.find(a => a.id === appointmentId);
                emitEvent('STOCK_CONSUMED', { appointment_id: appointmentId, clinic_id: appointment?.clinic_id, items, insufficient });
            },
            addStockMovement: (movement) => {
                const newMovement = { ...movement, id: uid(), created_at: now() };
                set(s => ({ stockMovements: [newMovement, ...s.stockMovements] }));
                saveToSupabase('stock_movement', newMovement, true).catch(e => console.error('[ClinicStore] Erro ao salvar movimento de estoque:', e));
            },

            // ---- Financial ----
            addTransaction: (t) => {
                const clinic_id = t.clinic_id || useAuth.getState().user?.clinic_id || 'clinic-1';
                const inferredKey = t.idempotency_key || (t.appointment_id ? `apt:${t.appointment_id}:${t.type}` : uid());
                const existing = get().transactions.find(txn => txn.idempotency_key === inferredKey);
                if (existing) return existing;
                const txn: FinancialTransaction = { ...t, clinic_id, id: uid(), idempotency_key: inferredKey, created_at: now() };
                set(s => ({ transactions: [txn, ...s.transactions] }));
                saveToSupabase('transaction', txn, true).catch(e => console.error('[ClinicStore] Erro ao salvar transação:', e));
                
                if (txn.type === 'income') {
                    emitEvent('PAYMENT_GENERATED', { transaction_id: txn.id, appointment_id: txn.appointment_id, clinic_id: txn.clinic_id });
                }
                return txn;
            },
            processPayment: async (id, method) => {
                const txn = get().transactions.find(t => t.id === id);
                if (!txn || txn.status === 'paid' || txn.status === 'cancelled') return;
                const updatedData = { status: 'paid' as TransactionStatus, payment_method: method || 'manual', paid_at: now() };
                set(s => ({
                    transactions: s.transactions.map(t =>
                        t.id === id ? { ...t, ...updatedData } : t
                    ),
                }));
                saveToSupabase('transaction', { ...txn, ...updatedData }, false).catch(e => console.error('[ClinicStore] Erro ao atualizar transação:', e));
                emitEvent('PAYMENT_RECEIVED', { transaction_id: id, clinic_id: txn.clinic_id });
            },
            generatePayment: (id, method, installments) => {
                const txn = get().transactions.find(t => t.id === id);
                if (!txn) return;
                if (txn.type !== 'income') return;
                if (txn.status === 'paid' || txn.status === 'cancelled') return;
                set(s => ({
                    transactions: s.transactions.map(t =>
                        t.id === id ? {
                            ...t,
                            status: 'awaiting_payment' as TransactionStatus,
                            payment_method: method,
                            installments,
                            payment_reference: t.payment_reference || `PAY-${id.slice(0, 8).toUpperCase()}`,
                            payment_url: t.payment_url || `https://pay.clinxia.local/${id}`,
                            pix_code: method === 'pix' ? t.pix_code || `PIX-${id.slice(0, 10).toUpperCase()}` : t.pix_code,
                        } : t
                    ),
                }));
                emitEvent('PAYMENT_GENERATED', { transaction_id: id, clinic_id: txn.clinic_id });
            },
            setTransactionAsaasData: (id, data) => {
                set(s => ({
                    transactions: s.transactions.map(t => t.id === id ? { ...t, ...data } : t),
                }));
                const updatedTxn = get().transactions.find(t => t.id === id);
                if (updatedTxn) {
                    saveToSupabase('transaction', updatedTxn, false).catch(e => console.error('[ClinicStore] Erro ao atualizar dados Asaas:', e));
                }
            },
            reconcileTransaction: (id, nextStatus, payload) => {
                const txn = get().transactions.find(t => t.id === id);
                if (!txn) return;
                set(s => ({
                    transactions: s.transactions.map(t =>
                        t.id === id
                            ? {
                                ...t,
                                status: nextStatus,
                                asaas_status: payload?.asaas_status || t.asaas_status,
                                paid_at: payload?.paid_at || (nextStatus === 'paid' ? now() : t.paid_at),
                            }
                            : t
                    ),
                }));
                const updatedTxn = get().transactions.find(t => t.id === id);
                if (updatedTxn) {
                    saveToSupabase('transaction', updatedTxn, false).catch(e => console.error('[ClinicStore] Erro ao reconciliar transação:', e));
                }
                emitEvent('ASAAS_RECONCILED', { transaction_id: id, clinic_id: txn.clinic_id, status: nextStatus });
            },
            getMonthlyIncome: (clinicId) => {
                const thisMonth = new Date().toISOString().slice(0, 7);
                return get().transactions
                    .filter(t => t.type === 'income' && t.status === 'paid' && t.created_at.startsWith(thisMonth))
                    .filter(t => !clinicId || t.clinic_id === clinicId)
                    .reduce((sum, t) => sum + t.amount, 0);
            },
            getMonthlyExpenses: (clinicId) => {
                const thisMonth = new Date().toISOString().slice(0, 7);
                return get().transactions
                    .filter(t => t.type === 'expense' && t.status === 'paid' && t.created_at.startsWith(thisMonth))
                    .filter(t => !clinicId || t.clinic_id === clinicId)
                    .reduce((sum, t) => sum + t.amount, 0);
            },
            getBalance: (clinicId) => {
                const state = get();
                const income = state.transactions
                    .filter(t => t.type === 'income' && t.status === 'paid')
                    .filter(t => !clinicId || t.clinic_id === clinicId)
                    .reduce((s, t) => s + t.amount, 0);
                const expenses = state.transactions
                    .filter(t => t.type === 'expense' && t.status === 'paid')
                    .filter(t => !clinicId || t.clinic_id === clinicId)
                    .reduce((s, t) => s + t.amount, 0);
                return income - expenses;
            },

            // ---- Account Actions ----
            addAccount: (account) => {
                const clinic_id = account.clinic_id || useAuth.getState().user?.clinic_id || 'clinic-1';
                const newAccount: Account = { ...account, clinic_id, id: uid(), created_at: now(), updated_at: now() };
                set(s => ({ accounts: [newAccount, ...s.accounts] }));
                saveToSupabase('account', newAccount, true).catch(e => console.error('[ClinicStore] Erro ao salvar conta:', e));
                return newAccount;
            },
            updateAccount: (id, data) => {
                set(s => ({ accounts: s.accounts.map(a => a.id === id ? { ...a, ...data, updated_at: now() } : a) }));
                const updatedAccount = get().accounts.find(a => a.id === id);
                if (updatedAccount) {
                    saveToSupabase('account', updatedAccount, false).catch(e => console.error('[ClinicStore] Erro ao atualizar conta:', e));
                }
            },
            deleteAccount: (id) => {
                const account = get().accounts.find(a => a.id === id);
                if (!account) return;
                set(s => ({ accounts: s.accounts.filter(a => a.id !== id) }));
                saveToSupabase('account', account, false, true).catch(e => console.error('[ClinicStore] Erro ao deletar conta:', e));
            },
            markAccountPaid: (id, paidAmount) => {
                const account = get().accounts.find(a => a.id === id);
                if (!account) return;
                const newPaid = paidAmount !== undefined ? paidAmount : account.value;
                const newStatus: AccountStatus = newPaid >= account.value ? 'paid' : (newPaid > 0 ? 'partial' : account.status);
                
                set(s => ({
                    accounts: s.accounts.map(a => a.id === id ? { ...a, paid: newPaid, status: newStatus, updated_at: now() } : a)
                }));
                const updatedAccount = get().accounts.find(a => a.id === id);
                if (updatedAccount) {
                    saveToSupabase('account', updatedAccount, false).catch(e => console.error('[ClinicStore] Erro ao marcar conta como paga:', e));
                }
            },

            // ---- Invoice Actions ----
            addInvoice: (invoice) => {
                const clinic_id = invoice.clinic_id || useAuth.getState().user?.clinic_id || 'clinic-1';
                const newInvoice: Invoice = { ...invoice, clinic_id, id: uid(), created_at: now() };
                set(s => ({ invoices: [newInvoice, ...s.invoices] }));
                saveToSupabase('invoice', newInvoice, true).catch(e => console.error('[ClinicStore] Erro ao salvar nota fiscal:', e));
                return newInvoice;
            },
            updateInvoice: (id, data) => {
                set(s => ({ invoices: s.invoices.map(i => i.id === id ? { ...i, ...data } : i) }));
                const updatedInvoice = get().invoices.find(i => i.id === id);
                if (updatedInvoice) {
                    saveToSupabase('invoice', updatedInvoice, false).catch(e => console.error('[ClinicStore] Erro ao atualizar nota fiscal:', e));
                }
            },
            deleteInvoice: (id) => {
                const invoice = get().invoices.find(i => i.id === id);
                if (!invoice) return;
                set(s => ({ invoices: s.invoices.filter(i => i.id !== id) }));
                saveToSupabase('invoice', invoice, false, true).catch(e => console.error('[ClinicStore] Erro ao deletar nota fiscal:', e));
            },

            // ---- Financial Category Actions ----
            addFinancialCategory: (category) => {
                const clinic_id = category.clinic_id || useAuth.getState().user?.clinic_id || 'clinic-1';
                const newCategory: FinancialCategory = { ...category, clinic_id, id: uid(), created_at: now() };
                set(s => ({ financialCategories: [newCategory, ...s.financialCategories] }));
                saveToSupabase('financial_category', newCategory, true).catch(e => console.error('[ClinicStore] Erro ao salvar categoria financeira:', e));
                return newCategory;
            },
            deleteFinancialCategory: (id) => {
                const category = get().financialCategories.find(c => c.id === id);
                if (!category) return;
                set(s => ({ financialCategories: s.financialCategories.filter(c => c.id !== id) }));
                saveToSupabase('financial_category', category, false, true).catch(e => console.error('[ClinicStore] Erro ao deletar categoria financeira:', e));
            },

            // ---- Services ----
            addService: (s) => {
                const clinic_id = s.clinic_id || useAuth.getState().user?.clinic_id || 'clinic-1';
                const service: Service = { ...s, clinic_id, id: uid() };
                set(st => ({ services: [...st.services, service] }));
                
                // Salvar no Supabase
                saveToSupabase('service', service, true).catch(e => console.error('[ClinicStore] Erro ao salvar serviço:', e));
                return service;
            },
            updateService: (id, data) => {
                set(s => ({ services: s.services.map(svc => svc.id === id ? { ...svc, ...data } : svc) }));
                const service = get().services.find(svc => svc.id === id);
                if (service) {
                    saveToSupabase('service', { ...service, ...data }, false).catch(e => console.error('[ClinicStore] Erro ao atualizar serviço:', e));
                }
            },
            deleteService: (id) => {
                set(s => ({ services: s.services.filter(svc => svc.id !== id) }));
                SupabaseSync.deleteService(id).catch(e => console.error('[ClinicStore] Erro ao deletar serviço:', e));
            },

            // ---- Professionals ----
            addProfessional: (p) => {
                const clinic_id = p.clinic_id || useAuth.getState().user?.clinic_id || 'clinic-1';
                const email = (p.email || '').toLowerCase();
                if (email && get().professionals.some(prof => prof.email.toLowerCase() === email)) {
                    return null;
                }
                const professional: User & { user_id?: string } = { ...p, clinic_id, id: uid(), created_at: now() };
                set(s => ({ professionals: [professional, ...s.professionals] }));

                const persistProfessional = async (userId?: string) => {
                    const toSave = { ...professional, user_id: userId || null };
                    const saveResult = await SupabaseSync.saveProfessional(toSave);
                    if (saveResult?.error) {
                        // Se já existir, tenta atualizar.
                        await SupabaseSync.updateProfessional(professional.id, toSave);
                    }
                };

                if (email && p.password) {
                    const password = p.password;
                    import('@/lib/supabase').then(({ createAuthUser }) => {
                        createAuthUser({
                            email,
                            password,
                            name: p.name,
                            phone: p.phone,
                            role: p.role,
                            commission_pct: p.commission_pct,
                            clinic_id: clinic_id === 'clinic-1' ? '00000000-0000-0000-0000-000000000001' : clinic_id,
                        }).then(async (result) => {
                            if (result.error) {
                                console.error('[ClinicStore] Erro ao criar usuário no Auth:', result.error);
                                toast(`Erro ao criar usuário: ${result.error}`, 'error');
                                // Removemos o profissional da lista local pois a criação falhou
                                set(s => ({ professionals: s.professionals.filter(p => p.id !== professional.id) }));
                                return;
                            }
                            if (result.user_id) {
                                set(s => ({
                                    professionals: s.professionals.map(prof =>
                                        prof.id === professional.id
                                            ? { ...prof, user_id: result.user_id, email, phone: p.phone, role: p.role, name: p.name }
                                            : prof
                                    ),
                                }));
                            }
                            await persistProfessional(result.user_id);
                        });
                    }).catch(async (e) => {
                        console.error('[ClinicStore] Erro ao importar createAuthUser:', e);
                        toast(`Erro ao criar usuário: erro de conexão`, 'error');
                        // Removemos o profissional da lista local pois a criação falhou
                        set(s => ({ professionals: s.professionals.filter(p => p.id !== professional.id) }));
                    });
                } else {
                    persistProfessional().catch(e => console.error('[ClinicStore] Erro ao salvar profissional:', e));
                }
                
                return professional;
            },
            updateProfessional: (id, data) => {
                set(s => ({ professionals: s.professionals.map(p => p.id === id ? { ...p, ...data } : p) }));
                const professional = get().professionals.find(p => p.id === id);
                if (professional) {
                    saveToSupabase('professional', { ...professional, ...data }, false).catch(e => console.error('[ClinicStore] Erro ao atualizar profissional:', e));
                }
            },
            deleteProfessional: (id) => {
                const toDelete = get().professionals.find(p => p.id === id);
                set(s => ({ professionals: s.professionals.filter(p => p.id !== id) }));
                SupabaseSync.deleteProfessional(id).then(result => {
                    if (result.error) {
                        console.error('[ClinicStore] Erro ao deletar profissional:', result.error);
                        if (toDelete) {
                            set(s => ({ professionals: [...s.professionals, toDelete] }));
                        }
                        alert('Erro ao excluir: ' + (result.error?.message || result.error));
                    }
                }).catch(e => {
                    console.error('[ClinicStore] Erro ao deletar profissional:', e);
                    if (toDelete) {
                        set(s => ({ professionals: [...s.professionals, toDelete] }));
                    }
                    alert('Erro ao excluir profissional');
                });
            },
            getProfessionalStats: (id, clinicId) => {
                const state = get();
                const apts = state.appointments
                    .filter(a => a.professional_id === id)
                    .filter(a => !clinicId || a.clinic_id === clinicId);
                const doneApts = apts.filter(a => a.status === 'done');
                const revenue = state.transactions
                    .filter(t => t.professional_id === id && t.type === 'income' && t.status === 'paid')
                    .filter(t => !clinicId || t.clinic_id === clinicId)
                    .reduce((s, t) => s + t.amount, 0);
                const noShows = apts.filter(a => a.status === 'no_show').length;
                const completedTotal = doneApts.length + noShows;
                const total = completedTotal || 1;

                const procedureCounts: Record<string, number> = {};
                doneApts.forEach(a => {
                    const name = a.service_name || 'Consulta';
                    procedureCounts[name] = (procedureCounts[name] || 0) + 1;
                });
                const topProcedures = Object.entries(procedureCounts)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);

                return {
                    appointments: apts.length,
                    revenue,
                    ticketMedio: doneApts.length > 0 ? revenue / doneApts.length : 0,
                    noShows,
                    attendanceRate: (doneApts.length / total) * 100,
                    topProcedures,
                };
            },
            getProfessionalCommissions: (professionalId, month) => {
                const state = get();
                const prof = state.professionals.find(p => p.id === professionalId);
                if (!prof) return { total_produced: 0, commission_amount: 0, appointment_count: 0, pending_commission: 0 };

                const txns = state.transactions.filter(t =>
                    t.professional_id === professionalId &&
                    t.type === 'income' &&
                    (!month || t.created_at.startsWith(month))
                );

                const aptsCount = state.appointments.filter(a =>
                    a.professional_id === professionalId &&
                    a.status === 'done' &&
                    (!month || a.scheduled_at.startsWith(month))
                ).length;

                const paid_txns = txns.filter(t => t.status === 'paid');
                const pending_txns = txns.filter(t => t.status !== 'paid' && t.status !== 'cancelled');
                
                const pct = (prof.commission_pct || 0) / 100;
                const total_produced = txns.reduce((sum, t) => sum + t.amount, 0);
                const commission_amount = paid_txns.reduce((sum, t) => sum + (t.amount * pct), 0);
                const pending_commission = pending_txns.reduce((sum, t) => sum + (t.amount * pct), 0);

                return {
                    total_produced,
                    commission_amount,
                    pending_commission,
                    appointment_count: aptsCount
                };
            },
            getClinicDRE: (clinicId, month) => {
                const state = get();
                const txns = state.transactions.filter(t =>
                    t.clinic_id === clinicId &&
                    t.created_at.startsWith(month) &&
                    t.status === 'paid'
                );

                const total_income = txns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

                const expenses_by_category_map: Record<string, number> = {};
                txns.filter(t => t.type === 'expense').forEach(t => {
                    expenses_by_category_map[t.category] = (expenses_by_category_map[t.category] || 0) + t.amount;
                });

                // Include commissions in expenses
                let professional_commissions = 0;
                state.professionals
                    .filter(p => p.clinic_id === clinicId)
                    .forEach(p => {
                        professional_commissions += get().getProfessionalCommissions(p.id, month).commission_amount;
                    });

                if (professional_commissions > 0) {
                    expenses_by_category_map['Comissões'] = (expenses_by_category_map['Comissões'] || 0) + professional_commissions;
                }

                const total_expenses = Object.values(expenses_by_category_map).reduce((sum, v) => sum + v, 0);
                const net_profit = total_income - total_expenses;
                const margin_pct = total_income > 0 ? (net_profit / total_income) * 100 : 0;

                const expenses_by_category = Object.entries(expenses_by_category_map).map(([label, value]) => ({
                    label,
                    value,
                    color: label === 'Marketing' ? 'blue' : label === 'Salários' ? 'indigo' : 'slate'
                }));

                return {
                    total_income,
                    total_expenses,
                    net_profit,
                    margin_pct,
                    expenses_by_category
                };
            },

            // ---- Navigation ----
            setNavigationContext: (ctx) => set({ navigationContext: ctx }),
            clearNavigationContext: () => set({ navigationContext: EMPTY_NAV_CONTEXT }),

            // ---- Notifications ----
            setNotificationPrefs: (prefs) => set({ notificationPrefs: prefs }),
            setNotificationPref: (key, value) => set(s => ({ notificationPrefs: { ...s.notificationPrefs, [key]: value } })),
            saveNotificationPrefs: async () => {
                const clinicId = useAuth.getState().user?.clinic_id;
                if (!clinicId) return;
                
                try {
                    const prefs = get().notificationPrefs;
                    await SupabaseSync.updateClinicSettings(clinicId, { notification_settings: prefs });
                    console.log('[ClinicStore] ✅ Preferências de notificação salvas no Supabase');
                    
                    const user = useAuth.getState().user;
                    if (user) {
                        get().addAuditLog({
                            clinic_id: clinicId,
                            user_id: user.id,
                            user_name: user.name,
                            action: 'SETTINGS_CHANGE',
                            entity_type: 'clinic',
                            entity_id: clinicId,
                            details: 'Preferências de notificação alteradas',
                            new_data: prefs
                        });
                    }
                } catch (e) {
                    console.error('[ClinicStore] Erro ao salvar preferências de notificação:', e);
                    throw e;
                }
            },
            setIntegrationConfig: (config) => {
                const oldConfig = get().integrationConfig;
                set(s => {
                    const next = { ...s.integrationConfig, ...config };
                    const clinicId = useAuth.getState().user?.clinic_id;
                    if (clinicId) {
                        SupabaseSync.updateClinicSettings(clinicId, { integration_config: next })
                            .then(() => {
                                const user = useAuth.getState().user;
                                if (user) {
                                    get().addAuditLog({
                                        clinic_id: clinicId,
                                        user_id: user.id,
                                        user_name: user.name,
                                        action: 'SETTINGS_CHANGE',
                                        entity_type: 'clinic',
                                        entity_id: clinicId,
                                        details: 'Configurações de integração alteradas',
                                        old_data: oldConfig,
                                        new_data: next
                                    });
                                }
                            })
                            .catch(e => console.error('[ClinicStore] Error saving integration config:', e));
                    }
                    return { integrationConfig: next };
                });
            },

            // ---- Photos ----
            addPatientPhoto: (patientId, dataUrl) => {
                set(s => {
                    const current = s.patientPhotos[patientId] || [];
                    return { patientPhotos: { ...s.patientPhotos, [patientId]: [dataUrl, ...current] } };
                });
            },
            removePatientPhoto: (patientId, index) => {
                set(s => {
                    const current = s.patientPhotos[patientId] || [];
                    const next = current.filter((_, i) => i !== index);
                    return { patientPhotos: { ...s.patientPhotos, [patientId]: next } };
                });
            },

            // ---- Audit ----
            addAuditLog: (log) => {
                const deviceInfo = typeof window !== 'undefined' ? {
                    ua: navigator.userAgent,
                    screen: `${window.screen.width}x${window.screen.height}`,
                } : {};
                
                const newLog = { 
                    ...log, 
                    id: uid(), 
                    created_at: now(),
                    new_data: { 
                        ...(log.new_data || {}), 
                        device_info: deviceInfo 
                    } 
                };
                set(s => ({ auditLogs: [newLog, ...s.auditLogs] }));
                saveToSupabase('audit_log', newLog, true).catch(e => console.error('[ClinicStore] Erro ao salvar log de auditoria:', e));
            },

            // ---- CRM & Automation ----
            addAutomationRule: (rule) => {
                const created: AutomationRule = { ...rule, id: uid(), created_at: now() };
                set(s => ({ automationRules: [created, ...s.automationRules] }));
                return created;
            },
            updateAutomationRule: (id, data) => {
                set(s => ({ automationRules: s.automationRules.map(rule => rule.id === id ? { ...rule, ...data } : rule) }));
            },
            addAutomationRun: (run) => {
                const created: AutomationRun = { ...run, id: uid(), created_at: now() };
                set(s => ({ automationRuns: [created, ...s.automationRuns] }));
                return created;
            },
            addLead: (lead) => {
                const created: Lead = { ...lead, id: uid(), created_at: now(), updated_at: now() };
                set(s => ({ leads: [created, ...s.leads] }));
                return created;
            },
            moveLeadStage: (leadId, stageId) => {
                set(s => ({
                    leads: s.leads.map(lead => lead.id === leadId ? { ...lead, stage_id: stageId, updated_at: now() } : lead),
                }));
            },
        };
        }
);


