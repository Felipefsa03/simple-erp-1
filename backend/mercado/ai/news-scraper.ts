import { EventEmitter } from 'events';

interface ScrapedNews {
  id: string;
  title: string;
  summary: string;
  source: 'google_news' | 'yahoo_finance' | 'twitter_x' | 'alphavantage' | 'forexfactory';
  url: string;
  currency: string;
  symbols: string[];
  impact: 'high' | 'medium' | 'low';
  direction: 'bullish' | 'bearish' | 'neutral';
  timestamp: number;
  author?: string;
  imageUrl?: string;
}

interface NewsSourceConfig {
  enabled: boolean;
  intervalMs: number;
}

export class NewsScraper extends EventEmitter {
  private scrapedNews: ScrapedNews[] = [];
  private maxNews = 500;
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private keywords: string[] = [];
  private apiKeys: Record<string, string> = {};

  private readonly bullishKeywords = [
    'record', 'high', 'surge', 'rally', 'gain', 'profit', 'growth', 'expansion',
    'bullish', 'outperform', 'upgrade', 'positive', 'breakthrough', 'innovation',
    'partnership', 'launch', 'approved', 'beat expectations', 'guidance up',
    'dividend', 'buyback', 'revenue up', 'strong demand',
  ];

  private readonly bearishKeywords = [
    'crash', 'plunge', 'decline', 'loss', 'downgrade', 'bearish', 'sell-off',
    'recession', 'inflation', 'layoff', 'investigation', 'lawsuit', 'fine',
    'restructuring', 'debt', 'default', 'bankruptcy', 'fraud', 'scandal',
    'guidance down', 'revenue miss', 'downgrade', 'volatility',
  ];

  private readonly currencyMap: Record<string, string> = {
    'USD': 'EURUSD', 'EUR': 'EURUSD', 'GBP': 'GBPUSD', 'JPY': 'USDJPY',
    'AUD': 'AUDUSD', 'CAD': 'USDCAD', 'CHF': 'USDCHF',
    'bitcoin': 'BITCOIN', 'btc': 'BITCOIN', 'ethereum': 'ETHEREUM', 'eth': 'ETHEREUM',
    'apple': 'AAPL', 'aapl': 'AAPL', 'google': 'GOOGL', 'googl': 'GOOGL',
    'amazon': 'AMZN', 'amzn': 'AMZN', 'tesla': 'TSLA', 'tsla': 'TSLA',
    'microsoft': 'MSFT', 'msft': 'MSFT', 'meta': 'META', 'meta': 'META',
    'nvidia': 'NVDA', 'nvda': 'NVDA',
  };

  constructor() {
    super();
  }

  configure(config: {
    googleNews?: NewsSourceConfig;
    yahooFinance?: NewsSourceConfig;
    twitterX?: NewsSourceConfig;
    alphavantage?: NewsSourceConfig;
    forexFactory?: NewsSourceConfig;
    keywords?: string[];
    apiKeys?: Record<string, string>;
  }) {
    if (config.keywords) this.keywords = config.keywords;
    if (config.apiKeys) this.apiKeys = config.apiKeys;
    return this;
  }

  async startAll() {
    await Promise.all([
      this.startGoogleNews(),
      this.startYahooFinance(),
      this.startTwitterX(),
      this.startAlphaVantage(),
      this.startForexFactory(),
    ]);
    console.log('[NewsScraper] All sources started');
    this.emit('ready');
  }

  stopAll() {
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
      console.log(`[NewsScraper] Stopped ${name}`);
    }
    this.intervals.clear();
  }

  // ─── GOOGLE NEWS ────────────────────────────────────────────
  async startGoogleNews(intervalMs = 120000) {
    if (this.intervals.has('google_news')) return;
    console.log('[NewsScraper] Starting Google News (every ' + (intervalMs / 1000) + 's)');

    const fetchGoogleNews = async () => {
      try {
        const symbols = ['EURUSD', 'BITCOIN', 'AAPL', 'TSLA', 'GOOGL', 'AMZN', 'MSFT', 'NVDA', 'META', 'ETHEREUM'];
        for (const symbol of symbols) {
          const query = symbol === 'EURUSD' ? 'forex+market' : symbol === 'BITCOIN' ? 'bitcoin+crypto' : symbol;
          const url = `https://news.google.com/rss/search?q=${query}+finance&hl=en-US&gl=US&ceid=US:en`;
          const res = await fetch(url);
          const xml = await res.text();

          const titleRegex = /<title[^>]*>([^<]+)<\/title>/g;
          const descRegex = /<description[^>]*>([^<]*)<\/description>/g;
          const linkRegex = /<link[^>]*>([^<]+)<\/link>/g;
          const pubDateRegex = /<pubDate[^>]*>([^<]+)<\/pubDate>/g;

          const titles: string[] = [];
          const descs: string[] = [];
          const links: string[] = [];
          const dates: string[] = [];

          let m;
          while ((m = titleRegex.exec(xml)) !== null) {
            if (titles.length < 10 && !m[1].startsWith('Google News')) titles.push(m[1]);
          }
          while ((m = descRegex.exec(xml)) !== null) { descs.push(this.stripHtml(m[1])); }
          while ((m = linkRegex.exec(xml)) !== null) { links.push(m[1]); }
          while ((m = pubDateRegex.exec(xml)) !== null) { dates.push(m[1]); }

          for (let i = 0; i < Math.min(titles.length, 5); i++) {
            const title = titles[i] || '';
            if (this.isDuplicate(title)) continue;

            const news: ScrapedNews = {
              id: `gn_${Date.now()}_${i}`,
              title: title,
              summary: descs[i] || '',
              source: 'google_news',
              url: links[i] || `https://news.google.com/search?q=${query}+finance`,
              currency: this.extractCurrency(title),
              symbols: [symbol],
              impact: this.classifyImpact(title),
              direction: this.classifyDirection(title),
              timestamp: Date.now(),
            };
            this.addNews(news);
          }
        }
      } catch (err: any) {
        console.error('[NewsScraper] Google News error:', err.message);
      }
    };

    await fetchGoogleNews();
    this.intervals.set('google_news', setInterval(fetchGoogleNews, intervalMs));
  }

  // ─── YAHOO FINANCE ───────────────────────────────────────────
  async startYahooFinance(intervalMs = 180000) {
    if (this.intervals.has('yahoo_finance')) return;
    console.log('[NewsScraper] Starting Yahoo Finance');

    const fetchYahoo = async () => {
      try {
        const symbols = ['EURUSD=X', 'BTC-USD', 'AAPL', 'TSLA', 'GOOGL', 'AMZN', 'MSFT', 'NVDA'];
        for (const symbol of symbols) {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1d`;
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
          });
          if (!res.ok) continue;
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          const price = meta?.regularMarketPrice;
          const prevClose = meta?.previousClose;
          if (price && prevClose) {
            const change = ((price - prevClose) / prevClose) * 100;
            const cleanSymbol = symbol.replace('=X', '').replace('-USD', '');
            const direction: 'bullish' | 'bearish' | 'neutral' = change > 1 ? 'bullish' : change < -1 ? 'bearish' : 'neutral';
            const title = `${cleanSymbol} ${change > 0 ? 'sobe' : 'cai'} ${Math.abs(change).toFixed(2)}% - $${price.toFixed(2)}`;
            if (!this.isDuplicate(title)) {
              this.addNews({
                id: `yf_${Date.now()}_${cleanSymbol}`,
                title,
                summary: `${cleanSymbol} fechou a $${price.toFixed(2)}, variação de ${change.toFixed(2)}%`,
                source: 'yahoo_finance',
                url: `https://finance.yahoo.com/quote/${symbol}`,
                currency: this.extractCurrency(cleanSymbol),
                symbols: [this.currencyMap[cleanSymbol.toLowerCase()] || cleanSymbol],
                impact: Math.abs(change) > 3 ? 'high' : Math.abs(change) > 1 ? 'medium' : 'low',
                direction,
                timestamp: Date.now(),
              });
            }
          }
        }
      } catch (err: any) {
        console.error('[NewsScraper] Yahoo Finance error:', err.message);
      }
    };

    await fetchYahoo();
    this.intervals.set('yahoo_finance', setInterval(fetchYahoo, intervalMs));
  }

  // ─── TWITTER / X ─────────────────────────────────────────────
  async startTwitterX(intervalMs = 150000) {
    if (this.intervals.has('twitter_x')) return;
    console.log('[NewsScraper] Starting X/Twitter (Proxied)');

    const fetchTwitter = async () => {
      try {
        const queries = ['$EURUSD', '$BTC', '$AAPL', '$TSLA', '$GOOGL', '$AMZN', '$MSFT', '$NVDA', 'forex', 'trading'];
        const apiKey = this.apiKeys['twitter'] || '';
        const baseUrl = apiKey
          ? `https://api.twitter.com/2/tweets/search/recent?query=`
          : `https://nitter.net/search?q=`;

        for (const query of queries.slice(0, 3)) {
          let url: string;
          let headers: Record<string, string> = {};

          if (apiKey) {
            url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query + ' finance')}&max_results=10&tweet.fields=created_at,public_metrics`;
            headers = { 'Authorization': `Bearer ${apiKey}` };
          } else {
            url = `https://nitter.net/search?q=${encodeURIComponent(query)}&f=live`;
            headers = { 'User-Agent': 'Mozilla/5.0' };
          }

          const res = await fetch(url, { headers });
          if (!res.ok) continue;
          const text = await res.text();

          if (apiKey) {
            const data = JSON.parse(text);
            const tweets = data?.data || [];
            for (const tweet of tweets.slice(0, 5)) {
              const title = tweet.text?.substring(0, 200) || '';
              if (this.isDuplicate(title)) continue;
              this.addNews({
                id: `tw_${tweet.id || Date.now()}`,
                title: title.substring(0, 100),
                summary: title,
                source: 'twitter_x',
                url: `https://twitter.com/i/web/status/${tweet.id}`,
                currency: this.extractCurrency(title),
                symbols: [this.currencyMap[query.toLowerCase().replace('$', '')] || query.replace('$', '')],
                impact: tweet.public_metrics?.like_count > 100 ? 'high' : 'medium',
                direction: this.classifyDirection(title),
                timestamp: new Date(tweet.created_at || Date.now()).getTime(),
                author: tweet.author_id,
              });
            }
          } else {
            const tweetRegex = /<div class="tweet-content[^>]*>([\s\S]*?)<\/div>/g;
            let match: RegExpExecArray | null;
            let count = 0;
            while ((match = tweetRegex.exec(text)) !== null && count < 5) {
              const content = this.stripHtml(match[1]).substring(0, 200);
              if (content.length < 10 || this.isDuplicate(content)) continue;
              this.addNews({
                id: `nt_${Date.now()}_${count}`,
                title: content.substring(0, 100),
                summary: content,
                source: 'twitter_x',
                url: `https://nitter.net/search?q=${encodeURIComponent(query)}`,
                currency: this.extractCurrency(content),
                symbols: [this.currencyMap[query.toLowerCase().replace('$', '')] || query],
                impact: content.length > 150 ? 'high' : 'medium',
                direction: this.classifyDirection(content),
                timestamp: Date.now(),
              });
              count++;
            }
          }
        }
      } catch (err: any) {
        console.error('[NewsScraper] Twitter/X error:', err.message);
      }
    };

    await fetchTwitter();
    this.intervals.set('twitter_x', setInterval(fetchTwitter, intervalMs));
  }

  // ─── ALPHA VANTAGE ───────────────────────────────────────────
  async startAlphaVantage(intervalMs = 300000) {
    const apiKey = this.apiKeys['alphavantage'];
    if (!apiKey || this.intervals.has('alphavantage')) return;
    console.log('[NewsScraper] Starting AlphaVantage');

    const fetchAV = async () => {
      try {
        const symbols = ['EURUSD', 'BITCOIN', 'AAPL', 'TSLA', 'GOOGL', 'AMZN', 'NVDA'];
        for (const symbol of symbols) {
          const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${apiKey}&limit=5`;
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = await res.json();
          const articles = data?.feed || [];
          for (const article of articles.slice(0, 5)) {
            if (this.isDuplicate(article.title)) continue;
            const overallSentiment = article.overall_sentiment_score || 0;
            this.addNews({
              id: `av_${article.time_published || Date.now()}`,
              title: article.title,
              summary: article.summary || '',
              source: 'alphavantage',
              url: article.url,
              currency: this.extractCurrency(article.title + ' ' + article.summary),
              symbols: (article.ticker_sentiment || []).map((t: any) => t.ticker),
              impact: overallSentiment > 0.35 || overallSentiment < -0.35 ? 'high' : 'medium',
              direction: overallSentiment > 0.1 ? 'bullish' : overallSentiment < -0.1 ? 'bearish' : 'neutral',
              timestamp: new Date(article.time_published || Date.now()).getTime(),
              imageUrl: article.banner_image,
            });
          }
        }
      } catch (err: any) {
        console.error('[NewsScraper] AlphaVantage error:', err.message);
      }
    };

    await fetchAV();
    this.intervals.set('alphavantage', setInterval(fetchAV, intervalMs));
  }

  // ─── FOREX FACTORY ───────────────────────────────────────────
  async startForexFactory(intervalMs = 300000) {
    if (this.intervals.has('forexfactory')) return;
    console.log('[NewsScraper] Starting ForexFactory');

    const fetchFF = async () => {
      try {
        const url = 'https://www.forexfactory.com/calendar?format=rss';
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return;
        const xml = await res.text();

        const titleRegex = /<title[^>]*>([^<]+)<\/title>/g;
        const descRegex = /<description[^>]*>([\s\S]*?)<\/description>/g;
        const titles: string[] = [];
        const descs: string[] = [];
        let m;

        while ((m = titleRegex.exec(xml)) !== null) {
          if (titles.length < 15 && !m[1].includes('Forex')) titles.push(m[1]);
        }
        while ((m = descRegex.exec(xml)) !== null) {
          descs.push(this.stripHtml(m[1]));
        }

        for (let i = 0; i < Math.min(titles.length, 10); i++) {
          const title = titles[i] || '';
          const desc = descs[i] || '';
          if (this.isDuplicate(title)) continue;

          const currencyMatch = title.match(/\(([A-Z]{3})\)/);
          const currency = currencyMatch ? currencyMatch[1] : 'USD';

          this.addNews({
            id: `ff_${Date.now()}_${i}`,
            title,
            summary: desc || title,
            source: 'forexfactory',
            url: 'https://www.forexfactory.com/calendar',
            currency,
            symbols: [this.currencyMap[currency.toLowerCase()] || `${currency}USD`],
            impact: title.toLowerCase().includes('***') ? 'high' : title.toLowerCase().includes('**') ? 'medium' : 'low',
            direction: this.classifyDirection(title + ' ' + desc),
            timestamp: Date.now(),
          });
        }
      } catch (err: any) {
        console.error('[NewsScraper] ForexFactory error:', err.message);
      }
    };

    await fetchFF();
    this.intervals.set('forexfactory', setInterval(fetchFF, intervalMs));
  }

  // ─── HELPERS ─────────────────────────────────────────────────
  private addNews(news: ScrapedNews) {
    this.scrapedNews.unshift(news);
    if (this.scrapedNews.length > this.maxNews) {
      this.scrapedNews = this.scrapedNews.slice(0, this.maxNews);
    }
    this.emit('news', news);

    const analysis = this.analyzeSentiment(news);
    if (analysis) {
      this.emit('sentiment', analysis);
    }
  }

  private isDuplicate(title: string): boolean {
    if (!title || title.length < 10) return true;
    const normalized = title.toLowerCase().trim();
    return this.scrapedNews.some(n => n.title.toLowerCase().includes(normalized.substring(0, 30)));
  }

  getNews(options: { source?: string; symbol?: string; limit?: number } = {}): ScrapedNews[] {
    let filtered = [...this.scrapedNews];
    if (options.source) filtered = filtered.filter(n => n.source === options.source);
    if (options.symbol) filtered = filtered.filter(n => n.symbols.includes(options.symbol));
    return filtered.slice(0, options.limit || 50);
  }

  getNewsBySymbol(symbol: string, limit = 20): ScrapedNews[] {
    return this.scrapedNews
      .filter(n => n.symbols.includes(symbol))
      .slice(0, limit);
  }

  getLatestBySource(source: string, limit = 10): ScrapedNews[] {
    return this.scrapedNews
      .filter(n => n.source === source)
      .slice(0, limit);
  }

  getAllSources(): string[] {
    return [...new Set(this.scrapedNews.map(n => n.source))];
  }

  analyzeSentiment(news: ScrapedNews): { symbol: string; sentiment: number; direction: string; confidence: number } | null {
    if (news.symbols.length === 0) return null;

    const sentimentValue = news.direction === 'bullish' ? 0.7 : news.direction === 'bearish' ? -0.7 : 0;
    const impactMultiplier = news.impact === 'high' ? 1.5 : news.impact === 'medium' ? 1.0 : 0.5;
    const confidence = Math.min(Math.abs(sentimentValue) * impactMultiplier, 1);

    return {
      symbol: news.symbols[0],
      sentiment: sentimentValue * impactMultiplier,
      direction: news.direction,
      confidence,
    };
  }

  private classifyDirection(text: string): 'bullish' | 'bearish' | 'neutral' {
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

  private classifyImpact(text: string): 'high' | 'medium' | 'low' {
    const lower = text.toLowerCase();
    const highImpact = ['crash', 'surge', 'plunge', 'record', 'crisis', 'approve', 'reject', 'lawsuit', 'investigation', 'bankruptcy', 'breakthrough'];
    const mediumImpact = ['gain', 'loss', 'rise', 'fall', 'upgrade', 'downgrade', 'launch', 'partner'];

    for (const word of highImpact) { if (lower.includes(word)) return 'high'; }
    for (const word of mediumImpact) { if (lower.includes(word)) return 'medium'; }
    return 'low';
  }

  private extractCurrency(text: string): string {
    const lower = text.toLowerCase();
    for (const [key] of Object.entries(this.currencyMap)) {
      if (lower.includes(key)) return key.toUpperCase();
    }
    const matches = text.match(/\(([A-Z]{3})\)/);
    return matches ? matches[1] : 'USD';
  }

  private stripHtml(text: string): string {
    return text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  getStats() {
    const sources = this.getAllSources();
    const bySource: Record<string, number> = {};
    for (const s of sources) bySource[s] = this.scrapedNews.filter(n => n.source === s).length;
    return { total: this.scrapedNews.length, bySource, sources };
  }
}
