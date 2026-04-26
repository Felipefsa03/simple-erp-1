// ============================================
// LuminaFlow ERP — Core Type Definitions
// ============================================

// --- Plans & Subscription ---
export type PlanType = 'basico' | 'profissional' | 'premium';

export interface PlanLimits {
  maxProfessionals: number;
  maxPatients: number;
  maxAppointmentsPerMonth: number;
  hasFinancial: boolean;
  hasStock: boolean;
  hasMarketing: boolean;
  hasProntuarios: boolean;
  hasMultiClinic: boolean;
  hasReports: boolean;
  hasAPI: boolean;
  hasPrioritySupport: boolean;
  hasCustomBranding: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  basico: {
    maxProfessionals: 1,
    maxPatients: 500,
    maxAppointmentsPerMonth: 200,
    hasFinancial: false,
    hasStock: false,
    hasMarketing: false,
    hasProntuarios: true,
    hasMultiClinic: false,
    hasReports: false,
    hasAPI: false,
    hasPrioritySupport: false,
    hasCustomBranding: false,
  },
  profissional: {
    maxProfessionals: 5,
    maxPatients: 2000,
    maxAppointmentsPerMonth: 1000,
    hasFinancial: true,
    hasStock: true,
    hasMarketing: true,
    hasProntuarios: true,
    hasMultiClinic: false,
    hasReports: true,
    hasAPI: false,
    hasPrioritySupport: false,
    hasCustomBranding: false,
  },
  premium: {
    maxProfessionals: 999,
    maxPatients: 999999,
    maxAppointmentsPerMonth: 999999,
    hasFinancial: true,
    hasStock: true,
    hasMarketing: true,
    hasProntuarios: true,
    hasMultiClinic: true,
    hasReports: true,
    hasAPI: true,
    hasPrioritySupport: true,
    hasCustomBranding: true,
  },
};

export interface Subscription {
  id: string;
  clinic_id: string;
  plan: PlanType;
  status: 'active' | 'past_due' | 'cancelled' | 'trial';
  current_period_start: string;
  current_period_end: string;
  amount: number;
  next_billing_date: string;
  mp_payment_id?: string;
  created_at: string;
}

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
    cro?: string;
    avatar_url?: string;
    created_at: string;
}

export interface ClinicAddress {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
}

export interface Clinic {
    id: string;
    name: string;
    cnpj?: string;
    phone?: string;
    email?: string;
    logo_url?: string;
    plan: PlanType;
    status: 'active' | 'past_due' | 'cancelled' | 'trial';
    owner_email: string;
    segment: 'odontologia' | 'estetica' | 'clinica_integrada' | 'geral';
    address?: ClinicAddress;
    specialties?: string[];
    created_at: string;
    // Campos opcionais vindos do banco de dados
    subscription_plan?: PlanType;
    subscription_status?: string;
    permissions?: Record<string, string[]>;
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
export type AppointmentSource = 'internal' | 'online';
export type ReminderChannel = 'whatsapp' | 'sms' | 'email';

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
    source?: AppointmentSource;
    recurrence_id?: string;
    google_event_url?: string;
    created_at: string;
}

export interface WaitingListEntry {
    id: string;
    clinic_id: string;
    patient_id: string;
    patient_name: string;
    service_id?: string;
    service_name?: string;
    preferred_days: number[];
    preferred_time_range: 'morning' | 'afternoon' | 'evening' | 'any';
    channels: ReminderChannel[];
    notes?: string;
    status: 'waiting' | 'contacted' | 'scheduled' | 'cancelled';
    created_at: string;
    updated_at: string;
}

export interface AppointmentRecurrence {
    id: string;
    clinic_id: string;
    patient_id: string;
    service_id?: string;
    professional_id: string;
    start_date: string;
    frequency: 'weekly' | 'biweekly' | 'monthly';
    occurrences: number;
    created_at: string;
}

export interface AppointmentConfirmation {
    id: string;
    clinic_id: string;
    appointment_id: string;
    patient_id: string;
    channel: ReminderChannel;
    status: 'queued' | 'sent' | 'failed';
    message: string;
    provider_response?: string;
    sent_at?: string;
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

export interface AnamneseFormLink {
    id: string;
    clinic_id: string;
    patient_id: string;
    token: string;
    expires_at: string;
    submitted_at?: string;
    status: 'active' | 'submitted' | 'expired';
    created_by?: string;
    created_at: string;
}

export interface DigitalSignature {
    id: string;
    clinic_id: string;
    patient_id: string;
    appointment_id?: string;
    role: 'patient' | 'professional';
    signer_name: string;
    signer_document?: string;
    image_data_url: string;
    signed_at: string;
}

export type ClinicalDocumentType = 'contract' | 'consent' | 'prescription' | 'certificate' | 'custom';

export interface ClinicalDocument {
    id: string;
    clinic_id: string;
    patient_id: string;
    appointment_id?: string;
    type: ClinicalDocumentType;
    title: string;
    content_html: string;
    professional_signature_id?: string;
    patient_signature_id?: string;
    created_by: string;
    created_at: string;
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
    asaas_payment_id?: string;
    asaas_status?: string;
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
    | 'APPOINTMENT_FINALIZED'
    | 'PAYMENT_GENERATED'
    | 'PAYMENT_RECEIVED'
    | 'STOCK_CONSUMED'
    | 'PATIENT_CREATED'
    | 'PATIENTS_IMPORTED'
    | 'RECORD_LOCKED'
    | 'APPOINTMENT_REMINDER_SENT'
    | 'WAITING_LIST_CONTACTED'
    | 'ANAMNESE_LINK_CREATED'
    | 'DOCUMENT_CREATED'
    | 'NPS_REQUESTED'
    | 'ASAAS_RECONCILED'
    | 'INTEGRATION_EVENT_SENT';

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

export interface IntegrationConfig {
    memed_api_url?: string;
    memed_api_token?: string;
    tiss_provider_name?: string;
    tiss_ans_code?: string;
    rd_station_token?: string;
    meta_pixel_id?: string;
    google_ads_customer_id?: string;
    google_calendar_email?: string;
    mp_access_token?: string;
    mp_public_key?: string;
    plan_price_basico?: number;
    plan_price_profissional?: number;
    plan_price_premium?: number;
}

export interface AutomationRule {
    id: string;
    clinic_id: string;
    name: string;
    type: 'nps' | 'reactivation' | 'billing' | 'birthday';
    channel: ReminderChannel;
    enabled: boolean;
    trigger: {
        event: 'appointment_done' | 'patient_inactive' | 'payment_overdue' | 'birthday';
        delay_hours?: number;
        inactivity_days?: number;
    };
    template: string;
    created_at: string;
}

export interface AutomationRun {
    id: string;
    clinic_id: string;
    rule_id: string;
    target_id: string;
    channel: ReminderChannel;
    status: 'queued' | 'sent' | 'failed';
    response?: string;
    created_at: string;
}

export interface Lead {
    id: string;
    clinic_id: string;
    name: string;
    phone?: string;
    email?: string;
    source: 'instagram' | 'google_ads' | 'facebook_ads' | 'referral' | 'walk_in' | 'other';
    interested_service?: string;
    score: number;
    owner_id?: string;
    stage_id: string;
    created_at: string;
    updated_at: string;
}

export interface FunnelStage {
    id: string;
    clinic_id: string;
    name: string;
    order: number;
    color: string;
}

// --- Subscriptions (Super Admin) ---
export interface PlatformSubscription {
    id: string;
    clinic_id: string;
    clinic_name: string;
    plan: 'basic' | 'pro' | 'ultra';
    status: 'active' | 'suspended' | 'cancelled' | 'past_due' | 'trial';
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

// --- Insurance (Convênios) ---
export interface Insurance {
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

// --- Branch (Filiais) ---
export interface Branch {
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

// --- Clinic Integrations (Multi-tenant) ---
export type IntegrationType = 'whatsapp' | 'asaas' | 'google_calendar' | 'rd_station' | 'meta_ads';

export type IntegrationStatus = 'active' | 'inactive' | 'pending' | 'error';

export interface ClinicIntegration {
    id: string;
    clinic_id: string;
    integration_type: IntegrationType;
    status: IntegrationStatus;
    api_token?: string;
    api_secret?: string;
    phone_number?: string;
    webhook_url?: string;
    extra_config?: Record<string, any>;
    last_sync_at?: string;
    error_message?: string;
    created_at: string;
    updated_at: string;
}
