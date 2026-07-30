import { useMercado } from './hooks/useMercado';
import { Card } from '@/components/design-system';
import { Brain, Activity, TrendingUp, BarChart3, Zap, GitBranch, Copy, Sigma } from 'lucide-react';

const STRATEGIES = [
  { id: 'rsi', name: 'RSI', description: 'Relative Strength Index - Compra quando sobrevendido, vende quando sobrecomprado', icon: Activity, color: 'emerald' },
  { id: 'macd', name: 'MACD', description: 'Moving Average Convergence Divergence - Cruzamento de médias', icon: GitBranch, color: 'blue' },
  { id: 'bollinger', name: 'Bollinger Bands', description: 'Bandas de Bollinger - Reversão à média quando toca as bordas', icon: BarChart3, color: 'violet' },
  { id: 'ma-cross', name: 'Médias Móveis', description: 'Cruzamento de média rápida e lenta', icon: TrendingUp, color: 'amber' },
  { id: 'stochastic', name: 'Estocástico', description: 'Oscilador estocástico - %K e %D para overbought/oversold', icon: Activity, color: 'rose' },
  { id: 'contrarian', name: 'Contrarian', description: 'Aposta contra a multidão (sentimento extremo)', icon: Copy, color: 'indigo' },
  { id: 'lstm', name: 'LSTM (IA)', description: 'Rede Neural Recorrente - Predição por deep learning', icon: Brain, color: 'cyan' },
  { id: 'composite', name: 'Composite', description: 'Voto ponderado entre todas as estratégias habilitadas', icon: Sigma, color: 'slate' },
];

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  violet: 'bg-violet-50 text-violet-600 border-violet-200',
  amber: 'bg-amber-50 text-amber-600 border-amber-200',
  rose: 'bg-rose-50 text-rose-600 border-rose-200',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  slate: 'bg-slate-50 text-slate-600 border-slate-200',
};

export function MercadoEstrategias() {
  const { signals } = useMercado();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STRATEGIES.map(strategy => {
          const Icon = strategy.icon;
          return (
            <Card key={strategy.id} className="p-5 border-2 border-transparent hover:border-brand-300 transition-all cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-xl ${colorMap[strategy.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{strategy.name}</h4>
                  <span className="text-xs text-slate-400">Peso: 1.0</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{strategy.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={strategy.id !== 'lstm'} className="sr-only peer" />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-brand-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                </label>
                <span className="text-xs text-slate-400">{strategy.id === 'lstm' ? 'Requer treinamento' : 'Ativo'}</span>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Sinais Recentes por Estratégia</h3>
        {signals?.length > 0 ? (
          <div className="space-y-2">
            {signals.slice(-10).reverse().map((signal: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-slate-900">{signal.symbol}</span>
                  <span className="text-xs text-slate-400">{signal.strategy}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${signal.direction === 'CALL' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {signal.direction}
                  </span>
                  <span className="text-xs text-slate-400">{(signal.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">Nenhum sinal gerado ainda. Inicie a engine de trading.</p>
        )}
      </Card>
    </div>
  );
}
