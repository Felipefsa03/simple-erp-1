export type Direction = 'CALL' | 'PUT';
export type OptionType = 'BINARY' | 'DIGITAL';
export type AccountType = 'PRACTICE' | 'REAL';
export type OrderResult = 'win' | 'loss' | 'equal';
export type StrategyName = 'rsi' | 'macd' | 'bollinger' | 'ma-cross' | 'stochastic' | 'support-resistance' | 'price-action' | 'martingale' | 'contrarian' | 'lstm' | 'composite';

export interface Candle {
  active_id: number;
  size: number;
  at: number;
  from: number;
  to: number;
  id: number;
  open: number;
  close: number;
  min: number;
  max: number;
  ask: number;
  bid: number;
  volume: number;
  phase: string;
}

export interface TradeSignal {
  strategy: StrategyName;
  direction: Direction;
  confidence: number;
  symbol: string;
  timestamp: number;
}

export interface OrderRequest {
  symbol: string;
  direction: Direction;
  amount: number;
  durationSeconds: number;
  type: OptionType;
}

export interface OrderResult {
  orderId: string;
  result: OrderResult;
  profitAmount: number | null;
  entryPrice: number;
  exitPrice?: number;
  openedAt: number;
  closedAt: number;
}

export interface Position {
  id: string;
  symbol: string;
  direction: Direction;
  amount: number;
  result?: OrderResult;
  profit?: number;
  openedAt: number;
  closedAt?: number;
}

export interface RiskConfig {
  maxDailyLossPct: number;
  maxDailyProfitPct: number;
  maxConsecutiveLoss: number;
  positionSizePct: number;
  minIntervalSeconds: number;
  maxTradesPerDay: number;
  stopLossEnabled: boolean;
  takeProfitEnabled: boolean;
  accountType: AccountType;
  kellyFraction: number;
  atrVolatilityThreshold: number;
}

export interface Guru {
  id: string;
  name: string;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  consistency: number;
  avgTradeDuration: number;
  isUsingMartingale: boolean;
  score: number;
}

export interface StrategyConfig {
  name: StrategyName;
  enabled: boolean;
  params: Record<string, unknown>;
  weight: number;
}

export interface BacktestResult {
  symbol: string;
  strategy: StrategyName;
  timeframe: string;
  startDate: string;
  endDate: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  roi: number;
  finalBalance: number;
}

export interface CompositeVote {
  direction: Direction;
  confidence: number;
  votes: Array<{ strategy: StrategyName; direction: Direction; confidence: number; weight: number }>;
}
