import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Activity,
  Shield,
  Clock,
  Layers,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  AlertCircle,
  Zap,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Bell,
  Volume2,
  VolumeX,
  Radio,
  Receipt,
  X,
  Info,
  HelpCircle,
  Scale,
  CalendarClock,
} from 'lucide-react';
import {
  Asset,
  AISignal,
  OrderDuration,
  OrderPlacementPayload,
  BatchOrderLeg,
  PriceAlert,
  BulkOrderSchedule,
  ScheduledStage,
} from '../types';

interface TradingPanelProps {
  currentAsset: Asset;
  assets?: Asset[];
  portfolioBalance: number;
  activeSignal: AISignal | null;
  selectedOrderBookPrice?: number | null;
  onPlaceOrder: (orderData: OrderPlacementPayload) => void;
  onPlaceBatchOrders?: (orders: OrderPlacementPayload[]) => { success: boolean; count: number; error?: string };
  priceAlerts?: PriceAlert[];
  onCreateAlert?: (alertData: Omit<PriceAlert, 'id' | 'createdAt' | 'status'>) => void;
  onDeleteAlert?: (alertId: string) => void;
  onToggleAlertStatus?: (alertId: string) => void;
  schedules?: BulkOrderSchedule[];
  onDeploySchedule?: (schedule: BulkOrderSchedule) => void;
  onToggleScheduleStatus?: (scheduleId: string) => void;
  onExecuteNextStageNow?: (scheduleId: string) => void;
  onOpenFullSchedulerModal?: () => void;
}

export const TradingPanel: React.FC<TradingPanelProps> = ({
  currentAsset,
  assets = [],
  portfolioBalance,
  activeSignal,
  selectedOrderBookPrice,
  onPlaceOrder,
  onPlaceBatchOrders,
  priceAlerts = [],
  onCreateAlert,
  onDeleteAlert,
  onToggleAlertStatus,
  schedules = [],
  onDeploySchedule,
  onToggleScheduleStatus,
  onExecuteNextStageNow,
  onOpenFullSchedulerModal,
}) => {
  // Mode: Single Order vs Batch Basket vs Price Alerts vs DCA Scheduler
  const [tradingMode, setTradingMode] = useState<'single' | 'batch' | 'alerts' | 'scheduler'>('single');

  // Quick DCA Scheduler Form State
  const [dcaTotalMargin, setDcaTotalMargin] = useState<number>(1000);
  const [dcaStages, setDcaStages] = useState<number>(5);
  const [dcaInterval, setDcaInterval] = useState<number>(10);
  const [dcaSide, setDcaSide] = useState<'LONG' | 'SHORT'>('LONG');

  const handleDeployQuickDCA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onDeploySchedule) return;
    if (dcaTotalMargin <= 0 || dcaTotalMargin > portfolioBalance) return;

    const trancheMargin = Math.round(dcaTotalMargin / dcaStages);
    const stages: ScheduledStage[] = [];
    for (let i = 0; i < dcaStages; i++) {
      stages.push({
        id: `dca-stage-${Date.now()}-${i + 1}`,
        stageNumber: i + 1,
        symbol: currentAsset.symbol,
        margin: trancheMargin,
        leverage: 5,
        side: dcaSide,
        type: 'MARKET',
        delaySeconds: i * dcaInterval,
        status: 'PENDING',
      });
    }

    const newSchedule: BulkOrderSchedule = {
      id: `sched-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${currentAsset.symbol.split('/')[0]} DCA Accumulation (${dcaStages}x)`,
      symbol: currentAsset.symbol,
      strategyType: 'DCA',
      side: dcaSide,
      status: 'ACTIVE',
      totalStages: dcaStages,
      completedStages: 0,
      intervalSeconds: dcaInterval,
      totalMarginAllocated: dcaTotalMargin,
      totalMarginFilled: 0,
      leverage: 5,
      createdAt: Date.now(),
      nextExecutionTime: Date.now() + 1000,
      stages,
      notes: `Quick DCA deployed from trading panel`,
    };

    onDeploySchedule(newSchedule);
  };

  // Single Order State
  const [side, setSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState<number>(currentAsset.price);
  const [marginAmount, setMarginAmount] = useState<number>(1000);
  const [leverage, setLeverage] = useState<number>(5);
  const [feeRate, setFeeRate] = useState<number>(0.1); // 0.1% flat fee commission
  const [feeDetailModalOpen, setFeeDetailModalOpen] = useState<boolean>(false);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [enableTrailingStop, setEnableTrailingStop] = useState<boolean>(false);
  const [trailingStopPct, setTrailingStopPct] = useState<number>(1.0);
  const [orderDuration, setOrderDuration] = useState<OrderDuration>('GTC');

  // Batch Orders State
  const defaultSecondSymbol = assets.find((a) => a.symbol !== currentAsset.symbol)?.symbol || 'ETH/USDT';
  const defaultSecondPrice = assets.find((a) => a.symbol === defaultSecondSymbol)?.price || 3500;

  const [batchLegs, setBatchLegs] = useState<BatchOrderLeg[]>([
    {
      id: `leg-1`,
      symbol: currentAsset.symbol,
      side: 'LONG',
      type: 'MARKET',
      price: currentAsset.price,
      margin: 500,
      leverage: 5,
      enableTrailingStop: false,
      trailingStopPct: 1.0,
      duration: 'GTC',
    },
    {
      id: `leg-2`,
      symbol: defaultSecondSymbol,
      side: 'LONG',
      type: 'MARKET',
      price: defaultSecondPrice,
      margin: 500,
      leverage: 5,
      enableTrailingStop: false,
      trailingStopPct: 1.0,
      duration: 'GTC',
    },
  ]);

  const [expandedLegs, setExpandedLegs] = useState<Record<string, boolean>>({});
  const [batchFeedback, setBatchFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Price Alerts Form State
  const [alertSymbol, setAlertSymbol] = useState<string>(currentAsset.symbol);
  const [alertCondition, setAlertCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [alertTargetPrice, setAlertTargetPrice] = useState<number>(
    Number((currentAsset.price * 1.02).toFixed(currentAsset.decimals))
  );
  const [alertNote, setAlertNote] = useState<string>('');
  const [alertSound, setAlertSound] = useState<boolean>(true);
  const [alertFilter, setAlertFilter] = useState<'all' | 'active' | 'triggered'>('all');
  const [alertSuccessMsg, setAlertSuccessMsg] = useState<string | null>(null);

  // Sync alert target price when switching asset or condition
  const selectedAlertAsset = assets.find((a) => a.symbol === alertSymbol) || currentAsset;

  // Auto-dismiss batch feedback
  useEffect(() => {
    if (batchFeedback) {
      const timer = setTimeout(() => setBatchFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [batchFeedback]);

  // Auto-dismiss alert success message
  useEffect(() => {
    if (alertSuccessMsg) {
      const timer = setTimeout(() => setAlertSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [alertSuccessMsg]);

  // Update limit price if user clicks order book price (in single mode)
  useEffect(() => {
    if (selectedOrderBookPrice && tradingMode === 'single') {
      setLimitPrice(selectedOrderBookPrice);
      setOrderType('LIMIT');
    }
  }, [selectedOrderBookPrice, tradingMode]);

  // Sync limit price with current asset price when asset changes
  useEffect(() => {
    setLimitPrice(currentAsset.price);
  }, [currentAsset.symbol]);

  // Single Order Calculations
  const effectivePrice = orderType === 'MARKET' ? currentAsset.price : limitPrice;
  const positionValue = marginAmount * leverage;
  const quantity = effectivePrice > 0 ? positionValue / effectivePrice : 0;

  // Estimated Fees & Cost Breakdown Calculations
  const baseCommissionFee = positionValue * (feeRate / 100);
  const estimatedEntryFee = baseCommissionFee;
  const estimatedExitFee = positionValue * (feeRate / 100);
  const estimatedRoundTripFee = estimatedEntryFee + estimatedExitFee;

  // Slippage estimate: for MARKET orders, calculated from position size relative to book liquidity & asset spread
  // For LIMIT orders, slippage is 0.00% (guaranteed price execution)
  const isMarketOrder = orderType === 'MARKET';
  const estimatedSlippagePct = isMarketOrder
    ? Math.max(0.015, Math.min(0.25, (positionValue / 75000) * 0.05 + (currentAsset.spread / currentAsset.price) * 100))
    : 0;
  const estimatedSlippageCost = positionValue * (estimatedSlippagePct / 100);

  // Liquidity node clearing & network settlement buffer
  const liquiditySettlementFee = positionValue > 0 ? Math.max(0.15, Math.min(1.50, positionValue * 0.00004)) : 0;

  // Total Immediate Execution Cost
  const totalImmediateCost = baseCommissionFee + estimatedSlippageCost + liquiditySettlementFee;

  // Projected Round-Trip Cost (Entry + Projected Exit)
  const projectedExitCommission = positionValue * (feeRate / 100);
  const projectedExitSlippage = estimatedSlippageCost;
  const totalRoundTripProjectedCost = totalImmediateCost + projectedExitCommission + projectedExitSlippage;

  // Effective Drag % on Margin Collateral
  const feeImpactOnMarginPct = marginAmount > 0 ? (estimatedEntryFee / marginAmount) * 100 : 0;
  const roundTripMarginImpactPct = marginAmount > 0 ? (estimatedRoundTripFee / marginAmount) * 100 : 0;
  const marginDragPct = marginAmount > 0 ? (totalImmediateCost / marginAmount) * 100 : 0;
  const roundTripMarginDragPct = marginAmount > 0 ? (totalRoundTripProjectedCost / marginAmount) * 100 : 0;

  // Break-even price movement required
  const breakEvenMovementPct = feeRate * 2;
  const breakEvenPriceDelta = effectivePrice * (breakEvenMovementPct / 100);
  const totalBreakEvenPct = positionValue > 0 ? (totalRoundTripProjectedCost / positionValue) * 100 : 0;
  const totalBreakEvenDollarDelta = effectivePrice * (totalBreakEvenPct / 100);

  // Single Trailing stop metrics
  const trailingDistance = (effectivePrice * trailingStopPct) / 100;
  const initialTrailingStopPrice =
    side === 'LONG'
      ? effectivePrice - trailingDistance
      : effectivePrice + trailingDistance;

  // Calculate estimated liquidation price for single order
  const maintenanceMarginRate = 0.005; // 0.5%
  const liquidationPrice =
    side === 'LONG'
      ? effectivePrice * (1 - 1 / leverage + maintenanceMarginRate)
      : effectivePrice * (1 + 1 / leverage - maintenanceMarginRate);

  const handlePercentageMargin = (pct: number) => {
    const calculated = (portfolioBalance * pct) / 100;
    setMarginAmount(Math.max(10, Math.floor(calculated)));
  };

  const handleApplyAISignal = () => {
    if (!activeSignal) return;
    if (activeSignal.action.includes('BUY')) {
      setSide('LONG');
    } else if (activeSignal.action.includes('SELL')) {
      setSide('SHORT');
    }
    if (activeSignal.suggestedLeverage) {
      setLeverage(activeSignal.suggestedLeverage);
    }
    if (activeSignal.stopLoss) {
      setStopLoss(activeSignal.stopLoss.toString());
    }
    if (activeSignal.targetPrice1) {
      setTakeProfit(activeSignal.targetPrice1.toString());
    }
  };

  const handleSubmitSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (marginAmount <= 0 || marginAmount > portfolioBalance) return;

    onPlaceOrder({
      symbol: currentAsset.symbol,
      side,
      type: orderType,
      price: effectivePrice,
      margin: marginAmount,
      leverage,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      trailingStopPct: enableTrailingStop ? trailingStopPct : undefined,
      duration: orderType === 'LIMIT' ? orderDuration : undefined,
    });
  };

  // Quick shortcut from Single Order to create an alert at Limit or Market price
  const handleQuickCreateAlertFromSingle = () => {
    const target = orderType === 'LIMIT' ? limitPrice : currentAsset.price * 1.02;
    const cond = target >= currentAsset.price ? 'ABOVE' : 'BELOW';
    if (onCreateAlert) {
      onCreateAlert({
        symbol: currentAsset.symbol,
        targetPrice: Number(target.toFixed(currentAsset.decimals)),
        condition: cond,
        note: `Target from ${currentAsset.symbol} order panel`,
        soundEnabled: true,
      });
      setAlertSuccessMsg(`Alert set for ${currentAsset.symbol} at $${target.toLocaleString()}!`);
    }
  };

  // =====================
  // BATCH ORDER OPERATIONS
  // =====================

  const totalBatchMargin = useMemo(
    () => batchLegs.reduce((sum, leg) => sum + (Number(leg.margin) || 0), 0),
    [batchLegs]
  );

  const totalBatchNotional = useMemo(
    () => batchLegs.reduce((sum, leg) => sum + (Number(leg.margin) || 0) * (Number(leg.leverage) || 1), 0),
    [batchLegs]
  );

  const isBatchOverBudget = totalBatchMargin > portfolioBalance;
  const isBatchEmpty = batchLegs.length === 0;

  const handleAddLeg = (customSymbol?: string) => {
    const availableAssets = assets.length > 0 ? assets : [currentAsset];
    const nextAsset = customSymbol
      ? availableAssets.find((a) => a.symbol === customSymbol) || currentAsset
      : availableAssets[batchLegs.length % availableAssets.length] || currentAsset;

    const newLeg: BatchOrderLeg = {
      id: `leg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      symbol: nextAsset.symbol,
      side: 'LONG',
      type: 'MARKET',
      price: nextAsset.price,
      margin: 500,
      leverage: 5,
      enableTrailingStop: false,
      trailingStopPct: 1.0,
      duration: 'GTC',
    };

    setBatchLegs((prev) => [...prev, newLeg]);
  };

  const handleRemoveLeg = (legId: string) => {
    setBatchLegs((prev) => prev.filter((leg) => leg.id !== legId));
  };

  const handleDuplicateLeg = (legId: string) => {
    const target = batchLegs.find((leg) => leg.id === legId);
    if (!target) return;

    const clone: BatchOrderLeg = {
      ...target,
      id: `leg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };

    setBatchLegs((prev) => [...prev, clone]);
  };

  const handleUpdateLeg = (legId: string, updates: Partial<BatchOrderLeg>) => {
    setBatchLegs((prev) =>
      prev.map((leg) => {
        if (leg.id !== legId) return leg;

        const updated = { ...leg, ...updates };

        if (updates.symbol && updates.symbol !== leg.symbol) {
          const matched = assets.find((a) => a.symbol === updates.symbol);
          if (matched) {
            updated.price = matched.price;
          }
        }

        return updated;
      })
    );
  };

  const toggleExpandLeg = (legId: string) => {
    setExpandedLegs((prev) => ({ ...prev, [legId]: !prev[legId] }));
  };

  const handleEqualizeMargin = () => {
    if (batchLegs.length === 0) return;
    const splitAmount = Math.max(10, Math.floor((portfolioBalance * 0.75) / batchLegs.length));
    setBatchLegs((prev) => prev.map((leg) => ({ ...leg, margin: splitAmount })));
  };

  const handleApplyPreset = (preset: 'top3' | 'hedge' | 'all' | 'clear') => {
    const available = assets.length > 0 ? assets : [currentAsset];

    if (preset === 'clear') {
      setBatchLegs([]);
      return;
    }

    if (preset === 'top3') {
      const topSymbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
      const splitMargin = Math.max(50, Math.floor((portfolioBalance * 0.6) / 3));

      const legs: BatchOrderLeg[] = topSymbols.map((sym, i) => {
        const ast = available.find((a) => a.symbol === sym) || available[0];
        return {
          id: `leg-top3-${i}-${Date.now()}`,
          symbol: ast.symbol,
          side: 'LONG',
          type: 'MARKET',
          price: ast.price,
          margin: splitMargin,
          leverage: 5,
          enableTrailingStop: true,
          trailingStopPct: 1.5,
          duration: 'GTC',
        };
      });

      setBatchLegs(legs);
    } else if (preset === 'hedge') {
      const btc = available.find((a) => a.symbol === 'BTC/USDT') || available[0];
      const eth = available.find((a) => a.symbol === 'ETH/USDT') || available[1] || available[0];
      const hedgeMargin = Math.max(50, Math.floor((portfolioBalance * 0.5) / 2));

      setBatchLegs([
        {
          id: `leg-hedge-1-${Date.now()}`,
          symbol: btc.symbol,
          side: 'LONG',
          type: 'MARKET',
          price: btc.price,
          margin: hedgeMargin,
          leverage: 5,
          duration: 'GTC',
        },
        {
          id: `leg-hedge-2-${Date.now()}`,
          symbol: eth.symbol,
          side: 'SHORT',
          type: 'MARKET',
          price: eth.price,
          margin: hedgeMargin,
          leverage: 5,
          duration: 'GTC',
        },
      ]);
    } else if (preset === 'all') {
      const splitMargin = Math.max(50, Math.floor((portfolioBalance * 0.8) / Math.max(1, available.length)));

      const legs: BatchOrderLeg[] = available.map((ast, i) => ({
        id: `leg-all-${i}-${Date.now()}`,
        symbol: ast.symbol,
        side: i % 2 === 0 ? 'LONG' : 'SHORT',
        type: 'MARKET',
        price: ast.price,
        margin: splitMargin,
        leverage: 5,
        duration: 'GTC',
      }));

      setBatchLegs(legs);
    }
  };

  const handleExecuteBatchOrders = () => {
    if (batchLegs.length === 0) {
      setBatchFeedback({ type: 'error', message: 'Add at least 1 trade leg to execute batch.' });
      return;
    }

    if (totalBatchMargin <= 0) {
      setBatchFeedback({ type: 'error', message: 'Total margin must be greater than $0.' });
      return;
    }

    if (totalBatchMargin > portfolioBalance) {
      setBatchFeedback({
        type: 'error',
        message: `Insufficient margin. Required: $${totalBatchMargin.toLocaleString()}, Available: $${portfolioBalance.toLocaleString()}`,
      });
      return;
    }

    const payloads: OrderPlacementPayload[] = batchLegs.map((leg) => {
      const ast = assets.find((a) => a.symbol === leg.symbol) || currentAsset;
      const orderPrice = leg.type === 'MARKET' ? ast.price : leg.price;

      return {
        symbol: leg.symbol,
        side: leg.side,
        type: leg.type,
        price: orderPrice,
        margin: leg.margin,
        leverage: leg.leverage,
        stopLoss: leg.stopLoss ? parseFloat(leg.stopLoss) : undefined,
        takeProfit: leg.takeProfit ? parseFloat(leg.takeProfit) : undefined,
        trailingStopPct: leg.enableTrailingStop ? leg.trailingStopPct : undefined,
        duration: leg.type === 'LIMIT' ? leg.duration : undefined,
      };
    });

    if (onPlaceBatchOrders) {
      const res = onPlaceBatchOrders(payloads);
      if (res.success) {
        setBatchFeedback({
          type: 'success',
          message: `Successfully executed batch of ${res.count} orders simultaneously!`,
        });
      } else {
        setBatchFeedback({
          type: 'error',
          message: res.error || 'Failed to execute batch orders.',
        });
      }
    } else {
      payloads.forEach((payload) => onPlaceOrder(payload));
      setBatchFeedback({
        type: 'success',
        message: `Dispatched ${payloads.length} orders across assets!`,
      });
    }
  };

  // =====================
  // PRICE ALERTS OPERATIONS
  // =====================

  const handleApplyAlertPercentPreset = (pct: number) => {
    const basePrice = selectedAlertAsset.price;
    const multiplier = 1 + pct / 100;
    const newTarget = Number((basePrice * multiplier).toFixed(selectedAlertAsset.decimals));
    setAlertTargetPrice(newTarget);
    setAlertCondition(pct >= 0 ? 'ABOVE' : 'BELOW');
  };

  const handleCreateAlertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateAlert) return;
    if (alertTargetPrice <= 0) return;

    onCreateAlert({
      symbol: alertSymbol,
      targetPrice: alertTargetPrice,
      condition: alertCondition,
      note: alertNote.trim() || undefined,
      soundEnabled: alertSound,
    });

    setAlertSuccessMsg(`Created alert for ${alertSymbol} at $${alertTargetPrice.toLocaleString()}!`);
    setAlertNote('');
  };

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    if (alertFilter === 'active') return priceAlerts.filter((a) => a.status === 'ACTIVE');
    if (alertFilter === 'triggered') return priceAlerts.filter((a) => a.status === 'TRIGGERED');
    return priceAlerts;
  }, [priceAlerts, alertFilter]);

  const activeAlertsCount = priceAlerts.filter((a) => a.status === 'ACTIVE').length;

  const isLong = side === 'LONG';

  return (
    <div className="flex flex-col h-full bg-[#0b0e14] border-l border-slate-800 text-slate-200 select-none p-3 overflow-y-auto">
      {/* Top Header Mode Switcher: Single vs Batch vs Alerts vs DCA Scheduler */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 mb-3 text-[11px] font-semibold">
        <button
          type="button"
          onClick={() => setTradingMode('single')}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-md transition-all ${
            tradingMode === 'single'
              ? 'bg-slate-800 text-white shadow-sm font-bold border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
          <span>Single</span>
        </button>

        <button
          type="button"
          onClick={() => setTradingMode('batch')}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-md transition-all ${
            tradingMode === 'batch'
              ? 'bg-indigo-600/30 text-indigo-300 shadow-sm font-bold border border-indigo-500/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>Batch</span>
        </button>

        <button
          type="button"
          onClick={() => setTradingMode('alerts')}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-md transition-all ${
            tradingMode === 'alerts'
              ? 'bg-amber-500/20 text-amber-300 shadow-sm font-bold border border-amber-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell className="w-3.5 h-3.5 text-amber-400" />
          <span>Alerts</span>
        </button>

        <button
          type="button"
          onClick={() => setTradingMode('scheduler')}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-md transition-all ${
            tradingMode === 'scheduler'
              ? 'bg-teal-500/20 text-teal-300 shadow-sm font-bold border border-teal-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Automated DCA & Multi-Stage Staged Execution Scheduler"
        >
          <CalendarClock className="w-3.5 h-3.5 text-teal-400" />
          <span>DCA</span>
          {schedules.filter((s) => s.status === 'ACTIVE').length > 0 && (
            <span className="text-[9px] font-mono px-1 rounded-full bg-teal-950 border border-teal-700 text-teal-300 animate-pulse">
              {schedules.filter((s) => s.status === 'ACTIVE').length}
            </span>
          )}
        </button>
      </div>

      {/* Global alert success message feedback */}
      {alertSuccessMsg && (
        <div className="mb-2.5 p-2 rounded-lg bg-amber-950/70 border border-amber-500/50 text-amber-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{alertSuccessMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* BULK ORDER DCA SCHEDULER MODE                            */}
      {/* ======================================================== */}
      {tradingMode === 'scheduler' && (
        <div className="space-y-3 text-xs font-mono">
          {/* Header Action to open Full Modal */}
          {onOpenFullSchedulerModal && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-teal-950/40 border border-teal-500/40 text-[11px]">
              <span className="flex items-center gap-1.5 text-teal-300 font-bold">
                <CalendarClock className="w-3.5 h-3.5 text-teal-400" />
                <span>Multi-Stage Scheduler</span>
              </span>
              <button
                type="button"
                onClick={onOpenFullSchedulerModal}
                className="px-2 py-0.5 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border border-teal-500/40 text-[10px] font-bold transition-colors cursor-pointer"
              >
                Open Hub →
              </button>
            </div>
          )}

          {/* Active Schedule Monitoring for current asset */}
          {schedules.filter((s) => s.symbol === currentAsset.symbol && (s.status === 'ACTIVE' || s.status === 'PAUSED')).length > 0 ? (
            <div className="space-y-2">
              <div className="text-[10px] text-slate-400 uppercase font-bold">
                Active DCA Sequences ({currentAsset.symbol})
              </div>
              {schedules
                .filter((s) => s.symbol === currentAsset.symbol && (s.status === 'ACTIVE' || s.status === 'PAUSED'))
                .map((sch) => {
                  const progressPct = Math.round((sch.completedStages / sch.totalStages) * 100);
                  const isRunning = sch.status === 'ACTIVE';

                  return (
                    <div
                      key={sch.id}
                      className="p-2.5 rounded-lg bg-slate-900 border border-teal-500/40 space-y-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-[11px] truncate">
                          {sch.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            isRunning
                              ? 'bg-teal-950 text-teal-300 border border-teal-800 animate-pulse'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {sch.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-slate-400">Tranches: </span>
                          <strong className="text-white">
                            {sch.completedStages} / {sch.totalStages} ({progressPct}%)
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Filled: </span>
                          <strong className="text-teal-300">
                            ${sch.totalMarginFilled} / ${sch.totalMarginAllocated}
                          </strong>
                        </div>
                      </div>

                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-teal-500 to-cyan-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {onExecuteNextStageNow && isRunning && (
                          <button
                            type="button"
                            onClick={() => onExecuteNextStageNow(sch.id)}
                            className="px-2 py-0.5 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border border-teal-500/40 text-[10px] flex items-center gap-1 font-bold transition-colors cursor-pointer"
                          >
                            <Zap className="w-2.5 h-2.5" />
                            <span>Trigger Leg</span>
                          </button>
                        )}

                        {onToggleScheduleStatus && (
                          <button
                            type="button"
                            onClick={() => onToggleScheduleStatus(sch.id)}
                            className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                          >
                            {isRunning ? 'Pause' : 'Resume'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : null}

          {/* Quick DCA Sequence Builder Card */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-xs">Deploy Fast DCA ({currentAsset.symbol})</span>
              <span className="text-[10px] text-teal-400">Auto-Staged</span>
            </div>

            <form onSubmit={handleDeployQuickDCA} className="space-y-2.5">
              {/* Direction Switcher */}
              <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setDcaSide('LONG')}
                  className={`py-1 rounded font-bold transition-all cursor-pointer ${
                    dcaSide === 'LONG'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Buy / Accumulate
                </button>
                <button
                  type="button"
                  onClick={() => setDcaSide('SHORT')}
                  className={`py-1 rounded font-bold transition-all cursor-pointer ${
                    dcaSide === 'SHORT'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sell / Scale Out
                </button>
              </div>

              {/* Total Margin */}
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Total Capital Budget</span>
                  <span>Avail: ${portfolioBalance.toLocaleString()}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    min={20}
                    max={portfolioBalance}
                    step={50}
                    value={dcaTotalMargin}
                    onChange={(e) => setDcaTotalMargin(Math.max(20, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-700 rounded pl-6 pr-2 py-1 text-white text-xs font-bold focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Tranches count & Interval */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <label className="text-slate-400 block mb-0.5">Tranches</label>
                  <select
                    value={dcaStages}
                    onChange={(e) => setDcaStages(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs font-bold focus:outline-none focus:border-teal-500"
                  >
                    <option value={3}>3 Stages (${Math.round(dcaTotalMargin / 3)}/ea)</option>
                    <option value={5}>5 Stages (${Math.round(dcaTotalMargin / 5)}/ea)</option>
                    <option value={8}>8 Stages (${Math.round(dcaTotalMargin / 8)}/ea)</option>
                    <option value={10}>10 Stages (${Math.round(dcaTotalMargin / 10)}/ea)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-0.5">Pacing</label>
                  <select
                    value={dcaInterval}
                    onChange={(e) => setDcaInterval(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs font-bold focus:outline-none focus:border-teal-500"
                  >
                    <option value={5}>Every 5s (Hyper)</option>
                    <option value={10}>Every 10s (Fast)</option>
                    <option value={30}>Every 30s</option>
                    <option value={60}>Every 1m</option>
                    <option value={300}>Every 5m</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={dcaTotalMargin <= 0 || dcaTotalMargin > portfolioBalance}
                className="w-full py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs rounded-lg shadow-md shadow-teal-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Launch {dcaStages}-Stage DCA</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PRICE ALERTS MODE                                        */}
      {/* ======================================================== */}
      {tradingMode === 'alerts' && (
        <div className="space-y-3 text-xs">
          {/* Create Alert Form Card */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2.5 font-mono">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300 font-bold text-xs">
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span>Set Price Alert</span>
              </span>
              <span className="text-[10px] text-slate-500">Live trigger</span>
            </div>

            <form onSubmit={handleCreateAlertSubmit} className="space-y-2.5">
              {/* Asset Dropdown & Current Price */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <label className="text-slate-400 text-[10px] block mb-0.5">Asset</label>
                  <select
                    value={alertSymbol}
                    onChange={(e) => setAlertSymbol(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-bold text-xs focus:outline-none focus:border-amber-500"
                  >
                    {assets.map((ast) => (
                      <option key={ast.symbol} value={ast.symbol}>
                        {ast.symbol} (${ast.price.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 text-[10px] block mb-0.5">Current Price</label>
                  <div className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs">
                    ${selectedAlertAsset.price.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Condition Toggle: Crosses Above (>=) vs Crosses Below (<=) */}
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Trigger Condition</label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setAlertCondition('ABOVE');
                      handleApplyAlertPercentPreset(2.0);
                    }}
                    className={`py-1 rounded text-center transition-all font-bold text-[10px] ${
                      alertCondition === 'ABOVE'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Price Crosses Above (≥)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAlertCondition('BELOW');
                      handleApplyAlertPercentPreset(-2.0);
                    }}
                    className={`py-1 rounded text-center transition-all font-bold text-[10px] ${
                      alertCondition === 'BELOW'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Price Drops Below (≤)
                  </button>
                </div>
              </div>

              {/* Target Price Input */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Target Threshold ($)</span>
                  {alertTargetPrice > 0 && (
                    <span
                      className={
                        alertTargetPrice >= selectedAlertAsset.price ? 'text-emerald-400' : 'text-rose-400'
                      }
                    >
                      {alertTargetPrice >= selectedAlertAsset.price ? '+' : ''}
                      {(
                        ((alertTargetPrice - selectedAlertAsset.price) / selectedAlertAsset.price) *
                        100
                      ).toFixed(2)}
                      % away
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  value={alertTargetPrice}
                  onChange={(e) => setAlertTargetPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Quick % Presets */}
              <div className="grid grid-cols-4 gap-1">
                {(alertCondition === 'ABOVE' ? [0.5, 1.0, 2.0, 5.0] : [-0.5, -1.0, -2.0, -5.0]).map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleApplyAlertPercentPreset(pct)}
                    className="py-1 rounded bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-slate-400 hover:text-amber-300 text-[10px] transition-colors"
                  >
                    {pct > 0 ? `+${pct}%` : `${pct}%`}
                  </button>
                ))}
              </div>

              {/* Optional Label / Note */}
              <div>
                <label className="text-slate-400 text-[10px] block mb-0.5">Alert Label (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Resistance Breakout / Buy Dip"
                  value={alertNote}
                  onChange={(e) => setAlertNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-[11px] focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Audio Sound Chime Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white text-[11px]">
                  <input
                    type="checkbox"
                    checked={alertSound}
                    onChange={(e) => setAlertSound(e.target.checked)}
                    className="accent-amber-400 rounded cursor-pointer"
                  />
                  <span>Play audio chime on trigger</span>
                </label>
                {alertSound ? (
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-600" />
                )}
              </div>

              {/* Create Alert Button */}
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 fill-current" />
                <span>Create Alert for {alertSymbol}</span>
              </button>
            </form>
          </div>

          {/* Active Alerts List Section */}
          <div className="space-y-2 font-mono">
            {/* Filter Tabs */}
            <div className="flex items-center justify-between text-[11px] px-0.5">
              <span className="text-slate-400 font-medium">Configured Alerts ({priceAlerts.length})</span>
              <div className="flex items-center gap-1">
                {(['all', 'active', 'triggered'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setAlertFilter(filter)}
                    className={`px-1.5 py-0.5 rounded text-[10px] capitalize transition-colors ${
                      alertFilter === filter
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {filteredAlerts.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-slate-500 space-y-1">
                <Bell className="w-6 h-6 mx-auto stroke-1 text-slate-600" />
                <p className="text-xs">No alerts matching filter.</p>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const ast = assets.find((a) => a.symbol === alert.symbol) || currentAsset;
                const distPct = ((alert.targetPrice - ast.price) / ast.price) * 100;
                const isTriggered = alert.status === 'TRIGGERED';
                const isActive = alert.status === 'ACTIVE';

                return (
                  <div
                    key={alert.id}
                    className={`p-2.5 rounded-lg border transition-all ${
                      isTriggered
                        ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                        : isActive
                        ? 'bg-slate-900/90 border-slate-800 text-slate-200'
                        : 'bg-slate-950/60 border-slate-800/60 text-slate-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{alert.symbol}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${
                            alert.condition === 'ABOVE'
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                              : 'bg-rose-950 text-rose-400 border-rose-800'
                          }`}
                        >
                          {alert.condition === 'ABOVE' ? '≥' : '≤'} ${alert.targetPrice.toLocaleString()}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-1 text-[10px]">
                        {isTriggered ? (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                            <Radio className="w-2.5 h-2.5 animate-pulse" />
                            TRIGGERED
                          </span>
                        ) : isActive ? (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-500">
                            PAUSED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metrics row */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1 border-t border-slate-800/80">
                      <div>
                        <span>Current: </span>
                        <span className="text-white">${ast.price.toLocaleString()}</span>
                        <span className="ml-1 text-slate-500">
                          ({distPct >= 0 ? '+' : ''}
                          {distPct.toFixed(2)}%)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {alert.soundEnabled && (
                          <span title="Audio chime active">
                            <Volume2 className="w-3 h-3 text-amber-400/80" />
                          </span>
                        )}

                        {/* Toggle Active / Pause */}
                        {onToggleAlertStatus && (
                          <button
                            type="button"
                            onClick={() => onToggleAlertStatus(alert.id)}
                            className="text-slate-400 hover:text-white text-[10px]"
                            title={isActive ? 'Pause alert' : 'Activate alert'}
                          >
                            {isActive ? 'Pause' : 'Resume'}
                          </button>
                        )}

                        {/* Delete alert */}
                        {onDeleteAlert && (
                          <button
                            type="button"
                            onClick={() => onDeleteAlert(alert.id)}
                            className="p-1 rounded hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Delete alert"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Optional Note */}
                    {alert.note && (
                      <div className="text-[10px] text-slate-400 mt-1 font-sans italic truncate">
                        "{alert.note}"
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BATCH ORDER BASKET MODE                                  */}
      {/* ======================================================== */}
      {tradingMode === 'batch' && (
        <div className="space-y-3 text-xs">
          {/* Batch Quick Presets Bar */}
          <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Basket Templates</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Quick setup</span>
            </div>

            <div className="grid grid-cols-4 gap-1 font-mono text-[10px]">
              <button
                type="button"
                onClick={() => handleApplyPreset('top3')}
                className="py-1 px-1.5 bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:text-indigo-300 rounded text-center transition-colors truncate"
                title="BTC, ETH, SOL Longs"
              >
                Top 3 Longs
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('hedge')}
                className="py-1 px-1.5 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:text-cyan-300 rounded text-center transition-colors truncate"
                title="BTC Long + ETH Short"
              >
                Crypto Hedge
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('all')}
                className="py-1 px-1.5 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:text-emerald-300 rounded text-center transition-colors truncate"
                title="All 5 Available Assets"
              >
                All Assets
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('clear')}
                className="py-1 px-1.5 bg-slate-950 border border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 rounded text-center transition-colors truncate"
                title="Clear All Legs"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Feedback Toast */}
          {batchFeedback && (
            <div
              className={`p-2.5 rounded-lg border flex items-start gap-2 text-xs font-mono transition-all ${
                batchFeedback.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/70 border-rose-500/50 text-rose-300'
              }`}
            >
              {batchFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-[11px] leading-snug">{batchFeedback.message}</div>
            </div>
          )}

          {/* Basket Legs List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
              <span>Order Basket Legs ({batchLegs.length})</span>
              <button
                type="button"
                onClick={handleEqualizeMargin}
                className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                title="Distribute 75% of available margin equally across all legs"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Equalize Margins</span>
              </button>
            </div>

            {batchLegs.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-slate-500 space-y-2">
                <Layers className="w-6 h-6 mx-auto stroke-1 text-slate-600" />
                <p className="text-xs">Your order basket is empty.</p>
                <button
                  type="button"
                  onClick={() => handleAddLeg()}
                  className="px-3 py-1 bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-md text-xs hover:bg-indigo-600/50"
                >
                  + Add First Order Leg
                </button>
              </div>
            ) : (
              batchLegs.map((leg, index) => {
                const matchedAsset = assets.find((a) => a.symbol === leg.symbol) || currentAsset;
                const legPrice = leg.type === 'MARKET' ? matchedAsset.price : leg.price;
                const legNotional = leg.margin * leg.leverage;
                const legQty = legPrice > 0 ? legNotional / legPrice : 0;
                const isExpanded = !!expandedLegs[leg.id];

                return (
                  <div
                    key={leg.id}
                    className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2 hover:border-slate-700/80 transition-all font-mono"
                  >
                    {/* Leg Header Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>

                        {/* Asset Dropdown */}
                        <select
                          value={leg.symbol}
                          onChange={(e) => handleUpdateLeg(leg.id, { symbol: e.target.value })}
                          className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-white font-bold text-xs focus:outline-none focus:border-cyan-500 flex-1 min-w-[100px]"
                        >
                          {assets.map((ast) => (
                            <option key={ast.symbol} value={ast.symbol}>
                              {ast.symbol} (${ast.price.toLocaleString()})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Side Switcher (LONG vs SHORT) */}
                      <div className="grid grid-cols-2 gap-1 bg-slate-950 p-0.5 rounded border border-slate-800 text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleUpdateLeg(leg.id, { side: 'LONG' })}
                          className={`px-2 py-0.5 rounded transition-all font-bold ${
                            leg.side === 'LONG'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          LONG
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateLeg(leg.id, { side: 'SHORT' })}
                          className={`px-2 py-0.5 rounded transition-all font-bold ${
                            leg.side === 'SHORT'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          SHORT
                        </button>
                      </div>

                      {/* Duplicate & Remove Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDuplicateLeg(leg.id)}
                          title="Duplicate order leg"
                          className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveLeg(leg.id)}
                          title="Remove leg"
                          className="p-1 rounded bg-slate-950 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Order Type & Price Row */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <div className="text-slate-500 text-[10px] mb-0.5">Execution Type</div>
                        <div className="grid grid-cols-2 gap-1 bg-slate-950 p-0.5 rounded border border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleUpdateLeg(leg.id, { type: 'MARKET' })}
                            className={`py-0.5 text-center rounded ${
                              leg.type === 'MARKET'
                                ? 'bg-slate-800 text-white font-bold'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            Market
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateLeg(leg.id, { type: 'LIMIT' })}
                            className={`py-0.5 text-center rounded ${
                              leg.type === 'LIMIT'
                                ? 'bg-slate-800 text-white font-bold'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            Limit
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500 text-[10px] mb-0.5">
                          {leg.type === 'MARKET' ? 'Market Est.' : 'Limit Price ($)'}
                        </div>
                        {leg.type === 'MARKET' ? (
                          <div className="w-full bg-slate-950 border border-slate-800/80 rounded px-2 py-1 text-slate-300 font-mono text-[11px]">
                            ${matchedAsset.price.toLocaleString()}
                          </div>
                        ) : (
                          <input
                            type="number"
                            step="any"
                            value={leg.price}
                            onChange={(e) =>
                              handleUpdateLeg(leg.id, { price: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                          />
                        )}
                      </div>
                    </div>

                    {/* Margin & Leverage Row */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                          <span>Margin</span>
                          <span>USDT</span>
                        </div>
                        <input
                          type="number"
                          min="10"
                          value={leg.margin}
                          onChange={(e) =>
                            handleUpdateLeg(leg.id, { margin: Math.max(0, parseFloat(e.target.value) || 0) })
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                          <span>Leverage</span>
                          <span className="text-cyan-400 font-bold">{leg.leverage}x</span>
                        </div>
                        <div className="grid grid-cols-4 gap-0.5 bg-slate-950 p-0.5 rounded border border-slate-800 text-[10px]">
                          {[2, 5, 10, 20].map((lev) => (
                            <button
                              key={lev}
                              type="button"
                              onClick={() => handleUpdateLeg(leg.id, { leverage: lev })}
                              className={`py-0.5 rounded text-center transition-colors ${
                                leg.leverage === lev
                                  ? 'bg-cyan-600 text-white font-bold'
                                  : 'text-slate-500 hover:text-slate-200'
                              }`}
                            >
                              {lev}x
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Notional Preview Strip */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>
                        Size: <strong className="text-white">${legNotional.toLocaleString()}</strong> (
                        {legQty.toFixed(3)} {leg.symbol.split('/')[0]})
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleExpandLeg(leg.id)}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 font-sans"
                      >
                        <span>{isExpanded ? 'Hide TP/SL/Trail' : 'TP/SL & Trail'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Expandable Advanced Options */}
                    {isExpanded && (
                      <div className="p-2 rounded bg-slate-950 border border-slate-800 space-y-2 text-[10px] pt-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-emerald-400 block mb-0.5">Take Profit ($)</label>
                            <input
                              type="number"
                              step="any"
                              placeholder="TP Price"
                              value={leg.takeProfit || ''}
                              onChange={(e) => handleUpdateLeg(leg.id, { takeProfit: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white text-[10px] focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="text-rose-400 block mb-0.5">Stop Loss ($)</label>
                            <input
                              type="number"
                              step="any"
                              placeholder="SL Price"
                              value={leg.stopLoss || ''}
                              onChange={(e) => handleUpdateLeg(leg.id, { stopLoss: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white text-[10px] focus:outline-none focus:border-rose-500"
                            />
                          </div>
                        </div>

                        {/* Trailing Stop Callback */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                            <input
                              type="checkbox"
                              checked={!!leg.enableTrailingStop}
                              onChange={(e) =>
                                handleUpdateLeg(leg.id, { enableTrailingStop: e.target.checked })
                              }
                              className="accent-cyan-400 rounded cursor-pointer"
                            />
                            <span>Dynamic Trailing SL</span>
                          </label>

                          {leg.enableTrailingStop && (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                max="10"
                                value={leg.trailingStopPct || 1.0}
                                onChange={(e) =>
                                  handleUpdateLeg(leg.id, {
                                    trailingStopPct: Math.max(0.1, parseFloat(e.target.value) || 0.1),
                                  })
                                }
                                className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-right text-white text-[10px]"
                              />
                              <span className="text-slate-400">%</span>
                            </div>
                          )}
                        </div>

                        {/* Order Duration (TIF) for Limit Orders */}
                        {leg.type === 'LIMIT' && (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                            <span className="text-slate-400">Order Duration (TIF):</span>
                            <div className="flex items-center gap-1">
                              {(['GTC', 'DAY', 'IOC', 'FOK'] as const).map((dur) => (
                                <button
                                  key={dur}
                                  type="button"
                                  onClick={() => handleUpdateLeg(leg.id, { duration: dur })}
                                  className={`px-1.5 py-0.5 rounded text-[9px] ${
                                    (leg.duration || 'GTC') === dur
                                      ? 'bg-cyan-600 text-white font-bold'
                                      : 'bg-slate-900 text-slate-400'
                                  }`}
                                >
                                  {dur}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Add Order Leg Button */}
            <button
              type="button"
              onClick={() => handleAddLeg()}
              className="w-full py-2 rounded-lg border border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-900/40 hover:bg-slate-900/80 text-slate-300 hover:text-indigo-300 font-mono text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>+ Add Trade Leg</span>
            </button>
          </div>

          {/* Basket Execution Summary */}
          <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-slate-800">
              <span className="text-slate-400">Total Basket Legs</span>
              <span className="font-bold text-white">{batchLegs.length} orders</span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Required Margin:</span>
              <span className={`font-bold ${isBatchOverBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
                ${totalBatchMargin.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Available Balance:</span>
              <span className="text-slate-300">${portfolioBalance.toLocaleString()}</span>
            </div>

            {/* Margin Utilization Bar */}
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isBatchOverBudget ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(100, portfolioBalance > 0 ? (totalBatchMargin / portfolioBalance) * 100 : 0)}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800 text-slate-400">
              <span>Total Notional Power:</span>
              <span className="text-cyan-400 font-bold">${totalBatchNotional.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Receipt className="w-3 h-3 text-cyan-400" />
                <span>Est. Basket Fees ({feeRate}%):</span>
              </span>
              <span className="text-amber-300 font-bold">
                ${(totalBatchNotional * (feeRate / 100)).toFixed(2)}{' '}
                <span className="text-[10px] text-slate-400 font-normal">
                  (RT: ${(totalBatchNotional * (feeRate / 100) * 2).toFixed(2)})
                </span>
              </span>
            </div>
          </div>

          {/* Master Batch Execution Button */}
          <button
            type="button"
            disabled={isBatchEmpty || isBatchOverBudget || totalBatchMargin <= 0}
            onClick={handleExecuteBatchOrders}
            className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
              isBatchEmpty || isBatchOverBudget || totalBatchMargin <= 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-indigo-600/30'
            }`}
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>
              {isBatchOverBudget
                ? `Insufficient Margin (Over by $${(totalBatchMargin - portfolioBalance).toLocaleString()})`
                : isBatchEmpty
                ? 'Add Legs to Execute Batch'
                : `Execute Batch (${batchLegs.length} Orders) · $${totalBatchMargin.toLocaleString()}`}
            </span>
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SINGLE ORDER MODE                                        */}
      {/* ======================================================== */}
      {tradingMode === 'single' && (
        <>
          {/* Side Switcher (LONG vs SHORT) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800 mb-3">
            <button
              type="button"
              onClick={() => setSide('LONG')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-md font-semibold text-xs transition-all ${
                isLong
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Long / Buy</span>
            </button>
            <button
              type="button"
              onClick={() => setSide('SHORT')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-md font-semibold text-xs transition-all ${
                !isLong
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Short / Sell</span>
            </button>
          </div>

          {/* AI Signal Recommendation Banner (if active) */}
          {activeSignal && (
            <div className="mb-3 p-2 bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-800/60 rounded-lg">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1 text-cyan-300 font-medium">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  AI Setup: {activeSignal.action}
                </span>
                <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                  {activeSignal.confidence}% Conf.
                </span>
              </div>
              <button
                type="button"
                onClick={handleApplyAISignal}
                className="w-full mt-1 py-1 text-[11px] font-semibold rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 transition-colors"
              >
                Auto-fill AI Recommended SL / TP ({activeSignal.suggestedLeverage}x)
              </button>
            </div>
          )}

          {/* Order Type Tabs & Quick Alert shortcut */}
          <div className="flex items-center justify-between mb-3 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOrderType('MARKET')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  orderType === 'MARKET'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Market
              </button>
              <button
                type="button"
                onClick={() => setOrderType('LIMIT')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  orderType === 'LIMIT'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Limit
              </button>
            </div>

            {/* Quick Alert Bell button */}
            <button
              type="button"
              onClick={handleQuickCreateAlertFromSingle}
              className="text-[10px] text-amber-400/90 hover:text-amber-300 flex items-center gap-1 py-1 px-1.5 rounded bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800/40 transition-colors"
              title="Set Price Alert at current target"
            >
              <Bell className="w-3 h-3" />
              <span>Quick Alert</span>
            </button>
          </div>

          <form onSubmit={handleSubmitSingle} className="space-y-3 text-xs">
            {/* Limit Price Input */}
            {orderType === 'LIMIT' && (
              <div className="space-y-2">
                <div>
                  <label className="text-slate-400 text-[11px] mb-1 block">Limit Price (USDT)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-[11px]">
                      USDT
                    </span>
                  </div>
                </div>

                {/* Order Duration (Time In Force) Selector */}
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Order Duration (TIF)</span>
                    </span>
                    <span className="font-mono text-cyan-400 font-bold text-[10px]">
                      {orderDuration === 'GTC'
                        ? "Good 'Til Canceled"
                        : orderDuration === 'DAY'
                        ? 'Day (24h Expiry)'
                        : orderDuration === 'IOC'
                        ? 'Immediate Or Cancel'
                        : 'Fill Or Kill'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono">
                    {(
                      [
                        { id: 'GTC', label: 'GTC', title: "Good 'Til Canceled - Remains active until filled or canceled" },
                        { id: 'DAY', label: 'Day', title: 'Day Order - Auto-expires at end of session (24h)' },
                        { id: 'IOC', label: 'IOC', title: 'Immediate Or Cancel - Fills immediately; cancels remaining volume' },
                        { id: 'FOK', label: 'FOK', title: 'Fill Or Kill - Must fill completely immediately or is killed' },
                      ] as const
                    ).map((dur) => (
                      <button
                        key={dur.id}
                        type="button"
                        title={dur.title}
                        onClick={() => setOrderDuration(dur.id)}
                        className={`py-1 rounded text-center transition-all ${
                          orderDuration === dur.id
                            ? 'bg-cyan-600 text-white font-bold shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {dur.label}
                      </button>
                    ))}
                  </div>

                  <div className="text-[9px] text-slate-500 font-sans leading-tight">
                    {orderDuration === 'GTC' && 'Order stays in the order book until fully matched or manually removed.'}
                    {orderDuration === 'DAY' && 'Automatically cancels if unfilled after 24 hours.'}
                    {orderDuration === 'IOC' && 'Fills what it can immediately against the book; cancels the rest.'}
                    {orderDuration === 'FOK' && 'Entire order must be filled immediately, otherwise cancelled.'}
                  </div>
                </div>
              </div>
            )}

            {/* Leverage Selector */}
            <div>
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                <span>Leverage Multiplier</span>
                <span className="font-mono text-cyan-400 font-bold">{leverage}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span onClick={() => setLeverage(1)} className="cursor-pointer hover:text-slate-300">1x</span>
                <span onClick={() => setLeverage(5)} className="cursor-pointer hover:text-slate-300">5x</span>
                <span onClick={() => setLeverage(10)} className="cursor-pointer hover:text-slate-300">10x</span>
                <span onClick={() => setLeverage(20)} className="cursor-pointer hover:text-slate-300">20x</span>
                <span onClick={() => setLeverage(50)} className="cursor-pointer hover:text-slate-300">50x</span>
              </div>
            </div>

            {/* Margin Input */}
            <div>
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                <span>Margin (Capital)</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Avail: ${portfolioBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  max={portfolioBalance}
                  value={marginAmount}
                  onChange={(e) => setMarginAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-[11px]">
                  USDT
                </span>
              </div>

              {/* Quick % buttons */}
              <div className="grid grid-cols-4 gap-1 mt-1.5">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handlePercentageMargin(pct)}
                    className="py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded font-mono text-[10px] transition-colors"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Take Profit & Stop Loss inputs */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
              <div>
                <label className="text-emerald-400 text-[11px] mb-1 block">Take Profit</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Target Price"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-rose-400 text-[11px] mb-1 block">Stop Loss</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Stop Price"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Trailing Stop-Loss Option */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={enableTrailingStop}
                    onChange={(e) => setEnableTrailingStop(e.target.checked)}
                    className="w-3.5 h-3.5 accent-cyan-400 rounded cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Trailing Stop-Loss</span>
                    <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-800">
                      DYNAMIC
                    </span>
                  </span>
                </label>
                {enableTrailingStop && (
                  <span className="text-[11px] font-mono font-bold text-cyan-400">
                    {trailingStopPct}%
                  </span>
                )}
              </div>

              {enableTrailingStop && (
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Trailing Callback Delta</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="10"
                        value={trailingStopPct}
                        onChange={(e) => setTrailingStopPct(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                        className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                      />
                      <span className="text-slate-400">%</span>
                    </div>
                  </div>

                  {/* Trailing % Quick Preset Buttons */}
                  <div className="grid grid-cols-4 gap-1">
                    {[0.5, 1.0, 1.5, 2.5].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setTrailingStopPct(pct)}
                        className={`py-0.5 rounded text-[10px] transition-colors border ${
                          trailingStopPct === pct
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  <div className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/80 space-y-1">
                    <div className="flex justify-between">
                      <span>Trailing Distance:</span>
                      <span className="text-white">±${trailingDistance.toFixed(currentAsset.decimals)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Initial Exit Trigger:</span>
                      <span className="text-amber-400 font-bold">${initialTrailingStopPrice.toFixed(currentAsset.decimals)}</span>
                    </div>
                    <div className="text-[9px] text-slate-500 pt-0.5 font-sans leading-tight">
                      Automatically ratchets {isLong ? 'upward as market climbs' : 'downward as market falls'}, locking in realized profits while trailing behind price reversals.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Estimated Fees & Trade Cost Analysis Card */}
            <div className="p-3 bg-gradient-to-br from-slate-900/95 via-[#0d121e] to-slate-900/95 rounded-xl border border-slate-800 space-y-2 font-mono text-xs shadow-md">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                <div className="flex items-center gap-1.5 text-slate-200 font-bold text-[11px]">
                  <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Estimated Trading Fees</span>
                  <span className="text-[10px] text-cyan-300 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-800/80 font-sans font-semibold">
                    {feeRate}% Flat Fee
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Fee Breakdown Details Trigger */}
                  <button
                    type="button"
                    onClick={() => setFeeDetailModalOpen(true)}
                    className="flex items-center gap-1 text-[10px] text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-700/60 px-1.5 py-0.5 rounded transition-all font-sans cursor-pointer"
                    title="View detailed fee, slippage, and cost breakdown"
                  >
                    <Info className="w-3 h-3 text-cyan-400" />
                    <span>Breakdown</span>
                  </button>

                  {/* Fee Rate Presets (e.g., 0.05% VIP / Maker, 0.10% Standard, 0.20% High-Frequency) */}
                  <div className="flex items-center gap-1 text-[9px]">
                    {[0.05, 0.1, 0.2].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setFeeRate(rate)}
                        className={`px-1.5 py-0.5 rounded transition-colors ${
                          feeRate === rate
                            ? 'bg-cyan-600 text-white font-bold'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                        }`}
                        title={`Set fee rate to ${rate}% flat`}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Commission Grid: Entry Fee vs Round-Trip Fee (clickable for detail modal) */}
              <div
                onClick={() => setFeeDetailModalOpen(true)}
                className="grid grid-cols-2 gap-2 text-[11px] cursor-pointer group"
                title="Click to view full fee and slippage breakdown"
              >
                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 group-hover:border-cyan-500/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 uppercase block">Entry Commission</span>
                    <Info className="w-2.5 h-2.5 text-slate-500 group-hover:text-cyan-400" />
                  </div>
                  <span className="text-white font-bold text-xs mt-0.5 block group-hover:text-cyan-300 transition-colors">
                    ${estimatedEntryFee.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-slate-400 font-sans">
                    {feeRate}% of ${positionValue.toLocaleString()} size
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 group-hover:border-cyan-500/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 uppercase block">Round-Trip Total</span>
                    <Info className="w-2.5 h-2.5 text-slate-500 group-hover:text-cyan-400" />
                  </div>
                  <span className="text-amber-400 font-bold text-xs mt-0.5 block">
                    ${estimatedRoundTripFee.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-slate-400 font-sans">
                    Open + Close Est.
                  </span>
                </div>
              </div>

              {/* Advanced Fee Drag Telemetry */}
              <div className="pt-1.5 border-t border-slate-800/60 space-y-1 text-[10px] text-slate-400 font-sans">
                <div className="flex justify-between items-center font-mono">
                  <span>Collateral Drag (% Margin):</span>
                  <span className="text-slate-200 font-semibold">
                    {feeImpactOnMarginPct.toFixed(2)}% <span className="text-slate-500 font-normal">({roundTripMarginImpactPct.toFixed(2)}% RT)</span>
                  </span>
                </div>
                <div className="flex justify-between items-center font-mono">
                  <span>Break-Even Price Movement:</span>
                  <span className="text-emerald-400 font-semibold">
                    ±${breakEvenPriceDelta.toFixed(currentAsset.decimals)} ({breakEvenMovementPct.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Execution Breakdown Summary */}
            <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800/80 space-y-1.5 text-[11px] font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Position Size</span>
                <span className="text-white font-semibold">
                  ${positionValue.toLocaleString()} ({quantity.toFixed(3)} {currentAsset.symbol.split('/')[0]})
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Est. Liq Price</span>
                <span className="text-amber-400 font-semibold">
                  ${liquidationPrice.toFixed(currentAsset.decimals)}
                </span>
              </div>
              <div
                onClick={() => setFeeDetailModalOpen(true)}
                className="flex justify-between text-slate-400 cursor-pointer hover:text-cyan-300 transition-colors"
                title="Click to view fee breakdown"
              >
                <span className="flex items-center gap-1">
                  <span>Est. Fee (Entry / Round-Trip)</span>
                  <Info className="w-2.5 h-2.5 text-cyan-400" />
                </span>
                <span className="text-amber-300 font-semibold hover:underline">
                  ${estimatedEntryFee.toFixed(2)} / ${estimatedRoundTripFee.toFixed(2)} ({feeRate}%)
                </span>
              </div>
            </div>

            {/* Submit Execution Button */}
            <button
              type="submit"
              disabled={marginAmount <= 0 || marginAmount > portfolioBalance}
              className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all ${
                marginAmount > portfolioBalance || marginAmount <= 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : isLong
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
              }`}
            >
              <span>{isLong ? 'Buy / Long' : 'Sell / Short'}</span>
              <span>{currentAsset.symbol.split('/')[0]}</span>
              <span>({leverage}x)</span>
            </button>
          </form>
        </>
      )}

      {/* Fee Calculation Breakdown Modal Detail View */}
      {feeDetailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
          <div className="bg-[#0b0f19] border border-cyan-500/50 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl relative font-mono text-xs overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 bg-[#0d121f] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Fee & Cost Calculation Breakdown</h3>
                  <p className="text-[10px] text-slate-400 font-sans">
                    Detailed mathematical modeling for {currentAsset.symbol} · {side} ({orderType})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFeeDetailModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-3.5">
              {/* Parameter Snapshot Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block uppercase">Order Type</span>
                  <span className="text-white font-bold text-xs mt-0.5 block">{orderType}</span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block uppercase">Position Size</span>
                  <span className="text-cyan-400 font-bold text-xs mt-0.5 block">
                    ${positionValue.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block uppercase">Margin (Collateral)</span>
                  <span className="text-white font-bold text-xs mt-0.5 block">
                    ${marginAmount.toLocaleString()} ({leverage}x)
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block uppercase">Execution Price</span>
                  <span className="text-white font-bold text-xs mt-0.5 block">
                    ${effectivePrice.toLocaleString(undefined, { minimumFractionDigits: currentAsset.decimals, maximumFractionDigits: currentAsset.decimals })}
                  </span>
                </div>
              </div>

              {/* Itemized Fee Breakdown Table */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 text-[11px]">
                <div className="text-xs font-bold text-slate-300 pb-1.5 border-b border-slate-800 flex items-center justify-between">
                  <span>Component</span>
                  <span>Estimated Cost</span>
                </div>

                {/* 1. Base Commission */}
                <div className="flex items-start justify-between gap-2 py-1">
                  <div>
                    <div className="text-slate-200 font-semibold flex items-center gap-1.5">
                      <span>1. Base Exchange Commission</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {feeRate}% Flat
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                      Standard protocol fee on filled notional (${positionValue.toLocaleString()} × {feeRate}%)
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-white font-bold">${baseCommissionFee.toFixed(2)}</span>
                    <span className="text-[9px] text-slate-500 block font-sans">
                      {((baseCommissionFee / (positionValue || 1)) * 100).toFixed(2)}% notional
                    </span>
                  </div>
                </div>

                {/* 2. Slippage Estimate */}
                <div className="flex items-start justify-between gap-2 py-1 border-t border-slate-800/80">
                  <div>
                    <div className="text-slate-200 font-semibold flex items-center gap-1.5">
                      <span>2. Slippage Estimate</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded border ${
                          isMarketOrder
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        }`}
                      >
                        {isMarketOrder ? `~${estimatedSlippagePct.toFixed(3)}% dynamic` : '0.00% Guaranteed'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                      {isMarketOrder
                        ? 'Projected price impact crossing spread against active order book depth'
                        : 'Limit orders match only at or better than your specified price; zero slippage'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`font-bold ${isMarketOrder ? 'text-amber-400' : 'text-emerald-400'}`}>
                      ${estimatedSlippageCost.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-slate-500 block font-sans">
                      {isMarketOrder ? `~${estimatedSlippagePct.toFixed(3)}%` : 'Protected'}
                    </span>
                  </div>
                </div>

                {/* 3. Liquidity Node Clearing / Settlement */}
                <div className="flex items-start justify-between gap-2 py-1 border-t border-slate-800/80">
                  <div>
                    <div className="text-slate-200 font-semibold flex items-center gap-1.5">
                      <span>3. Liquidity Node Relay / Clearing</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                      High-frequency matching engine & margin account settlement buffer
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-white font-bold">${liquiditySettlementFee.toFixed(2)}</span>
                    <span className="text-[9px] text-slate-500 block font-sans">Fixed buffer</span>
                  </div>
                </div>

                {/* Total Immediate Entry Cost */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-700 bg-slate-950/60 p-2 rounded-lg">
                  <div>
                    <span className="text-slate-200 font-bold text-xs block">Total Immediate Entry Cost</span>
                    <span className="text-[10px] text-slate-400 font-sans">
                      Deducted upon contract opening
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-cyan-400 font-bold text-sm block">
                      ${totalImmediateCost.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans">
                      {marginDragPct.toFixed(2)}% of margin
                    </span>
                  </div>
                </div>
              </div>

              {/* Round-Trip & Break-Even Telemetry */}
              <div className="p-3 bg-gradient-to-r from-amber-950/30 to-slate-900 border border-amber-500/30 rounded-xl space-y-2 text-[11px]">
                <div className="flex items-center justify-between text-amber-300 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-amber-400" />
                    <span>Projected Round-Trip Cost (Open + Close)</span>
                  </span>
                  <span className="text-xs">${totalRoundTripProjectedCost.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-amber-900/40 text-slate-300">
                  <div>
                    <span className="text-slate-500 block">Total Collateral Drag</span>
                    <span className="font-semibold text-white mt-0.5 block">
                      {roundTripMarginDragPct.toFixed(2)}% of initial margin
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Required Break-Even Movement</span>
                    <span className="font-semibold text-emerald-400 mt-0.5 block">
                      ±${totalBreakEvenDollarDelta.toFixed(currentAsset.decimals)} ({totalBreakEvenPct.toFixed(2)}%)
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-sans pt-1 border-t border-amber-900/40">
                  {side === 'LONG' ? (
                    <span>
                      Asset must rise above <strong className="text-white">${(effectivePrice + totalBreakEvenDollarDelta).toFixed(currentAsset.decimals)}</strong> to net positive after all fees and estimated slippage.
                    </span>
                  ) : (
                    <span>
                      Asset must drop below <strong className="text-white">${(effectivePrice - totalBreakEvenDollarDelta).toFixed(currentAsset.decimals)}</strong> to net positive after all fees and estimated slippage.
                    </span>
                  )}
                </div>
              </div>

              {/* Pro Execution Insight */}
              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 text-[10px] text-slate-400 font-sans flex items-start gap-2">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-slate-200">Execution Pro Tip:</strong> Switching from Market to Limit order removes all taker slippage, instantly saving up to <strong className="text-emerald-400">${estimatedSlippageCost.toFixed(2)}</strong> on this order.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-800 bg-[#0d121f] flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-sans">Dynamic real-time calculation</span>
              <button
                type="button"
                onClick={() => setFeeDetailModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
