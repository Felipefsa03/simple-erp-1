import { GuruTracker } from './guru-tracker.service';
import { TradingService } from '../trading.service';
import { IQOptionService } from '../iqoption.service';
import { Direction, OptionType } from '../types';
import { EventEmitter } from 'events';

interface FollowedGuru {
  guruId: string;
  copyRatio: number;
  maxAmountPerTrade: number;
  enabled: boolean;
  onlyHighConfidence: boolean;
}

export class CopyTradingService extends EventEmitter {
  private followedGurus: Map<string, FollowedGuru> = new Map();
  private active = false;

  constructor(
    private guruTracker: GuruTracker,
    private tradingService: TradingService,
    private iqOption: IQOptionService
  ) {
    super();
    this.setupListeners();
  }

  private setupListeners() {
    this.guruTracker.on('guru-updated', (guru) => {
      const followed = this.followedGurus.get(guru.id);
      if (followed?.enabled && guru.score > 60 && !guru.isUsingMartingale) {
        this.emit('guru-signal', guru);
      }
    });

    this.iqOption.on('option-closed', async (data: any) => {
      // Replicar trades de gurus seguidos
    });
  }

  followGuru(guruId: string, config: Partial<FollowedGuru> = {}) {
    const existing = this.followedGurus.get(guruId);
    this.followedGurus.set(guruId, {
      guruId,
      copyRatio: config.copyRatio ?? existing?.copyRatio ?? 1.0,
      maxAmountPerTrade: config.maxAmountPerTrade ?? existing?.maxAmountPerTrade ?? 50,
      enabled: config.enabled ?? existing?.enabled ?? true,
      onlyHighConfidence: config.onlyHighConfidence ?? existing?.onlyHighConfidence ?? true,
    });
    this.emit('guru-followed', { guruId, config });
  }

  unfollowGuru(guruId: string) {
    this.followedGurus.delete(guruId);
    this.emit('guru-unfollowed', { guruId });
  }

  async replicateTrade(guruId: string, symbol: string, direction: Direction, amount: number) {
    const followed = this.followedGurus.get(guruId);
    if (!followed?.enabled) return;

    const guru = this.guruTracker.getGuru(guruId);
    if (!guru) return;

    if (guru.isUsingMartingale) {
      this.emit('trade-blocked', { guruId, reason: 'Guru uses martingale' });
      return;
    }

    if (guru.winRate < 0.55) {
      this.emit('trade-blocked', { guruId, reason: `Low win rate: ${(guru.winRate * 100).toFixed(1)}%` });
      return;
    }

    const adjustedAmount = Math.min(amount * followed.copyRatio, followed.maxAmountPerTrade);
    const balance = await this.iqOption.getBalance();
    const maxTradeAmount = balance * 0.05;

    if (adjustedAmount > maxTradeAmount) {
      this.emit('trade-blocked', { guruId, reason: 'Trade amount exceeds max allowed' });
      return;
    }

    const result = await this.tradingService.executeOrder({
      symbol,
      direction,
      amount: adjustedAmount,
      durationSeconds: 60,
      type: 'BINARY',
    });

    if (result) {
      this.emit('trade-replicated', { guruId, symbol, direction, amount: adjustedAmount, result });
    }
  }

  getFollowedGurus(): Array<{ guru: any; config: FollowedGuru }> {
    return Array.from(this.followedGurus.entries()).map(([guruId, config]) => ({
      guru: this.guruTracker.getGuru(guruId),
      config,
    }));
  }

  updateFollowConfig(guruId: string, config: Partial<FollowedGuru>) {
    const existing = this.followedGurus.get(guruId);
    if (existing) {
      Object.assign(existing, config);
      this.emit('follow-config-updated', { guruId, config });
    }
  }

  start() {
    this.active = true;
    this.emit('started');
  }

  stop() {
    this.active = false;
    this.emit('stopped');
  }

  isActive(): boolean {
    return this.active;
  }
}
