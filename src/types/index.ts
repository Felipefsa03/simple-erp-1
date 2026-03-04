// ============================================
// LuminaFlow ERP — Core Type Definitions
// ============================================

// --- Auth & Users ---
export type UserRole = 'super_admin' | 'admin' | 'dentist' | 'receptionist' | 'aesthetician' | 'financial';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    clinic_id?: string;
    commission_pct: number;
    phone?: string;
    created_at: string;
}

export interface Clinic {
    id: string;
    name: string;
    cnpj?: string;
    phone?: string;
    email?: string;
    logo_url?: string;
    plan: 'basic' | 'pro' | 'ultra';
    status: 'active' | 'inactive' | 'trial';
    owner_email: string;
    segment: 'odontologia' | 'estetica' | 'geral';
    created_at: string;
}

// --- Patients ---
export interface Patient {
    id: string;
    clinic_id: string;
    name: string;
    cpf?: string;
    phone: string;
    email: string;
    birth_date?: string;
    allergies: string[];
    tags: string[];
    status: 'active' | 'inactive' | 'risk';
    last_visit?: string;
    created_at: string;
}

// --- Services ---
export interface Service {
    id: string;
    clinic_id: string;
    name: string;
    category: string;
    avg_duration_min: number;
    base_price: number;
    estimated_cost: number;
    materials: ServiceMaterial[];
    active: boolean;
    professional_prices?: Record<string, number>;
}

export interface ServiceMaterial {
    stock_item_id: string;
    stock_item_name: string;
    qty_per_use: number;
}

// --- Appointments ---
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'done' | 'no_show' | 'cancelled';

export interface Appointment {
    id: string;
    clinic_id: string;
    patient_id: string;
    patient_name: string;
    professional_id: string;
    professional_name: string;
    service_id?: string;
    service_name?: string;
    scheduled_at: string;
    duration_min: number;
    status: AppointmentStatus;
    base_value: number;
    notes?: string;
    started_at?: string;
    finished_at?: string;
    service_time_min?: number;
    created_at: string;
}

// --- Medical Records ---
export interface MedicalRecord {
    id: string;
    appointment_id?: string;
    clinic_id: string;
    patient_id: string;
    professional_id: string;
    content: string;
    locked: boolean;
    locked_at?: string;
    created_at: string;
    updated_at: string;
}

export interface OdontogramEntry {
    tooth_number: number;
    procedure: string;
    notes?: string;
    date: string;
}

export interface TreatmentPlan {
    id: string;
    patient_id: string;
    clinic_id: string;
    title: string;
    items: TreatmentPlanItem[];
    status: 'active' | 'completed' | 'cancelled';
    total_estimated: number;
    created_at: string;
}

export interface TreatmentPlanItem {
    id: string;
    service_name: string;
    tooth?: number;
    status: 'pending' | 'in_progress' | 'done';
    estimated_price: number;
    notes?: string;
}

export interface AnamneseData {
    patient_id: string;
    clinic_id: string;
    medical_history: string;
    current_medications: string;
    allergies: string;
    habits: string;
    complaints: string;
    observations: string;
    updated_at: string;
}

// --- Stock ---
export interface StockItem {
    id: string;
    clinic_id: string;
    name: string;
    category: string;
    quantity: number;
    min_quantity: number;
    unit: string;
    unit_cost: number;
    created_at: string;
}

export interface StockMovement {
    id: string;
    clinic_id: string;
    stock_item_id: string;
    stock_item_name: string;
    appointment_id?: string;
    type: 'in' | 'out' | 'adjustment';
    qty: number;
    note: string;
    created_by: string;
    created_at: string;
}

// --- Financial ---
export type TransactionStatus = 'pending' | 'paid' | 'cancelled' | 'refunded' | 'awaiting_payment';

export interface FinancialTransaction {
    id: string;
    clinic_id: string;
    appointment_id?: string;
    patient_id?: string;
    patient_name?: string;
    professional_id?: string;
    professional_name?: string;
    type: 'income' | 'expense';
    category: string;
    description: string;
    amount: number;
    material_cost?: number;
    service_time_min?: number;
    status: TransactionStatus;
    payment_method?: string;
    payment_reference?: string;
    payment_url?: string;
    pix_code?: string;
    idempotency_key: string;
    items?: string[];
    installments?: number;
    due_date?: string;
    created_at: string;
    paid_at?: string;
}

export interface AppointmentMaterial {
    stock_item_id: string;
    stock_item_name: string;
    qty: number;
}

// --- Audit Log ---
export interface AuditLog {
    id: string;
    clinic_id: string;
    user_id: string;
    user_name: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details: string;
    created_at: string;
}

// --- Events ---
export type DomainEventType =
    | 'APPOINTMENT_CREATED'
    | 'APPOINTMENT_STARTED'
    | 'APPOINTMENT_FINISHED'
    | 'PAYMENT_GENERATED'
    | 'PAYMENT_RECEIVED'
    | 'STOCK_CONSUMED'
    | 'PATIENT_CREATED'
    | 'PATIENTS_IMPORTED'
    | 'RECORD_LOCKED';

export interface DomainEvent {
    type: DomainEventType;
    payload: Record<string, any>;
    timestamp: string;
}

// --- Navigation Context ---
export interface NavigationContext {
    patientId?: string;
    appointmentId?: string;
    fromModule?: string;
}

// --- Asaas Integration ---
export interface AsaasConfig {
    api_key: string;
    wallet_id: string;
    environment: 'sandbox' | 'production';
    enabled: boolean;
    webhook_url?: string;
    connected_at?: string;
}

// --- Subscriptions (Super Admin) ---
export interface PlatformSubscription {
    id: string;
    clinic_id: string;
    clinic_name: string;
    plan: 'basic' | 'pro' | 'ultra';
    status: 'active' | 'suspended' | 'cancelled' | 'past_due';
    amount: number;
    billing_cycle: 'monthly' | 'yearly';
    next_billing_date: string;
    created_at: string;
    payment_history: SubscriptionPayment[];
}

export interface SubscriptionPayment {
    id: string;
    date: string;
    amount: number;
    status: 'paid' | 'pending' | 'failed';
    method: string;
}

// --- Security (Super Admin) ---
export interface SecurityLog {
    id: string;
    user_id: string;
    user_name: string;
    action: string;
    ip_address: string;
    details: string;
    created_at: string;
}

export interface ActiveSession {
    id: string;
    user_id: string;
    user_name: string;
    clinic_name: string;
    ip_address: string;
    device: string;
    started_at: string;
    last_activity: string;
}
