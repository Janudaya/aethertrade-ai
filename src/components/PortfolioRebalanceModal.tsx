import React, { useState, useMemo } from 'react';
import {
  Scale,
  X,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Zap,
  Sliders,
  Sparkles,
  RefreshCw,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  ShieldCheck,
  Check,
  Percent,
  HelpCircle,
  Info,
  DollarSign,
  Activity,
  ArrowRightLeft,
} from 'lucide-react';
import { Position, Asset, OrderPlacementPayload } from '../types';

export type RebalanceModelType = 'EQUAL_WEIGHT' | 'RISK_PARITY' | 'CUSTOM';

interface PortfolioRebalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  positions: Position[];
  assets: Asset[];
  portfolioBalance: number;
  onPlaceOrder?: (orderData: OrderPlacementPayload) => void;
  onPlaceBatchOrders?: (orders: OrderPlacementPayload[]) => { success: boolean; count: number; error?: string };
  onClosePosition?: (positionId: string, reason?: 'MANUAL' | 'TAKE_PROFIT' | 'STOP_LOSS' | 'TRAILING_STOP' | 'AI_AGENT') => void;
  onSelectAsset?: (asset: Asset) => void;
}

export interface ProposedTransaction {
  id: string;
  symbol: string;
  asset: Asset;
  action: 'BUY' | 'TRIM' | 'BALANCED';
  currentWeightPct: number;
  targetWeightPct: number;
  currentMargin: number;
  targetMargin: number;
  marginDelta: number;
  suggestedQty: number;
  estimatedPrice: number;
  estimatedFee: number;
  volatilityPct: number;
  riskContributionPct: number;
  existingPositionId?: string;
  selected: boolean;
}

export const PortfolioRebalanceModal: React.FC<PortfolioRebalanceModalProps> = ({
  isOpen,
  onClose,
  positions,
  assets,
  portfolioBalance,
  onPlaceOrder,
  onPlaceBatchOrders,
  onClosePosition,
  onSelectAsset,
}) => {
  // Model: Equal-Weight (1/N) vs Risk-Parity (Inverse Volatility 1/σ) vs Custom
  const [modelType, setModelType] = useState<RebalanceModelType>('EQUAL_WEIGHT');

  // Scope: Active positions only vs Entire core universe
  const [rebalanceScope, setRebalanceScope] = useState<'active' | 'universe'>('active');

  // Deployment target % of total equity
  const [targetDeployPct, setTargetDeployPct] = useState<number>(50);

  // Custom weights map: symbol -> percentage
  const [customWeights, setCustomWeights] = useState<Record<string, number>>({});

  // Confirmation view step: 'plan' | 'confirm'
  const [viewStep, setViewStep] = useState<'plan' | 'confirm'>('plan');

  // Transactions selection map
  const [selectedTrades, setSelectedTrades] = useState<Record<string, boolean>>({});

  // Feedback banner state
  const [executionFeedback, setExecutionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string[];
  } | null>(null);

  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // Compute total equity
  const unrealizedPnL = useMemo(() => positions.reduce((acc, p) => acc + p.pnl, 0), [positions]);
  const totalEquity = Math.max(100, portfolioBalance + unrealizedPnL);

  // Determine list of candidate assets based on scope
  const candidateAssets = useMemo(() => {
    if (rebalanceScope === 'active' && positions.length > 0) {
      const activeSymbols = Array.from(new Set(positions.map((p) => p.symbol)));
      return assets.filter((a) => activeSymbols.includes(a.symbol));
    }
    // Fallback or Universe mode: top 5 diversified assets
    return assets.slice(0, 5);
  }, [rebalanceScope, positions, assets]);

  // Calculate volatility (σ) for each candidate asset (normalized 24h range & sparkline)
  const assetVolatilities = useMemo(() => {
    const volMap: Record<string, number> = {};

    candidateAssets.forEach((a) => {
      // Intraday range volatility proxy
      let vol = a.price > 0 ? ((a.high24h - a.low24h) / a.price) * 100 : 3.0;

      // Also factor sparkline standard deviation if available
      if (a.sparkline && a.sparkline.length > 2) {
        const mean = a.sparkline.reduce((sum, v) => sum + v, 0) / a.sparkline.length;
        const variance =
          a.sparkline.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / a.sparkline.length;
        const stdDev = Math.sqrt(variance);
        const stdDevPct = mean > 0 ? (stdDev / mean) * 100 : 2.0;
        vol = Number(((vol * 0.6 + stdDevPct * 0.4) * 1.5).toFixed(2));
      }

      // Bound between 0.8% and 25%
      volMap[a.symbol] = Math.max(0.8, Math.min(25, Number(vol.toFixed(2))));
    });

    return volMap;
  }, [candidateAssets]);

  // Compute Target Weights according to selected Model
  const targetWeights = useMemo(() => {
    const weights: Record<string, number> = {};
    const n = candidateAssets.length;

    if (n === 0) return weights;

    if (modelType === 'EQUAL_WEIGHT') {
      // 1/N equal weighting
      const equalPct = Number((100 / n).toFixed(2));
      candidateAssets.forEach((a) => {
        weights[a.symbol] = equalPct;
      });
    } else if (modelType === 'RISK_PARITY') {
      // Inverse-volatility weighting: w_i = (1 / σ_i) / Σ(1 / σ_j)
      let sumInvVol = 0;
      candidateAssets.forEach((a) => {
        const vol = assetVolatilities[a.symbol] || 3.0;
        sumInvVol += 1 / vol;
      });

      candidateAssets.forEach((a) => {
        const vol = assetVolatilities[a.symbol] || 3.0;
        const invVol = 1 / vol;
        const weightPct = Number(((invVol / sumInvVol) * 100).toFixed(1));
        weights[a.symbol] = weightPct;
      });
    } else if (modelType === 'CUSTOM') {
      // User custom weights
      candidateAssets.forEach((a) => {
        weights[a.symbol] = customWeights[a.symbol] ?? Number((100 / n).toFixed(1));
      });
    }

    return weights;
  }, [candidateAssets, modelType, assetVolatilities, customWeights]);

  // Total target capital to allocate across portfolio
  const totalTargetCapital = (totalEquity * targetDeployPct) / 100;

  // Generate proposed transactions
  const proposedTransactions = useMemo<ProposedTransaction[]>(() => {
    const totalCurrentDeployed = positions.reduce((acc, p) => acc + p.margin, 0);

    return candidateAssets.map((asset) => {
      const matchingPositions = positions.filter((p) => p.symbol === asset.symbol);
      const currentMargin = matchingPositions.reduce((acc, p) => acc + p.margin, 0);
      const currentWeightPct =
        totalCurrentDeployed > 0 ? (currentMargin / totalCurrentDeployed) * 100 : 0;

      const targetWeightPct = targetWeights[asset.symbol] || 0;
      const targetMargin = Math.round((totalTargetCapital * targetWeightPct) / 100);
      const marginDelta = targetMargin - currentMargin;

      let action: 'BUY' | 'TRIM' | 'BALANCED' = 'BALANCED';
      if (marginDelta > 25) {
        action = 'BUY';
      } else if (marginDelta < -25) {
        action = 'TRIM';
      }

      const notionalDelta = Math.abs(marginDelta * 5); // 5x leverage standard
      const suggestedQty =
        asset.price > 0
          ? Number((notionalDelta / asset.price).toFixed(asset.decimals > 2 ? 4 : 2))
          : 0;

      const estimatedFee = Number((notionalDelta * 0.001).toFixed(2)); // 0.1% fee
      const vol = assetVolatilities[asset.symbol] || 3.0;
      const riskContributionPct = Number(((targetWeightPct * vol) / 100).toFixed(2));

      const isSelected = selectedTrades[asset.symbol] ?? (action !== 'BALANCED');

      return {
        id: `rebal-${asset.symbol}`,
        symbol: asset.symbol,
        asset,
        action,
        currentWeightPct: Number(currentWeightPct.toFixed(1)),
        targetWeightPct,
        currentMargin,
        targetMargin,
        marginDelta,
        suggestedQty,
        estimatedPrice: asset.price,
        estimatedFee,
        volatilityPct: vol,
        riskContributionPct,
        existingPositionId: matchingPositions[0]?.id,
        selected: isSelected,
      };
    });
  }, [
    candidateAssets,
    positions,
    targetWeights,
    totalTargetCapital,
    assetVolatilities,
    selectedTrades,
  ]);

  // Total Turnover and Trades Count
  const actionableTrades = useMemo(
    () => proposedTransactions.filter((t) => t.action !== 'BALANCED' && t.selected),
    [proposedTransactions]
  );

  const totalTurnoverRequired = useMemo(
    () => actionableTrades.reduce((acc, t) => acc + Math.abs(t.marginDelta), 0),
    [actionableTrades]
  );

  const totalEstimatedFees = useMemo(
    () => actionableTrades.reduce((acc, t) => acc + t.estimatedFee, 0),
    [actionableTrades]
  );

  const buysCount = actionableTrades.filter((t) => t.action === 'BUY').length;
  const trimsCount = actionableTrades.filter((t) => t.action === 'TRIM').length;

  // Toggle trade selection in proposed list
  const handleToggleSelectTrade = (symbol: string) => {
    setSelectedTrades((prev) => ({
      ...prev,
      [symbol]: !(prev[symbol] ?? true),
    }));
  };

  // Execute Rebalancing Plan
  const handleExecuteConfirmedRebalance = async () => {
    setIsExecuting(true);
    setExecutionFeedback(null);

    try {
      const buyOrders: OrderPlacementPayload[] = [];
      const trimmedSymbols: string[] = [];

      // 1. Process Trims / Sells
      actionableTrades.forEach((trade) => {
        if (trade.action === 'TRIM') {
          // If closing or trimming an existing position
          if (trade.existingPositionId && onClosePosition) {
            onClosePosition(trade.existingPositionId, 'MANUAL');
            trimmedSymbols.push(trade.symbol);
          }
        }
      });

      // 2. Process Buys / Expansions
      actionableTrades.forEach((trade) => {
        if (trade.action === 'BUY' && trade.marginDelta > 0) {
          buyOrders.push({
            symbol: trade.symbol,
            side: 'LONG',
            type: 'MARKET',
            price: trade.asset.price,
            margin: trade.marginDelta,
            leverage: 5,
          });
        }
      });

      // Place buys batch or individually
      if (buyOrders.length > 0) {
        if (onPlaceBatchOrders) {
          onPlaceBatchOrders(buyOrders);
        } else if (onPlaceOrder) {
          buyOrders.forEach((o) => onPlaceOrder(o));
        }
      }

      setExecutionFeedback({
        type: 'success',
        message: `Portfolio successfully rebalanced! Executed ${actionableTrades.length} trades (${buysCount} Buys, ${trimsCount} Trims).`,
        details: actionableTrades.map(
          (t) =>
            `${t.action === 'BUY' ? 'Added' : 'Trimmed'} $${Math.abs(t.marginDelta)} in ${t.symbol} (Target: ${t.targetWeightPct}%)`
        ),
      });

      setViewStep('plan');
    } catch (err: any) {
      setExecutionFeedback({
        type: 'error',
        message: err?.message || 'Error occurred while executing rebalancing orders.',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="bg-[#0b0e17] border border-indigo-500/40 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl relative font-mono text-xs overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0e1320] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-cyan-600 to-teal-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-400/30">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Portfolio Rebalancer Utility
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  {modelType === 'RISK_PARITY'
                    ? 'RISK-PARITY (1/σ)'
                    : modelType === 'EQUAL_WEIGHT'
                    ? 'EQUAL-WEIGHT (1/N)'
                    : 'CUSTOM ALLOCATION'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Calculates and stages target trades to realign holdings to an equal-weight or risk-parity distribution.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Model Selection & Parameters Strip */}
        <div className="p-3 sm:px-5 bg-[#0d121f] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Distribution Model Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setModelType('EQUAL_WEIGHT');
                setViewStep('plan');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                modelType === 'EQUAL_WEIGHT'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Percent className="w-3 h-3" />
              <span>Equal-Weight (1/N)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModelType('RISK_PARITY');
                setViewStep('plan');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                modelType === 'RISK_PARITY'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Weights assets inversely to their volatility so every holding contributes equal risk"
            >
              <ShieldCheck className="w-3 h-3 text-indigo-300" />
              <span>Risk-Parity (1/Vol)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModelType('CUSTOM');
                setViewStep('plan');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                modelType === 'CUSTOM'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>Custom Weights</span>
            </button>
          </div>

          {/* Scope Selector: Active Positions vs All Core Universe */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-sans">Scope:</span>
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setRebalanceScope('active')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  rebalanceScope === 'active'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Active Positions ({positions.length})
              </button>
              <button
                type="button"
                onClick={() => setRebalanceScope('universe')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  rebalanceScope === 'universe'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Core Universe ({assets.length})
              </button>
            </div>
          </div>
        </div>

        {/* Telemetry Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:px-5 bg-slate-900/40 border-b border-slate-800/80 text-[11px]">
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-bold">Total Portfolio Equity</span>
            <div className="text-sm font-bold text-white mt-1">
              ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-bold">Target Capital Deploy</span>
            <div className="text-sm font-bold text-cyan-400 mt-1">
              ${totalTargetCapital.toLocaleString()} ({targetDeployPct}%)
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-bold">Proposed Transactions</span>
            <div className="text-sm font-bold text-indigo-300 mt-1">
              {actionableTrades.length} Trades ({buysCount}W Buy / {trimsCount}L Trim)
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-bold">Turnover Required</span>
            <div className="text-sm font-bold text-amber-400 mt-1">
              ${totalTurnoverRequired.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {executionFeedback && (
          <div
            className={`mx-4 mt-3 p-3 rounded-xl border text-xs font-mono animate-in fade-in duration-150 ${
              executionFeedback.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                : 'bg-rose-950/80 border-rose-500/60 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {executionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{executionFeedback.message}</span>
            </div>
            {executionFeedback.details && executionFeedback.details.length > 0 && (
              <div className="mt-2 pl-6 space-y-0.5 text-[11px] text-slate-300">
                {executionFeedback.details.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="text-emerald-400">•</span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* STEP 1: PROPOSED TRANSACTIONS & REBALANCE PLAN */}
          {viewStep === 'plan' && (
            <div className="space-y-4">
              {/* Distribution Methodology Explanation */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  {modelType === 'RISK_PARITY' ? (
                    <span>
                      <strong className="text-white">Risk-Parity Model (1/σ):</strong> Weights each asset inversely to its volatility ($\sigma$). Assets with lower volatility (e.g. Gold Spot, Forex) receive larger allocations, while higher-volatility assets receive smaller allocations, ensuring each holding contributes equal risk to the portfolio.
                    </span>
                  ) : modelType === 'EQUAL_WEIGHT' ? (
                    <span>
                      <strong className="text-white">Equal-Weight Model (1/N):</strong> Allocates an equal dollar margin ({Number((100 / Math.max(1, candidateAssets.length)).toFixed(1))}%) across all candidate assets. Trims overweighted positions and buys into underweighted positions.
                    </span>
                  ) : (
                    <span>
                      <strong className="text-white">Custom Target Model:</strong> Adjust target percentages for each asset below to design your bespoke multi-asset allocation.
                    </span>
                  )}
                </div>
              </div>

              {/* Transactions Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase">
                  <span>Proposed Rebalance Trades ({proposedTransactions.length} Assets)</span>
                  <span>Target Weight & Trade Delta</span>
                </div>

                <div className="divide-y divide-slate-800/80">
                  {proposedTransactions.map((trade) => {
                    const isBuy = trade.action === 'BUY';
                    const isTrim = trade.action === 'TRIM';

                    return (
                      <div
                        key={trade.symbol}
                        className={`p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                          trade.selected
                            ? 'bg-slate-900/40 hover:bg-slate-900/70'
                            : 'opacity-60 bg-slate-950/50'
                        }`}
                      >
                        {/* Left: Checkbox + Asset Info */}
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <input
                            type="checkbox"
                            checked={trade.selected}
                            onChange={() => handleToggleSelectTrade(trade.symbol)}
                            disabled={trade.action === 'BALANCED'}
                            className="rounded accent-indigo-500 cursor-pointer w-3.5 h-3.5"
                          />

                          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
                            {trade.symbol.slice(0, 3)}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white">{trade.symbol}</span>
                              <span className="text-[10px] text-slate-400 font-sans">
                                (${trade.asset.price.toLocaleString()})
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>Vol: {trade.volatilityPct}%</span>
                              <span>•</span>
                              <span>Risk Contrib: {trade.riskContributionPct}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Middle: Current vs Target Weight Visual Bar */}
                        <div className="flex-1 px-0 sm:px-4 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">
                              Current: <strong className="text-white">{trade.currentWeightPct}%</strong> (${trade.currentMargin})
                            </span>
                            <span className="text-slate-300">
                              Target: <strong className="text-indigo-400">{trade.targetWeightPct}%</strong> (${trade.targetMargin})
                            </span>
                          </div>

                          {/* Progress bar comparison */}
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden flex">
                            <div
                              className="bg-slate-600 h-full transition-all"
                              style={{ width: `${Math.min(100, trade.currentWeightPct)}%` }}
                              title={`Current: ${trade.currentWeightPct}%`}
                            />
                            <div
                              className="bg-indigo-500 h-full opacity-60 transition-all"
                              style={{ width: `${Math.min(100, trade.targetWeightPct)}%` }}
                              title={`Target: ${trade.targetWeightPct}%`}
                            />
                          </div>
                        </div>

                        {/* Right: Trade Action & Delta */}
                        <div className="flex items-center gap-3 justify-end shrink-0">
                          {isBuy && (
                            <div className="text-right">
                              <div className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold text-[11px] inline-flex items-center gap-1">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>Buy +${trade.marginDelta.toLocaleString()}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                ~{trade.suggestedQty} units
                              </div>
                            </div>
                          )}

                          {isTrim && (
                            <div className="text-right">
                              <div className="px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-300 font-bold text-[11px] inline-flex items-center gap-1">
                                <ArrowDownRight className="w-3.5 h-3.5" />
                                <span>Trim -${Math.abs(trade.marginDelta).toLocaleString()}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                ~{trade.suggestedQty} units
                              </div>
                            </div>
                          )}

                          {!isBuy && !isTrim && (
                            <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 text-[10px] font-semibold border border-slate-800">
                              Balanced
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PRE-FLIGHT CONFIRMATION DIALOG */}
          {viewStep === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Pre-Flight Rebalance Confirmation</span>
                </div>
                <p className="text-xs text-slate-300 font-sans">
                  Please review the proposed execution basket below. Executing this batch will systematically place market orders to align your active positions with the{' '}
                  <strong className="text-white">{modelType}</strong> target weights.
                </p>
              </div>

              {/* Order Basket Summary */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase">
                  <span>Trade Order Execution Basket</span>
                  <span>Estimated Total Fees: ~${totalEstimatedFees.toFixed(2)}</span>
                </div>

                <div className="divide-y divide-slate-800/80">
                  {actionableTrades.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-14 text-center py-0.5 rounded text-[10px] font-bold ${
                            t.action === 'BUY'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {t.action}
                        </span>
                        <div>
                          <span className="font-bold text-white">{t.symbol}</span>
                          <span className="text-[10px] text-slate-500 ml-2">
                            Market Price: ${t.estimatedPrice.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="font-bold text-white">
                            {t.action === 'BUY' ? '+' : '-'}${Math.abs(t.marginDelta).toLocaleString()} Margin
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {t.currentWeightPct}% → {t.targetWeightPct}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation & Execution Action */}
        <div className="p-3 sm:px-5 border-t border-slate-800 bg-[#0d121f] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 font-sans text-[11px]">
            {actionableTrades.length > 0 ? (
              <span>
                Total Turnover: <strong className="text-amber-400 font-mono">${totalTurnoverRequired.toLocaleString()}</strong> across{' '}
                <strong className="text-white font-mono">{actionableTrades.length}</strong> proposed trades.
              </span>
            ) : (
              <span>Portfolio is already within target drift bounds.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {viewStep === 'confirm' ? (
              <>
                <button
                  type="button"
                  onClick={() => setViewStep('plan')}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold transition-colors cursor-pointer"
                >
                  ← Back to Plan
                </button>
                <button
                  type="button"
                  disabled={isExecuting || actionableTrades.length === 0}
                  onClick={handleExecuteConfirmedRebalance}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none hover:scale-105 active:scale-95"
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing Orders...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Execute {actionableTrades.length} Trades</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={actionableTrades.length === 0}
                  onClick={() => setViewStep('confirm')}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none hover:scale-105 active:scale-95"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Review & Confirm Rebalance ({actionableTrades.length})</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
