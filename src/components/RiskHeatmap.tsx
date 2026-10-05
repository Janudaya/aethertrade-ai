import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Layers,
  PieChart,
  Percent,
  RefreshCw,
  ExternalLink,
  Info,
} from 'lucide-react';
import { Position, Asset } from '../types';

interface RiskHeatmapProps {
  positions: Position[];
  portfolioBalance: number;
  assets: Asset[];
  onSelectAsset?: (asset: Asset) => void;
  onOpenAuditModal?: () => void;
}

export interface AssetExposureData {
  symbol: string;
  assetName: string;
  category: string;
  netSide: 'LONG' | 'SHORT' | 'HEDGED';
  totalMargin: number;
  totalNotional: number;
  avgLeverage: number;
  totalPnl: number;
  totalPnlPct: number;
  exposureShareOfEquity: number;
  exposureShareOfActive: number;
  positionsCount: number;
  minLiqDistancePct: number;
  riskTier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export const RiskHeatmap: React.FC<RiskHeatmapProps> = ({
  positions,
  portfolioBalance,
  assets,
  onSelectAsset,
}) => {
  const [sizeMode, setSizeMode] = useState<'notional' | 'margin' | 'riskWeighted'>('notional');
  const [colorMode, setColorMode] = useState<'pnl' | 'concentration' | 'direction'>('pnl');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  // AI Risk Audit state
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Calculate portfolio totals
  const totalUnrealizedPnl = useMemo(
    () => positions.reduce((acc, p) => acc + p.pnl, 0),
    [positions]
  );
  const portfolioEquity = Math.max(1, portfolioBalance + totalUnrealizedPnl);
  const totalAllocatedMargin = useMemo(
    () => positions.reduce((acc, p) => acc + p.margin, 0),
    [positions]
  );
  const marginUtilizationPct = (totalAllocatedMargin / portfolioEquity) * 100;

  // Group by Asset Symbol
  const assetExposures = useMemo<AssetExposureData[]>(() => {
    if (positions.length === 0) return [];

    const grouped: { [symbol: string]: Position[] } = {};
    positions.forEach((p) => {
      if (!grouped[p.symbol]) grouped[p.symbol] = [];
      grouped[p.symbol].push(p);
    });

    const totalActiveNotional = positions.reduce(
      (acc, p) => acc + p.margin * p.leverage,
      0
    );

    return Object.entries(grouped).map(([symbol, posList]) => {
      const matchedAsset = assets.find((a) => a.symbol === symbol);
      const totalMargin = posList.reduce((acc, p) => acc + p.margin, 0);
      const totalNotional = posList.reduce((acc, p) => acc + p.margin * p.leverage, 0);
      const totalPnl = posList.reduce((acc, p) => acc + p.pnl, 0);
      const totalPnlPct = totalMargin > 0 ? (totalPnl / totalMargin) * 100 : 0;
      const avgLeverage = totalMargin > 0 ? totalNotional / totalMargin : 1;

      // Net side
      const longNotional = posList
        .filter((p) => p.side === 'LONG')
        .reduce((acc, p) => acc + p.margin * p.leverage, 0);
      const shortNotional = posList
        .filter((p) => p.side === 'SHORT')
        .reduce((acc, p) => acc + p.margin * p.leverage, 0);

      const netSide: 'LONG' | 'SHORT' | 'HEDGED' =
        longNotional > shortNotional * 1.2
          ? 'LONG'
          : shortNotional > longNotional * 1.2
          ? 'SHORT'
          : 'HEDGED';

      // Distance to liquidation
      const liqDistances = posList.map((p) => {
        const diff = Math.abs(p.currentPrice - p.liquidationPrice);
        return p.currentPrice > 0 ? (diff / p.currentPrice) * 100 : 100;
      });
      const minLiqDistancePct = Math.min(...liqDistances);

      // Exposure proportions
      const exposureShareOfEquity = (totalNotional / portfolioEquity) * 100;
      const exposureShareOfActive =
        totalActiveNotional > 0 ? (totalNotional / totalActiveNotional) * 100 : 0;

      // Risk Tier classification
      let riskTier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (minLiqDistancePct < 6 || avgLeverage > 25 || exposureShareOfEquity > 150) {
        riskTier = 'CRITICAL';
      } else if (minLiqDistancePct < 12 || avgLeverage > 12 || exposureShareOfEquity > 80) {
        riskTier = 'HIGH';
      } else if (minLiqDistancePct < 22 || avgLeverage > 5 || exposureShareOfEquity > 40) {
        riskTier = 'MODERATE';
      }

      return {
        symbol,
        assetName: matchedAsset?.name || symbol,
        category: matchedAsset?.category || 'Crypto',
        netSide,
        totalMargin,
        totalNotional,
        avgLeverage,
        totalPnl,
        totalPnlPct,
        exposureShareOfEquity,
        exposureShareOfActive,
        positionsCount: posList.length,
        minLiqDistancePct,
        riskTier,
      };
    });
  }, [positions, assets, portfolioEquity]);

  // Total active notional
  const totalNotionalExposure = useMemo(
    () => assetExposures.reduce((acc, a) => acc + a.totalNotional, 0),
    [assetExposures]
  );
  const effectivePortfolioLeverage =
    portfolioEquity > 0 ? totalNotionalExposure / portfolioEquity : 0;

  // Max sizing basis
  const totalSizingWeight = useMemo(() => {
    if (assetExposures.length === 0) return 1;
    if (sizeMode === 'notional') {
      return assetExposures.reduce((acc, a) => acc + a.totalNotional, 0) || 1;
    }
    if (sizeMode === 'margin') {
      return assetExposures.reduce((acc, a) => acc + a.totalMargin, 0) || 1;
    }
    return (
      assetExposures.reduce((acc, a) => acc + a.totalNotional * a.avgLeverage, 0) || 1
    );
  }, [assetExposures, sizeMode]);

  // Color generator for each block
  const getBlockColor = (item: AssetExposureData) => {
    if (colorMode === 'pnl') {
      const pnlPct = item.totalPnlPct;
      if (pnlPct >= 15) return 'bg-emerald-600/80 border-emerald-400 text-emerald-100';
      if (pnlPct >= 5) return 'bg-emerald-600/50 border-emerald-500/60 text-emerald-200';
      if (pnlPct > 0) return 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300';
      if (pnlPct === 0) return 'bg-slate-800/80 border-slate-700 text-slate-300';
      if (pnlPct > -5) return 'bg-rose-950/60 border-rose-500/40 text-rose-300';
      if (pnlPct > -15) return 'bg-rose-600/50 border-rose-500/60 text-rose-200';
      return 'bg-rose-600/80 border-rose-400 text-rose-100';
    }

    if (colorMode === 'concentration') {
      const share = item.exposureShareOfActive;
      if (share > 50) return 'bg-rose-950/80 border-rose-500 text-rose-200';
      if (share > 30) return 'bg-amber-950/80 border-amber-500 text-amber-200';
      if (share > 15) return 'bg-blue-950/80 border-blue-500 text-blue-200';
      return 'bg-cyan-950/60 border-cyan-500/40 text-cyan-200';
    }

    // Direction mode
    if (item.netSide === 'LONG') {
      return 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200';
    }
    if (item.netSide === 'SHORT') {
      return 'bg-rose-950/70 border-rose-500/50 text-rose-200';
    }
    return 'bg-purple-950/70 border-purple-500/50 text-purple-200';
  };

  // Run AI Risk Audit
  const handleRunRiskAudit = async () => {
    setIsAuditing(true);
    setAuditError(null);
    try {
      const res = await fetch('/api/ai/audit-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positions: positions.map((p) => ({
            symbol: p.symbol,
            side: p.side,
            margin: p.margin,
            leverage: p.leverage,
            pnl: p.pnl,
            pnlPct: p.pnlPct,
          })),
          portfolioEquity: Number(portfolioEquity.toFixed(2)),
          marginUtilization: Number(marginUtilizationPct.toFixed(1)),
        }),
      });
      if (!res.ok) throw new Error('Failed to audit risk');
      const data = await res.json();
      setAuditResult(data);
    } catch (err: any) {
      console.error(err);
      setAuditError('Failed to generate audit. Please retry.');
    } finally {
      setIsAuditing(false);
    }
  };

  const selectedItem = assetExposures.find((a) => a.symbol === selectedSymbol);

  return (
    <div className="flex flex-col h-full bg-[#080b11] text-slate-200 p-4 select-none overflow-y-auto">
      {/* Risk Metrics Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 font-mono">
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">
            Total Notional Exposure
          </div>
          <div className="text-base font-bold text-white mt-1">
            ${totalNotionalExposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Allocated: ${totalAllocatedMargin.toLocaleString()} margin
          </div>
        </div>

        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">
            Effective Leverage
          </div>
          <div className="text-base font-bold text-cyan-400 mt-1">
            {effectivePortfolioLeverage.toFixed(2)}x
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Across {positions.length} active position{positions.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">
            Margin Utilization
          </div>
          <div
            className={`text-base font-bold mt-1 ${
              marginUtilizationPct > 65
                ? 'text-rose-400'
                : marginUtilizationPct > 35
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {marginUtilizationPct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Free Capital: ${(portfolioEquity - totalAllocatedMargin).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
            <span>Portfolio Beta Risk</span>
            <span
              className={`w-2 h-2 rounded-full ${
                marginUtilizationPct > 65
                  ? 'bg-rose-400 animate-ping'
                  : marginUtilizationPct > 35
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span
              className={`text-sm font-bold ${
                marginUtilizationPct > 65
                  ? 'text-rose-400'
                  : marginUtilizationPct > 35
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {marginUtilizationPct > 65
                ? 'HIGH BETA'
                : marginUtilizationPct > 35
                ? 'BALANCED'
                : 'CONSERVATIVE'}
            </span>
            <button
              onClick={handleRunRiskAudit}
              disabled={isAuditing}
              className="px-2 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-[10px] font-sans font-medium flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-cyan-300" />
              <span>{isAuditing ? 'Auditing...' : 'AI Audit'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Exposure Distribution Linear Progress Bar */}
      {assetExposures.length > 0 && (
        <div className="mb-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
            <span className="text-slate-400 text-[11px]">Asset Exposure Weighting</span>
            <span className="text-[10px] text-slate-500">
              Cash Cushion: {(100 - Math.min(100, marginUtilizationPct)).toFixed(1)}%
            </span>
          </div>

          <div className="h-3 w-full bg-slate-800 rounded-lg overflow-hidden flex p-0.5 gap-0.5">
            {assetExposures.map((exp, idx) => {
              const widthPct = Math.max(3, exp.exposureShareOfActive);
              const palette = [
                'bg-cyan-500',
                'bg-indigo-500',
                'bg-emerald-500',
                'bg-amber-500',
                'bg-purple-500',
                'bg-rose-500',
              ];
              const color = palette[idx % palette.length];
              return (
                <div
                  key={exp.symbol}
                  title={`${exp.symbol}: ${exp.exposureShareOfActive.toFixed(1)}% active exposure`}
                  className={`${color} h-full rounded-sm transition-all hover:brightness-125 cursor-pointer`}
                  style={{ width: `${widthPct}%` }}
                  onClick={() => setSelectedSymbol(exp.symbol)}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] font-mono text-slate-400">
            {assetExposures.map((exp) => (
              <div
                key={exp.symbol}
                onClick={() => setSelectedSymbol(exp.symbol)}
                className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="font-semibold text-slate-200">{exp.symbol}</span>
                <span>{exp.exposureShareOfActive.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Heatmap Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
        {/* Sizing Mode Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tile Size:</span>
          </span>
          <div className="flex bg-slate-800/80 p-0.5 rounded-lg text-[11px]">
            <button
              onClick={() => setSizeMode('notional')}
              className={`px-2.5 py-1 rounded transition-colors ${
                sizeMode === 'notional' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Notional ($)
            </button>
            <button
              onClick={() => setSizeMode('margin')}
              className={`px-2.5 py-1 rounded transition-colors ${
                sizeMode === 'margin' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Margin ($)
            </button>
            <button
              onClick={() => setSizeMode('riskWeighted')}
              className={`px-2.5 py-1 rounded transition-colors ${
                sizeMode === 'riskWeighted' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Risk-Weighted
            </button>
          </div>
        </div>

        {/* Color Mode Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px] font-medium">Color Heat:</span>
          <div className="flex bg-slate-800/80 p-0.5 rounded-lg text-[11px]">
            <button
              onClick={() => setColorMode('pnl')}
              className={`px-2.5 py-1 rounded transition-colors ${
                colorMode === 'pnl' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              PnL Return %
            </button>
            <button
              onClick={() => setColorMode('concentration')}
              className={`px-2.5 py-1 rounded transition-colors ${
                colorMode === 'concentration' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Concentration
            </button>
            <button
              onClick={() => setColorMode('direction')}
              className={`px-2.5 py-1 rounded transition-colors ${
                colorMode === 'direction' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Long vs Short
            </button>
          </div>
        </div>
      </div>

      {/* Main Heatmap Grid Visualization */}
      {assetExposures.length === 0 ? (
        <div className="flex-1 min-h-[200px] flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl p-6 text-center text-slate-500">
          <ShieldCheck className="w-10 h-10 text-emerald-500/50 mb-2 stroke-1" />
          <h4 className="text-sm font-semibold text-slate-300">Zero Active Exposure</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Open positions in the terminal or activate an automated AI agent to visualize portfolio risk distribution and liquidation buffers.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-[240px] flex flex-wrap gap-2.5 p-1">
          {assetExposures.map((item) => {
            let weight = item.totalNotional;
            if (sizeMode === 'margin') weight = item.totalMargin;
            if (sizeMode === 'riskWeighted') weight = item.totalNotional * item.avgLeverage;

            const flexBasisPct = Math.max(18, Math.min(100, (weight / totalSizingWeight) * 100));
            const colorClass = getBlockColor(item);
            const isSelected = selectedSymbol === item.symbol;
            const isProfit = item.totalPnl >= 0;

            return (
              <div
                key={item.symbol}
                onClick={() => setSelectedSymbol(item.symbol)}
                style={{ flexBasis: `${flexBasisPct}%` }}
                className={`flex-1 min-w-[190px] min-h-[140px] p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${colorClass} ${
                  isSelected ? 'ring-2 ring-white shadow-2xl scale-[1.01]' : 'hover:scale-[1.008]'
                }`}
              >
                {/* Tile Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-base tracking-tight text-white font-mono">
                        {item.symbol}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-black/40 border border-white/20">
                        {item.netSide} {item.avgLeverage.toFixed(0)}x
                      </span>
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">{item.assetName}</div>
                  </div>

                  {/* Switch terminal asset button */}
                  {onSelectAsset && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const target = assets.find((a) => a.symbol === item.symbol);
                        if (target) onSelectAsset(target);
                      }}
                      title="Load in Terminal Chart"
                      className="p-1 rounded bg-black/30 hover:bg-black/50 text-white transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Center Big PnL & Return Display */}
                <div className="my-2 font-mono">
                  <div className="text-xl font-black tracking-tight">
                    {isProfit ? '+' : ''}{item.totalPnlPct.toFixed(2)}%
                  </div>
                  <div className="text-xs opacity-90 font-medium">
                    {isProfit ? '+' : ''}${item.totalPnl.toFixed(2)} USDT
                  </div>
                </div>

                {/* Footer Micro Risk Breakdown */}
                <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-1 text-[10px] font-mono opacity-90">
                  <div>
                    <span className="opacity-70">Notional: </span>
                    <span className="font-semibold text-white">
                      ${item.totalNotional.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="opacity-70">Liq Buffer: </span>
                    <span
                      className={`font-semibold ${
                        item.minLiqDistancePct < 8
                          ? 'text-rose-300 font-bold'
                          : item.minLiqDistancePct < 15
                          ? 'text-amber-300'
                          : 'text-emerald-300'
                      }`}
                    >
                      {item.minLiqDistancePct.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="opacity-70">Weight: </span>
                    <span className="font-semibold">{item.exposureShareOfActive.toFixed(1)}%</span>
                  </div>
                  <div className="text-right">
                    <span className="opacity-70">Risk: </span>
                    <span className="font-bold">{item.riskTier}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Asset Detailed Risk Inspector Drawer (if clicked) */}
      {selectedItem && (
        <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-slate-700/80 shadow-xl font-mono text-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{selectedItem.symbol}</span>
              <span className="text-[11px] text-slate-400">Exposure Breakdown</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  selectedItem.riskTier === 'CRITICAL'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : selectedItem.riskTier === 'HIGH'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {selectedItem.riskTier} RISK
              </span>
            </div>
            <button
              onClick={() => setSelectedSymbol(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Close Inspector
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 text-[11px]">
            <div>
              <div className="text-slate-500 uppercase text-[10px]">Total Notional Value</div>
              <div className="text-white font-bold text-sm mt-0.5">
                ${selectedItem.totalNotional.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-slate-500 uppercase text-[10px]">Margin Allocated</div>
              <div className="text-white font-bold text-sm mt-0.5">
                ${selectedItem.totalMargin.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-slate-500 uppercase text-[10px]">Liquidation Buffer</div>
              <div
                className={`font-bold text-sm mt-0.5 ${
                  selectedItem.minLiqDistancePct < 10 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {selectedItem.minLiqDistancePct.toFixed(1)}% price drop
              </div>
            </div>
            <div>
              <div className="text-slate-500 uppercase text-[10px]">Equity Impact</div>
              <div className="text-cyan-400 font-bold text-sm mt-0.5">
                {selectedItem.exposureShareOfEquity.toFixed(1)}% of total equity
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Risk Audit Modal / Drawer */}
      {auditResult && (
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-cyan-950/40 border border-indigo-500/40 shadow-xl space-y-3 font-sans text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white text-sm">
                Gemini Institutional Risk Audit
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  auditResult.riskCategory === 'AGGRESSIVE'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : auditResult.riskCategory === 'MODERATE'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {auditResult.riskCategory} ({auditResult.riskScore}/100)
              </span>
            </div>
            <button
              onClick={() => setAuditResult(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Dismiss
            </button>
          </div>

          <p className="text-slate-300 leading-relaxed">{auditResult.summary}</p>

          {auditResult.concentrationWarning && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>{auditResult.concentrationWarning}</span>
            </div>
          )}

          {auditResult.actionableRecommendations && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Risk Mitigation Directives:
              </div>
              <ul className="space-y-1 text-slate-300 text-[11px]">
                {auditResult.actionableRecommendations.map((rec: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
