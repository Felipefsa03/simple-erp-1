import { useMercado } from './hooks/useMercado';
import { Card } from '@/components/design-system';
import { useState } from 'react';
import { BarChart3, TrendingUp, Brain, Activity } from 'lucide-react';

const INDICATORS = [
  { id: 'rsi', name: 'RSI (14)', description: 'Momento - Sobrevendido < 30, Sobrecomprado > 70' },
  { id: 'macd', name: 'MACD (12,26,9)', description: 'Tendência - Cruzamento de sinal' },
  { id: 'bollinger', name: 'Bollinger (20,2)', description: 'Volatilidade - Reversão à média' },
  { id: 'stochastic', name: 'Estocástico (14,3,3)', description: 'Momento - %K e %D' },
  { id: 'atr', name: 'ATR (14)', description: 'Volatilidade - Média de range verdadeiro' },
];

export function MercadoAnalise() {
  const { signals } = useMercado();
  const [selectedIndicator, setSelectedIndicator] = useState('rsi');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 space-y-2">
        <Card className="p-4">
          <h3 className="font-semibold text-slate-900 mb-3 text-sm">Indicadores</h3>
          <div className="space-y-1">
            {INDICATORS.map(ind => (
              <button key={ind.id} onClick={() => setSelectedIndicator(ind.id)}
                className={`w-full text-left p-3 rounded-lg text-sm transition-all ${selectedIndicator === ind.id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                <p className="font-medium">{ind.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{ind.description}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-slate-900 mb-2 text-sm">Machine Learning</h3>
          <button className="w-full p-3 rounded-lg bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 text-sm font-medium text-cyan-700 hover:from-cyan-100 hover:to-blue-100 transition-all">
            <Brain className="w-4 h-4 inline mr-2" />Treinar LSTM
          </button>
          <p className="text-xs text-slate-400 mt-2">Requer ~1000 candles históricos</p>
        </Card>
      </div>

      <div className="lg:col-span-3 space-y-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Análise Técnica</h3>
          <div className="h-64 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
            <BarChart3 className="w-8 h-8 mr-2 opacity-50" />
            <span className="text-sm">Gráfico interativo será exibido aqui com os indicadores sobrepostos</span>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-emerald-500" />
              <h4 className="text-sm font-semibold text-slate-900">Sinais em Tempo Real</h4>
            </div>
            {signals?.length > 0 ? (
              <div className="space-y-1">
                {signals.slice(-3).reverse().map((s: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs p-2 bg-slate-50 rounded">
                    <span>{s.symbol}</span>
                    <span className={s.direction === 'CALL' ? 'text-emerald-600' : 'text-red-600'}>{s.direction}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Aguardando...</p>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <h4 className="text-sm font-semibold text-slate-900">Backtesting</h4>
            </div>
            <p className="text-xs text-slate-400 mb-2">Teste suas estratégias com dados históricos</p>
            <button className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">Executar Backtest</button>
          </Card>
        </div>
      </div>
    </div>
  );
}
