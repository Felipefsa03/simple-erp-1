import { IQOptionService } from '../iqoption.service';
import { Guru } from '../types';
import { EventEmitter } from 'events';

interface GuruTrade {
  guruId: string;
  symbol: string;
  direction: 'CALL' | 'PUT';
  amount: number;
  result?: 'win' | 'loss';
  profit?: number;
  timestamp: number;
  duration: number;
}

export class GuruTracker extends EventEmitter {
  private gurus: Map<string, Guru> = new Map();
  private guruHistory: Map<string, GuruTrade[]> = new Map();
  private readonly MIN_TRADES = 50;
  private readonly MIN_WIN_RATE = 0.55;
  private readonly MAX_DRAWDOWN = 0.15;
  private readonly MIN_SHARPE = 0.5;

  constructor(private iqOption: IQOptionService) {
    super();
    this.setupListeners();
  }

  private setupListeners() {
    this.iqOption.on('sentiment', (data: any) => {
      this.processSentimentAsGuruSignal(data);
    });

    this.iqOption.on('option-closed', (data: any) => {
      this.processGuruTradeResult(data);
    });
  }

  private processSentimentAsGuruSignal(data: any) {
    const guruId = `guru_sentiment_${data.symbol}`;
    const existing = this.gurus.get(guruId);

    if (!existing) {
      const guru: Guru = {
        id: guruId,
        name: `Smart Money ${data.symbol}`,
        winRate: 0.55,
        totalTrades: 0,
        profitFactor: 1.2,
        sharpeRatio: 0.6,
        maxDrawdown: 0.08,
        consistency: 0.7,
        avgTradeDuration: 120,
        isUsingMartingale: false,
        score: 60,
      };
      this.gurus.set(guruId, guru);
    }
  }

  private processGuruTradeResult(data: any) {
    const guruId = data.guru_id || `guru_unknown`;
    if (!this.guruHistory.has(guruId)) {
      this.guruHistory.set(guruId, []);
    }

    const trade: GuruTrade = {
      guruId,
      symbol: data.symbol || 'EURUSD',
      direction: data.direction || 'CALL',
      amount: data.amount || 0,
      result: data.win ? 'win' : 'loss',
      profit: data.profit || 0,
      timestamp: Date.now(),
      duration: data.duration || 60,
    };

    this.guruHistory.get(guruId)!.push(trade);
    if (this.guruHistory.get(guruId)!.length > 500) {
      this.guruHistory.get(guruId)!.shift();
    }

    this.updateGuruStats(guruId);
  }

  private updateGuruStats(guruId: string) {
    const trades = this.guruHistory.get(guruId);
    if (!trades || trades.length < this.MIN_TRADES) return;

    const wins = trades.filter(t => t.result === 'win').length;
    const losses = trades.filter(t => t.result === 'loss').length;
    const total = wins + losses;

    if (total === 0) return;

    const winRate = wins / total;
    const grossProfit = trades.filter(t => t.result === 'win').reduce((s, t) => s + (t.profit || 0), 0);
    const grossLoss = Math.abs(trades.filter(t => t.result === 'loss').reduce((s, t) => s + (t.profit || 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const returns = trades.map(t => t.result === 'win' ? (t.profit || 0) / t.amount : -(t.amount));
    const meanReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / returns.length;
    const sharpeRatio = Math.sqrt(variance) > 0 ? meanReturn / Math.sqrt(variance) * Math.sqrt(252) : 0;

    const maxDrawdown = this.calculateMaxDrawdown(trades);

    let isMartingale = false;
    if (trades.length >= 10) {
      const recent = trades.slice(-10);
      let consecutiveLosses = 0;
      for (let i = recent.length - 1; i >= 0; i--) {
        if (recent[i].result === 'loss') consecutiveLosses++;
        else break;
      }
      if (consecutiveLosses >= 3) {
        const lastLossAmount = recent.slice(-consecutiveLosses).reduce((s, t) => s + t.amount, 0);
        const avgAmount = trades.reduce((s, t) => s + t.amount, 0) / trades.length;
        if (lastLossAmount > avgAmount * 3) isMartingale = true;
      }
    }

    const consistency = 1 - (variance / (meanReturn || 1));
    const score = (winRate * 40 + Math.min(profitFactor, 3) / 3 * 20 + Math.min(sharpeRatio, 2) / 2 * 20 + (1 - maxDrawdown) * 10 + Math.max(0, consistency) * 10);

    const existing = this.gurus.get(guruId);
    if (existing) {
      existing.winRate = winRate;
      existing.totalTrades = total;
      existing.profitFactor = profitFactor;
      existing.sharpeRatio = sharpeRatio;
      existing.maxDrawdown = maxDrawdown;
      existing.consistency = consistency;
      existing.isUsingMartingale = isMartingale;
      existing.score = score;

      this.emit('guru-updated', existing);
    }
  }

  private calculateMaxDrawdown(trades: GuruTrade[]): number {
    let peak = 0;
    let maxDrawdown = 0;
    let balance = 10000;
    for (const trade of trades) {
      balance += trade.result === 'win' ? (trade.profit || 0) : -trade.amount;
      if (balance > peak) peak = balance;
      const drawdown = (peak - balance) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    return maxDrawdown;
  }

  getTopGurus(limit: number = 10): Guru[] {
    return Array.from(this.gurus.values())
      .filter(g => g.totalTrades >= this.MIN_TRADES
        && g.winRate >= this.MIN_WIN_RATE
        && g.maxDrawdown <= this.MAX_DRAWDOWN
        && g.sharpeRatio >= this.MIN_SHARPE
        && !g.isUsingMartingale)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  getAllGurus(): Guru[] {
    return Array.from(this.gurus.values());
  }

  getGuru(guruId: string): Guru | undefined {
    return this.gurus.get(guruId);
  }

  getGuruHistory(guruId: string): GuruTrade[] {
    return this.guruHistory.get(guruId) || [];
  }
}
