import { Direction } from '../types';

export interface HumanizerConfig {
  minDelayMs: number;
  maxDelayMs: number;
  sessionActivityIntervalMs: number;
  dailyProfitTarget: number;
  dailyLossLimit: number;
  consecutiveWinCooldown: number;
}

export class Humanizer {
  private consecutiveWins = 0;
  private tradesToday = 0;
  private profitToday = 0;
  private lastTradeAt = 0;
  private spoofTimer: ReturnType<typeof setInterval> | null = null;
  private onSpoofActivity: (() => void) | null = null;

  constructor(
    private config: HumanizerConfig = {
      minDelayMs: 150,
      maxDelayMs: 600,
      sessionActivityIntervalMs: 45000,
      dailyProfitTarget: 5,
      dailyLossLimit: 3,
      consecutiveWinCooldown: 3,
    }
  ) {}

  startSpoofing(spoofFn: () => void) {
    this.onSpoofActivity = spoofFn;
    this.spoofTimer = setInterval(() => {
      if (Math.random() < 0.4) {
        spoofFn();
      }
    }, this.config.sessionActivityIntervalMs);
  }

  stopSpoofing() {
    if (this.spoofTimer) {
      clearInterval(this.spoofTimer);
      this.spoofTimer = null;
    }
  }

  async applyJitter(): Promise<void> {
    const jitter = Math.random() * (this.config.maxDelayMs - this.config.minDelayMs) + this.config.minDelayMs;
    await this.sleep(jitter);

    if (this.lastTradeAt > 0) {
      const elapsed = Date.now() - this.lastTradeAt;
      if (elapsed < 10000) {
        const additionalJitter = Math.random() * 500 + 100;
        await this.sleep(additionalJitter);
      }
    }
  }

  shouldPauseAfterWin(): boolean {
    this.consecutiveWins++;
    if (this.consecutiveWins >= this.config.consecutiveWinCooldown) {
      this.consecutiveWins = 0;
      return true;
    }
    return false;
  }

  shouldStopTrading(): { stop: boolean; reason: string } {
    if (this.profitToday >= this.config.dailyProfitTarget) {
      return { stop: true, reason: `Daily profit target of ${this.config.dailyProfitTarget}% reached` };
    }
    if (this.tradesToday > 50) {
      return { stop: true, reason: 'Too many trades today, simulating human limit' };
    }
    return { stop: false, reason: '' };
  }

  recordTrade(profit: number) {
    this.tradesToday++;
    this.profitToday += profit;
    this.lastTradeAt = Date.now();
    if (profit <= 0) {
      this.consecutiveWins = 0;
    }
  }

  resetDaily() {
    this.consecutiveWins = 0;
    this.tradesToday = 0;
    this.profitToday = 0;
  }

  getProfile(direction: Direction): Direction {
    if (Math.random() < 0.08) {
      return direction === 'CALL' ? 'PUT' : 'CALL';
    }
    return direction;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
