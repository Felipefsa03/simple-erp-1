import { IQOptionService } from './iqoption.service';
import { Direction, OptionType, OrderRequest, OrderResult, Position } from './types';
import { CircuitBreaker } from './risk-management/circuit-breaker';
import { StopLossManager } from './risk-management/stop-loss';
import { PositionSizingKelly } from './risk-management/position-sizing';
import { Humanizer } from './anti-ban/humanizer';
import { EventEmitter } from 'events';

export class TradingService extends EventEmitter {
  private positions: Map<string, Position> = new Map();
  private tradeHistory: OrderResult[] = [];
  private active = false;

  constructor(
    private iqOption: IQOptionService,
    private circuitBreaker: CircuitBreaker,
    private stopLoss: StopLossManager,
    private positionSizing: PositionSizingKelly,
    private humanizer: Humanizer
  ) {
    super();
  }

  async start(autoTrade: boolean = false) {
    this.active = true;
    const balance = await this.iqOption.getBalance();
    this.circuitBreaker.initialize(balance);
    this.stopLoss.initialize(balance);
    this.emit('started', { balance });
  }

  stop() {
    this.active = false;
    this.emit('stopped');
  }

  isActive(): boolean {
    return this.active;
  }

  async executeOrder(request: OrderRequest): Promise<OrderResult | null> {
    if (!this.active) {
      this.emit('error', new Error('Trading service is not active'));
      return null;
    }

    const breakerCheck = this.circuitBreaker.check();
    if (!breakerCheck.allowed) {
      this.emit('trade-blocked', { reason: breakerCheck.reason });
      return null;
    }

    const stopCheck = this.stopLoss.shouldStop();
    if (stopCheck.stop) {
      this.emit('trade-blocked', { reason: stopCheck.reason });
      return null;
    }

    const humanCheck = this.humanizer.shouldStopTrading();
    if (humanCheck.stop) {
      this.emit('trade-blocked', { reason: humanCheck.reason });
      return null;
    }

    const balance = await this.iqOption.getBalance();
    const kelly = this.positionSizing.getKellyFraction();
    const posSize = this.positionSizing.calculatePositionSize(balance, 2, 0.5, kelly);
    const finalAmount = Math.min(request.amount || posSize, balance * 0.1);

    if (finalAmount <= 0) {
      this.emit('error', new Error('Insufficient balance'));
      return null;
    }

    try {
      const direction = this.humanizer.getProfile(request.direction);

      let result: any;
      if (request.type === 'BINARY') {
        result = await this.iqOption.buyBinaryOption(request.symbol, direction, finalAmount, request.durationSeconds / 60);
      } else {
        result = await this.iqOption.buyDigitalOption(request.symbol, direction, finalAmount, request.durationSeconds / 60);
      }

      const position: Position = {
        id: result?.id || `order_${Date.now()}`,
        symbol: request.symbol,
        direction,
        amount: finalAmount,
        openedAt: Date.now(),
      };

      this.positions.set(position.id, position);
      this.emit('position-opened', position);

      return {
        orderId: position.id,
        result: 'win',
        profitAmount: 0,
        entryPrice: 0,
        openedAt: Date.now(),
        closedAt: 0,
      };
    } catch (error: any) {
      this.circuitBreaker.recordLoss(finalAmount);
      this.emit('error', error);
      return null;
    }
  }

  async checkOrderResult(orderId: string): Promise<OrderResult | null> {
    const position = this.positions.get(orderId);
    if (!position) return null;

    try {
      const result = await this.iqOption.getApi()?.checkBinaryOptionResult(orderId, 70000);
      if (!result) return null;

      const orderResult: OrderResult = {
        orderId,
        result: result.win === 'win' ? 'win' : result.win === 'loss' ? 'loss' : 'equal',
        profitAmount: result.profitAmount,
        entryPrice: 0,
        closedAt: Date.now(),
        openedAt: position.openedAt,
      };

      if (orderResult.result === 'win') {
        this.positionSizing.recordTrade(true, orderResult.profitAmount || 0);
        this.circuitBreaker.recordWin(orderResult.profitAmount || 0);
        this.stopLoss.recordTrade(orderResult.profitAmount || 0);
      } else {
        this.positionSizing.recordTrade(false, -(position.amount));
        this.circuitBreaker.recordLoss(position.amount);
        this.stopLoss.recordTrade(-position.amount);
      }

      this.humanizer.recordTrade(orderResult.result === 'win' ? 1 : -1);
      this.positions.delete(orderId);
      this.tradeHistory.push(orderResult);
      this.emit('order-result', orderResult);

      return orderResult;
    } catch (error) {
      console.error('[TradingService] Error checking order result:', error);
      return null;
    }
  }

  getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  getHistory(limit: number = 50): OrderResult[] {
    return this.tradeHistory.slice(-limit);
  }

  getStats() {
    const wins = this.tradeHistory.filter(t => t.result === 'win').length;
    const losses = this.tradeHistory.filter(t => t.result === 'loss').length;
    const total = this.tradeHistory.length;
    return {
      totalTrades: total,
      wins,
      losses,
      winRate: total > 0 ? wins / total : 0,
      profitFactor: this.calculateProfitFactor(),
      openPositions: this.positions.size,
      ...this.positionSizing.getStats(),
      ...this.stopLoss.getStats(),
      circuitBreaker: this.circuitBreaker.getState(),
    };
  }

  private calculateProfitFactor(): number {
    const grossProfit = this.tradeHistory.filter(t => t.result === 'win').reduce((s, t) => s + (t.profitAmount || 0), 0);
    const grossLoss = Math.abs(this.tradeHistory.filter(t => t.result === 'loss').reduce((s, t) => s + (t.profitAmount || 0), 0));
    return grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  }
}
