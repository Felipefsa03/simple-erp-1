import { useAuth } from '@/hooks/useAuth';
import type { User, Clinic } from '@/types';

interface SubscriptionBlockPageProps {
  user: User;
  clinic: Clinic | null;
  subscriptionInfo: { plan: string; amount: number; dueDate: string; qrCode: string; pixLink: string };
  onPaymentConfirmed: () => void;
}

export function SubscriptionBlockPage({ user, subscriptionInfo, onPaymentConfirmed }: SubscriptionBlockPageProps) {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Assinatura Pendente</h1>
          <p className="text-slate-500 mb-6">Para continuar usando o Clinxia, realize o pagamento do seu plano.</p>

          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
            <div className="flex justify-between text-sm mb-2"><span className="text-slate-500">Plano:</span><span className="font-bold capitalize">{subscriptionInfo.plan}</span></div>
            <div className="flex justify-between text-sm mb-2"><span className="text-slate-500">Valor:</span><span className="font-bold text-emerald-600">R${subscriptionInfo.amount}/mês</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Vencimento:</span><span className="font-bold">{subscriptionInfo.dueDate}</span></div>
          </div>

          {subscriptionInfo.qrCode ? (
            <div className="bg-white border-2 border-slate-200 rounded-xl p-4 mb-4 inline-block">
              <div dangerouslySetInnerHTML={{ __html: subscriptionInfo.qrCode.replace(/<svg/, '<svg style="width:180px;height:180px"') }} />
            </div>
          ) : (
            <div className="w-44 h-44 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📱</span>
            </div>
          )}

          {subscriptionInfo.pixLink && (
            <a href={subscriptionInfo.pixLink} target="_blank" rel="noopener noreferrer" className="block mb-4 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all">
              Pagar pelo Mercado Pago →
            </a>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-xs text-amber-700">⚠️ Após o pagamento, o sistema será liberado automaticamente.</p>
          </div>

          <button
            onClick={async () => {
              try {
                const { supabase } = await import('@/lib/supabase');
                const { data: payments } = await supabase!
                  .from('payments')
                  .select('*')
                  .eq('clinic_id', user?.clinic_id)
                  .eq('status', 'approved')
                  .limit(1);
                if (payments && payments.length > 0) {
                  onPaymentConfirmed();
                } else {
                  window.location.reload();
                }
              } catch (_e: unknown) { window.location.reload(); }
            }}
            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all"
          >
            Já realizei o pagamento
          </button>

          <button onClick={logout} className="mt-3 text-sm text-slate-500 hover:text-slate-700">
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}
