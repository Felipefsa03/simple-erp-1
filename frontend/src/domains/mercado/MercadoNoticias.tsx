import { useState, useEffect } from 'react';
import { Card } from '@/components/design-system';
import { cn } from '@/lib/utils';
import { mercadoApi } from '@/lib/mercado/api';
import { Newspaper, TrendingUp, TrendingDown, Globe, Twitter, ExternalLink, RefreshCw, Activity, Zap, Filter } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  currency: string;
  symbols: string[];
  impact: string;
  direction: string;
  timestamp: number;
  imageUrl?: string;
}

const SOURCE_META: Record<string, { label: string; icon: any; color: string }> = {
  google_news: { label: 'Google News', icon: Globe, color: 'text-blue-600 bg-blue-50' },
  yahoo_finance: { label: 'Yahoo Finance', icon: Activity, color: 'text-violet-600 bg-violet-50' },
  twitter_x: { label: 'X / Twitter', icon: Twitter, color: 'text-sky-600 bg-sky-50' },
  alphavantage: { label: 'Alpha Vantage', icon: Zap, color: 'text-emerald-600 bg-emerald-50' },
  forexfactory: { label: 'Forex Factory', icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
};

export function MercadoNoticias() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filterSource, setFilterSource] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchNews = async () => {
    try {
      const params = filterSource !== 'all' ? `?source=${filterSource}` : '';
      const data = await mercadoApi.newsFeed(params);
      setNews(data.news || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error('[MercadoNoticias] Error fetching news:', err);
    } finally {
      setLoading(false);
    }
  };

  const startScraper = async () => {
    try {
      await mercadoApi.startNewsScraper();
      await fetchNews();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNews();
    if (autoRefresh) {
      const interval = setInterval(fetchNews, 30000);
      return () => clearInterval(interval);
    }
  }, [filterSource, autoRefresh]);

  const sources = Object.keys(SOURCE_META);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-brand-600" />
          <div>
            <h3 className="font-semibold text-slate-900">Feed de Notícias em Tempo Real</h3>
            <p className="text-xs text-slate-400">
              Capturado de: Google News, Yahoo Finance, X/Twitter, Alpha Vantage, Forex Factory
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchNews} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors" title="Atualizar">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="rounded" />
            Auto
          </label>
          <button onClick={startScraper} className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700">
            <Zap className="w-3 h-3" /> Iniciar Scraper
          </button>
        </div>
      </div>

      {stats && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button onClick={() => setFilterSource('all')} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all", filterSource === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
            <Filter className="w-3 h-3" /> Todos ({stats.total || 0})
          </button>
          {sources.map(src => {
            const meta = SOURCE_META[src];
            const count = stats.bySource?.[src] || 0;
            return (
              <button key={src} onClick={() => setFilterSource(src)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all", filterSource === src ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                <meta.icon className="w-3 h-3" /> {meta.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : news.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {news.map((item) => {
            const sourceMeta = SOURCE_META[item.source] || { label: item.source, icon: Globe, color: 'text-slate-600 bg-slate-50' };
            const Icon = sourceMeta.icon;

            return (
              <Card key={item.id} className="p-5 hover:shadow-md transition-shadow border-l-4 border-transparent"
                style={{
                  borderLeftColor: item.direction === 'bullish' ? '#10b981' : item.direction === 'bearish' ? '#ef4444' : '#e2e8f0'
                }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium", sourceMeta.color)}>
                        <Icon className="w-3 h-3" /> {sourceMeta.label}
                      </span>
                      {item.impact === 'high' && <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-bold">ALTO</span>}
                      {item.direction === 'bullish' && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
                      {item.direction === 'bearish' && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                    </div>

                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-semibold text-slate-900 hover:text-brand-600 transition-colors line-clamp-2">
                      {item.title}
                    </a>

                    {item.summary && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.summary}</p>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      {item.symbols?.map((sym: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono font-medium">{sym}</span>
                      ))}
                      <span className="text-[10px] text-slate-400">{new Date(item.timestamp).toLocaleString('pt-BR')}</span>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-slate-300 hover:text-brand-600">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Newspaper className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">Nenhuma notícia capturada</p>
          <p className="text-sm mt-1">Clique em "Iniciar Scraper" para começar a capturar notícias em tempo real</p>
          <div className="flex gap-3 mt-4">
            <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full">
              <Globe className="w-3 h-3" /> Google News
            </div>
            <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-violet-50 text-violet-600 rounded-full">
              <Activity className="w-3 h-3" /> Yahoo Finance
            </div>
            <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-sky-50 text-sky-600 rounded-full">
              <Twitter className="w-3 h-3" /> X/Twitter
            </div>
          </div>
        </div>
      )}

      {stats && stats.total > 0 && (
        <Card className="p-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Estatísticas</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(stats.bySource || {}).map(([src, count]: [string, any]) => {
              const meta = SOURCE_META[src] || { label: src, icon: Globe, color: 'text-slate-600' };
              return (
                <div key={src} className="text-center">
                  <p className="text-lg font-bold text-slate-900">{count}</p>
                  <p className="text-[10px] text-slate-400">{meta.label}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
