import { useMercado } from './hooks/useMercado';
import { Card } from '@/components/design-system';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart3, Target, Zap, Brain } from 'lucide-react';

interface MercadoDashboardProps {
  onNavigate: (tab: string) => void;
}

export function MercadoDashboard({ onNavigate }: MercadoDashboardProps) {
  const { balance, stats, signals, moods, engineRunning, tradingActive, loading, gurus } = useMercado();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  const winRate = stats?.winRate != null ? (stats.winRate * 100).toFixed(1) : '0.0';
  const totalTrades = stats?.totalTrades || 0;
  const profitFactor = stats?.profitFactor != null ? stats.profitFactor.toFixed(2) : '0.00';
  const kellyFraction = stats?.kellyFraction != null ? (stats.kellyFraction * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Saldo</p>
              <p className="text-2xl font-bold text-slate-900">${balance?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><DollarSign className="w-6 h-6" /></div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", tradingActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
              {tradingActive ? 'Ativo' : 'Inativo'}
            </span>
            <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", engineRunning ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500")}>
              Engine: {engineRunning ? 'Ligada' : 'Desligada'}
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Win Rate</p>
              <p className="text-2xl font-bold text-slate-900">{winRate}%</p>
            </div>
            <div className={cn("p-3 rounded-xl", parseFloat(winRate) >= 50 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
              <Target className="w-6 h-6" />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">{totalTrades} trades no total</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Profit Factor</p>
              <p className="text-2xl font-bold text-slate-900">{profitFactor}</p>
            </div>
            <div className="p-3 rounded-xl bg-violet-50 text-violet-600"><BarChart3 className="w-6 h-6" /></div>
          </div>
          <p className="mt-2 text-xs text-slate-400">Kelly: {kellyFraction}%</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Gurus</p>
              <p className="text-2xl font-bold text-slate-900">{gurus?.length || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600"><Brain className="w-6 h-6" /></div>
          </div>
          <p className="mt-2 text-xs text-slate-400">Top traders disponíveis</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Últimos Sinais</h3>
          {signals?.length > 0 ? (
            <div className="space-y-3">
              {signals.slice(-5).reverse().map((signal: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {signal.direction === 'CALL' ? (
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{signal.symbol}</p>
                      <p className="text-xs text-slate-400">{signal.strategy} · {(signal.confidence * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                  <span className={cn("text-xs font-bold px-2 py-1 rounded", signal.direction === 'CALL' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                    {signal.direction}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Activity className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Aguardando sinais...</p>
              <button onClick={() => onNavigate('mercado-estrategias')} className="mt-2 text-xs text-brand-600 hover:underline">
                Configurar estratégias
              </button>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Sentimento do Mercado</h3>
          {moods?.length > 0 ? (
            <div className="space-y-3">
              {moods.slice(0, 8).map((mood: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full", mood.mood > 0.6 ? "bg-emerald-500" : mood.mood < 0.4 ? "bg-red-500" : "bg-slate-400")} />
                    <p className="font-medium text-slate-900">{mood.symbol}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", mood.mood > 0.6 ? "bg-emerald-500" : mood.mood < 0.4 ? "bg-red-500" : "bg-slate-400")}
                        style={{ width: `${mood.mood * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium text-slate-500 w-8 text-right">{(mood.mood * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Zap className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhum dado de sentimento disponível</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}


