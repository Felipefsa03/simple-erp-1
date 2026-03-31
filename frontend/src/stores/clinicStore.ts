// ============================================
// LuminaFlow ERP — Main Clinic Store (Zustand + localStorage)
// ============================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    Patient, Appointment, AppointmentStatus, MedicalRecord,
    StockItem, StockMovement, FinancialTransaction, TransactionStatus,
    Service, AuditLog, OdontogramEntry, AnamneseData,
    TreatmentPlan, TreatmentPlanItem, NavigationContext, User, AppointmentMaterial, DomainEventType,
    WaitingListEntry, AppointmentRecurrence, AppointmentConfirmation, AnamneseFormLink,
    DigitalSignature, ClinicalDocument, AutomationRule, AutomationRun, Lead, FunnelStage, IntegrationConfig,
    Insurance, Branch,
} from '@/types';
import { useEventBus } from '@/stores/eventBus';
import { useAuth } from '@/hooks/useAuth';
import { uid, now } from '@/lib/utils';
import { SupabaseSync } from '@/lib/supabaseSync';

// Proxy handles routing: Vite dev proxy in dev, Vercel rewrites in production
const CLINIC_API_BASE = '';

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

let hasSynced = false;

const syncWithSupabaseInternal = async (clinicId: string, set: any, get: any) => {
    if (hasSynced) {
        console.log('[ClinicStore] ⏭️ Sincronização já realizada, pulando...');
        return;
    }
    hasSynced = true;
    
    console.log('[ClinicStore] 🔄 Iniciando sincronização com Supabase para:', clinicId);
    
    try {
        // Carregar pacientes - SEMPRE sobrescrever dados locais
        const patients = await SupabaseSync.loadPatients(clinicId);
        set({ patients });
        console.log('[ClinicStore] ✅ Pacientes carregados:', patients.length);

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

        // Carregar transações - SEMPRE sobrescrever
        const transactions = await SupabaseSync.loadTransactions(clinicId);
        if (transactions.length > 0) {
        set({ transactions });
        console.log('[ClinicStore] ✅ Transações carregadas:', transactions.length);

        console.log('[ClinicStore] ✅ Sincronização completa!');
    } catch (error) {
        console.error('[ClinicStore] ❌ Erro na sincronização:', error);
    }
};

// Wrapper para salvar no Supabase e atualizar estado local
const saveToSupabase = async (type: 'patient' | 'professional' | 'appointment' | 'service' | 'stock' | 'transaction', data: any, isNew: boolean = true) => {
    try {
        if (type === 'patient') {
            if (isNew) {
                await SupabaseSync.savePatient(data);
            } else {
                await SupabaseSync.updatePatient(data.id, data);
            }
        } else if (type === 'professional') {
            if (isNew) {
                await SupabaseSync.saveProfessional(data);
            } else {
                await SupabaseSync.updateProfessional(data.id, data);
            }
        } else if (type === 'appointment') {
            if (isNew) {
                await SupabaseSync.saveAppointment(data);
            } else {
                await SupabaseSync.updateAppointment(data.id, data);
            }
        } else if (type === 'service') {
            if (isNew) {
                await SupabaseSync.saveService(data);
            } else {
                await SupabaseSync.updateService(data.id, data);
            }
        } else if (type === 'stock') {
            if (isNew) {
                await SupabaseSync.saveStockItem(data);
            } else {
                await SupabaseSync.updateStockItem(data.id, data);
            }
        } else if (type === 'transaction') {
            if (isNew) {
                await SupabaseSync.saveTransaction(data);
            } else {
                await SupabaseSync.updateTransaction(data.id, data);
            }
        }
    } catch (error) {
        console.error(`[ClinicStore] Erro ao salvar ${type} no Supabase:`, error);
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
    navigationContext: NavigationContext;

    // Patient Actions
    addPatient: (p: Omit<Patient, 'id' | 'created_at'>) => Patient;
    updatePatient: (id: string, data: Partial<Patient>) => void;
    importPatients: (patients: Omit<Patient, 'id' | 'created_at'>[]) => number;
    getPatient: (id: string) => Patient | undefined;

    // Sync Actions
    syncWithSupabase: () => void;

    // Appointment Actions
    addAppointment: (a: Omit<Appointment, 'id' | 'created_at'>) => Appointment | null;
    updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
    startAppointment: (id: string) => void;
    finalizeAppointment: (id: string, userId: string, userName: string) => boolean;
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

    // Service Actions
    addService: (s: Omit<Service, 'id'>) => Service;
    updateService: (id: string, data: Partial<Service>) => void;
    deleteService: (id: string) => void;

    // Professional Actions
    addProfessional: (p: Omit<User, 'id' | 'created_at'>) => User | null;
    updateProfessional: (id: string, data: Partial<User>) => void;
    deleteProfessional: (id: string) => void;
    getProfessionalCommissions: (professionalId: string, month?: string) => { total_produced: number; commission_amount: number; appointment_count: number };
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

// Verificar se Supabase está configurado para usar dados reais
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gzcimnredlffqyogxzqq.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-NOExiRGRb1XcRAMEgkTzQ_9d1AGmtK';
const useRealData = !!(SUPABASE_URL && SUPABASE_KEY);

// Dados reais ou demo baseado na configuração
const INITIAL_DATA = useRealData ? {
    professionals: [],
    patients: [],
    appointments: [],
    services: DEMO_SERVICES,
    stockItems: DEMO_STOCK,
    transactions: [],
} : {
    professionals: DEMO_PROFESSIONALS,
    patients: DEMO_PATIENTS,
    appointments: DEMO_APPOINTMENTS,
    services: DEMO_SERVICES,
    stockItems: DEMO_STOCK,
    transactions: DEMO_TRANSACTIONS,
};

console.log('[ClinicStore] Modo:', useRealData ? 'REAL (Supabase)' : 'DEMO', '- Patients:', useRealData ? 'vai carregar do banco' : DEMO_PATIENTS.length);

export const useClinicStore = create<ClinicStore>()(
    persist(
        (set, get) => {
            // Auto-sync with Supabase on first load if configured
            if (useRealData && typeof window !== 'undefined') {
                const clinicId = '00000000-0000-0000-0000-000000000001';
                console.log('[ClinicStore] 🔄 Iniciando sincronização automática...');
                setTimeout(() => syncWithSupabaseInternal(clinicId, set, get), 1500);
            }
            
            return {
            // Initial data - based on Supabase configuration
            professionals: INITIAL_DATA.professionals,
            patients: INITIAL_DATA.patients,
            appointments: INITIAL_DATA.appointments,
            services: INITIAL_DATA.services,
            stockItems: INITIAL_DATA.stockItems,
            stockMovements: [],
            transactions: INITIAL_DATA.transactions,
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
            whatsappIntegrations: {
                'clinic-1': { connected: false, token: '', phoneNumber: '', lastSync: null },
                'clinic-2': { connected: false, token: '', phoneNumber: '', lastSync: null },
                'clinic-3': { connected: false, token: '', phoneNumber: '', lastSync: null },
            },
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
                return branch;
            },
            updateBranch: (id, data) => {
                set(s => ({ branches: s.branches.map(b => b.id === id ? { ...b, ...data } : b) }));
            },
            deleteBranch: (id) => {
                set(s => ({ branches: s.branches.filter(b => b.id !== id) }));
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
            addPatient: async (p) => {
                const clinic_id = useAuth.getState().user?.clinic_id || 'clinic-1';
                const formattedPhone = formatPhoneForWhatsApp(p.phone);
                const patient: Patient = { ...p, phone: formattedPhone, clinic_id, id: uid(), created_at: now() };
                set(s => ({ patients: [patient, ...s.patients] }));
                emitEvent('PATIENT_CREATED', { patient_id: patient.id, clinic_id: patient.clinic_id });
                
                // Salvar no Supabase
                await saveToSupabase('patient', patient, true);
                console.log('[ClinicStore] ✅ Paciente salvo no Supabase:', patient.name);
                
                return patient;
            },
            updatePatient: async (id, data) => {
                const updatedData = data.phone ? { ...data, phone: formatPhoneForWhatsApp(data.phone) } : data;
                set(s => ({ patients: s.patients.map(p => p.id === id ? { ...p, ...updatedData } : p) }));
                
                // Atualizar no Supabase
                const patient = get().patients.find(p => p.id === id);
                if (patient) {
                    await saveToSupabase('patient', { ...patient, ...updatedData }, false);
                }
            },
            importPatients: (patients) => {
                const newPatients = patients.map(p => ({ ...p, id: uid(), created_at: now() }));
                set(s => ({ patients: [...newPatients, ...s.patients] }));
                emitEvent('PATIENTS_IMPORTED', { clinic_id: patients[0]?.clinic_id, count: newPatients.length });
                return newPatients.length;
            },
            getPatient: (id) => get().patients.find(p => p.id === id),

            // ---- Sync ----
            syncWithSupabase: () => {
                const clinic_id = useAuth.getState().user?.clinic_id || '00000000-0000-0000-0000-000000000001';
                syncWithSupabaseInternal(clinic_id, set, get);
            },

            // ---- Appointments ----
            addAppointment: (a) => {
                const state = get();
                const clinic_id = useAuth.getState().user?.clinic_id || 'clinic-1';
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

                const appointment: Appointment = { ...a, clinic_id, source: a.source || 'internal', id: uid(), created_at: now() };
                set(s => ({ appointments: [...s.appointments, appointment] }));
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
                if (status === 'done') return;
                set(s => ({ appointments: s.appointments.map(a => a.id === id ? { ...a, status } : a) }));
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
                emitEvent('APPOINTMENT_STARTED', {
                    appointment_id: id,
                    clinic_id: appointment.clinic_id,
                    patient_id: appointment.patient_id,
                    professional_id: appointment.professional_id,
                });
            },
            finalizeAppointment: (id, userId, userName) => {
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

                // 2. Lock medical records for this appointment
                set(s => ({
                    medicalRecords: s.medicalRecords.map(r =>
                        r.appointment_id === id ? { ...r, locked: true, locked_at: now() } : r
                    ),
                }));
                emitEvent('RECORD_LOCKED', { appointment_id: id, clinic_id: appointment.clinic_id });

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
                    let chargeAmount = appointment.base_value;
                    if (service?.professional_prices && appointment.professional_id) {
                        const profPrice = service.professional_prices[appointment.professional_id];
                        if (profPrice !== undefined && profPrice > 0) {
                            chargeAmount = profPrice;
                        }
                    }

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
                        return;
                    }
                }
                // Create new record (standalone or appointment-linked)
                set(s => ({
                    medicalRecords: [...s.medicalRecords, {
                        id: uid(), appointment_id: appointmentId || undefined, clinic_id: clinicId,
                        patient_id: patientId, professional_id: professionalId,
                        content, locked: false, created_at: now(), updated_at: now(),
                    }],
                }));
            },
            getRecordsForPatient: (patientId) => get().medicalRecords.filter(r => r.patient_id === patientId),
            setOdontogramEntry: (patientId, entry) => {
                set(s => {
                    const existing = s.odontogramData[patientId] || [];
                    const filtered = existing.filter(e => e.tooth_number !== entry.tooth_number);
                    return { odontogramData: { ...s.odontogramData, [patientId]: [...filtered, entry] } };
                });
            },
            getOdontogramData: (patientId) => get().odontogramData[patientId] || [],
            saveAnamnese: (data) => {
                set(s => ({ anamneseData: { ...s.anamneseData, [data.patient_id]: data } }));
            },
            getAnamnese: (patientId) => get().anamneseData[patientId],
            // ---- Anamnese Links & Public Forms ----
            syncAnamneseWithServer: async () => {
                try {
                    const response = await fetch(`${CLINIC_API_BASE}/api/clinic/anamnese-sync`, {
                        headers: {
                            'ngrok-skip-browser-warning': 'true'
                        }
                    });
                    if (!response.ok) return false;
                    
                    const text = await response.text();
                    if (!text) return false;
                    
                    const data = JSON.parse(text);
                    if (data.ok && Array.isArray(data.items) && data.items.length > 0) {
                        data.items.forEach((item: any) => {
                            get().saveAnamnese({
                                ...item.data,
                                patient_id: item.patientId,
                                clinic_id: item.clinicId,
                                updated_at: item.submittedAt,
                            });
                        });
                        return true;
                    }
                } catch (error) {
                    // Silent catch to prevent spamming the console on network errors
                }
                return false;
            },

            generateAnamneseLink: (patientId, createdBy, hoursValid = 72) => {
                const clinic_id = useAuth.getState().user?.clinic_id || 'clinic-1';
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
                set(s => ({ treatmentPlans: [...s.treatmentPlans, { ...plan, id: uid(), created_at: now() }] }));
            },
            updateTreatmentPlan: (planId, items) => {
                set(s => ({
                    treatmentPlans: s.treatmentPlans.map(p =>
                        p.id === planId ? { ...p, items, total_estimated: items.reduce((sum, i) => sum + i.estimated_price, 0) } : p
                    ),
                }));
            },
            getPlansForPatient: (patientId) => get().treatmentPlans.filter(p => p.patient_id === patientId),

            // ---- Appointment Materials ----
            setAppointmentMaterials: (appointmentId, items) => {
                set(s => ({ appointmentMaterials: { ...s.appointmentMaterials, [appointmentId]: items } }));
            },
            getAppointmentMaterials: (appointmentId) => get().appointmentMaterials[appointmentId] || [],

            // ---- Stock ----
            addStockItem: async (item) => {
                const clinic_id = useAuth.getState().user?.clinic_id || 'clinic-1';
                const newItem: StockItem = { ...item, clinic_id, id: uid(), created_at: now() };
                set(s => ({ stockItems: [newItem, ...s.stockItems] }));
                
                // Salvar no Supabase
                await saveToSupabase('stock', newItem, true);
                
                return newItem;
            },
            updateStockItem: async (id, data) => {
                set(s => ({ stockItems: s.stockItems.map(i => i.id === id ? { ...i, ...data } : i) }));
                
                // Atualizar no Supabase
                const item = get().stockItems.find(i => i.id === id);
                if (item) {
                    await saveToSupabase('stock', { ...item, ...data }, false);
                }
            },
            deleteStockItem: async (id) => {
                set(s => ({ stockItems: s.stockItems.filter(i => i.id !== id) }));
                
                // Deletar no Supabase
                await SupabaseSync.deleteStockItem(id);
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
                    get().updateStockItem(stock_item_id, { quantity: newQty });
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
                const clinic_id = useAuth.getState().user?.clinic_id || 'clinic-1';
                set(s => ({ stockMovements: [{ ...movement, clinic_id, id: uid(), created_at: now() }, ...s.stockMovements] }));
            },

            // ---- Financial ----
            addTransaction: async (t) => {
                const clinic_id = useAuth.getState().user?.clinic_id || 'clinic-1';
                const inferredKey = t.idempotency_key || (t.appointment_id ? `apt:${t.appointment_id}:${t.type}` : uid());
                const existing = get().transactions.find(txn => txn.idempotency_key === inferredKey);
                if (existing) return existing;
                const txn: FinancialTransaction = { ...t, clinic_id, id: uid(), idempotency_key: inferredKey, created_at: now() };
                set(s => ({ transactions: [txn, ...s.transactions] }));
                
                // Salvar no Supabase
                await saveToSupabase('transaction', txn, true);
                
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
                
                // Atualizar no Supabase
                await saveToSupabase('transaction', { ...txn, ...updatedData }, false);
                
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
                            payment_url: t.payment_url || `https://pay.luminaflow.local/${id}`,
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

            // ---- Services ----
            addService: async (s) => {
                const clinic_id = useAuth.getState().user?.clinic_id || 'clinic-1';
                const service: Service = { ...s, clinic_id, id: uid() };
                set(st => ({ services: [...st.services, service] }));
                
                // Salvar no Supabase
                await saveToSupabase('service', service, true);
                
                return service;
            },
            updateService: async (id, data) => {
                set(s => ({ services: s.services.map(svc => svc.id === id ? { ...svc, ...data } : svc) }));
                
                // Atualizar no Supabase
                const service = get().services.find(svc => svc.id === id);
                if (service) {
                    await saveToSupabase('service', { ...service, ...data }, false);
                }
            },
            deleteService: async (id) => {
                set(s => ({ services: s.services.filter(svc => svc.id !== id) }));
                
                // Deletar no Supabase
                await SupabaseSync.deleteService(id);
            },

            // ---- Professionals ----
            addProfessional: async (p) => {
                const clinic_id = useAuth.getState().user?.clinic_id || 'clinic-1';
                const email = (p.email || '').toLowerCase();
                if (email && get().professionals.some(prof => prof.email.toLowerCase() === email)) {
                    return null;
                }
                const professional: User = { ...p, clinic_id, id: uid(), created_at: now() };
                set(s => ({ professionals: [professional, ...s.professionals] }));
                
                // Salvar no Supabase
                await saveToSupabase('professional', professional, true);
                console.log('[ClinicStore] ✅ Profissional salvo no Supabase:', professional.name);
                
                return professional;
            },
            updateProfessional: async (id, data) => {
                set(s => ({ professionals: s.professionals.map(p => p.id === id ? { ...p, ...data } : p) }));
                
                // Atualizar no Supabase
                const professional = get().professionals.find(p => p.id === id);
                if (professional) {
                    await saveToSupabase('professional', { ...professional, ...data }, false);
                }
            },
            deleteProfessional: async (id) => {
                set(s => ({ professionals: s.professionals.filter(p => p.id !== id) }));
                
                // Deletar no Supabase
                await SupabaseSync.deleteProfessional(id);
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
                const total = apts.length || 1;

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
                    attendanceRate: ((total - noShows) / total) * 100,
                    topProcedures,
                };
            },
            getProfessionalCommissions: (professionalId, month) => {
                const state = get();
                const prof = state.professionals.find(p => p.id === professionalId);
                if (!prof) return { total_produced: 0, commission_amount: 0, appointment_count: 0 };

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
                const total_produced = txns.reduce((sum, t) => sum + t.amount, 0);
                const commission_amount = paid_txns.reduce((sum, t) => sum + (t.amount * (prof.commission_pct / 100)), 0);

                return {
                    total_produced,
                    commission_amount,
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
            setIntegrationConfig: (config) => set(s => ({ integrationConfig: { ...s.integrationConfig, ...config } })),

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
                set(s => ({ auditLogs: [{ ...log, id: uid(), created_at: now() }, ...s.auditLogs] }));
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
        },
        {
            name: 'luminaflow-clinic-store',
            partialize: (state) => ({
                patients: state.patients,
                appointments: state.appointments,
                services: state.services,
                stockItems: state.stockItems,
                stockMovements: state.stockMovements,
                transactions: state.transactions,
                medicalRecords: state.medicalRecords,
                odontogramData: state.odontogramData,
                anamneseData: state.anamneseData,
                treatmentPlans: state.treatmentPlans,
                professionals: state.professionals,
                appointmentMaterials: state.appointmentMaterials,
                notificationPrefs: state.notificationPrefs,
                patientPhotos: state.patientPhotos,
                auditLogs: state.auditLogs,
                waitingList: state.waitingList,
                recurrences: state.recurrences,
                appointmentConfirmations: state.appointmentConfirmations,
                anamneseLinks: state.anamneseLinks,
                signatures: state.signatures,
                clinicalDocuments: state.clinicalDocuments,
                automationRules: state.automationRules,
                automationRuns: state.automationRuns,
                leads: state.leads,
                funnelStages: state.funnelStages,
                integrationConfig: state.integrationConfig,
                insurances: state.insurances,
                branches: state.branches,
                whatsappIntegrations: state.whatsappIntegrations,
                systemWhatsApp: state.systemWhatsApp,
            }),
            merge: (persistedState, currentState) => {
                // Usar dados do localStorage se existirem, caso contrário usar dados iniciais
                const next = {
                    ...currentState,
                    ...(persistedState as Partial<ClinicStore>),
                } as ClinicStore;
                
                // Se não tem dados persistidos e está em modo real, vai carregar do banco
                if (!persistedState) {
                    console.log('[ClinicStore] Sem dados salvos, usando dados iniciais');
                }
                return next;
            },
        }
    )
);
