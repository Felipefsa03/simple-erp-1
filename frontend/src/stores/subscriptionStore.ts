// ============================================
// LuminaFlow ERP — Subscription Store (Zustand)
// ============================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  ClinicSubscription, 
  SubscriptionPlan, 
  SubscriptionStatus,
  PlanType,
  PaymentTransaction
} from '@/types/subscription';
import { SUBSCRIPTION_PLANS, getPlanById, isTrialExpired, getDaysRemaining } from '@/types/subscription';
import { uid, now } from '@/lib/utils';

interface SubscriptionStore {
  // Estado
  subscription: ClinicSubscription | null;
  paymentHistory: PaymentTransaction[];
  availablePlans: SubscriptionPlan[];
  
  // Actions
  createTrialSubscription: (clinicId: string) => ClinicSubscription;
  subscribeToPlan: (clinicId: string, planId: string, billingCycle: 'monthly' | 'yearly') => Promise<ClinicSubscription>;
  cancelSubscription: (clinicId: string) => void;
  reactivateSubscription: (clinicId: string) => void;
  
  // Webhooks e pagamentos
  handlePaymentSuccess: (clinicId: string, paymentData: any) => void;
  handlePaymentFailed: (clinicId: string, paymentData: any) => void;
  handleSubscriptionUpdated: (clinicId: string, mpData: any) => void;
  
  // Controle de acesso
  checkAccess: () => { hasAccess: boolean; reason?: string; daysRemaining?: number };
  blockAccess: (clinicId: string, reason: string) => void;
  
  // Utilitários
  getCurrentPlan: () => SubscriptionPlan | undefined;
  isPaymentPending: () => boolean;
  getNextBillingDate: () => Date | null;
}

const TRIAL_DAYS = 30;

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set, get) => ({
      subscription: null,
      paymentHistory: [],
      availablePlans: SUBSCRIPTION_PLANS,

      createTrialSubscription: (clinicId: string) => {
        const trialStart = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

        const subscription: ClinicSubscription = {
          id: uid(),
          clinic_id: clinicId,
          plan_id: 'free_trial',
          plan_type: 'free_trial',
          status: 'trial',
          trial_start_date: trialStart.toISOString(),
          trial_end_date: trialEnd.toISOString(),
          is_blocked: false,
          created_at: now(),
          updated_at: now(),
        };

        set({ subscription });
        return subscription;
      },

      subscribeToPlan: async (clinicId: string, planId: string, billingCycle: 'monthly' | 'yearly') => {
        const plan = getPlanById(planId);
        if (!plan) throw new Error('Plano não encontrado');

        const current = get().subscription;
        
        // Criar assinatura no Mercado Pago (simulado)
        const mpSubscriptionId = `MP_SUB_${uid()}`;
        const mpCustomerId = `MP_CUST_${clinicId}`;
        
        const subscriptionStart = new Date();
        const subscriptionEnd = new Date();
        subscriptionEnd.setMonth(subscriptionEnd.getMonth() + (billingCycle === 'monthly' ? 1 : 12));

        const subscription: ClinicSubscription = {
          id: uid(),
          clinic_id: clinicId,
          plan_id: planId,
          plan_type: plan.plan_type,
          status: 'pending',
          trial_start_date: current?.trial_start_date || now(),
          trial_end_date: current?.trial_end_date || now(),
          subscription_start_date: subscriptionStart.toISOString(),
          subscription_end_date: subscriptionEnd.toISOString(),
          mp_subscription_id: mpSubscriptionId,
          mp_customer_id: mpCustomerId,
          mp_subscription_status: 'pending',
          payment_method: 'pix',
          next_billing_date: subscriptionEnd.toISOString(),
          is_blocked: false,
          created_at: now(),
          updated_at: now(),
        };

        set({ subscription });
        
        // Simular criação de assinatura no Mercado Pago
        // Em produção, faria chamada à API do Mercado Pago
        console.log('📦 Criando assinatura no Mercado Pago:', {
          planId,
          billingCycle,
          customerId: mpCustomerId,
          amount: billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly,
        });

        return subscription;
      },

      cancelSubscription: (clinicId: string) => {
        const current = get().subscription;
        if (!current || current.clinic_id !== clinicId) return;

        set({
          subscription: {
            ...current,
            status: 'cancelled',
            cancelled_at: now(),
            updated_at: now(),
          },
        });
      },

      reactivateSubscription: (clinicId: string) => {
        const current = get().subscription;
        if (!current || current.clinic_id !== clinicId) return;

        set({
          subscription: {
            ...current,
            status: current.plan_type === 'free_trial' ? 'trial' : 'active',
            cancelled_at: undefined,
            updated_at: now(),
          },
        });
      },

      handlePaymentSuccess: (clinicId: string, paymentData: any) => {
        const current = get().subscription;
        if (!current || current.clinic_id !== clinicId) return;

        const payment: PaymentTransaction = {
          id: uid(),
          clinic_id: clinicId,
          subscription_id: current.id,
          mp_payment_id: paymentData.id,
          mp_payment_type: paymentData.payment_type,
          mp_status: paymentData.status,
          amount: paymentData.transaction_amount,
          currency: paymentData.currency || 'BRL',
          payment_method: paymentData.payment_method_id === 'pix' ? 'pix' : 
                         paymentData.payment_type === 'credit_card' ? 'credit_card' : 'boleto',
          installments: paymentData.installments,
          paid_at: now(),
          created_at: now(),
          status: 'approved',
        };

        set({
          subscription: {
            ...current,
            status: 'active',
            mp_subscription_status: 'active',
            last_payment_date: now(),
            next_billing_date: paymentData.next_billing_date || null,
            is_blocked: false,
            blocked_at: undefined,
            block_reason: undefined,
            updated_at: now(),
          },
          paymentHistory: [payment, ...get().paymentHistory],
        });
      },

      handlePaymentFailed: (clinicId: string, paymentData: any) => {
        const current = get().subscription;
        if (!current || current.clinic_id !== clinicId) return;

        const payment: PaymentTransaction = {
          id: uid(),
          clinic_id: clinicId,
          subscription_id: current.id,
          mp_payment_id: paymentData.id,
          mp_payment_type: paymentData.payment_type,
          mp_status: paymentData.status,
          amount: paymentData.transaction_amount,
          currency: paymentData.currency || 'BRL',
          payment_method: 'pix',
          created_at: now(),
          status: 'rejected',
        };

        set({
          subscription: {
            ...current,
            status: 'past_due',
            mp_subscription_status: 'past_due',
            updated_at: now(),
          },
          paymentHistory: [payment, ...get().paymentHistory],
        });
      },

      handleSubscriptionUpdated: (clinicId: string, mpData: any) => {
        const current = get().subscription;
        if (!current || current.clinic_id !== clinicId) return;

        const statusMap: Record<string, SubscriptionStatus> = {
          'active': 'active',
          'pending': 'pending',
          'paused': 'suspended',
          'cancelled': 'cancelled',
          'past_due': 'past_due',
        };

        const newStatus = statusMap[mpData.status] || current.status;
        const shouldBlock = newStatus === 'past_due' || newStatus === 'cancelled';

        set({
          subscription: {
            ...current,
            status: newStatus,
            mp_subscription_status: mpData.status,
            is_blocked: shouldBlock,
            blocked_at: shouldBlock ? now() : undefined,
            block_reason: shouldBlock ? 'Pagamento não identificado' : undefined,
            updated_at: now(),
          },
        });
      },

      checkAccess: () => {
        const current = get().subscription;
        if (!current) {
          return { hasAccess: false, reason: 'Nenhuma assinatura encontrada' };
        }

        // Verificar se está bloqueado
        if (current.is_blocked) {
          return { hasAccess: false, reason: current.block_reason || 'Acesso bloqueado' };
        }

        // Verificar trial expirado
        if (current.status === 'trial') {
          if (isTrialExpired(current)) {
            // Bloquear acesso
            set({
              subscription: {
                ...current,
                is_blocked: true,
                blocked_at: now(),
                block_reason: 'Período de teste expirado',
              },
            });
            return { hasAccess: false, reason: 'Período de teste expirado' };
          }
          const daysRemaining = getDaysRemaining(current);
          return { hasAccess: true, daysRemaining };
        }

        // Verificar pagamento pendente
        if (current.status === 'pending' || current.status === 'past_due') {
          return { hasAccess: false, reason: 'Pagamento pendente' };
        }

        // Verificar cancelado
        if (current.status === 'cancelled') {
          return { hasAccess: false, reason: 'Assinatura cancelada' };
        }

        return { hasAccess: true };
      },

      blockAccess: (clinicId: string, reason: string) => {
        const current = get().subscription;
        if (!current || current.clinic_id !== clinicId) return;

        set({
          subscription: {
            ...current,
            is_blocked: true,
            blocked_at: now(),
            block_reason: reason,
            updated_at: now(),
          },
        });
      },

      getCurrentPlan: () => {
        const current = get().subscription;
        if (!current) return undefined;
        return getPlanById(current.plan_id);
      },

      isPaymentPending: () => {
        const current = get().subscription;
        return current?.status === 'pending' || current?.status === 'past_due';
      },

      getNextBillingDate: () => {
        const current = get().subscription;
        if (!current?.next_billing_date) return null;
        return new Date(current.next_billing_date);
      },
    }),
    {
      name: 'luminaflow-subscription',
    }
  )
);
