import { useState } from 'react';
import { TrendingUp, BarChart3, Brain, Copy, History, Settings, Activity, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MercadoDashboard } from './MercadoDashboard';
import { MercadoTrading } from './MercadoTrading';
import { MercadoEstrategias } from './MercadoEstrategias';
import { MercadoAnalise } from './MercadoAnalise';
import { MercadoCopyTrading } from './MercadoCopyTrading';
import { MercadoHistorico } from './MercadoHistorico';
import { MercadoConfig } from './MercadoConfig';
import { MercadoNoticias } from './MercadoNoticias';

export const MERCADO_SUB_TABS = [
  { id: 'mercado', label: 'Dashboard', icon: BarChart3 },
  { id: 'mercado-trading', label: 'Trading', icon: Activity },
  { id: 'mercado-estrategias', label: 'Estratégias', icon: Brain },
  { id: 'mercado-analise', label: 'Análise', icon: TrendingUp },
  { id: 'mercado-copy', label: 'Copy Trading', icon: Copy },
  { id: 'mercado-noticias', label: 'Notícias', icon: Newspaper },
  { id: 'mercado-historico', label: 'Histórico', icon: History },
  { id: 'mercado-config', label: 'Config', icon: Settings },
];

interface MercadoProps {
  subTab?: string;
  onSubTabChange?: (tab: string) => void;
}

export function Mercado({ subTab = 'mercado', onSubTabChange }: MercadoProps) {
  const [activeSubTab, setActiveSubTab] = useState(subTab);

  const handleTabChange = (tab: string) => {
    setActiveSubTab(tab);
    onSubTabChange?.(tab);
  };

  const renderContent = () => {
    switch (activeSubTab) {
      case 'mercado': return <MercadoDashboard onNavigate={handleTabChange} />;
      case 'mercado-trading': return <MercadoTrading />;
      case 'mercado-estrategias': return <MercadoEstrategias />;
      case 'mercado-analise': return <MercadoAnalise />;
      case 'mercado-copy': return <MercadoCopyTrading />;
      case 'mercado-noticias': return <MercadoNoticias />;
      case 'mercado-historico': return <MercadoHistorico />;
      case 'mercado-config': return <MercadoConfig />;
      default: return <MercadoDashboard onNavigate={handleTabChange} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mercado Financeiro</h1>
          <p className="text-sm text-slate-500 mt-1">Sistema automatizado de trading com IA</p>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {MERCADO_SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
              activeSubTab === tab.id
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {renderContent()}
      </div>
    </div>
  );
}
