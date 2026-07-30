import { IQOptionService } from './iqoption.service';
import { EventEmitter } from 'events';

interface SentimentData {
  symbol: string;
  value: number;
  timestamp: number;
  tradersCount: number;
}

interface MarketMood {
  symbol: string;
  mood: number;
  classification: 'extreme_buy' | 'buy' | 'neutral' | 'sell' | 'extreme_sell';
  contrarianSignal: 'CALL' | 'PUT' | 'NEUTRO';
}

export class SentimentService extends EventEmitter {
  private sentimentCache: Map<string, SentimentData> = new Map();
  private moods: Map<string, MarketMood> = new Map();

  constructor(private iqOption: IQOptionService) {
    super();
    this.setupListeners();
  }

  private setupListeners() {
    this.iqOption.on('sentiment', (data: any) => {
      const sentiment: SentimentData = {
        symbol: data.symbol,
        value: data.value,
        timestamp: Date.now(),
        tradersCount: data.count || 0,
      };
      this.sentimentCache.set(data.symbol, sentiment);
      const mood = this.classifyMood(data.symbol, data.value);
      this.moods.set(data.symbol, mood);
      this.emit('sentiment-update', mood);
    });
  }

  private classifyMood(symbol: string, value: number): MarketMood {
    let classification: MarketMood['classification'];
    let contrarianSignal: MarketMood['contrarianSignal'];

    if (value >= 0.85) {
      classification = 'extreme_buy';
      contrarianSignal = 'PUT';
    } else if (value >= 0.65) {
      classification = 'buy';
      contrarianSignal = 'PUT';
    } else if (value >= 0.35) {
      classification = 'neutral';
      contrarianSignal = 'NEUTRO';
    } else if (value >= 0.15) {
      classification = 'sell';
      contrarianSignal = 'CALL';
    } else {
      classification = 'extreme_sell';
      contrarianSignal = 'CALL';
    }

    return { symbol, mood: value, classification, contrarianSignal };
  }

  async subscribeSentiment(symbols: string[]) {
    for (const symbol of symbols) {
      await this.iqOption.subscribeSentiment(symbol);
    }
  }

  async unsubscribeSentiment(symbols: string[]) {
    for (const symbol of symbols) {
      await this.iqOption.unsubscribeSentiment(symbol);
    }
  }

  getMood(symbol: string): MarketMood | undefined {
    return this.moods.get(symbol);
  }

  getAllMoods(): MarketMood[] {
    return Array.from(this.moods.values());
  }

  getSentiment(symbol: string): SentimentData | undefined {
    return this.sentimentCache.get(symbol);
  }

  getAllSentiments(): SentimentData[] {
    return Array.from(this.sentimentCache.values());
  }
}
