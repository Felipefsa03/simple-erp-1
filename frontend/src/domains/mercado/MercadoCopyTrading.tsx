import { useMercado } from './hooks/useMercado';
import { Card } from '@/components/design-system';
import { Copy, TrendingUp, TrendingDown, UserCheck, UserX, Star, Shield } from 'lucide-react';

export function MercadoCopyTrading() {
  const { gurus, followedGurus, followGuru, unfollowGuru, loading } = useMercado();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-900">Top Gurus</h3>
              <p className="text-xs text-slate-400">Traders filtrados por win rate, Sharpe ratio e drawdown</p>
            </div>
          </div>

          {gurus?.length > 0 ? (
            <div className="space-y-3">
              {gurus.map((guru: any, i: number) => (
                <div key={guru.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-sm">
                      {guru.name?.charAt(0) || 'G'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{guru.name}</p>
                        {guru.score > 80 && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                        {!guru.isUsingMartingale && <Shield className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-emerald-600 font-medium">{(guru.winRate * 100).toFixed(1)}% win</span>
                        <span className="text-xs text-slate-400">Profit: {guru.profitFactor?.toFixed(2)}</span>
                        <span className="text-xs text-slate-400">Sharpe: {guru.sharpeRatio?.toFixed(2)}</span>
                        <span className="text-xs text-rose-500">Drawdown: {(guru.maxDrawdown * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400">{guru.totalTrades} trades</span>
                    <button onClick={() => followGuru({ guruId: guru.id, copyRatio: 1 })} className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700">
                      <Copy className="w-3 h-3" /> Seguir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <UserX className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">Nenhum guru disponível</p>
              <p className="text-xs mt-1">Conecte à IQ Option e acumule dados de mercado</p>
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-5 h-5 text-brand-600" />
            <h3 className="font-semibold text-slate-900">Seguindo</h3>
          </div>
          {followedGurus?.length > 0 ? (
            <div className="space-y-3">
              {followedGurus.map((fg: any, i: number) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm text-slate-900">{fg.guru?.name || fg.config.guruId}</p>
                    <button onClick={() => unfollowGuru(fg.config.guruId)} className="text-xs text-red-500 hover:underline">Parar</button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Ratio: {fg.config.copyRatio}x</span>
                    <span>Max: ${fg.config.maxAmountPerTrade || 50}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Copy className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Nenhum guru sendo seguido</p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 text-sm mb-3">Filtros Anti-Sortudo</h3>
          <div className="space-y-2 text-xs text-slate-500">
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded"><Shield className="w-3 h-3 text-green-600" /> Win rate mínimo: 55%</div>
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded"><Shield className="w-3 h-3 text-green-600" /> Sharpe ratio mínimo: 0.5</div>
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded"><Shield className="w-3 h-3 text-green-600" /> Drawdown máximo: 15%</div>
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded"><Shield className="w-3 h-3 text-red-600" /> Bloqueio de Martingale</div>
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded"><Shield className="w-3 h-3 text-green-600" /> Mínimo de 50 trades</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
