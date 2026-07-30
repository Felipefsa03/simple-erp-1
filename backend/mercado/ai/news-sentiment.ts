import { Direction } from '../types';
import { EventEmitter } from 'events';

interface NewsItem {
  title: string;
  summary: string;
  impact: 'high' | 'medium' | 'low';
  currency: string;
  timestamp: number;
  direction: 'bullish' | 'bearish' | 'neutral';
}

interface NewsAnalysis {
  symbol: string;
  sentiment: number;
  direction: Direction | 'NEUTRO';
  confidence: number;
  newsCount: number;
  blockingTrades: boolean;
  reason: string;
}

export class NewsSentimentAnalyzer extends EventEmitter {
  private newsCache: Map<string, NewsItem[]> = new Map();
  private analysisCache: Map<string, NewsAnalysis> = new Map();
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  // Mapeamento de moedas para pares Forex
  private readonly currencyMap: Record<string, string[]> = {
    'USD': ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCAD', 'AUDUSD'],
    'EUR': ['EURUSD', 'EURJPY', 'EURGBP'],
    'GBP': ['GBPUSD', 'EURGBP'],
    'JPY': ['USDJPY', 'EURJPY'],
    'AUD': ['AUDUSD'],
    'CAD': ['USDCAD'],
    'BTC': ['BITCOIN'],
    'ETH': ['ETHEREUM'],
  };

  // Palavras-chave para análise de sentimento
  private readonly bullishKeywords = [
    'interest rate cut', 'stimulus', 'growth', 'expansion', 'surplus',
    'employment rise', 'gdp up', 'inflation target', 'quantitative easing',
    'rate cut', 'economic recovery', 'bullish', 'outperform',
  ];

  private readonly bearishKeywords = [
    'interest rate hike', 'recession', 'inflation', 'debt crisis',
    'unemployment', 'gdp down', 'trade war', 'sanctions',
    'rate hike', 'economic slowdown', 'bearish', 'default',
    'volatility', 'crash', 'sell-off',
  ];

  constructor() {
    super();
  }

  startMonitoring(intervalMs: number = 300000) {
    this.updateInterval = setInterval(() => {
      this.analyzeAll();
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async analyzeNews(symbol: string): Promise<NewsAnalysis> {
    const currencies = this.getCurrenciesForSymbol(symbol);
    const allNews: NewsItem[] = [];
    let totalSentiment = 0;
    let highImpactCount = 0;

    for (const currency of currencies) {
      const news = this.newsCache.get(currency) || [];
      allNews.push(...news);

      for (const item of news) {
        const impactMultiplier = item.impact === 'high' ? 3 : item.impact === 'medium' ? 2 : 1;
        const directionMultiplier = item.direction === 'bullish' ? 1 : item.direction === 'bearish' ? -1 : 0;

        totalSentiment += directionMultiplier * impactMultiplier;
        if (item.impact === 'high') highImpactCount++;
      }
    }

    if (allNews.length === 0) {
      return {
        symbol,
        sentiment: 0,
        direction: 'NEUTRO',
        confidence: 0,
        newsCount: 0,
        blockingTrades: false,
        reason: 'No recent news',
      };
    }

    const maxPossible = allNews.length * 3;
    const normalizedSentiment = maxPossible > 0 ? totalSentiment / maxPossible : 0;
    const confidence = Math.min(Math.abs(normalizedSentiment) * 2, 1);

    let direction: Direction | 'NEUTRO' = 'NEUTRO';
    let blockingTrades = false;
    let reason = '';

    if (normalizedSentiment > 0.3 && highImpactCount > 0) {
      direction = 'CALL';
      blockingTrades = false;
      reason = 'Bullish news sentiment detected';
    } else if (normalizedSentiment < -0.3 && highImpactCount > 0) {
      direction = 'PUT';
      blockingTrades = false;
      reason = 'Bearish news sentiment detected';
    } else if (Math.abs(normalizedSentiment) > 0.6) {
      direction = normalizedSentiment > 0 ? 'CALL' : 'PUT';
      blockingTrades = false;
      reason = 'Strong news sentiment';
    } else if (Math.abs(normalizedSentiment) < 0.1 && highImpactCount === 0) {
      direction = 'NEUTRO';
      blockingTrades = false;
      reason = 'No clear news direction';
    } else {
      direction = 'NEUTRO';
      blockingTrades = true;
      reason = `Conflicting news signals (sentiment: ${normalizedSentiment.toFixed(2)})`;
    }

    const analysis: NewsAnalysis = {
      symbol,
      sentiment: normalizedSentiment,
      direction,
      confidence,
      newsCount: allNews.length,
      blockingTrades,
      reason,
    };

    this.analysisCache.set(symbol, analysis);
    return analysis;
  }

  async addNews(item: NewsItem) {
    const currency = item.currency;
    if (!this.newsCache.has(currency)) {
      this.newsCache.set(currency, []);
    }
    this.newsCache.get(currency)!.push(item);

    if (this.newsCache.get(currency)!.length > 100) {
      this.newsCache.get(currency)!.shift();
    }

    this.emit('news-added', item);
  }

  async addEconomicNews(title: string, summary: string, currency: string, impact: NewsItem['impact']) {
    const direction = this.classifyNewsDirection(title + ' ' + summary);
    await this.addNews({
      title,
      summary,
      impact,
      currency,
      timestamp: Date.now() / 1000,
      direction,
    });
  }

  private classifyNewsDirection(text: string): 'bullish' | 'bearish' | 'neutral' {
    const lower = text.toLowerCase();
    let bullishScore = 0;
    let bearishScore = 0;

    for (const kw of this.bullishKeywords) {
      if (lower.includes(kw)) bullishScore++;
    }
    for (const kw of this.bearishKeywords) {
      if (lower.includes(kw)) bearishScore++;
    }

    if (bullishScore > bearishScore) return 'bullish';
    if (bearishScore > bullishScore) return 'bearish';
    return 'neutral';
  }

  private getCurrenciesForSymbol(symbol: string): string[] {
    const upper = symbol.toUpperCase();
    for (const [currency, symbols] of Object.entries(this.currencyMap)) {
      if (symbols.includes(upper)) {
        return [currency];
      }
    }
    return [];
  }

  private async analyzeAll() {
    for (const symbol of this.analysisCache.keys()) {
      await this.analyzeNews(symbol);
    }
  }

  getAnalysis(symbol: string): NewsAnalysis | undefined {
    return this.analysisCache.get(symbol);
  }

  getAllAnalyses(): NewsAnalysis[] {
    return Array.from(this.analysisCache.values());
  }

  clearNews() {
    this.newsCache.clear();
    this.analysisCache.clear();
  }
}
