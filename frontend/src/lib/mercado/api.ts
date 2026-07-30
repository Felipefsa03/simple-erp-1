const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || '');

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}/api/mercado${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`Mercado API error: ${res.status}`);
  return res.json();
}

export const mercadoApi = {
  status: () => request('/status'),
  balance: () => request('/balance'),
  positions: () => request('/positions'),
  history: (limit = 50) => request(`/history?limit=${limit}`),
  stats: () => request('/stats'),
  trade: (data: any) => request('/trade', { method: 'POST', body: JSON.stringify(data) }),
  engineStart: () => request('/engine/start', { method: 'POST' }),
  engineStop: () => request('/engine/stop', { method: 'POST' }),
  engineConfig: () => request('/engine/config'),
  updateEngineConfig: (data: any) => request('/engine/config', { method: 'POST', body: JSON.stringify(data) }),
  signals: () => request('/signals'),
  sentiment: () => request('/sentiment'),
  sentimentSymbol: (symbol: string) => request(`/sentiment/${symbol}`),
  gurus: () => request('/gurus'),
  guruDetail: (id: string) => request(`/gurus/${id}`),
  copyFollow: (data: any) => request('/copy/follow', { method: 'POST', body: JSON.stringify(data) }),
  copyUnfollow: (data: any) => request('/copy/unfollow', { method: 'POST', body: JSON.stringify(data) }),
  copyFollowed: () => request('/copy/followed'),
  tradingStart: (autoTrade = false) => request('/trading/start', { method: 'POST', body: JSON.stringify({ autoTrade }) }),
  tradingStop: () => request('/trading/stop', { method: 'POST' }),
  riskConfig: () => request('/risk/config'),
  lstmTrain: (data: any) => request('/lstm/train', { method: 'POST', body: JSON.stringify(data) }),
  lstmPredict: (data: any) => request('/lstm/predict', { method: 'POST', body: JSON.stringify(data) }),
  newsAnalysis: () => request('/news/analysis'),
  newsAdd: (data: any) => request('/news/add', { method: 'POST', body: JSON.stringify(data) }),
  newsFeed: (params?: string) => request(`/news/feed${params || ''}`),
  newsFeedSymbol: (symbol: string) => request(`/news/feed/${symbol}`),
  newsSources: () => request('/news/sources'),
  newsStats: () => request('/news/stats'),
  startNewsScraper: () => request('/news/scraper/start', { method: 'POST' }),
  stopNewsScraper: () => request('/news/scraper/stop', { method: 'POST' }),
  backtest: (data: any) => request('/backtest', { method: 'POST', body: JSON.stringify(data) }),
};
