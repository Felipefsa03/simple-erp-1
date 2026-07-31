import { IQOptionApi, IQOptionMarket, IQOptionModel, IQOptionTime, IQOptionCurrencyType, iqOptionExpired, IQOptionStreamCandleGenerated, IQOptionStreamOptionTradersSentiment, IQOptionStreamOptionClose, IQOptionStreamUserAlerts } from 'iq-option-client';
import { Direction, AccountType, Candle } from './types';
import { EventEmitter } from 'events';
import { Humanizer } from './anti-ban/humanizer';

export class IQOptionService extends EventEmitter {
  private api: IQOptionApi | null = null;
  private connected = false;
  private accountType: AccountType = 'PRACTICE';
  private email: string;
  private password: string;
  private humanizer: Humanizer;
  private candleStreams: Map<string, IQOptionStreamCandleGenerated> = new Map();
  private sentimentStreams: Map<string, IQOptionStreamOptionTradersSentiment> = new Map();
  private closeStream: IQOptionStreamOptionClose | null = null;
  private alertsStream: IQOptionStreamUserAlerts | null = null;
  private profile: any = null;
  private balance: any = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT = 10;
  private readonly RECONNECT_DELAY = 5000;

  constructor(email: string, password: string) {
    super();
    this.email = email;
    this.password = password;
    this.humanizer = new Humanizer();
  }

  async connect(): Promise<boolean> {
    try {
      this.api = new IQOptionApi(this.email, this.password);
      this.profile = await this.api.connectAsync();
      this.connected = true;
      this.reconnectAttempts = 0;

      const practiceBalance = this.profile.balances.find((b: any) => b.type === IQOptionCurrencyType.TEST);
      const realBalance = this.profile.balances.find((b: any) => b.type === IQOptionCurrencyType.FIAT);
      this.balance = this.accountType === 'REAL' ? realBalance : practiceBalance;

      this.setupOptionCloseStream();
      this.setupAlertsStream();

      this.emit('connected', { profile: this.profile, balance: this.balance });
      return true;
    } catch (error) {
      console.error('[IQOption] Connection failed:', error);
      this.connected = false;
      this.startReconnectLoop();
      return false;
    }
  }

  private async startReconnectLoop() {
    if (this.reconnectAttempts >= this.MAX_RECONNECT) {
      this.emit('error', new Error('Max reconnect attempts reached'));
      return;
    }
    this.reconnectAttempts++;
    console.log(`[IQOption] Reconnecting attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT}...`);
    await new Promise(r => setTimeout(r, this.RECONNECT_DELAY * this.reconnectAttempts));
    try {
      this.api = new IQOptionApi(this.email, this.password);
      this.profile = await this.api.connectAsync();
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit('connected', { profile: this.profile, balance: this.balance });
    } catch (error) {
      console.error('[IQOption] Reconnection failed, attempt', this.reconnectAttempts);
      await this.startReconnectLoop();
    }
  }

  private setupOptionCloseStream() {
    if (!this.api) return;
    this.closeStream = new IQOptionStreamOptionClose(this.api.getIQOptionWs());
    this.closeStream.on('data', (data: any) => {
      this.emit('option-closed', data);
    });
  }

  private setupAlertsStream() {
    if (!this.api) return;
    this.alertsStream = new IQOptionStreamUserAlerts(this.api.getIQOptionWs());
    this.alertsStream.on('data', (data: any) => {
      this.emit('alert', data);
    });
  }

  async subscribeCandles(symbol: string, timeframe: number): Promise<void> {
    if (!this.api) return;
    const key = `${symbol}_${timeframe}`;
    if (this.candleStreams.has(key)) return;

    const timeMap: Record<number, IQOptionTime> = {
      60: IQOptionTime.ONE_MINUTE,
      300: IQOptionTime.FIVE_MINUTES,
      900: IQOptionTime.FIFTEEN_MINUTES,
      1800: IQOptionTime.THIRTY_MINUTES,
      3600: IQOptionTime.ONE_HOUR,
    };

    const stream = new IQOptionStreamCandleGenerated(
      this.api.getIQOptionWs(),
      symbol as unknown as IQOptionMarket,
      timeMap[timeframe] || IQOptionTime.ONE_MINUTE
    );

    stream.on('data', (candle: any) => {
      const formatted: Candle = {
        active_id: candle.active_id,
        size: candle.size,
        at: candle.at,
        from: candle.from,
        to: candle.to,
        id: candle.id,
        open: candle.open,
        close: candle.close,
        min: candle.min,
        max: candle.max,
        ask: candle.ask,
        bid: candle.bid,
        volume: candle.volume,
        phase: candle.phase,
      };
      this.emit('candle', formatted);
    });

    await stream.startStream();
    this.candleStreams.set(key, stream);
  }

  async unsubscribeCandles(symbol: string, timeframe: number) {
    const key = `${symbol}_${timeframe}`;
    const stream = this.candleStreams.get(key);
    if (stream) {
      stream.stopStream();
      this.candleStreams.delete(key);
    }
  }

  async subscribeSentiment(symbol: string): Promise<void> {
    if (!this.api) return;
    if (this.sentimentStreams.has(symbol)) return;

    const stream = new IQOptionStreamOptionTradersSentiment(
      this.api.getIQOptionWs(),
      symbol as unknown as IQOptionMarket
    );

    stream.on('data', (data: any) => {
      this.emit('sentiment', { symbol, ...data });
    });

    await stream.startStream();
    this.sentimentStreams.set(symbol, stream);
  }

  async unsubscribeSentiment(symbol: string) {
    const stream = this.sentimentStreams.get(symbol);
    if (stream) {
      stream.stopStream();
      this.sentimentStreams.delete(symbol);
    }
  }

  async getHistoricalCandles(symbol: string, timeframe: number, count: number): Promise<Candle[]> {
    if (!this.api) return [];
    try {
      const activeId = this.getActiveId(symbol);
      const candles = await this.api.getCandles(activeId, timeframe, 0, count, true, true);
      return candles as Candle[];
    } catch (error) {
      console.error('[IQOption] Error fetching historical candles:', error);
      return [];
    }
  }

  async buyBinaryOption(symbol: string, direction: Direction, amount: number, durationMinutes: number): Promise<any> {
    if (!this.api) throw new Error('Not connected');

    await this.humanizer.applyJitter();

    const model = direction === 'CALL' ? IQOptionModel.BUY : IQOptionModel.SELL;
    const result = await this.api.sendOrderBinary(
      symbol as unknown as IQOptionMarket,
      model,
      iqOptionExpired(durationMinutes),
      this.balance?.id,
      85,
      amount
    );

    this.emit('order-placed', { symbol, direction, amount, result });
    return result;
  }

  async buyDigitalOption(symbol: string, direction: Direction, amount: number, durationMinutes: number): Promise<any> {
    if (!this.api) throw new Error('Not connected');

    await this.humanizer.applyJitter();

    const model = direction === 'CALL' ? IQOptionModel.BUY : IQOptionModel.SELL;
    const result = await this.api.sendOrderDigital(
      symbol as unknown as IQOptionMarket,
      model,
      durationMinutes,
      this.balance?.id,
      amount,
      0
    );

    this.emit('order-placed', { symbol, direction, amount, result });
    return result;
  }

  async getBalance(): Promise<number> {
    if (!this.api) return 0;
    try {
      const profile = await this.api.connectAsync();
      const balance = profile.balances.find((b: any) =>
        this.accountType === 'REAL' ? b.type === IQOptionCurrencyType.FIAT : b.type === IQOptionCurrencyType.TEST
      );
      return balance?.amount || 0;
    } catch {
      return this.balance?.amount || 0;
    }
  }

  setAccountType(type: AccountType) {
    this.accountType = type;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getProfile(): any {
    return this.profile;
  }

  getHumanizer(): Humanizer {
    return this.humanizer;
  }

  getApi(): IQOptionApi | null {
    return this.api;
  }

  private getActiveId(symbol: string): number {
    const map: Record<string, number> = {
      'EURUSD': 1, 'EURUSD-OTC': 1,
      'GBPUSD': 2, 'GBPUSD-OTC': 2,
      'USDJPY': 3,
      'AUDUSD': 4,
      'USDCAD': 5,
      'GBPJPY': 7,
      'EURJPY': 9,
      'BITCOIN': 816,
      'ETHEREUM': 913,
      'AAPL': 168,
      'GOOGL': 60,
      'AMZN': 96,
      'TSLA': 212,
    };
    return map[symbol] || 1;
  }

  async disconnect() {
    for (const [key, stream] of this.candleStreams) {
      stream.stopStream();
    }
    this.candleStreams.clear();
    for (const [key, stream] of this.sentimentStreams) {
      stream.stopStream();
    }
    this.sentimentStreams.clear();
    this.humanizer.stopSpoofing();
    this.connected = false;
    this.emit('disconnected');
  }
}
