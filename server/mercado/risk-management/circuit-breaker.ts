import { Candle } from '../types';

export interface CircuitBreakerState {
  isOpen: boolean;
  openAt: number | null;
  reason: string | null;
  consecutiveLosses: number;
  dailyLoss: number;
  dailyTrades: number;
  startBalance: number;
  currentBalance: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = {
    isOpen: false,
    openAt: null,
    reason: null,
    consecutiveLosses: 0,
    dailyLoss: 0,
    dailyTrades: 0,
    startBalance: 0,
    currentBalance: 0,
  };

  private recentCandles: Candle[] = [];
  private readonly MAX_CANDLES = 50;

  constructor(
    private maxConsecutiveLoss = 5,
    private maxDailyLossPct = 10,
    private atrMultiplier = 3,
    private cooldownMinutes = 30
  ) {}

  initialize(balance: number) {
    this.state.startBalance = balance;
    this.state.currentBalance = balance;
  }

  updateCandle(candle: Candle) {
    this.recentCandles.push(candle);
    if (this.recentCandles.length > this.MAX_CANDLES) {
      this.recentCandles.shift();
    }
  }

  calculateATR(period = 14): number {
    if (this.recentCandles.length < period + 1) return 0;
    const ranges: number[] = [];
    for (let i = this.recentCandles.length - period; i < this.recentCandles.length; i++) {
      const candle = this.recentCandles[i];
      const prev = this.recentCandles[i - 1];
      const tr = Math.max(
        candle.max - candle.min,
        Math.abs(candle.max - prev.close),
        Math.abs(candle.min - prev.close)
      );
      ranges.push(tr);
    }
    return ranges.reduce((a, b) => a + b, 0) / ranges.length;
  }

  isVolatilityAnomalous(price: number): boolean {
    const atr = this.calculateATR();
    if (atr === 0) return false;

    const lastCandle = this.recentCandles[this.recentCandles.length - 1];
    if (!lastCandle) return false;

    const candleRange = lastCandle.max - lastCandle.min;
    return candleRange > atr * this.atrMultiplier;
  }

  recordLoss(amount: number) {
    this.state.consecutiveLosses++;
    this.state.dailyLoss += amount;
    this.state.dailyTrades++;
    this.state.currentBalance -= amount;

    if (this.state.consecutiveLosses >= this.maxConsecutiveLoss) {
      this.openBreaker(`Max consecutive losses (${this.maxConsecutiveLoss})`);
    }

    const lossPct = (this.state.dailyLoss / this.state.startBalance) * 100;
    if (lossPct >= this.maxDailyLossPct) {
      this.openBreaker(`Daily loss limit reached (${lossPct.toFixed(1)}%)`);
    }
  }

  recordWin(amount: number) {
    this.state.consecutiveLosses = 0;
    this.state.dailyTrades++;
    this.state.currentBalance += amount;
  }

  private openBreaker(reason: string) {
    this.state.isOpen = true;
    this.state.openAt = Date.now();
    this.state.reason = reason;
  }

  closeBreaker() {
    this.state.isOpen = false;
    this.state.openAt = null;
    this.state.reason = null;
    this.state.consecutiveLosses = 0;
  }

  check(): { allowed: boolean; reason: string } {
    if (!this.state.isOpen) {
      return { allowed: true, reason: '' };
    }

    if (this.state.openAt && (Date.now() - this.state.openAt) >= this.cooldownMinutes * 60 * 1000) {
      this.closeBreaker();
      return { allowed: true, reason: 'Breaker reset after cooldown' };
    }

    return { allowed: false, reason: this.state.reason || 'Circuit breaker is open' };
  }

  resetDaily() {
    this.state.consecutiveLosses = 0;
    this.state.dailyLoss = 0;
    this.state.dailyTrades = 0;
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }
}
