import { useState } from 'react';
import { useMercado } from './hooks/useMercado';
import { Card } from '@/components/design-system';
import { Play, Square, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

const SYMBOLS = ['EURUSD', 'EURUSD-OTC', 'GBPUSD', 'USDJPY', 'AUDUSD', 'BITCOIN', 'ETHEREUM', 'TSLA', 'AAPL', 'GOOGL'];

export function MercadoTrading() {
  const { balance, positions, signals, engineRunning, tradingActive, startEngine, stopEngine, startTrading, stopTrading, trade } = useMercado();
  const [selectedSymbol, setSelectedSymbol] = useState('EURUSD');
  const [selectedDir, setSelectedDir] = useState<'CALL' | 'PUT'>('CALL');
  const [amount, setAmount] = useState(10);
  const [duration, setDuration] = useState(1);
  const [trading, setTrading] = useState(false);

  const handleManualTrade = async () => {
    setTrading(true);
    try {
      await trade({ symbol: selectedSymbol, direction: selectedDir, amount, durationSeconds: duration * 60, type: 'BINARY' });
    } finally {
      setTrading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-900">Painel de Trading</h3>
            <div className="flex gap-2">
              {!tradingActive ? (
                <button onClick={() => startTrading(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                  <Play className="w-4 h-4" /> Iniciar Automático
                </button>
              ) : (
                <button onClick={stopTrading} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                  <Square className="w-4 h-4" /> Parar
                </button>
              )}
              {!engineRunning ? (
                <button onClick={startEngine} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  <Play className="w-4 h-4" /> Engine
                </button>
              ) : (
                <button onClick={stopEngine} className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                  <Square className="w-4 h-4" /> Engine
                </button>
              )}
            </div>
          </div>

          <div className="p-6 bg-slate-900 rounded-xl text-white mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Gráfico em Tempo Real</span>
              <span className="text-xs text-slate-500">{selectedSymbol} · {duration}min</span>
            </div>
            <div className="h-48 flex items-center justify-center text-slate-600">
              <AlertTriangle className="w-8 h-8 mr-2" />
              <span className="text-sm">Conecte-se à IQ Option para visualizar o gráfico ao vivo</span>
            </div>
          </div>

          {positions?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-3">Posições Abertas</h4>
              <div className="space-y-2">
                {positions.map((pos: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {pos.direction === 'CALL' ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                      <div><p className="font-medium text-slate-900">{pos.symbol}</p><p className="text-xs text-slate-400">${pos.amount.toFixed(2)}</p></div>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(pos.openedAt).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Ordem Manual</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Ativo</label>
              <select value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1">Direção</label>
              <div className="flex gap-2">
                <button onClick={() => setSelectedDir('CALL')} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg text-sm font-medium transition-all ${selectedDir === 'CALL' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  <TrendingUp className="w-4 h-4" /> CALL
                </button>
                <button onClick={() => setSelectedDir('PUT')} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg text-sm font-medium transition-all ${selectedDir === 'PUT' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  <TrendingDown className="w-4 h-4" /> PUT
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1">Valor ($)</label>
              <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} min={1} max={balance || 100} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500" />
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1">Duração (min)</label>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm">
                {[1, 2, 3, 5, 10, 15, 30].map(m => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>

            <button onClick={handleManualTrade} disabled={trading || !balance} className="w-full py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {trading ? 'Executando...' : `Executar ${selectedDir === 'CALL' ? 'COMPRA' : 'VENDA'}`}
            </button>

            {signals?.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs font-medium text-blue-700 mb-1">Último sinal do robô</p>
                <p className="text-sm text-blue-900">{signals[signals.length - 1]?.symbol} → {signals[signals.length - 1]?.direction} ({(signals[signals.length - 1]?.confidence * 100).toFixed(0)}%)</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-2">Saldo</h3>
          <p className="text-3xl font-bold text-slate-900">${balance?.toFixed(2) || '0.00'}</p>
          <p className="text-xs text-slate-400 mt-1">Conta PRACTICE · IQ Option</p>
        </Card>
      </div>
    </div>
  );
}
