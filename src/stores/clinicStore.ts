// ============================================
// LuminaFlow ERP — Main Clinic Store (Zustand + localStorage)
// ============================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    Patient, Appointment, AppointmentStatus, MedicalRecord,
    StockItem, StockMovement, FinancialTransaction, TransactionStatus,
    Service, AuditLog, OdontogramEntry, AnamneseData,
    TreatmentPlan, TreatmentPlanItem, NavigationContext, User,
} from '@/types';

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

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
    navigationContext: NavigationContext;

    // Patient Actions
    addPatient: (p: Omit<Patient, 'id' | 'created_at'>) => Patient;
    updatePatient: (id: string, data: Partial<Patient>) => void;
    importPatients: (patients: Omit<Patient, 'id' | 'created_at'>[]) => number;
    getPatient: (id: string) => Patient | undefined;

    // Appointment Actions
    addAppointment: (a: Omit<Appointment, 'id' | 'created_at'>) => Appointment;
    updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
    startAppointment: (id: string) => void;
    finalizeAppointment: (id: string, userId: string, userName: string) => void;

    // Medical Record Actions
    saveEvolution: (appointmentId: string, patientId: string, clinicId: string, professionalId: string, content: string) => void;
    getRecordsForPatient: (patientId: string) => MedicalRecord[];
    setOdontogramEntry: (patientId: string, entry: OdontogramEntry) => void;
    getOdontogramData: (patientId: string) => OdontogramEntry[];
    saveAnamnese: (data: AnamneseData) => void;
    getAnamnese: (patientId: string) => AnamneseData | undefined;

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
    addTransaction: (t: Omit<FinancialTransaction, 'id' | 'created_at' | 'idempotency_key'>) => FinancialTransaction;
    processPayment: (id: string, method?: string) => void;
    getMonthlyIncome: () => number;
    getMonthlyExpenses: () => number;
    getBalance: () => number;

    // Service Actions
    addService: (s: Omit<Service, 'id'>) => Service;
    updateService: (id: string, data: Partial<Service>) => void;
    deleteService: (id: string) => void;

    // Professional Actions
    updateProfessional: (id: string, data: Partial<User>) => void;
    getProfessionalStats: (id: string) => { appointments: number; revenue: number; ticketMedio: number; noShows: number; attendanceRate: number; topProcedures: { name: string; count: number }[] };

    // Navigation
    setNavigationContext: (ctx: NavigationContext) => void;
    clearNavigationContext: () => void;

    // Audit
    addAuditLog: (log: Omit<AuditLog, 'id' | 'created_at'>) => void;
}

export const useClinicStore = create<ClinicStore>()(
    persist(
        (set, get) => ({
            // Initial data
            professionals: DEMO_PROFESSIONALS,
            patients: DEMO_PATIENTS,
            appointments: DEMO_APPOINTMENTS,
            services: DEMO_SERVICES,
            stockItems: DEMO_STOCK,
            stockMovements: [],
            transactions: DEMO_TRANSACTIONS,
            medicalRecords: [],
            odontogramData: {},
            anamneseData: {},
            treatmentPlans: [],
            auditLogs: [],
            navigationContext: {},

            // ---- Patients ----
            addPatient: (p) => {
                const patient: Patient = { ...p, id: uid(), created_at: now() };
                set(s => ({ patients: [patient, ...s.patients] }));
                return patient;
            },
            updatePatient: (id, data) => {
                set(s => ({ patients: s.patients.map(p => p.id === id ? { ...p, ...data } : p) }));
            },
            importPatients: (patients) => {
                const newPatients = patients.map(p => ({ ...p, id: uid(), created_at: now() }));
                set(s => ({ patients: [...newPatients, ...s.patients] }));
                return newPatients.length;
            },
            getPatient: (id) => get().patients.find(p => p.id === id),

            // ---- Appointments ----
            addAppointment: (a) => {
                const appointment: Appointment = { ...a, id: uid(), created_at: now() };
                set(s => ({ appointments: [...s.appointments, appointment] }));
                return appointment;
            },
            updateAppointmentStatus: (id, status) => {
                set(s => ({ appointments: s.appointments.map(a => a.id === id ? { ...a, status } : a) }));
            },
            startAppointment: (id) => {
                set(s => ({
                    appointments: s.appointments.map(a =>
                        a.id === id ? { ...a, status: 'in_progress' as AppointmentStatus, started_at: now() } : a
                    ),
                }));
            },
            finalizeAppointment: (id, userId, userName) => {
                const state = get();
                const appointment = state.appointments.find(a => a.id === id);
                if (!appointment || appointment.status === 'done') return; // idempotency check

                // 1. Lock appointment
                set(s => ({
                    appointments: s.appointments.map(a =>
                        a.id === id ? { ...a, status: 'done' as AppointmentStatus, finished_at: now() } : a
                    ),
                }));

                // 2. Lock medical records for this appointment
                set(s => ({
                    medicalRecords: s.medicalRecords.map(r =>
                        r.appointment_id === id ? { ...r, locked: true, locked_at: now() } : r
                    ),
                }));

                // 3. Consume stock if service has materials
                const service = state.services.find(svc => svc.id === appointment.service_id);
                if (service && service.materials.length > 0) {
                    const stockConsumptions = service.materials.map(m => ({
                        stock_item_id: m.stock_item_id,
                        qty: m.qty_per_use,
                    }));
                    get().consumeStock(stockConsumptions, id, userId);
                }

                // 4. Generate financial transaction
                const existingTxn = state.transactions.find(
                    t => t.appointment_id === id && t.type === 'income'
                );
                if (!existingTxn) {
                    const materialCost = service?.materials.reduce((sum, m) => {
                        const item = state.stockItems.find(s => s.id === m.stock_item_id);
                        return sum + (item ? item.unit_cost * m.qty_per_use : 0);
                    }, 0) || 0;

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
                        amount: appointment.base_value,
                        status: 'awaiting_payment',
                        items: service?.materials.map(m => m.stock_item_name) || [],
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
            },

            // ---- Medical Records ----
            saveEvolution: (appointmentId, patientId, clinicId, professionalId, content) => {
                const existing = get().medicalRecords.find(r => r.appointment_id === appointmentId);
                if (existing) {
                    if (existing.locked) return;
                    set(s => ({
                        medicalRecords: s.medicalRecords.map(r =>
                            r.appointment_id === appointmentId ? { ...r, content, updated_at: now() } : r
                        ),
                    }));
                } else {
                    set(s => ({
                        medicalRecords: [...s.medicalRecords, {
                            id: uid(), appointment_id: appointmentId, clinic_id: clinicId,
                            patient_id: patientId, professional_id: professionalId,
                            content, locked: false, created_at: now(), updated_at: now(),
                        }],
                    }));
                }
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

            // ---- Stock ----
            addStockItem: (item) => {
                const newItem: StockItem = { ...item, id: uid(), created_at: now() };
                set(s => ({ stockItems: [newItem, ...s.stockItems] }));
                return newItem;
            },
            updateStockItem: (id, data) => {
                set(s => ({ stockItems: s.stockItems.map(i => i.id === id ? { ...i, ...data } : i) }));
            },
            deleteStockItem: (id) => {
                set(s => ({ stockItems: s.stockItems.filter(i => i.id !== id) }));
            },
            consumeStock: (items, appointmentId, userId) => {
                items.forEach(({ stock_item_id, qty }) => {
                    const state = get();
                    const item = state.stockItems.find(s => s.id === stock_item_id);
                    if (!item) return;
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
            },
            addStockMovement: (movement) => {
                set(s => ({ stockMovements: [{ ...movement, id: uid(), created_at: now() }, ...s.stockMovements] }));
            },

            // ---- Financial ----
            addTransaction: (t) => {
                const txn: FinancialTransaction = { ...t, id: uid(), idempotency_key: uid(), created_at: now() };
                set(s => ({ transactions: [txn, ...s.transactions] }));
                return txn;
            },
            processPayment: (id, method) => {
                set(s => ({
                    transactions: s.transactions.map(t =>
                        t.id === id ? { ...t, status: 'paid' as TransactionStatus, payment_method: method || 'manual', paid_at: now() } : t
                    ),
                }));
            },
            getMonthlyIncome: () => {
                const thisMonth = new Date().toISOString().slice(0, 7);
                return get().transactions
                    .filter(t => t.type === 'income' && t.status === 'paid' && t.created_at.startsWith(thisMonth))
                    .reduce((sum, t) => sum + t.amount, 0);
            },
            getMonthlyExpenses: () => {
                const thisMonth = new Date().toISOString().slice(0, 7);
                return get().transactions
                    .filter(t => t.type === 'expense' && t.status === 'paid' && t.created_at.startsWith(thisMonth))
                    .reduce((sum, t) => sum + t.amount, 0);
            },
            getBalance: () => {
                const state = get();
                const income = state.transactions.filter(t => t.type === 'income' && t.status === 'paid').reduce((s, t) => s + t.amount, 0);
                const expenses = state.transactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((s, t) => s + t.amount, 0);
                return income - expenses;
            },

            // ---- Services ----
            addService: (s) => {
                const service: Service = { ...s, id: uid() };
                set(st => ({ services: [...st.services, service] }));
                return service;
            },
            updateService: (id, data) => {
                set(s => ({ services: s.services.map(svc => svc.id === id ? { ...svc, ...data } : svc) }));
            },
            deleteService: (id) => {
                set(s => ({ services: s.services.filter(svc => svc.id !== id) }));
            },

            // ---- Professionals ----
            updateProfessional: (id, data) => {
                set(s => ({ professionals: s.professionals.map(p => p.id === id ? { ...p, ...data } : p) }));
            },
            getProfessionalStats: (id) => {
                const state = get();
                const apts = state.appointments.filter(a => a.professional_id === id);
                const doneApts = apts.filter(a => a.status === 'done');
                const revenue = state.transactions
                    .filter(t => t.professional_id === id && t.type === 'income' && t.status === 'paid')
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

            // ---- Navigation ----
            setNavigationContext: (ctx) => set({ navigationContext: ctx }),
            clearNavigationContext: () => set({ navigationContext: {} }),

            // ---- Audit ----
            addAuditLog: (log) => {
                set(s => ({ auditLogs: [{ ...log, id: uid(), created_at: now() }, ...s.auditLogs] }));
            },
        }),
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
                auditLogs: state.auditLogs,
            }),
        }
    )
);
