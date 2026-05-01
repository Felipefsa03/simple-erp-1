// ============================================
// clinxia ERP — Tipos de Assinatura e Pagamento
// ============================================

export type PlanType = 'free_trial' | 'basic' | 'pro' | 'ultra';

export type SubscriptionStatus = 
  | 'trial' 
  | 'active' 
  | 'pending' 
  | 'suspended' 
  | 'cancelled' 
  | 'past_due';

export interface SubscriptionPlan {
  id: string;
  name: string;
  plan_type: PlanType;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  max_users: number;
  max_patients: number;
  has_asaas: boolean;
  has_advanced_reports: boolean;
  has_api_access: boolean;
}

export interface ClinicSubscription {
  id: string;
  clinic_id: string;
  plan_id: string;
  plan_type: PlanType;
  status: SubscriptionStatus;
  
  // Datas
  trial_start_date: string;
  trial_end_date: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  cancelled_at?: string;
  
  // Mercado Pago
  mp_subscription_id?: string;
  mp_customer_id?: string;
  mp_subscription_status?: string;
  
  // Pagamento
  payment_method?: 'pix' | 'credit_card' | 'boleto';
  last_payment_date?: string;
  next_billing_date?: string;
  
  // Controle de acesso
  is_blocked: boolean;
  blocked_at?: string;
  block_reason?: string;
  
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  clinic_id: string;
  subscription_id: string;
  
  // Mercado Pago
  mp_payment_id?: string;
  mp_payment_type?: string;
  mp_status?: string;
  mp_status_detail?: string;
  
  // Dados do pagamento
  amount: number;
  currency: string;
  payment_method: 'pix' | 'credit_card' | 'boleto';
  installments?: number;
  
  // Datas
  paid_at?: string;
  created_at: string;
  
  // Status
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
}

export interface WebhookLog {
  id: string;
  clinic_id?: string;
  event_type: string;
  mp_event_id: string;
  payload: Record<string, any>;
  processed: boolean;
  processed_at?: string;
  error?: string;
  created_at: string;
}

// Planos disponíveis
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free_trial',
    name: 'Trial Grátis',
    plan_type: 'free_trial',
    price_monthly: 0,
    price_yearly: 0,
    features: [
      'Até 100 pacientes',
      '1 profissional',
      'Agenda básica',
      'Prontuário eletrônico',
      'Estoque básico',
      'Suporte por email',
    ],
    max_users: 1,
    max_patients: 100,
    has_asaas: false,
    has_advanced_reports: false,
    has_api_access: false,
  },
  {
    id: 'basic',
    name: 'Básico',
    plan_type: 'basic',
    price_monthly: 97,
    price_yearly: 970,
    features: [
      'Até 500 pacientes',
      '3 profissionais',
      'Agenda completa',
      'Prontuário eletrônico',
      'Estoque completo',
      'Relatórios básicos',
      'Suporte prioritário',
    ],
    max_users: 3,
    max_patients: 500,
    has_asaas: false,
    has_advanced_reports: false,
    has_api_access: false,
  },
  {
    id: 'pro',
    name: 'Profissional',
    plan_type: 'pro',
    price_monthly: 197,
    price_yearly: 1970,
    features: [
      'Pacientes ilimitados',
      'Profissionais ilimitados',
      'Agenda completa',
      'Prontuário eletrônico',
      'Estoque completo',
      'Relatórios avançados',
      'Integração Asaas',
      'Múltiplas clínicas',
      'Suporte VIP',
    ],
    max_users: -1,
    max_patients: -1,
    has_asaas: true,
    has_advanced_reports: true,
    has_api_access: true,
  },
  {
    id: 'ultra',
    name: 'Ultra',
    plan_type: 'ultra',
    price_monthly: 397,
    price_yearly: 3970,
    features: [
      'Tudo do Profissional',
      'API completa',
      'White label',
      'Dedicated support',
      'Custom integrations',
      'SLA garantido',
    ],
    max_users: -1,
    max_patients: -1,
    has_asaas: true,
    has_advanced_reports: true,
    has_api_access: true,
  },
];

export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find(p => p.id === planId);
}

export function getPlanPrice(plan: PlanType, billing_cycle: 'monthly' | 'yearly'): number {
  const planData = getPlanById(plan);
  if (!planData) return 0;
  return billing_cycle === 'monthly' ? planData.price_monthly : planData.price_yearly;
}

export function isTrialExpired(subscription: ClinicSubscription): boolean {
  if (subscription.status !== 'trial') return false;
  const trialEnd = new Date(subscription.trial_end_date);
  return trialEnd < new Date();
}

export function getDaysRemaining(subscription: ClinicSubscription): number {
  if (subscription.status !== 'trial') return 0;
  const trialEnd = new Date(subscription.trial_end_date);
  const now = new Date();
  const diff = trialEnd.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Re-export formatCurrency as formatCurrencyBRL for backward compatibility
export { formatCurrency as formatCurrencyBRL } from '@/lib/utils';

