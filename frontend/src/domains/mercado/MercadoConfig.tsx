import { useMercado } from './hooks/useMercado';
import { Card } from '@/components/design-system';
import { Shield, DollarSign, Activity, Clock, AlertTriangle } from 'lucide-react';

export function MercadoConfig() {
  const { riskConfig } = useMercado();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-slate-900">Gerenciamento de Risco</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /><span className="text-sm text-slate-700">Perda Máxima Diária</span></div>
            <input type="number" defaultValue={riskConfig?.stopLoss?.dailyLossPct || 10} className="w-20 p-1.5 border border-slate-200 rounded text-sm text-right" />%
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" /><span className="text-sm text-slate-700">Lucro Máximo Diário</span></div>
            <input type="number" defaultValue={15} className="w-20 p-1.5 border border-slate-200 rounded text-sm text-right" />%
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" /><span className="text-sm text-slate-700">Tamanho da Posição</span></div>
            <input type="number" defaultValue={2} className="w-20 p-1.5 border border-slate-200 rounded text-sm text-right" />%
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-violet-500" /><span className="text-sm text-slate-700">Intervalo Mínimo</span></div>
            <input type="number" defaultValue={60} className="w-20 p-1.5 border border-slate-200 rounded text-sm text-right" />s
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-red-500" /><span className="text-sm text-slate-700">Perdas Consecutivas</span></div>
            <input type="number" defaultValue={5} className="w-20 p-1.5 border border-slate-200 rounded text-sm text-right" />
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-brand-600" />
            <h3 className="font-semibold text-slate-900">Estado Atual do Risco</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Circuit Breaker</span>
              <span className={`font-medium ${riskConfig?.circuitBreaker?.isOpen ? 'text-red-600' : 'text-emerald-600'}`}>
                {riskConfig?.circuitBreaker?.isOpen ? 'ABERTO' : 'FECHADO'}
              </span>
            </div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Perdas Consecutivas</span><span className="font-medium text-slate-900">{riskConfig?.circuitBreaker?.consecutiveLosses || 0}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Trades Hoje</span><span className="font-medium text-slate-900">{riskConfig?.stopLoss?.tradesToday || 0}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Kelly Fraction</span><span className="font-medium text-slate-900">{riskConfig?.positionSizing?.kellyFraction != null ? (riskConfig.positionSizing.kellyFraction * 100).toFixed(1) : '0.0'}%</span></div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-slate-900">Anti-Ban</h3>
          </div>
          <div className="space-y-2 text-xs text-slate-500">
            <div className="p-2 bg-slate-50 rounded">Jitter: Delay aleatório de 150-600ms antes de cada ordem</div>
            <div className="p-2 bg-slate-50 rounded">Session Spoofing: Ações aleatórias para simular humano</div>
            <div className="p-2 bg-slate-50 rounded">Limite diário: Pausa após lucro ou perda excessiva</div>
            <div className="p-2 bg-slate-50 rounded">Circuit Breaker: Para após N perdas consecutivas</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
