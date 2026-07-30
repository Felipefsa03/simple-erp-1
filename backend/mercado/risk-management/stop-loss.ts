export class StopLossManager {
  private dailyProfit = 0;
  private dailyLoss = 0;
  private startingBalance = 0;
  private currentBalance = 0;
  private tradesToday = 0;

  constructor(
    private maxDailyLossPct = 10,
    private maxDailyProfitPct = 15,
    private maxTradesPerDay = 50
  ) {}

  initialize(balance: number) {
    this.startingBalance = balance;
    this.currentBalance = balance;
  }

  recordTrade(profit: number) {
    this.tradesToday++;
    if (profit > 0) {
      this.dailyProfit += profit;
      this.currentBalance += profit;
    } else {
      this.dailyLoss += Math.abs(profit);
      this.currentBalance += profit;
    }
  }

  shouldStop(): { stop: boolean; reason: string } {
    const lossPct = this.startingBalance > 0 ? (this.dailyLoss / this.startingBalance) * 100 : 0;
    const profitPct = this.startingBalance > 0 ? (this.dailyProfit / this.startingBalance) * 100 : 0;

    if (lossPct >= this.maxDailyLossPct) {
      return { stop: true, reason: `Stop-loss: Daily loss ${lossPct.toFixed(1)}% >= ${this.maxDailyLossPct}%` };
    }
    if (profitPct >= this.maxDailyProfitPct) {
      return { stop: true, reason: `Take-profit: Daily profit ${profitPct.toFixed(1)}% >= ${this.maxDailyProfitPct}%` };
    }
    if (this.tradesToday >= this.maxTradesPerDay) {
      return { stop: true, reason: `Max trades per day (${this.maxTradesPerDay}) reached` };
    }
    return { stop: false, reason: '' };
  }

  resetDaily() {
    this.dailyProfit = 0;
    this.dailyLoss = 0;
    this.tradesToday = 0;
    this.currentBalance = this.startingBalance;
  }

  getStats() {
    return {
      dailyProfit: this.dailyProfit,
      dailyLoss: this.dailyLoss,
      tradesToday: this.tradesToday,
      currentBalance: this.currentBalance,
      dailyLossPct: this.startingBalance > 0 ? (this.dailyLoss / this.startingBalance) * 100 : 0,
      dailyProfitPct: this.startingBalance > 0 ? (this.dailyProfit / this.startingBalance) * 100 : 0,
    };
  }
}
