export class PositionSizingKelly {
  private winRate = 0.5;
  private avgWin = 0;
  private avgLoss = 0;
  private tradeHistory: Array<{ win: boolean; profit: number }> = [];
  private readonly MAX_HISTORY = 200;

  recordTrade(win: boolean, profit: number) {
    this.tradeHistory.push({ win, profit });
    if (this.tradeHistory.length > this.MAX_HISTORY) {
      this.tradeHistory.shift();
    }
    this.recalculate();
  }

  private recalculate() {
    if (this.tradeHistory.length < 10) {
      this.winRate = 0.5;
      return;
    }
    const wins = this.tradeHistory.filter(t => t.win);
    const losses = this.tradeHistory.filter(t => !t.win);
    this.winRate = wins.length / this.tradeHistory.length;
    this.avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.profit, 0) / wins.length : 0;
    this.avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.profit, 0) / losses.length) : 0;
  }

  calculateKellyFraction(): number {
    if (this.avgLoss === 0 || this.winRate <= 0) return 0.01;
    const b = this.avgWin / this.avgLoss;
    const p = this.winRate;
    const q = 1 - p;
    const kelly = (p * b - q) / b;
    return Math.max(0, Math.min(kelly, 0.25));
  }

  calculatePositionSize(balance: number, basePct: number, confidence: number, kellyFraction: number): number {
    const volatilityAdjustment = this.getVolatilityAdjustment();
    const kellyAdjustment = Math.max(0.01, kellyFraction * 2);
    const confidenceMultiplier = 0.3 + confidence * 0.7;

    const adjustedPct = basePct * confidenceMultiplier * kellyAdjustment * volatilityAdjustment;
    const finalPct = Math.max(0.005, Math.min(adjustedPct, 0.1));
    return parseFloat((balance * finalPct).toFixed(2));
  }

  private getVolatilityAdjustment(): number {
    if (this.tradeHistory.length < 5) return 1;
    const recent = this.tradeHistory.slice(-5);
    const losses = recent.filter(t => !t.win).length;
    if (losses >= 4) return 0.5;
    if (losses >= 3) return 0.75;
    return 1;
  }

  getWinRate(): number { return this.winRate; }
  getKellyFraction(): number { return this.calculateKellyFraction(); }
  getStats() {
    return {
      winRate: this.winRate,
      avgWin: this.avgWin,
      avgLoss: this.avgLoss,
      kellyFraction: this.calculateKellyFraction(),
      totalTrades: this.tradeHistory.length,
    };
  }
}
