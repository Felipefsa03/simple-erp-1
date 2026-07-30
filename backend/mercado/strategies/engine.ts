import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { Candle, Direction, TradeSignal, StrategyConfig, CompositeVote } from '../types';
import { calculateRSI, calculateMACD, calculateBollingerBands, calculateMovingAverage, calculateStochastic, findSupportResistance, calculateATR, detectCandlePattern } from './technical-indicators';
import { IQOptionService } from '../iqoption.service';
import { TradingService } from '../trading.service';
import { SentimentService } from '../sentiment.service';
import { LSTMPredictor } from '../ai/lstm-predictor';
import { NewsSentimentAnalyzer } from '../ai/news-sentiment';
import { EventEmitter } from 'events';

export interface EngineConfig {
  symbols: string[];
  timeframes: number[];
  strategies: StrategyConfig[];
  autoTrade: boolean;
  trainingInterval: number;
}

export class TradingEngine extends EventEmitter {
  private running = false;
  private worker: Worker | null = null;
  private config: EngineConfig;
  private candles: Map<string, Candle[]> = new Map();
  private lastSignals: Map<string, TradeSignal> = new Map();
  private workerActive = false;

  constructor(
    private iqOption: IQOptionService,
    private tradingService: TradingService,
    private sentimentService: SentimentService,
    private lstm: LSTMPredictor,
    private newsAnalyzer: NewsSentimentAnalyzer,
    config: Partial<EngineConfig> = {}
  ) {
    super();
    this.config = {
      symbols: config.symbols || ['EURUSD', 'EURUSD-OTC', 'GBPUSD', 'BITCOIN'],
      timeframes: config.timeframes || [60, 300],
      strategies: config.strategies || [
        { name: 'rsi', enabled: true, params: { period: 14, oversold: 30, overbought: 70 }, weight: 1.0 },
        { name: 'macd', enabled: true, params: { fast: 12, slow: 26, signal: 9 }, weight: 1.0 },
        { name: 'bollinger', enabled: true, params: { period: 20, stdDev: 2 }, weight: 0.8 },
        { name: 'ma-cross', enabled: true, params: { fast: 5, slow: 20 }, weight: 0.7 },
        { name: 'stochastic', enabled: true, params: { period: 14, k: 3, d: 3 }, weight: 0.6 },
        { name: 'contrarian', enabled: true, params: { threshold: 0.75 }, weight: 0.9 },
        { name: 'lstm', enabled: true, params: {}, weight: 1.2 },
      ],
      autoTrade: config.autoTrade || false,
      trainingInterval: config.trainingInterval || 3600000,
    };
  }

  async start() {
    this.running = true;
    this.setupListeners();

    for (const symbol of this.config.symbols) {
      for (const tf of this.config.timeframes) {
        await this.iqOption.subscribeCandles(symbol, tf);
      }
      await this.iqOption.subscribeSentiment(symbol);
    }

    await this.sentimentService.subscribeSentiment(this.config.symbols);
    this.emit('started', { config: this.config });
  }

  private setupListeners() {
    let candleBuffer: Candle[] = [];

    this.iqOption.on('candle', async (candle: Candle) => {
      const key = `${candle.active_id}_${candle.size}`;
      if (!this.candles.has(key)) this.candles.set(key, []);
      this.candles.get(key)!.push(candle);

      if (this.candles.get(key)!.length > 1000) {
        this.candles.get(key)!.shift();
      }

      candleBuffer.push(candle);
      if (candleBuffer.length >= 10) {
        await this.analyze();
        candleBuffer = [];
      }
    });

    this.iqOption.on('sentiment', async (data: any) => {
      this.emit('sentiment-update', data);
    });
  }

  private async analyze() {
    if (!this.running) return;

    for (const symbol of this.config.symbols) {
      for (const tf of this.config.timeframes) {
        const key = `${this.getActiveId(symbol)}_${tf}`;
        const candles = this.candles.get(key);
        if (!candles || candles.length < 50) continue;

        const votes = await this.getVotes(symbol, candles);
        const composite = this.compositeStrategy(votes);

        if (composite.confidence >= 0.65 && composite.direction !== 'NEUTRO') {
          const signal: TradeSignal = {
            strategy: 'composite',
            direction: composite.direction,
            confidence: composite.confidence,
            symbol,
            timestamp: Date.now(),
          };

          this.lastSignals.set(symbol, signal);
          this.emit('signal', signal);

          if (this.config.autoTrade) {
            await this.executeSignal(signal);
          }
        }
      }
    }
  }

  private async getVotes(symbol: string, candles: Candle[]): Promise<Array<{ strategy: string; direction: Direction; confidence: number; weight: number }>> {
    const votes: Array<{ strategy: string; direction: Direction; confidence: number; weight: number }> = [];
    const sentiment = this.sentimentService.getMood(symbol);

    for (const sc of this.config.strategies) {
      if (!sc.enabled) continue;

      switch (sc.name) {
        case 'rsi': {
          const rsi = calculateRSI(candles, (sc.params.period as number) || 14);
          if (rsi.length > 0) {
            const lastRSI = rsi[rsi.length - 1];
            const oversold = (sc.params.oversold as number) || 30;
            const overbought = (sc.params.overbought as number) || 70;
            if (lastRSI < oversold) {
              votes.push({ strategy: 'rsi', direction: 'CALL', confidence: 1 - lastRSI / 100, weight: sc.weight });
            } else if (lastRSI > overbought) {
              votes.push({ strategy: 'rsi', direction: 'PUT', confidence: lastRSI / 100, weight: sc.weight });
            }
          }
          break;
        }
        case 'macd': {
          const macd = calculateMACD(candles, sc.params.fast as number, sc.params.slow as number, sc.params.signal as number);
          if (macd.histogram.length > 1) {
            const last = macd.histogram[macd.histogram.length - 1];
            const prev = macd.histogram[macd.histogram.length - 2];
            if (last > 0 && prev <= 0) votes.push({ strategy: 'macd', direction: 'CALL', confidence: Math.min(Math.abs(last) * 10, 0.9), weight: sc.weight });
            if (last < 0 && prev >= 0) votes.push({ strategy: 'macd', direction: 'PUT', confidence: Math.min(Math.abs(last) * 10, 0.9), weight: sc.weight });
          }
          break;
        }
        case 'bollinger': {
          const bb = calculateBollingerBands(candles, sc.params.period as number, sc.params.stdDev as number);
          if (bb.upper.length > 0) {
            const lastClose = candles[candles.length - 1].close;
            const lastLower = bb.lower[bb.lower.length - 1];
            const lastUpper = bb.upper[bb.upper.length - 1];
            if (lastClose <= lastLower) votes.push({ strategy: 'bollinger', direction: 'CALL', confidence: 0.7, weight: sc.weight });
            if (lastClose >= lastUpper) votes.push({ strategy: 'bollinger', direction: 'PUT', confidence: 0.7, weight: sc.weight });
          }
          break;
        }
        case 'ma-cross': {
          const fastMA = calculateMovingAverage(candles, sc.params.fast as number);
          const slowMA = calculateMovingAverage(candles, sc.params.slow as number);
          const offset = candles.length - slowMA.length;
          if (fastMA.length > 1 && slowMA.length > 1) {
            const fastLast = fastMA[fastMA.length - 1];
            const fastPrev = fastMA[fastMA.length - 2];
            const slowLast = slowMA[slowMA.length - 1];
            const slowPrev = slowMA[slowMA.length - 2];
            if (fastPrev <= slowPrev && fastLast > slowLast) votes.push({ strategy: 'ma-cross', direction: 'CALL', confidence: 0.65, weight: sc.weight });
            if (fastPrev >= slowPrev && fastLast < slowLast) votes.push({ strategy: 'ma-cross', direction: 'PUT', confidence: 0.65, weight: sc.weight });
          }
          break;
        }
        case 'stochastic': {
          const stoch = calculateStochastic(candles, sc.params.period as number, sc.params.k as number, sc.params.d as number);
          if (stoch.k.length > 1) {
            const k = stoch.k[stoch.k.length - 1];
            const d = stoch.d[stoch.d.length - 1];
            if (k < 20 && k > d) votes.push({ strategy: 'stochastic', direction: 'CALL', confidence: 0.6, weight: sc.weight });
            if (k > 80 && k < d) votes.push({ strategy: 'stochastic', direction: 'PUT', confidence: 0.6, weight: sc.weight });
          }
          break;
        }
        case 'contrarian': {
          if (sentiment) {
            const threshold = (sc.params.threshold as number) || 0.75;
            if (sentiment.mood > threshold) {
              votes.push({ strategy: 'contrarian', direction: sentiment.contrarianSignal, confidence: sentiment.mood, weight: sc.weight });
            } else if (sentiment.mood < 1 - threshold) {
              votes.push({ strategy: 'contrarian', direction: sentiment.contrarianSignal, confidence: 1 - sentiment.mood, weight: sc.weight });
            }
          }
          break;
        }
        case 'lstm': {
          if (this.lstm.isTrained()) {
            const prediction = await this.lstm.predict(candles);
            votes.push({ strategy: 'lstm', direction: prediction.direction, confidence: prediction.confidence, weight: sc.weight });
          }
          break;
        }
      }
    }

    return votes;
  }

  private compositeStrategy(votes: Array<{ strategy: string; direction: Direction; confidence: number; weight: number }>): CompositeVote {
    if (votes.length === 0) return { direction: 'CALL', confidence: 0, votes: [] };

    let callScore = 0;
    let putScore = 0;
    let totalWeight = 0;

    for (const vote of votes) {
      const weightedConfidence = vote.confidence * vote.weight;
      totalWeight += vote.weight;
      if (vote.direction === 'CALL') callScore += weightedConfidence;
      else putScore += weightedConfidence;
    }

    if (totalWeight === 0) return { direction: 'CALL', confidence: 0, votes };

    const callPct = callScore / totalWeight;
    const putPct = putScore / totalWeight;
    const confidence = Math.max(callPct, putPct);
    const direction: Direction = callPct >= putPct ? 'CALL' : 'PUT';

    return { direction, confidence, votes };
  }

  private async executeSignal(signal: TradeSignal) {
    const newsAnalysis = this.newsAnalyzer.getAnalysis(signal.symbol);
    if (newsAnalysis?.blockingTrades) {
      this.emit('trade-blocked', { symbol: signal.symbol, reason: newsAnalysis.reason });
      return;
    }

    if (signal.direction === 'NEUTRO') return;

    const result = await this.tradingService.executeOrder({
      symbol: signal.symbol,
      direction: signal.direction,
      amount: 0,
      durationSeconds: 60,
      type: 'BINARY',
    });

    if (result) {
      this.emit('trade-executed', { signal, result });
    }
  }

  private getActiveId(symbol: string): number {
    const map: Record<string, number> = {
      'EURUSD': 1, 'EURUSD-OTC': 1, 'GBPUSD': 2,
      'USDJPY': 3, 'AUDUSD': 4, 'USDCAD': 5,
      'GBPJPY': 7, 'EURJPY': 9, 'BITCOIN': 816,
      'ETHEREUM': 913, 'AAPL': 168, 'GOOGL': 60,
      'AMZN': 96, 'TSLA': 212,
    };
    return map[symbol] || 1;
  }

  updateConfig(config: Partial<EngineConfig>) {
    Object.assign(this.config, config);
  }

  getConfig(): EngineConfig {
    return { ...this.config };
  }

  getLastSignals(): Map<string, TradeSignal> {
    return new Map(this.lastSignals);
  }

  async stop() {
    this.running = false;
    for (const symbol of this.config.symbols) {
      for (const tf of this.config.timeframes) {
        await this.iqOption.unsubscribeCandles(symbol, tf);
      }
      await this.iqOption.unsubscribeSentiment(symbol);
    }
    this.emit('stopped');
  }

  isRunning(): boolean {
    return this.running;
  }
}
