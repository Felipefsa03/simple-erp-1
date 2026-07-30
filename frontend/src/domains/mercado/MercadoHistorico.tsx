import { useMercado } from './hooks/useMercado';
import { Card } from '@/components/design-system';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

export function MercadoHistorico() {
  const { history, stats } = useMercado();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4"><p className="text-xs text-slate-400">Total</p><p className="text-lg font-bold text-slate-900">{stats?.totalTrades || 0}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-400">Wins</p><p className="text-lg font-bold text-emerald-600">{stats?.wins || 0}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-400">Losses</p><p className="text-lg font-bold text-red-600">{stats?.losses || 0}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-400">Win Rate</p><p className="text-lg font-bold text-slate-900">{stats?.winRate != null ? (stats.winRate * 100).toFixed(1) : '0.0'}%</p></Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Histórico de Trades</h3>
        {history?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-medium">Ativo</th>
                  <th className="pb-3 font-medium">Direção</th>
                  <th className="pb-3 font-medium">Valor</th>
                  <th className="pb-3 font-medium">Resultado</th>
                  <th className="pb-3 font-medium">Lucro</th>
                  <th className="pb-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {history.map((trade: any, i: number) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        {trade.result === 'win' ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                        {trade.symbol || 'EURUSD'}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${trade.direction === 'CALL' || trade.result === 'win' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {trade.direction || (trade.result === 'win' ? 'CALL' : 'PUT')}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600">${trade.amount?.toFixed(2) || '0.00'}</td>
                    <td className="py-3">
                      <span className={`text-xs font-bold ${trade.result === 'win' ? 'text-emerald-600' : trade.result === 'loss' ? 'text-red-600' : 'text-slate-400'}`}>
                        {trade.result === 'win' ? 'WIN' : trade.result === 'loss' ? 'LOSS' : 'EMPATE'}
                      </span>
                    </td>
                    <td className={`py-3 font-medium ${(trade.profitAmount || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {trade.profitAmount != null ? `${trade.profitAmount >= 0 ? '+' : ''}$${trade.profitAmount.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-3 text-slate-400 text-xs">
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(trade.openedAt || trade.closedAt || Date.now()).toLocaleString()}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum trade realizado</p>
            <p className="text-xs mt-1">Ative a engine de trading para começar</p>
          </div>
        )}
      </Card>
    </div>
  );
}
