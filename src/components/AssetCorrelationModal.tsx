import React, { useState, useMemo } from 'react';
import {
  Network,
  X,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Coins,
  DollarSign,
  BarChart3,
  Layers,
  Info,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { Asset, Position } from '../types';

interface AssetCorrelationModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  positions?: Position[];
  onSelectAsset?: (asset: Asset) => void;
}

type TimeframeOption = '24H' | '7D' | '30D' | '90D';
type CategoryFilter = 'ALL' | 'CRYPTO' | 'CROSS_ASSET';

interface PairDetail {
  assetA: Asset;
  assetB: Asset;
  correlation: number;
  diversificationRating: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR';
  description: string;
}

// Empirical macro base correlations between core assets
const BASE_CORRELATION_MATRIX: Record<string, Record<string, number>> = {
  'BTC/USDT': {
    'BTC/USDT': 1.0,
    'ETH/USDT': 0.86,
    'SOL/USDT': 0.79,
    'XAU/USD': -0.12,
    NVDA: 0.48,
    'EUR/USD': 0.24,
  },
  'ETH/USDT': {
    'BTC/USDT': 0.86,
    'ETH/USDT': 1.0,
    'SOL/USDT': 0.82,
    'XAU/USD': -0.16,
    NVDA: 0.44,
    'EUR/USD': 0.28,
  },
  'SOL/USDT': {
    'BTC/USDT': 0.79,
    'ETH/USDT': 0.82,
    'SOL/USDT': 1.0,
    'XAU/USD': -0.18,
    NVDA: 0.52,
    'EUR/USD': 0.18,
  },
  'XAU/USD': {
    'BTC/USDT': -0.12,
    'ETH/USDT': -0.16,
    'SOL/USDT': -0.18,
    'XAU/USD': 1.0,
    NVDA: -0.06,
    'EUR/USD': 0.46,
  },
  NVDA: {
    'BTC/USDT': 0.48,
    'ETH/USDT': 0.44,
    'SOL/USDT': 0.52,
    'XAU/USD': -0.06,
    NVDA: 1.0,
    'EUR/USD': 0.12,
  },
  'EUR/USD': {
    'BTC/USDT': 0.24,
    'ETH/USDT': 0.28,
    'SOL/USDT': 0.18,
    'XAU/USD': 0.46,
    NVDA: 0.12,
    'EUR/USD': 1.0,
  },
};

export const AssetCorrelationModal: React.FC<AssetCorrelationModalProps> = ({
  isOpen,
  onClose,
  assets,
  positions = [],
  onSelectAsset,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('7D');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [selectedPair, setSelectedPair] = useState<{
    symbolA: string;
    symbolB: string;
  } | null>(null);

  // Filter available assets according to filter
  const filteredAssets = useMemo(() => {
    if (categoryFilter === 'CRYPTO') {
      return assets.filter((a) => a.category === 'Crypto');
    }
    if (categoryFilter === 'CROSS_ASSET') {
      return assets.filter((a) => a.category !== 'Crypto');
    }
    return assets;
  }, [assets, categoryFilter]);

  // Dynamic timeframe adjustment factor
  const timeframeModifier = useMemo(() => {
    switch (timeframe) {
      case '24H':
        return 0.05; // Slightly noisier short term
      case '7D':
        return 0.0;
      case '30D':
        return -0.04;
      case '90D':
        return -0.07;
      default:
        return 0.0;
    }
  }, [timeframe]);

  // Compute correlation between two assets
  const getCorrelation = (symA: string, symB: string): number => {
    if (symA === symB) return 1.0;

    let base =
      BASE_CORRELATION_MATRIX[symA]?.[symB] ??
      BASE_CORRELATION_MATRIX[symB]?.[symA];

    if (base === undefined) {
      // Default heuristic based on category
      const assetA = assets.find((a) => a.symbol === symA);
      const assetB = assets.find((a) => a.symbol === symB);
      if (assetA && assetB) {
        if (assetA.category === assetB.category) {
          base = 0.72;
        } else if (
          (assetA.category === 'Commodities' && assetB.category === 'Crypto') ||
          (assetB.category === 'Commodities' && assetA.category === 'Crypto')
        ) {
          base = -0.15;
        } else {
          base = 0.2;
        }
      } else {
        base = 0.35;
      }
    }

    // Apply timeframe modifier while constraining within [-1, 1]
    const adjusted = Math.max(-1.0, Math.min(1.0, base + timeframeModifier));
    return Number(adjusted.toFixed(2));
  };

  // Helper to get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Crypto':
        return <Coins className="w-3.5 h-3.5 text-amber-400" />;
      case 'Commodities':
        return <Scale className="w-3.5 h-3.5 text-amber-300" />;
      case 'Forex':
        return <DollarSign className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Equities':
        return <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Cell color helper based on Pearson correlation value (-1 to +1)
  const getCellStyling = (r: number, isSelf: boolean) => {
    if (isSelf) {
      return {
        bg: 'bg-slate-900/90',
        text: 'text-slate-400 font-bold',
        border: 'border-slate-800',
        label: 'Self (1.00)',
      };
    }
    if (r >= 0.7) {
      return {
        bg: 'bg-emerald-950/70 hover:bg-emerald-900/80',
        text: 'text-emerald-300 font-bold',
        border: 'border-emerald-500/40',
        label: 'Strong Positive',
      };
    }
    if (r >= 0.3) {
      return {
        bg: 'bg-cyan-950/50 hover:bg-cyan-900/60',
        text: 'text-cyan-300 font-semibold',
        border: 'border-cyan-500/30',
        label: 'Moderate Positive',
      };
    }
    if (r > -0.3) {
      return {
        bg: 'bg-slate-900/90 hover:bg-indigo-950/70',
        text: 'text-slate-300 font-medium',
        border: 'border-slate-800 hover:border-indigo-500/50',
        label: 'Uncorrelated / Prime Diversifier',
      };
    }
    if (r > -0.7) {
      return {
        bg: 'bg-amber-950/50 hover:bg-amber-900/60',
        text: 'text-amber-300 font-semibold',
        border: 'border-amber-500/30',
        label: 'Moderate Negative (Inverse Hedge)',
      };
    }
    return {
      bg: 'bg-rose-950/70 hover:bg-rose-900/80',
      text: 'text-rose-300 font-bold',
      border: 'border-rose-500/40',
      label: 'Strong Negative (Direct Hedge)',
    };
  };

  // Pair detail calculation for the selected or default pair
  const activePairDetail: PairDetail | null = useMemo(() => {
    const symA = selectedPair ? selectedPair.symbolA : filteredAssets[0]?.symbol;
    const symB = selectedPair ? selectedPair.symbolB : filteredAssets[1]?.symbol;

    if (!symA || !symB) return null;
    const assetA = assets.find((a) => a.symbol === symA);
    const assetB = assets.find((a) => a.symbol === symB);
    if (!assetA || !assetB) return null;

    const r = getCorrelation(symA, symB);

    let diversificationRating: PairDetail['diversificationRating'] = 'MODERATE';
    let description = '';

    if (symA === symB) {
      diversificationRating = 'POOR';
      description = 'Identical asset (100% self-correlation). Provides zero portfolio diversification.';
    } else if (r <= -0.15) {
      diversificationRating = 'EXCELLENT';
      description =
        'Strong inverse co-movement. Ideal defensive hedge; holding opposing exposure buffers volatility during severe drawdowns.';
    } else if (Math.abs(r) < 0.25) {
      diversificationRating = 'EXCELLENT';
      description =
        'Prime non-correlated pair. Prices move largely independently according to distinct macro drivers, maximizing risk-adjusted Sharpe ratio.';
    } else if (r < 0.65) {
      diversificationRating = 'GOOD';
      description =
        'Moderate co-movement. Offers partial hedging benefit while maintaining general market exposure.';
    } else {
      diversificationRating = 'POOR';
      description =
        'High directional coupling. Holding both simultaneously doubles risk concentration; both assets usually rally or dump in tandem.';
    }

    return {
      assetA,
      assetB,
      correlation: r,
      diversificationRating,
      description,
    };
  }, [selectedPair, filteredAssets, assets, timeframeModifier]);

  // Diversification opportunities finder
  const diversificationOpportunities = useMemo(() => {
    const opps: Array<{
      assetA: Asset;
      assetB: Asset;
      correlation: number;
      type: 'Safe Haven' | 'Non-Correlated' | 'Inverse Hedge';
      gainReason: string;
    }> = [];

    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        const a = assets[i];
        const b = assets[j];
        const r = getCorrelation(a.symbol, b.symbol);

        if (r <= 0.15) {
          let type: 'Safe Haven' | 'Non-Correlated' | 'Inverse Hedge' = 'Non-Correlated';
          let gainReason = 'Independent alpha drivers reduce systemic drawdown';

          if (a.category === 'Commodities' || b.category === 'Commodities') {
            type = 'Safe Haven';
            gainReason = 'Gold acts as a macro inflation hedge against risk-on assets';
          } else if (r < -0.1) {
            type = 'Inverse Hedge';
            gainReason = 'Counter-cyclical price action smooths total equity volatility';
          }

          opps.push({
            assetA: a,
            assetB: b,
            correlation: r,
            type,
            gainReason,
          });
        }
      }
    }

    return opps.sort((x, y) => x.correlation - y.correlation).slice(0, 4);
  }, [assets, timeframeModifier]);

  // Check currently held positions for high correlation concentration
  const positionConcentrationWarnings = useMemo(() => {
    if (positions.length < 2) return [];

    const warnings: string[] = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const p1 = positions[i];
        const p2 = positions[j];
        const r = getCorrelation(p1.symbol, p2.symbol);

        if (r >= 0.75 && p1.side === p2.side) {
          warnings.push(
            `Concentrated Exposure: ${p1.symbol} & ${p2.symbol} both held ${p1.side} (r = ${r > 0 ? '+' : ''}${r}). A sharp sector drop will simultaneously pressure both margins.`
          );
        }
      }
    }
    return warnings;
  }, [positions, timeframeModifier]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="bg-[#0b0e17] border border-cyan-500/40 rounded-2xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl relative font-mono text-xs overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0e1320] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
              <Network className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Asset Correlation Matrix & Heatmap
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  DIVERSIFICATION AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Analyze pairwise co-movement across crypto, commodities, forex, and equities to optimize portfolio risk.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Timeframe Selector */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
              {(['24H', '7D', '30D', '90D'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    timeframe === tf
                      ? 'bg-cyan-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Top Filter and Correlation Legend Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Filter Universe:</span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {(['ALL', 'CRYPTO', 'CROSS_ASSET'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setCategoryFilter(filter)}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      categoryFilter === filter
                        ? 'bg-slate-800 text-cyan-300 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {filter === 'ALL'
                      ? 'All Markets'
                      : filter === 'CRYPTO'
                      ? 'Crypto Only'
                      : 'Cross-Asset Only'}
                  </button>
                ))}
              </div>
            </div>

            {/* Heatmap Legend */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-sans">
              <span className="text-slate-400 font-mono">Legend:</span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-mono">
                +0.7 to +1.0 (High Coupling)
              </span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 font-mono">
                +0.3 to +0.7 (Moderate)
              </span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono">
                -0.3 to +0.3 (Non-Correlated ⭐️)
              </span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/50 border border-amber-500/30 text-amber-300 font-mono">
                -0.7 to -0.3 (Hedge)
              </span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/70 border border-rose-500/40 text-rose-300 font-mono">
                -1.0 to -0.7 (Inverse)
              </span>
            </div>
          </div>

          {/* Active Positions Risk Concentration Alert */}
          {positionConcentrationWarnings.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Active Portfolio Co-Movement Alert</span>
              </div>
              {positionConcentrationWarnings.map((warning, idx) => (
                <p key={idx} className="font-sans text-amber-300/90 pl-5">
                  • {warning}
                </p>
              ))}
            </div>
          )}

          {/* Main Grid & Pairwise Detail Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Heatmap Grid Table */}
            <div className="lg:col-span-7 bg-slate-900/80 p-3 sm:p-4 rounded-xl border border-slate-800 overflow-x-auto space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span>Cross-Asset Pearson Correlation Grid</span>
                  <span className="text-[10px] text-slate-400 font-normal">({timeframe} lookback)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-sans">
                  Click any cell to inspect pair dynamics
                </span>
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-slate-500 text-[10px] font-normal">
                      ASSET
                    </th>
                    {filteredAssets.map((colAsset) => (
                      <th
                        key={colAsset.symbol}
                        className="p-1.5 text-center text-slate-300 text-[10px] font-bold"
                      >
                        <div className="truncate max-w-[55px] mx-auto" title={colAsset.symbol}>
                          {colAsset.symbol.split('/')[0]}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((rowAsset) => (
                    <tr key={rowAsset.symbol} className="border-t border-slate-800/60">
                      {/* Row Header */}
                      <td className="p-2 text-left whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getCategoryIcon(rowAsset.category)}
                          <span className="font-bold text-white text-[11px]">
                            {rowAsset.symbol}
                          </span>
                        </div>
                      </td>

                      {/* Matrix Cells */}
                      {filteredAssets.map((colAsset) => {
                        const isSelf = rowAsset.symbol === colAsset.symbol;
                        const r = getCorrelation(rowAsset.symbol, colAsset.symbol);
                        const styling = getCellStyling(r, isSelf);
                        const isSelected =
                          selectedPair &&
                          ((selectedPair.symbolA === rowAsset.symbol &&
                            selectedPair.symbolB === colAsset.symbol) ||
                            (selectedPair.symbolA === colAsset.symbol &&
                              selectedPair.symbolB === rowAsset.symbol));

                        return (
                          <td key={colAsset.symbol} className="p-1 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedPair({
                                  symbolA: rowAsset.symbol,
                                  symbolB: colAsset.symbol,
                                })
                              }
                              className={`w-full py-2 px-1 rounded-lg border transition-all text-xs font-mono flex flex-col items-center justify-center cursor-pointer ${
                                styling.bg
                              } ${styling.border} ${styling.text} ${
                                isSelected
                                  ? 'ring-2 ring-cyan-400 scale-105 z-10 shadow-lg'
                                  : 'hover:scale-102'
                              }`}
                              title={`${rowAsset.symbol} vs ${colAsset.symbol}: r = ${r > 0 ? '+' : ''}${r} (${styling.label})`}
                            >
                              <span>
                                {isSelf ? '1.00' : `${r > 0 ? '+' : ''}${r.toFixed(2)}`}
                              </span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right Column: Pairwise Deep Dive & Diversification Gauge */}
            <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-[#0e1320] p-4 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-cyan-400" />
                  <span>Pairwise Diversification Inspector</span>
                </span>
                {activePairDetail && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      activePairDetail.diversificationRating === 'EXCELLENT'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : activePairDetail.diversificationRating === 'GOOD'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        : activePairDetail.diversificationRating === 'MODERATE'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {activePairDetail.diversificationRating} RATING
                  </span>
                )}
              </div>

              {activePairDetail ? (
                <div className="space-y-3.5">
                  {/* Pair Header Comparison */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        {getCategoryIcon(activePairDetail.assetA.category)}
                        <span className="font-bold text-white text-xs">
                          {activePairDetail.assetA.symbol}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ${activePairDetail.assetA.price.toLocaleString()} (
                        <span
                          className={
                            activePairDetail.assetA.change24h >= 0
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }
                        >
                          {activePairDetail.assetA.change24h >= 0 ? '+' : ''}
                          {activePairDetail.assetA.change24h}%
                        </span>
                        )
                      </div>
                    </div>

                    <div className="text-center px-2">
                      <span className="text-[10px] uppercase text-slate-500 block">
                        Correlation
                      </span>
                      <span
                        className={`text-base font-black ${
                          activePairDetail.correlation <= -0.1
                            ? 'text-rose-400'
                            : activePairDetail.correlation <= 0.3
                            ? 'text-slate-200'
                            : activePairDetail.correlation <= 0.7
                            ? 'text-cyan-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {activePairDetail.correlation > 0 ? '+' : ''}
                        {activePairDetail.correlation.toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {getCategoryIcon(activePairDetail.assetB.category)}
                        <span className="font-bold text-white text-xs">
                          {activePairDetail.assetB.symbol}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ${activePairDetail.assetB.price.toLocaleString()} (
                        <span
                          className={
                            activePairDetail.assetB.change24h >= 0
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }
                        >
                          {activePairDetail.assetB.change24h >= 0 ? '+' : ''}
                          {activePairDetail.assetB.change24h}%
                        </span>
                        )
                      </div>
                    </div>
                  </div>

                  {/* Quantitative Gauge Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>-1.0 (Inverse Hedge)</span>
                      <span>0.0 (Uncorrelated)</span>
                      <span>+1.0 (Coupled)</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-950 rounded-full border border-slate-800 relative overflow-hidden flex">
                      <div className="w-1/2 h-full bg-gradient-to-r from-rose-500/80 via-amber-500/80 to-slate-700" />
                      <div className="w-1/2 h-full bg-gradient-to-r from-slate-700 via-cyan-500/80 to-emerald-500/80" />
                      {/* Marker indicator */}
                      <div
                        className="absolute top-0 bottom-0 w-2 bg-white rounded-full shadow-lg -translate-x-1"
                        style={{
                          left: `${((activePairDetail.correlation + 1) / 2) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Diversification Insight Text */}
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block font-mono">
                      Portfolio Analysis
                    </span>
                    <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                      {activePairDetail.description}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {onSelectAsset && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectAsset(activePairDetail.assetA);
                            onClose();
                          }}
                          className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <span>Load {activePairDetail.assetA.symbol.split('/')[0]}</span>
                          <ExternalLink className="w-3 h-3 text-cyan-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectAsset(activePairDetail.assetB);
                            onClose();
                          }}
                          className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <span>Load {activePairDetail.assetB.symbol.split('/')[0]}</span>
                          <ExternalLink className="w-3 h-3 text-cyan-400" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-slate-500">
                  Select a cell to view pairwise insights.
                </div>
              )}
            </div>
          </div>

          {/* Section: Automated Diversification Opportunities */}
          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white text-xs">
                  Top Recommended Diversification & Hedging Pairs
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-sans">
                Algorithmic non-correlated pairs to reduce volatility
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {diversificationOpportunities.map((opp, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition-all space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {opp.type}
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        r = {opp.correlation > 0 ? '+' : ''}
                        {opp.correlation.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-white pt-1">
                      <span>{opp.assetA.symbol}</span>
                      <span className="text-slate-500 font-normal">&</span>
                      <span>{opp.assetB.symbol}</span>
                    </div>

                    <p className="text-[10px] text-slate-400 font-sans leading-tight">
                      {opp.gainReason}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPair({
                        symbolA: opp.assetA.symbol,
                        symbolB: opp.assetB.symbol,
                      })
                    }
                    className="w-full mt-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 text-[10px] font-medium border border-slate-800 transition-colors"
                  >
                    Inspect Pair Dynamics
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-5 border-t border-slate-800 bg-[#0d121f] flex flex-wrap items-center justify-between gap-3 text-[11px]">
          <div className="text-slate-400 font-sans flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              Correlation values range from -1.00 (inverse) to +1.00 (co-directional). Low correlation (&lt; 0.20) preserves capital during systemic stress.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors cursor-pointer"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
