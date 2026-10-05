/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Asset,
  Candle,
  Timeframe,
  IndicatorSettings,
  Position,
  Order,
  OrderDuration,
  OrderPlacementPayload,
  TradeHistoryItem,
  TradeReason,
  TradeCategory,
  AutonomousAgent,
  PriceAlert,
  AISignal,
  MarketSentiment,
  OrderBookEntry,
  ExecutionTapeItem,
  BulkOrderSchedule,
  ScheduledStage,
} from './types';
import { Bell } from 'lucide-react';
import { INITIAL_ASSETS, generateInitialCandles } from './utils/indicators';
import { DEFAULT_AGENTS } from './utils/defaultAgents';
import {
  playOrderFilledSound,
  playProfitSound,
  playAlertSound,
  setSoundEnabled,
  isSoundEnabled,
} from './utils/sound';

import { Header } from './components/Header';
import { MarketNews } from './components/MarketNews';
import { MarketBar } from './components/MarketBar';
import { CandleChart } from './components/CandleChart';
import { MultiChartArea, ChartLayoutMode } from './components/MultiChartArea';
import { OrderBook } from './components/OrderBook';
import { TradingPanel } from './components/TradingPanel';
import { PositionsTable } from './components/PositionsTable';
import { AIAgentHub } from './components/AIAgentHub';
import { AISignalModal } from './components/AISignalModal';
import { AICopilotDrawer } from './components/AICopilotDrawer';
import { MarketSentimentModal } from './components/MarketSentimentModal';
import { RiskHeatmapModal } from './components/RiskHeatmapModal';
import { MarketScannerModal } from './components/MarketScannerModal';
import { AssetCorrelationModal } from './components/AssetCorrelationModal';
import { TradeAnalysisModal } from './components/TradeAnalysisModal';
import { BulkOrderSchedulerModal } from './components/BulkOrderSchedulerModal';
import { PortfolioRebalanceModal } from './components/PortfolioRebalanceModal';

export default function App() {
  // 1. Market State
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [currentAsset, setCurrentAsset] = useState<Asset>(INITIAL_ASSETS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [chartLayout, setChartLayout] = useState<ChartLayoutMode>('1x1');
  const [candles, setCandles] = useState<Candle[]>(() =>
    generateInitialCandles(INITIAL_ASSETS[0].price, 85, '15m')
  );
  const [priceTickDirection, setPriceTickDirection] = useState<'up' | 'down' | 'none'>('none');

  // Indicators Settings
  const [indicators, setIndicators] = useState<IndicatorSettings>({
    showEMA9: true,
    showEMA21: true,
    showEMA50: false,
    showBollinger: true,
    showRSI: true,
    showMACD: false,
    showVolume: true,
  });

  // Order Book & Recent Trades
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [recentTrades, setRecentTrades] = useState<ExecutionTapeItem[]>([]);
  const [selectedOrderBookPrice, setSelectedOrderBookPrice] = useState<number | null>(null);

  // 2. Portfolio State
  const [portfolioBalance, setPortfolioBalance] = useState<number>(100000);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([
    {
      id: 'trade-init-1',
      symbol: 'BTC/USDT',
      side: 'LONG',
      entryPrice: 66800.0,
      exitPrice: 68450.0,
      quantity: 0.25,
      pnl: 412.5,
      pnlPct: 12.35,
      openedAt: Date.now() - 48 * 60 * 1000,
      closedAt: Date.now() - 6 * 60 * 1000,
      holdingDurationMs: 42 * 60 * 1000,
      reason: 'AI_AGENT',
      agentName: 'Trend Momentum Pro',
      notes: 'AI quant momentum breakout confirmation',
    },
    {
      id: 'trade-init-2',
      symbol: 'BTC/USDT',
      side: 'LONG',
      entryPrice: 67200.0,
      exitPrice: 68150.0,
      quantity: 0.35,
      pnl: 332.5,
      pnlPct: 7.07,
      openedAt: Date.now() - 60 * 60 * 1000,
      closedAt: Date.now() - 18 * 60 * 1000,
      holdingDurationMs: 42 * 60 * 1000,
      reason: 'SCHEDULE',
      agentName: 'BTC DCA 5-Stage Accumulation',
      notes: 'Automated DCA tranche #2 executed at 15s interval',
    },
    {
      id: 'trade-init-3',
      symbol: 'SOL/USDT',
      side: 'LONG',
      entryPrice: 188.0,
      exitPrice: 184.25,
      quantity: 25.0,
      pnl: -93.75,
      pnlPct: -3.99,
      openedAt: Date.now() - 32 * 60 * 1000,
      closedAt: Date.now() - 14 * 60 * 1000,
      holdingDurationMs: 18 * 60 * 1000,
      reason: 'STOP_LOSS',
      notes: 'Support level broken on volume spike',
    },
    {
      id: 'trade-init-4',
      symbol: 'XAU/USD',
      side: 'LONG',
      entryPrice: 2638.0,
      exitPrice: 2652.4,
      quantity: 2.0,
      pnl: 288.0,
      pnlPct: 5.46,
      openedAt: Date.now() - 160 * 60 * 1000,
      closedAt: Date.now() - 40 * 60 * 1000,
      holdingDurationMs: 120 * 60 * 1000,
      reason: 'MANUAL',
      notes: 'Manual swing entry following macro CPI release',
    },
    {
      id: 'trade-init-5',
      symbol: 'NVDA',
      side: 'LONG',
      entryPrice: 135.2,
      exitPrice: 138.8,
      quantity: 40.0,
      pnl: 144.0,
      pnlPct: 5.33,
      openedAt: Date.now() - 75 * 60 * 1000,
      closedAt: Date.now() - 20 * 60 * 1000,
      holdingDurationMs: 55 * 60 * 1000,
      reason: 'TAKE_PROFIT',
      notes: 'Take profit limit order filled at key resistance',
    },
    {
      id: 'trade-init-6',
      symbol: 'ETH/USDT',
      side: 'SHORT',
      entryPrice: 3580.0,
      exitPrice: 3510.0,
      quantity: 3.5,
      pnl: 245.0,
      pnlPct: 9.78,
      openedAt: Date.now() - 95 * 60 * 1000,
      closedAt: Date.now() - 25 * 60 * 1000,
      holdingDurationMs: 70 * 60 * 1000,
      reason: 'AI_AGENT',
      agentName: 'Volatility Breakout Alpha',
      notes: 'Overbought RSI mean-reversion scalp',
    },
    {
      id: 'trade-init-7',
      symbol: 'SOL/USDT',
      side: 'LONG',
      entryPrice: 178.5,
      exitPrice: 182.2,
      quantity: 18.0,
      pnl: 66.6,
      pnlPct: 4.15,
      openedAt: Date.now() - 110 * 60 * 1000,
      closedAt: Date.now() - 50 * 60 * 1000,
      holdingDurationMs: 60 * 60 * 1000,
      reason: 'SCHEDULE',
      agentName: 'Solana Dip Ladder',
      notes: 'Multi-stage dip accumulation ladder leg #3',
    },
    {
      id: 'trade-init-8',
      symbol: 'BTC/USDT',
      side: 'SHORT',
      entryPrice: 67100.0,
      exitPrice: 67450.0,
      quantity: 0.15,
      pnl: -52.5,
      pnlPct: -2.61,
      openedAt: Date.now() - 40 * 60 * 1000,
      closedAt: Date.now() - 28 * 60 * 1000,
      holdingDurationMs: 12 * 60 * 1000,
      reason: 'STOP_LOSS',
      notes: 'Stop loss triggered below local support',
    },
  ]);

  // 3. AI Quant Agents & Features
  const [agents, setAgents] = useState<AutonomousAgent[]>(DEFAULT_AGENTS);
  const [activeSignal, setActiveSignal] = useState<AISignal | null>(null);
  const [signalModalOpen, setSignalModalOpen] = useState<boolean>(false);
  const [isScanningSignal, setIsScanningSignal] = useState<boolean>(false);
  const [agentModalOpen, setAgentModalOpen] = useState<boolean>(false);
  const [sentimentModalOpen, setSentimentModalOpen] = useState<boolean>(false);
  const [riskHeatmapModalOpen, setRiskHeatmapModalOpen] = useState<boolean>(false);
  const [marketScannerModalOpen, setMarketScannerModalOpen] = useState<boolean>(false);
  const [correlationModalOpen, setCorrelationModalOpen] = useState<boolean>(false);
  const [tradeAnalysisModalOpen, setTradeAnalysisModalOpen] = useState<boolean>(false);
  const [marketSentiment, setMarketSentiment] = useState<MarketSentiment | null>(null);
  const [copilotOpen, setCopilotOpen] = useState<boolean>(false);
  const [soundActive, setSoundActive] = useState<boolean>(true);

  // 4. Price Alerts State
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([
    {
      id: 'alert-1',
      symbol: 'BTC/USDT',
      targetPrice: 69200,
      condition: 'ABOVE',
      status: 'ACTIVE',
      createdAt: Date.now() - 3600000,
      note: 'Key Resistance Breakout',
      soundEnabled: true,
    },
    {
      id: 'alert-2',
      symbol: 'ETH/USDT',
      targetPrice: 3450,
      condition: 'BELOW',
      status: 'ACTIVE',
      createdAt: Date.now() - 1800000,
      note: 'Support Bounce Level',
      soundEnabled: true,
    },
  ]);

  const [triggeredAlertBanner, setTriggeredAlertBanner] = useState<{
    id: string;
    symbol: string;
    targetPrice: number;
    condition: 'ABOVE' | 'BELOW';
    currentPrice: number;
    note?: string;
  } | null>(null);

  // Auto-dismiss triggered alert banner after 7s
  useEffect(() => {
    if (triggeredAlertBanner) {
      const timer = setTimeout(() => setTriggeredAlertBanner(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [triggeredAlertBanner]);

  const handleCreateAlert = (alertData: Omit<PriceAlert, 'id' | 'createdAt' | 'status'>) => {
    const newAlert: PriceAlert = {
      ...alertData,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
      status: 'ACTIVE',
    };
    setPriceAlerts((prev) => [newAlert, ...prev]);
  };

  const handleDeleteAlert = (alertId: string) => {
    setPriceAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const handleToggleAlertStatus = (alertId: string) => {
    setPriceAlerts((prev) =>
      prev.map((a) => {
        if (a.id === alertId) {
          const nextStatus = a.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
          return { ...a, status: nextStatus };
        }
        return a;
      })
    );
  };

  // Bulk Order Schedulers (DCA / Multi-Stage Staged Execution) State
  const [schedulerModalOpen, setSchedulerModalOpen] = useState(false);
  const [rebalanceModalOpen, setRebalanceModalOpen] = useState(false);
  const [schedules, setSchedules] = useState<BulkOrderSchedule[]>([
    {
      id: 'sched-seed-1',
      name: 'BTC/USDT DCA Accumulation (5x)',
      symbol: 'BTC/USDT',
      strategyType: 'DCA',
      side: 'LONG',
      status: 'ACTIVE',
      totalStages: 5,
      completedStages: 2,
      intervalSeconds: 15,
      totalMarginAllocated: 2500,
      totalMarginFilled: 1000,
      averageFillPrice: 68320.0,
      leverage: 5,
      stopLossPct: 3.5,
      takeProfitPct: 8.0,
      createdAt: Date.now() - 30000,
      nextExecutionTime: Date.now() + 14000,
      stages: [
        {
          id: 'stage-seed-1',
          stageNumber: 1,
          symbol: 'BTC/USDT',
          margin: 500,
          leverage: 5,
          side: 'LONG',
          type: 'MARKET',
          delaySeconds: 0,
          status: 'FILLED',
          executedAt: Date.now() - 30000,
          fillPrice: 68250.0,
        },
        {
          id: 'stage-seed-2',
          stageNumber: 2,
          symbol: 'BTC/USDT',
          margin: 500,
          leverage: 5,
          side: 'LONG',
          type: 'MARKET',
          delaySeconds: 15,
          status: 'FILLED',
          executedAt: Date.now() - 15000,
          fillPrice: 68390.0,
        },
        {
          id: 'stage-seed-3',
          stageNumber: 3,
          symbol: 'BTC/USDT',
          margin: 500,
          leverage: 5,
          side: 'LONG',
          type: 'MARKET',
          delaySeconds: 30,
          status: 'PENDING',
        },
        {
          id: 'stage-seed-4',
          stageNumber: 4,
          symbol: 'BTC/USDT',
          margin: 500,
          leverage: 5,
          side: 'LONG',
          type: 'MARKET',
          delaySeconds: 45,
          status: 'PENDING',
        },
        {
          id: 'stage-seed-5',
          stageNumber: 5,
          symbol: 'BTC/USDT',
          margin: 500,
          leverage: 5,
          side: 'LONG',
          type: 'MARKET',
          delaySeconds: 60,
          status: 'PENDING',
        },
      ],
      notes: 'Automated 5-stage DCA Accumulation Plan',
    },
  ]);

  const handleDeploySchedule = (newSchedule: BulkOrderSchedule) => {
    setSchedules((prev) => [newSchedule, ...prev]);
  };

  const handleToggleScheduleStatus = (scheduleId: string) => {
    setSchedules((prev) =>
      prev.map((sch) => {
        if (sch.id === scheduleId) {
          const nextStatus = sch.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
          return {
            ...sch,
            status: nextStatus,
            nextExecutionTime:
              nextStatus === 'ACTIVE' ? Date.now() + sch.intervalSeconds * 1000 : sch.nextExecutionTime,
          };
        }
        return sch;
      })
    );
  };

  const handleCancelSchedule = (scheduleId: string) => {
    setSchedules((prev) =>
      prev.map((sch) => {
        if (sch.id === scheduleId) {
          return { ...sch, status: 'CANCELLED' };
        }
        return sch;
      })
    );
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    setSchedules((prev) => prev.filter((sch) => sch.id !== scheduleId));
  };

  // Sound toggle
  const toggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
  };

  // Helper to generate realistic order book depth around current price
  const updateOrderBook = useCallback(
    (price: number, decimals: number) => {
      const newBids: OrderBookEntry[] = [];
      const newAsks: OrderBookEntry[] = [];
      let bidCum = 0;
      let askCum = 0;

      const step = price * 0.0003;

      for (let i = 1; i <= 9; i++) {
        const bidPrice = Number((price - i * step).toFixed(decimals));
        const bidAmt = Number((Math.random() * 2.2 + 0.3).toFixed(3));
        bidCum += bidAmt;
        newBids.push({ price: bidPrice, amount: bidAmt, total: Number(bidCum.toFixed(3)) });

        const askPrice = Number((price + i * step).toFixed(decimals));
        const askAmt = Number((Math.random() * 2.2 + 0.3).toFixed(3));
        askCum += askAmt;
        newAsks.push({ price: askPrice, amount: askAmt, total: Number(askCum.toFixed(3)) });
      }

      setBids(newBids);
      setAsks(newAsks);
    },
    []
  );

  // Switch active asset
  const handleSelectAsset = (newAsset: Asset) => {
    setCurrentAsset(newAsset);
    const newCandles = generateInitialCandles(newAsset.price, 85, timeframe);
    setCandles(newCandles);
    updateOrderBook(newAsset.price, newAsset.decimals);
    setActiveSignal(null);
  };

  // Switch timeframe
  const handleChangeTimeframe = (tf: Timeframe) => {
    setTimeframe(tf);
    const newCandles = generateInitialCandles(currentAsset.price, 85, tf);
    setCandles(newCandles);
  };

  // Toggle indicators
  const handleToggleIndicator = (key: keyof IndicatorSettings) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Close a position manually
  const handleClosePosition = useCallback(
    (positionId: string, reason: TradeReason = 'MANUAL') => {
      setPositions((prev) => {
        const pos = prev.find((p) => p.id === positionId);
        if (!pos) return prev;

        const netPnl = pos.pnl;
        const roiPct = pos.pnlPct;

        // Return margin + net PnL back to portfolio cash
        setPortfolioBalance((b) => b + pos.margin + netPnl);

        // Record in trade history
        setTradeHistory((hist) => [
          {
            id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            symbol: pos.symbol,
            side: pos.side,
            entryPrice: pos.entryPrice,
            exitPrice: pos.currentPrice,
            quantity: pos.quantity,
            pnl: netPnl,
            pnlPct: roiPct,
            openedAt: pos.openedAt,
            closedAt: Date.now(),
            holdingDurationMs: Date.now() - (pos.openedAt || (Date.now() - 300000)),
            reason,
            agentName: pos.agentName,
            notes: pos.notes,
          },
          ...hist,
        ]);

        if (netPnl > 0) {
          playProfitSound();
        }

        return prev.filter((p) => p.id !== positionId);
      });
    },
    []
  );

  // Cancel an open limit order
  const handleCancelOrder = (orderId: string) => {
    setOrders((prev) => {
      const order = prev.find((o) => o.id === orderId);
      if (order) {
        const orderMargin = (order.quantity * order.price) / order.leverage;
        setPortfolioBalance((b) => b + orderMargin);
      }
      return prev.filter((o) => o.id !== orderId);
    });
  };

  // Place a new order
  const handlePlaceOrder = (orderData: {
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
  }) => {
    if (orderData.margin > portfolioBalance) return;

    const matchedAsset = assets.find((a) => a.symbol === orderData.symbol) || currentAsset;

    // For IOC and FOK Limit orders, test immediate execution against current market price
    if (orderData.type === 'LIMIT' && (orderData.duration === 'IOC' || orderData.duration === 'FOK')) {
      const canFillImmediately =
        (orderData.side === 'LONG' && orderData.price >= matchedAsset.price) ||
        (orderData.side === 'SHORT' && orderData.price <= matchedAsset.price);

      if (!canFillImmediately) {
        // Order cannot be filled immediately, so it is cancelled (killed) as per IOC/FOK rules
        return;
      }
    }

    // Deduct margin from available capital
    setPortfolioBalance((b) => b - orderData.margin);

    const positionValue = orderData.margin * orderData.leverage;
    const quantity = positionValue / orderData.price;

    const maintenanceMargin = 0.005;
    const liqPrice =
      orderData.side === 'LONG'
        ? orderData.price * (1 - 1 / orderData.leverage + maintenanceMargin)
        : orderData.price * (1 + 1 / orderData.leverage - maintenanceMargin);

    const initialTrailingStop = orderData.trailingStopPct
      ? orderData.side === 'LONG'
        ? orderData.price * (1 - orderData.trailingStopPct / 100)
        : orderData.price * (1 + orderData.trailingStopPct / 100)
      : undefined;

    // Check if limit order with IOC or FOK should immediately execute as a filled position
    const isImmediateFill =
      orderData.type === 'MARKET' ||
      ((orderData.duration === 'IOC' || orderData.duration === 'FOK') &&
        ((orderData.side === 'LONG' && orderData.price >= matchedAsset.price) ||
          (orderData.side === 'SHORT' && orderData.price <= matchedAsset.price)));

    if (isImmediateFill) {
      const execPrice = orderData.type === 'MARKET' ? orderData.price : matchedAsset.price;
      const newPos: Position = {
        id: `pos-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        symbol: orderData.symbol,
        side: orderData.side,
        entryPrice: execPrice,
        currentPrice: execPrice,
        quantity,
        leverage: orderData.leverage,
        margin: orderData.margin,
        pnl: 0,
        pnlPct: 0,
        stopLoss: orderData.stopLoss || (initialTrailingStop ? Number(initialTrailingStop.toFixed(currentAsset.decimals)) : undefined),
        takeProfit: orderData.takeProfit,
        trailingStopPct: orderData.trailingStopPct,
        trailingStopPrice: initialTrailingStop ? Number(initialTrailingStop.toFixed(currentAsset.decimals)) : undefined,
        highWaterMark: execPrice,
        liquidationPrice: Number(liqPrice.toFixed(currentAsset.decimals)),
        openedAt: Date.now(),
        agentId: orderData.agentId,
        agentName: orderData.agentName,
      };

      setPositions((prev) => [newPos, ...prev]);
      playOrderFilledSound();
    } else {
      // Limit order (GTC or DAY)
      const duration = orderData.duration || 'GTC';
      const expiresAt = duration === 'DAY' ? Date.now() + 24 * 60 * 60 * 1000 : undefined;

      const newOrder: Order = {
        id: `ord-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        symbol: orderData.symbol,
        side: orderData.side === 'LONG' ? 'BUY' : 'SELL',
        type: 'LIMIT',
        price: orderData.price,
        quantity,
        leverage: orderData.leverage,
        status: 'OPEN',
        createdAt: Date.now(),
        duration,
        expiresAt,
        stopLoss: orderData.stopLoss,
        takeProfit: orderData.takeProfit,
        trailingStopPct: orderData.trailingStopPct,
      };

      setOrders((prev) => [newOrder, ...prev]);
      playOrderFilledSound();
    }
  };

  // Place batch orders across multiple assets simultaneously
  const handlePlaceBatchOrders = (batchOrders: OrderPlacementPayload[]) => {
    if (!batchOrders || batchOrders.length === 0) {
      return { success: false, count: 0, error: 'Batch is empty' };
    }

    const totalRequiredMargin = batchOrders.reduce((acc, o) => acc + o.margin, 0);
    if (totalRequiredMargin > portfolioBalance) {
      return {
        success: false,
        count: 0,
        error: `Insufficient margin. Required: $${totalRequiredMargin.toLocaleString()}, Available: $${portfolioBalance.toLocaleString()}`,
      };
    }

    const newPositionsToAdd: Position[] = [];
    const newOrdersToAdd: Order[] = [];
    let marginDeducted = 0;

    batchOrders.forEach((orderData, index) => {
      if (orderData.margin <= 0) return;

      const matchedAsset = assets.find((a) => a.symbol === orderData.symbol) || currentAsset;
      const maintenanceMargin = 0.005;
      const liqPrice =
        orderData.side === 'LONG'
          ? orderData.price * (1 - 1 / orderData.leverage + maintenanceMargin)
          : orderData.price * (1 + 1 / orderData.leverage - maintenanceMargin);

      const positionValue = orderData.margin * orderData.leverage;
      const quantity = positionValue / orderData.price;

      const initialTrailingStop = orderData.trailingStopPct
        ? orderData.side === 'LONG'
          ? orderData.price * (1 - orderData.trailingStopPct / 100)
          : orderData.price * (1 + orderData.trailingStopPct / 100)
        : undefined;

      const isImmediateFill =
        orderData.type === 'MARKET' ||
        ((orderData.duration === 'IOC' || orderData.duration === 'FOK') &&
          ((orderData.side === 'LONG' && orderData.price >= matchedAsset.price) ||
            (orderData.side === 'SHORT' && orderData.price <= matchedAsset.price)));

      if (isImmediateFill) {
        const execPrice = orderData.type === 'MARKET' ? matchedAsset.price : orderData.price;
        marginDeducted += orderData.margin;

        newPositionsToAdd.push({
          id: `pos-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
          symbol: orderData.symbol,
          side: orderData.side,
          entryPrice: execPrice,
          currentPrice: execPrice,
          quantity,
          leverage: orderData.leverage,
          margin: orderData.margin,
          pnl: 0,
          pnlPct: 0,
          stopLoss: orderData.stopLoss || (initialTrailingStop ? Number(initialTrailingStop.toFixed(matchedAsset.decimals)) : undefined),
          takeProfit: orderData.takeProfit,
          trailingStopPct: orderData.trailingStopPct,
          trailingStopPrice: initialTrailingStop ? Number(initialTrailingStop.toFixed(matchedAsset.decimals)) : undefined,
          highWaterMark: execPrice,
          liquidationPrice: Number(liqPrice.toFixed(matchedAsset.decimals)),
          openedAt: Date.now() + index,
          agentId: orderData.agentId,
          agentName: orderData.agentName,
        });
      } else {
        // Resting limit order
        marginDeducted += orderData.margin;
        const duration = orderData.duration || 'GTC';
        const expiresAt = duration === 'DAY' ? Date.now() + 24 * 60 * 60 * 1000 : undefined;

        newOrdersToAdd.push({
          id: `ord-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
          symbol: orderData.symbol,
          side: orderData.side === 'LONG' ? 'BUY' : 'SELL',
          type: 'LIMIT',
          price: orderData.price,
          quantity,
          leverage: orderData.leverage,
          status: 'OPEN',
          createdAt: Date.now() + index,
          duration,
          expiresAt,
          stopLoss: orderData.stopLoss,
          takeProfit: orderData.takeProfit,
          trailingStopPct: orderData.trailingStopPct,
        });
      }
    });

    if (marginDeducted > 0) {
      setPortfolioBalance((b) => Math.max(0, b - marginDeducted));
      if (newPositionsToAdd.length > 0) {
        setPositions((prev) => [...newPositionsToAdd, ...prev]);
      }
      if (newOrdersToAdd.length > 0) {
        setOrders((prev) => [...newOrdersToAdd, ...prev]);
      }
      playOrderFilledSound();
    }

    return {
      success: true,
      count: newPositionsToAdd.length + newOrdersToAdd.length,
      positionsCreated: newPositionsToAdd.length,
      ordersCreated: newOrdersToAdd.length,
    };
  };

  // Reset simulated paper portfolio
  const handleResetPortfolio = () => {
    if (window.confirm('Reset simulated portfolio to $100,000 and close all open positions?')) {
      setPortfolioBalance(100000);
      setPositions([]);
      setOrders([]);
      setTradeHistory([]);
    }
  };

  // Execute a stage of a Bulk Order Schedule (DCA / Multi-Stage Ladder)
  const handleExecuteNextStageNow = useCallback(
    (scheduleId: string) => {
      setSchedules((prev) => {
        const sch = prev.find((s) => s.id === scheduleId);
        if (!sch || sch.status === 'COMPLETED' || sch.status === 'CANCELLED') return prev;

        const pendingStage = sch.stages.find((stg) => stg.status === 'PENDING');
        if (!pendingStage) return prev;

        const asset = assets.find((a) => a.symbol === sch.symbol) || currentAsset;
        if (pendingStage.margin > portfolioBalance) return prev;

        // Place the stage order into positions
        handlePlaceOrder({
          symbol: sch.symbol,
          side: sch.side,
          type: pendingStage.type,
          price: asset.price,
          margin: pendingStage.margin,
          leverage: pendingStage.leverage,
          stopLoss: sch.stopLossPct
            ? Number(
                (sch.side === 'LONG'
                  ? asset.price * (1 - sch.stopLossPct / 100)
                  : asset.price * (1 + sch.stopLossPct / 100)
                ).toFixed(asset.decimals)
              )
            : undefined,
          takeProfit: sch.takeProfitPct
            ? Number(
                (sch.side === 'LONG'
                  ? asset.price * (1 + sch.takeProfitPct / 100)
                  : asset.price * (1 - sch.takeProfitPct / 100)
                ).toFixed(asset.decimals)
              )
            : undefined,
        });

        const nextCompleted = sch.completedStages + 1;
        const nextMarginFilled = sch.totalMarginFilled + pendingStage.margin;
        const prevCost = (sch.averageFillPrice || asset.price) * sch.totalMarginFilled;
        const newCost = prevCost + asset.price * pendingStage.margin;
        const nextAvgPrice = Number((newCost / nextMarginFilled).toFixed(asset.decimals));
        const isFinished = nextCompleted >= sch.totalStages;

        const updatedStages = sch.stages.map((stg) =>
          stg.id === pendingStage.id
            ? {
                ...stg,
                status: 'FILLED' as const,
                executedAt: Date.now(),
                fillPrice: asset.price,
              }
            : stg
        );

        return prev.map((s) =>
          s.id === scheduleId
            ? {
                ...s,
                completedStages: nextCompleted,
                totalMarginFilled: nextMarginFilled,
                averageFillPrice: nextAvgPrice,
                status: isFinished ? ('COMPLETED' as const) : s.status,
                nextExecutionTime: isFinished ? 0 : Date.now() + sch.intervalSeconds * 1000,
                stages: updatedStages,
              }
            : s
        );
      });
    },
    [assets, currentAsset, handlePlaceOrder, portfolioBalance]
  );

  // Autonomous Agent Status Toggle
  const handleToggleAgentStatus = (agentId: string) => {
    setAgents((prev) =>
      prev.map((agent) => {
        if (agent.id === agentId) {
          const nextStatus = agent.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
          return {
            ...agent,
            status: nextStatus,
            recentLogs: [
              {
                id: `log-${Date.now()}`,
                time: 'Just now',
                message: `Agent status changed to ${nextStatus}.`,
                type: nextStatus === 'ACTIVE' ? 'trade' : 'alert',
              },
              ...agent.recentLogs,
            ],
          };
        }
        return agent;
      })
    );
  };

  // Add custom AI compiled agent
  const handleCreateCustomAgent = (newAgent: AutonomousAgent) => {
    setAgents((prev) => [newAgent, ...prev]);
    playAlertSound();
  };

  // Run immediate agent scan & simulated trade trigger
  const handleRunAgentCycleNow = (agentId: string) => {
    const targetAgent = agents.find((a) => a.id === agentId);
    if (!targetAgent) return;

    const matchedAsset = assets.find((a) => a.symbol === targetAgent.targetPair) || currentAsset;
    const isLong = Math.random() > 0.45;
    const margin = Math.min(portfolioBalance * 0.05, 1500);

    const price = matchedAsset.price;
    const stopLoss = isLong
      ? price * (1 - targetAgent.executionRules.stopLossPct / 100)
      : price * (1 + targetAgent.executionRules.stopLossPct / 100);
    const takeProfit = isLong
      ? price * (1 + targetAgent.executionRules.takeProfitPct / 100)
      : price * (1 - targetAgent.executionRules.takeProfitPct / 100);

    handlePlaceOrder({
      symbol: matchedAsset.symbol,
      side: isLong ? 'LONG' : 'SHORT',
      type: 'MARKET',
      price,
      margin,
      leverage: targetAgent.executionRules.leverage,
      stopLoss: Number(stopLoss.toFixed(matchedAsset.decimals)),
      takeProfit: Number(takeProfit.toFixed(matchedAsset.decimals)),
      agentId: targetAgent.id,
      agentName: targetAgent.name,
    });

    setAgents((prev) =>
      prev.map((a) => {
        if (a.id === agentId) {
          return {
            ...a,
            totalTrades: a.totalTrades + 1,
            recentLogs: [
              {
                id: `log-${Date.now()}`,
                time: 'Just now',
                message: `Executed automated ${isLong ? 'LONG' : 'SHORT'} on ${matchedAsset.symbol} @ $${price.toFixed(matchedAsset.decimals)} (${targetAgent.executionRules.leverage}x).`,
                type: 'trade',
              },
              ...a.recentLogs.slice(0, 8),
            ],
          };
        }
        return a;
      })
    );
  };

  // Fetch or Refresh AI Alpha Signal
  const handleFetchAISignal = useCallback(async () => {
    setIsScanningSignal(true);
    try {
      const response = await fetch('/api/ai/analyze-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: currentAsset.symbol,
          currentPrice: currentAsset.price,
          change24h: currentAsset.change24h,
          high24h: currentAsset.high24h,
          low24h: currentAsset.low24h,
          timeframe,
          rsi: 54.2,
          ema9: currentAsset.price * 1.002,
          ema21: currentAsset.price * 0.998,
          ema50: currentAsset.price * 0.992,
        }),
      });

      const data = await response.json();
      setActiveSignal(data);
    } catch (err) {
      console.error('Failed to fetch AI signal:', err);
    } finally {
      setIsScanningSignal(false);
    }
  }, [currentAsset, timeframe]);

  // Initial order book and sentiment load
  useEffect(() => {
    updateOrderBook(currentAsset.price, currentAsset.decimals);

    fetch('/api/ai/market-sentiment', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => setMarketSentiment(data))
      .catch((err) => console.error(err));
  }, []);

  // 4. Real-time Market Simulation Tick Engine
  useEffect(() => {
    const tickInterval = setInterval(() => {
      // 1. Perturb asset prices with realistic micro-volatility
      setAssets((prevAssets) =>
        prevAssets.map((asset) => {
          const volatility = asset.price * 0.0006;
          const delta = (Math.random() - 0.495) * volatility;
          const nextPrice = Math.max(0.0001, asset.price + delta);
          const nextHigh = Math.max(asset.high24h, nextPrice);
          const nextLow = Math.min(asset.low24h, nextPrice);

          if (asset.symbol === currentAsset.symbol) {
            setPriceTickDirection(delta >= 0 ? 'up' : 'down');
            setTimeout(() => setPriceTickDirection('none'), 350);
          }

          return {
            ...asset,
            price: Number(nextPrice.toFixed(asset.decimals)),
            high24h: Number(nextHigh.toFixed(asset.decimals)),
            low24h: Number(nextLow.toFixed(asset.decimals)),
          };
        })
      );

      // 2. Update current active asset price & last candle
      const curr = assets.find((a) => a.symbol === currentAsset.symbol);
      if (curr) {
        setCurrentAsset(curr);

        // Update candle
        setCandles((prevCandles) => {
          if (prevCandles.length === 0) return prevCandles;
          const updated = [...prevCandles];
          const lastIndex = updated.length - 1;
          const last = { ...updated[lastIndex] };

          last.close = curr.price;
          last.high = Math.max(last.high, curr.price);
          last.low = Math.min(last.low, curr.price);
          last.volume += Math.floor(Math.random() * 450);

          updated[lastIndex] = last;
          return updated;
        });

        // Update order book occasionally
        if (Math.random() > 0.4) {
          updateOrderBook(curr.price, curr.decimals);
        }

        // Add recent trade tape entry
        if (Math.random() > 0.5) {
          const isBuy = Math.random() > 0.48;
          const tradeAmt = Number((Math.random() * 1.5 + 0.1).toFixed(3));
          setRecentTrades((prev) => [
            {
              id: `tr-${Date.now()}-${Math.random()}`,
              price: curr.price,
              amount: tradeAmt,
              side: isBuy ? 'BUY' : 'SELL',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            },
            ...prev.slice(0, 15),
          ]);
        }
      }

      // 3. Evaluate open positions PnL, TP, SL, Liquidation
      setPositions((prevPositions) => {
        return prevPositions.map((pos) => {
          const matched = assets.find((a) => a.symbol === pos.symbol) || currentAsset;
          const currentPrice = matched.price;

          const priceDiff = pos.side === 'LONG' ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice;
          const pnl = priceDiff * pos.quantity;
          const pnlPct = (pnl / pos.margin) * 100;

          // Check Take Profit trigger
          if (pos.takeProfit) {
            const hitTP = pos.side === 'LONG' ? currentPrice >= pos.takeProfit : currentPrice <= pos.takeProfit;
            if (hitTP) {
              setTimeout(() => handleClosePosition(pos.id, 'TAKE_PROFIT'), 50);
            }
          }

          let updatedTrailingPrice = pos.trailingStopPrice;
          let updatedHighWaterMark = pos.highWaterMark || pos.entryPrice;

          // Trailing Stop-Loss dynamic ratchet
          if (pos.trailingStopPct) {
            if (pos.side === 'LONG') {
              if (currentPrice > updatedHighWaterMark) {
                updatedHighWaterMark = currentPrice;
                const newTrailingStop = currentPrice * (1 - pos.trailingStopPct / 100);
                if (!updatedTrailingPrice || newTrailingStop > updatedTrailingPrice) {
                  updatedTrailingPrice = Number(newTrailingStop.toFixed(matched.decimals));
                }
              }
              // Check Trailing Stop Trigger
              if (updatedTrailingPrice && currentPrice <= updatedTrailingPrice) {
                setTimeout(() => handleClosePosition(pos.id, 'TRAILING_STOP'), 50);
              }
            } else {
              // SHORT position
              if (currentPrice < updatedHighWaterMark) {
                updatedHighWaterMark = currentPrice;
                const newTrailingStop = currentPrice * (1 + pos.trailingStopPct / 100);
                if (!updatedTrailingPrice || newTrailingStop < updatedTrailingPrice) {
                  updatedTrailingPrice = Number(newTrailingStop.toFixed(matched.decimals));
                }
              }
              // Check Trailing Stop Trigger
              if (updatedTrailingPrice && currentPrice >= updatedTrailingPrice) {
                setTimeout(() => handleClosePosition(pos.id, 'TRAILING_STOP'), 50);
              }
            }
          }

          // Check Standard Stop Loss trigger (if not superseded by trailing stop)
          const effectiveStop = updatedTrailingPrice || pos.stopLoss;
          if (effectiveStop && !pos.trailingStopPct) {
            const hitSL = pos.side === 'LONG' ? currentPrice <= effectiveStop : currentPrice >= effectiveStop;
            if (hitSL) {
              setTimeout(() => handleClosePosition(pos.id, 'STOP_LOSS'), 50);
            }
          }

          // Check Liquidation
          const hitLiq = pos.side === 'LONG' ? currentPrice <= pos.liquidationPrice : currentPrice >= pos.liquidationPrice;
          if (hitLiq) {
            setTimeout(() => handleClosePosition(pos.id, 'STOP_LOSS'), 50);
          }

          return {
            ...pos,
            currentPrice,
            pnl: Number(pnl.toFixed(2)),
            pnlPct: Number(pnlPct.toFixed(2)),
            stopLoss: effectiveStop,
            trailingStopPrice: updatedTrailingPrice,
            highWaterMark: updatedHighWaterMark,
          };
        });
      });

      // 4. Check Limit Orders for filling and Day expiry
      setOrders((prevOrders) => {
        const remaining: Order[] = [];
        const now = Date.now();

        prevOrders.forEach((ord) => {
          // Check DAY order expiry (24 hours)
          if (ord.duration === 'DAY' && ord.expiresAt && now >= ord.expiresAt) {
            // Auto-cancel expired order and refund margin
            const orderMargin = (ord.quantity * ord.price) / ord.leverage;
            setPortfolioBalance((b) => b + orderMargin);
            return;
          }

          const asset = assets.find((a) => a.symbol === ord.symbol) || currentAsset;
          const shouldFill =
            (ord.side === 'BUY' && asset.price <= ord.price) ||
            (ord.side === 'SELL' && asset.price >= ord.price);

          if (shouldFill) {
            // Fill limit order into active position
            handlePlaceOrder({
              symbol: ord.symbol,
              side: ord.side === 'BUY' ? 'LONG' : 'SHORT',
              type: 'MARKET',
              price: ord.price,
              margin: (ord.quantity * ord.price) / ord.leverage,
              leverage: ord.leverage,
              stopLoss: ord.stopLoss,
              takeProfit: ord.takeProfit,
              trailingStopPct: ord.trailingStopPct,
            });
          } else {
            remaining.push(ord);
          }
        });
        return remaining;
      });

      // 5. Evaluate Price Alerts
      setPriceAlerts((prevAlerts) => {
        let alertFired: PriceAlert | null = null;
        let alertFiredPrice = 0;

        const updated = prevAlerts.map((alt) => {
          if (alt.status !== 'ACTIVE') return alt;

          const matched = assets.find((a) => a.symbol === alt.symbol) || currentAsset;
          const currentPrice = matched.price;

          const hitAbove = alt.condition === 'ABOVE' && currentPrice >= alt.targetPrice;
          const hitBelow = alt.condition === 'BELOW' && currentPrice <= alt.targetPrice;

          if (hitAbove || hitBelow) {
            alertFired = alt;
            alertFiredPrice = currentPrice;
            return {
              ...alt,
              status: 'TRIGGERED' as const,
              triggeredAt: Date.now(),
            };
          }
          return alt;
        });

        if (alertFired) {
          const fired: PriceAlert = alertFired;
          if (fired.soundEnabled !== false) {
            playAlertSound();
          }
          setTriggeredAlertBanner({
            id: fired.id,
            symbol: fired.symbol,
            targetPrice: fired.targetPrice,
            condition: fired.condition,
            currentPrice: alertFiredPrice,
            note: fired.note,
          });
        }

        return updated;
      });
    }, 1300);

    return () => clearInterval(tickInterval);
  }, [assets, currentAsset, handleClosePosition, updateOrderBook]);

  // 5. Periodic Autonomous Agent Cycle
  useEffect(() => {
    const agentInterval = setInterval(() => {
      const activeBots = agents.filter((a) => a.status === 'ACTIVE');
      if (activeBots.length === 0) return;

      // Randomly pick one active bot to evaluate
      const bot = activeBots[Math.floor(Math.random() * activeBots.length)];

      // 30% chance to trigger an automated paper trade if no excessive exposure
      if (positions.length < 5 && Math.random() < 0.35 && portfolioBalance > 5000) {
        handleRunAgentCycleNow(bot.id);
      }
    }, 14000);

    return () => clearInterval(agentInterval);
  }, [agents, positions.length, portfolioBalance]);

  // 6. Real-time Bulk Order Scheduler Execution Engine
  useEffect(() => {
    const schedulerInterval = setInterval(() => {
      schedules.forEach((sch) => {
        if (sch.status === 'ACTIVE' && Date.now() >= sch.nextExecutionTime) {
          handleExecuteNextStageNow(sch.id);
        }
      });
    }, 1000);

    return () => clearInterval(schedulerInterval);
  }, [schedules, handleExecuteNextStageNow]);

  // Compute total unrealized PnL
  const totalUnrealizedPnL = positions.reduce((acc, p) => acc + p.pnl, 0);
  const activeAgentsCount = agents.filter((a) => a.status === 'ACTIVE').length;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#080b11] text-slate-100 font-sans overflow-hidden">
      {/* Top Header */}
      <Header
        assets={assets}
        currentAsset={currentAsset}
        onSelectAsset={handleSelectAsset}
        portfolioBalance={portfolioBalance}
        unrealizedPnL={totalUnrealizedPnL}
        openPositionsCount={positions.length}
        activeAgentsCount={activeAgentsCount}
        onOpenSignalModal={() => {
          setSignalModalOpen(true);
          if (!activeSignal) handleFetchAISignal();
        }}
        onOpenAgentModal={() => setAgentModalOpen(true)}
        onOpenSentimentModal={() => setSentimentModalOpen(true)}
        onOpenRiskHeatmap={() => setRiskHeatmapModalOpen(true)}
        onOpenMarketScanner={() => setMarketScannerModalOpen(true)}
        onOpenCorrelationModal={() => setCorrelationModalOpen(true)}
        onOpenTradeAnalysis={() => setTradeAnalysisModalOpen(true)}
        onOpenBulkScheduler={() => setSchedulerModalOpen(true)}
        activeSchedulesCount={schedules.filter((s) => s.status === 'ACTIVE').length}
        onOpenRebalanceModal={() => setRebalanceModalOpen(true)}
        onToggleCopilot={() => setCopilotOpen(!copilotOpen)}
        copilotOpen={copilotOpen}
        soundEnabled={soundActive}
        onToggleSound={toggleSound}
        onResetPortfolio={handleResetPortfolio}
      />

      {/* Real-Time Market News Ticker with Google Search Grounding */}
      <MarketNews
        onSelectAsset={(symbolOrCat) => {
          const match = assets.find((a) => a.symbol.toUpperCase().includes(symbolOrCat.toUpperCase()));
          if (match) handleSelectAsset(match);
        }}
      />

      {/* Market Bar */}
      <MarketBar
        currentAsset={currentAsset}
        assets={assets}
        onSelectAsset={handleSelectAsset}
        timeframe={timeframe}
        onChangeTimeframe={handleChangeTimeframe}
        indicators={indicators}
        onToggleIndicator={handleToggleIndicator}
        priceTickDirection={priceTickDirection}
        chartLayout={chartLayout}
        onChangeLayout={setChartLayout}
      />

      {/* Main Terminal Grid Area */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden relative">
        {/* Left & Middle: Candlestick Chart and Lower Positions Area */}
        <div className="col-span-12 lg:col-span-9 flex flex-col h-full border-r border-slate-800/80 overflow-hidden">
          {/* Candlestick & Indicator Chart / Multi-Chart Grid Workspace */}
          <div className="flex-1 min-h-[340px] relative">
            <MultiChartArea
              layout={chartLayout}
              onChangeLayout={setChartLayout}
              currentAsset={currentAsset}
              assets={assets}
              onSelectAsset={handleSelectAsset}
              timeframe={timeframe}
              indicators={indicators}
              positions={positions}
              primaryCandles={candles}
            />
          </div>

          {/* Lower Positions & History Dock */}
          <div className="h-72 min-h-[250px]">
            <PositionsTable
              positions={positions}
              orders={orders}
              tradeHistory={tradeHistory}
              assets={assets}
              portfolioBalance={portfolioBalance}
              onClosePosition={(id) => handleClosePosition(id, 'MANUAL')}
              onCancelOrder={handleCancelOrder}
              onSelectAsset={handleSelectAsset}
              onPlaceOrder={handlePlaceOrder}
              onPlaceBatchOrders={handlePlaceBatchOrders}
            />
          </div>
        </div>

        {/* Right Column: Order Book & Trading Execution Panel */}
        <div className="hidden lg:grid col-span-3 grid-rows-12 h-full overflow-hidden bg-[#0d111a]">
          {/* Order Book Depth Ladder */}
          <div className="row-span-5 overflow-hidden border-b border-slate-800">
            <OrderBook
              currentPrice={currentAsset.price}
              decimals={currentAsset.decimals}
              bids={bids}
              asks={asks}
              recentTrades={recentTrades}
              onSelectPrice={(price) => setSelectedOrderBookPrice(price)}
            />
          </div>

          {/* Trading Form Panel */}
          <div className="row-span-7 overflow-y-auto">
            <TradingPanel
              currentAsset={currentAsset}
              assets={assets}
              portfolioBalance={portfolioBalance}
              activeSignal={activeSignal}
              selectedOrderBookPrice={selectedOrderBookPrice}
              onPlaceOrder={handlePlaceOrder}
              onPlaceBatchOrders={handlePlaceBatchOrders}
              priceAlerts={priceAlerts}
              onCreateAlert={handleCreateAlert}
              onDeleteAlert={handleDeleteAlert}
              onToggleAlertStatus={handleToggleAlertStatus}
              schedules={schedules}
              onDeploySchedule={handleDeploySchedule}
              onToggleScheduleStatus={handleToggleScheduleStatus}
              onExecuteNextStageNow={handleExecuteNextStageNow}
              onOpenFullSchedulerModal={() => setSchedulerModalOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Autonomous AI Agents Hub Modal */}
      <AIAgentHub
        isOpen={agentModalOpen}
        onClose={() => setAgentModalOpen(false)}
        agents={agents}
        currentAsset={currentAsset}
        onToggleAgentStatus={handleToggleAgentStatus}
        onCreateCustomAgent={handleCreateCustomAgent}
        onRunAgentCycleNow={handleRunAgentCycleNow}
      />

      {/* AI Alpha Signal Scanner Modal */}
      <AISignalModal
        isOpen={signalModalOpen}
        onClose={() => setSignalModalOpen(false)}
        currentAsset={currentAsset}
        candles={candles}
        activeSignal={activeSignal}
        onRefreshSignal={handleFetchAISignal}
        onExecuteSignal={(signal) => {
          handlePlaceOrder({
            symbol: currentAsset.symbol,
            side: signal.action.includes('BUY') ? 'LONG' : 'SHORT',
            type: 'MARKET',
            price: currentAsset.price,
            margin: Math.min(portfolioBalance * 0.1, 2000),
            leverage: signal.suggestedLeverage || 5,
            stopLoss: signal.stopLoss,
            takeProfit: signal.targetPrice1,
          });
        }}
        isLoading={isScanningSignal}
      />

      {/* Market Sentiment & Macro Modal */}
      <MarketSentimentModal
        isOpen={sentimentModalOpen}
        onClose={() => setSentimentModalOpen(false)}
        sentiment={marketSentiment}
        onRefresh={() => {
          fetch('/api/ai/market-sentiment', { method: 'POST' })
            .then((r) => r.json())
            .then((d) => setMarketSentiment(d));
        }}
        isLoading={false}
      />

      {/* Visual Risk Heatmap Modal */}
      <RiskHeatmapModal
        isOpen={riskHeatmapModalOpen}
        onClose={() => setRiskHeatmapModalOpen(false)}
        positions={positions}
        portfolioBalance={portfolioBalance}
        assets={assets}
        onSelectAsset={handleSelectAsset}
      />

      {/* Market Volatility Scanner Modal */}
      <MarketScannerModal
        isOpen={marketScannerModalOpen}
        onClose={() => setMarketScannerModalOpen(false)}
        assets={assets}
        currentAsset={currentAsset}
        onSelectAsset={handleSelectAsset}
      />

      {/* AI Copilot Drawer */}
      <AICopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        currentAsset={currentAsset}
        positions={positions}
        portfolioBalance={portfolioBalance}
      />

      {/* Cross-Asset Correlation Matrix & Diversification Heatmap Modal */}
      <AssetCorrelationModal
        isOpen={correlationModalOpen}
        onClose={() => setCorrelationModalOpen(false)}
        assets={assets}
        positions={positions}
        onSelectAsset={handleSelectAsset}
      />

      {/* Recharts Trade Outcome Analysis Dashboard Modal */}
      <TradeAnalysisModal
        isOpen={tradeAnalysisModalOpen}
        onClose={() => setTradeAnalysisModalOpen(false)}
        tradeHistory={tradeHistory}
        assets={assets}
      />

      {/* Bulk Order Scheduler & Staged TWAP/DCA Engine Modal */}
      <BulkOrderSchedulerModal
        isOpen={schedulerModalOpen}
        onClose={() => setSchedulerModalOpen(false)}
        schedules={schedules}
        currentAsset={currentAsset}
        assets={assets}
        portfolioBalance={portfolioBalance}
        onDeploySchedule={handleDeploySchedule}
        onToggleScheduleStatus={handleToggleScheduleStatus}
        onExecuteNextStageNow={handleExecuteNextStageNow}
        onCancelSchedule={handleCancelSchedule}
        onDeleteSchedule={handleDeleteSchedule}
      />

      {/* Portfolio Equal-Weight & Risk-Parity Rebalancer Utility Modal */}
      <PortfolioRebalanceModal
        isOpen={rebalanceModalOpen}
        onClose={() => setRebalanceModalOpen(false)}
        positions={positions}
        assets={assets}
        portfolioBalance={portfolioBalance}
        onPlaceOrder={handlePlaceOrder}
        onPlaceBatchOrders={handlePlaceBatchOrders}
        onClosePosition={handleClosePosition}
        onSelectAsset={handleSelectAsset}
      />

      {/* Floating Price Alert Notification Banner */}
      {triggeredAlertBanner && (
        <div className="fixed top-14 right-4 z-50 max-w-sm w-full bg-[#0d131f] border-2 border-amber-500 shadow-2xl shadow-amber-500/20 rounded-xl p-3.5 flex items-start gap-3 animate-pulse">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
            <Bell className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">{triggeredAlertBanner.symbol} Alert Triggered!</span>
              <button
                onClick={() => setTriggeredAlertBanner(null)}
                className="text-slate-400 hover:text-white text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <p className="text-amber-300 font-semibold mt-1">
              Price {triggeredAlertBanner.condition === 'ABOVE' ? 'climbed above' : 'dropped below'} $
              {triggeredAlertBanner.targetPrice.toLocaleString()} (Mark: $
              {triggeredAlertBanner.currentPrice.toLocaleString()})
            </p>
            {triggeredAlertBanner.note && (
              <p className="text-slate-300 text-[11px] mt-0.5 truncate font-sans">
                {triggeredAlertBanner.note}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
