import { Candle, Direction, StrategyName, BacktestResult } from '../types';
import { calculateRSI, calculateMACD, calculateMovingAverage } from '../strategies/technical-indicators';

export class BacktestEngine {
  async run(
    symbol: string,
    strategy: StrategyName,
    candles: Candle[],
    initialBalance: number = 1000,
    params: Record<string, any> = {}
  ): Promise<BacktestResult> {
    const trades: Array<{ direction: Direction; entry: number; exit: number; win: boolean; profit: number }> = [];
    let balance = initialBalance;

    for (let i = 100; i < candles.length; i++) {
      const slice = candles.slice(0, i);
      const signal = this.getSignal(strategy, slice, params);
      if (!signal || signal === 'NEUTRO') continue;

      const entry = candles[i - 1].close;
      const exit = candles[i].close;
      const win = signal === 'CALL' ? exit > entry : exit < entry;
      const profit = win ? entry * 0.0085 : -entry * 0.01;

      balance += profit;
      trades.push({ direction: signal, entry, exit, win, profit });
    }

    const wins = trades.filter(t => t.win).length;
    const losses = trades.filter(t => !t.win).length;
    const total = trades.length;

    const grossProfit = trades.filter(t => t.win).reduce((s, t) => s + t.profit, 0);
    const grossLoss = Math.abs(trades.filter(t => !t.win).reduce((s, t) => s + t.profit, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const returns = trades.map(t => t.profit / initialBalance);
    const meanReturn = returns.reduce((s, r) => s + r, 0) / returns.length || 0;
    const variance = returns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / returns.length || 0;
    const sharpeRatio = Math.sqrt(variance) > 0 ? (meanReturn / Math.sqrt(variance)) * Math.sqrt(252) : 0;

    let peak = initialBalance;
    let maxDrawdown = 0;
    let runningBalance = initialBalance;
    for (const trade of trades) {
      runningBalance += trade.profit;
      if (runningBalance > peak) peak = runningBalance;
      const dd = (peak - runningBalance) / peak;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    const roi = initialBalance > 0 ? ((balance - initialBalance) / initialBalance) * 100 : 0;

    return {
      symbol,
      strategy,
      timeframe: params.timeframe || 'M1',
      startDate: new Date(candles[0]?.from * 1000 || 0).toISOString(),
      endDate: new Date(candles[candles.length - 1]?.from * 1000 || 0).toISOString(),
      totalTrades: total,
      wins,
      losses,
      winRate: total > 0 ? wins / total : 0,
      profitFactor,
      sharpeRatio,
      maxDrawdown,
      roi,
      finalBalance: balance,
    };
  }

  private getSignal(strategy: StrategyName, candles: Candle[], params: Record<string, any>): Direction | 'NEUTRO' | null {
    switch (strategy) {
      case 'rsi': {
        const rsi = calculateRSI(candles, params.period || 14);
        if (rsi.length === 0) return null;
        const last = rsi[rsi.length - 1];
        if (last < (params.oversold || 30)) return 'CALL';
        if (last > (params.overbought || 70)) return 'PUT';
        return 'NEUTRO';
      }
      case 'macd': {
        const macd = calculateMACD(candles, params.fast || 12, params.slow || 26, params.signal || 9);
        if (macd.histogram.length < 2) return null;
        const last = macd.histogram[macd.histogram.length - 1];
        const prev = macd.histogram[macd.histogram.length - 2];
        if (last > 0 && prev <= 0) return 'CALL';
        if (last < 0 && prev >= 0) return 'PUT';
        return 'NEUTRO';
      }
      case 'ma-cross': {
        const fast = calculateMovingAverage(candles, params.fast || 5);
        const slow = calculateMovingAverage(candles, params.slow || 20);
        if (fast.length < 2 || slow.length < 2) return null;
        const fLast = fast[fast.length - 1], fPrev = fast[fast.length - 2];
        const sLast = slow[slow.length - 1], sPrev = slow[slow.length - 2];
        if (fPrev <= sPrev && fLast > sLast) return 'CALL';
        if (fPrev >= sPrev && fLast < sLast) return 'PUT';
        return 'NEUTRO';
      }
      default:
        return 'NEUTRO';
    }
  }
}
