export interface Asset {
  symbol: string;
  name: string;
  category: 'Crypto' | 'Forex' | 'Commodities' | 'Equities';
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  decimals: number;
  spread: number;
  fundingRate: number;
  sparkline: number[];
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '1D';

export interface IndicatorSettings {
  showEMA9: boolean;
  showEMA21: boolean;
  showEMA50: boolean;
  showBollinger: boolean;
  showRSI: boolean;
  showMACD: boolean;
  showVolume: boolean;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  leverage: number;
  margin: number;
  pnl: number;
  pnlPct: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingStopPct?: number;
  trailingStopPrice?: number;
  highWaterMark?: number;
  liquidationPrice: number;
  openedAt: number;
  agentId?: string;
  agentName?: string;
  notes?: string;
}

export type OrderDuration = 'GTC' | 'DAY' | 'IOC' | 'FOK';

export interface OrderPlacementPayload {
  symbol: string;
  side: 'LONG' | 'SHORT';
  type: 'MARKET' | 'LIMIT';
  price: number;
  margin: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingStopPct?: number;
  duration?: OrderDuration;
  agentId?: string;
  agentName?: string;
}

export interface BatchOrderLeg {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  type: 'MARKET' | 'LIMIT';
  price: number;
  margin: number;
  leverage: number;
  stopLoss?: string;
  takeProfit?: string;
  trailingStopPct?: number;
  enableTrailingStop?: boolean;
  duration?: OrderDuration;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW';
  status: 'ACTIVE' | 'TRIGGERED' | 'DISABLED';
  createdAt: number;
  triggeredAt?: number;
  note?: string;
  soundEnabled?: boolean;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_MARKET';
  price: number;
  quantity: number;
  leverage: number;
  status: 'OPEN' | 'FILLED' | 'CANCELLED';
  createdAt: number;
  duration?: OrderDuration;
  expiresAt?: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingStopPct?: number;
}

export type TradeReason =
  | 'MANUAL'
  | 'TAKE_PROFIT'
  | 'STOP_LOSS'
  | 'TRAILING_STOP'
  | 'AI_AGENT'
  | 'SCHEDULE'
  | 'SCHEDULED_DCA';

export type TradeCategory =
  | 'Agent'
  | 'Manual'
  | 'Schedule'
  | 'Take Profit'
  | 'Stop Loss'
  | 'Trailing Stop';

export interface TradeHistoryItem {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPct: number;
  closedAt: number;
  openedAt?: number;
  holdingDurationMs?: number;
  reason: TradeReason;
  agentName?: string;
  notes?: string;
  category?: TradeCategory;
}

export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

export interface ExecutionTapeItem {
  id: string;
  price: number;
  amount: number;
  side: 'BUY' | 'SELL';
  time: string;
}

export interface MarketNewsItem {
  id?: string;
  headline: string;
  category: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  source: string;
  timeAgo: string;
  url?: string;
}

export interface MarketNewsResponse {
  news: MarketNewsItem[];
  groundingSources?: { title: string; uri: string }[];
  timestamp: number;
  grounded: boolean;
}

export interface AutonomousAgent {
  id: string;
  name: string;
  tagline: string;
  description: string;
  strategyType: 'MOMENTUM_SCALPING' | 'TREND_FOLLOWING' | 'MEAN_REVERSION' | 'BREAKOUT' | 'GRID_ARBITRAGE';
  status: 'ACTIVE' | 'PAUSED' | 'IDLE';
  targetPair: string;
  winRateProjected: number;
  profitFactor: number;
  maxDrawdown: number;
  totalTrades: number;
  winTrades: number;
  totalPnl: number;
  executionRules: {
    entryConditions: string[];
    exitConditions: string[];
    leverage: number;
    stopLossPct: number;
    takeProfitPct: number;
    trailingStopPct: number;
    cooldownMinutes: number;
    positionSizePct: number;
  };
  systemDirective: string;
  recentLogs: {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'trade' | 'alert' | 'profit';
  }[];
}

export interface AISignal {
  action: 'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG SELL';
  confidence: number;
  summary: string;
  recommendedEntry: number;
  targetPrice1: number;
  targetPrice2: number;
  stopLoss: number;
  riskRewardRatio: string;
  signals: {
    trend: { label: string; status: 'bullish' | 'bearish' | 'neutral'; detail: string };
    momentum: { label: string; status: 'bullish' | 'bearish' | 'neutral'; detail: string };
    volatility: { label: string; status: 'low' | 'medium' | 'high'; detail: string };
    keyLevels: {
      support: number[];
      resistance: number[];
    };
  };
  catalysts: string[];
  suggestedLeverage: number;
}

export interface MarketSentiment {
  fearGreedIndex: number;
  sentimentStatus: string;
  marketRegime: string;
  macroSummary: string;
  narratives: {
    title: string;
    impact: 'Bullish' | 'Bearish' | 'Neutral';
    affected: string;
    description: string;
  }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export type SchedulerStrategyType = 'DCA' | 'MULTI_STAGE_LADDER' | 'CUSTOM_SEQUENCE';

export interface ScheduledStage {
  id: string;
  stageNumber: number;
  symbol: string;
  targetPrice?: number;
  margin: number;
  leverage: number;
  side: 'LONG' | 'SHORT';
  type: 'MARKET' | 'LIMIT';
  delaySeconds: number;
  status: 'PENDING' | 'EXECUTING' | 'FILLED' | 'SKIPPED' | 'FAILED';
  executedAt?: number;
  fillPrice?: number;
  pnl?: number;
  error?: string;
}

export interface BulkOrderSchedule {
  id: string;
  name: string;
  symbol: string;
  strategyType: SchedulerStrategyType;
  side: 'LONG' | 'SHORT';
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  totalStages: number;
  completedStages: number;
  intervalSeconds: number;
  totalMarginAllocated: number;
  totalMarginFilled: number;
  averageFillPrice?: number;
  leverage: number;
  stopLossPct?: number;
  takeProfitPct?: number;
  trailingStopPct?: number;
  createdAt: number;
  nextExecutionTime: number;
  stages: ScheduledStage[];
  notes?: string;
}
