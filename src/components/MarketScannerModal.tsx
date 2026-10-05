import React, { useState, useMemo } from 'react';
import {
  Flame,
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  ArrowRight,
  Filter,
  BarChart2,
  SlidersHorizontal,
  Layers,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { Asset } from '../types';

interface MarketScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  currentAsset: Asset;
  onSelectAsset: (asset: Asset) => void;
}

export interface VolatilityScoredAsset {
  asset: Asset;
  rank: number;
  rangeDollars: number;
  rangePct: number;
  absChange: number;
  stdDev: number;
  coeffOfVariation: number;
  volatilityScore: number;
  regime: 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW';
  breakoutBias: 'BULLISH EXPANSION' | 'BEARISH FLUSH' | 'EXPANDING RANGE';
}

export const MarketScannerModal: React.FC<MarketScannerModalProps> = ({
  isOpen,
  onClose,
  assets,
  currentAsset,
  onSelectAsset,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Crypto' | 'Commodities' | 'Forex' | 'Equities'>('ALL');
  const [sortBy, setSortBy] = useState<'score' | 'range' | 'change' | 'volume'>('score');
  const [minScoreThreshold, setMinScoreThreshold] = useState<number>(0);

  // Compute detailed volatility, price variance, and standard deviation for each asset
  const scoredAssets = useMemo<VolatilityScoredAsset[]>(() => {
    const computed = assets.map((asset) => {
      const rangeDollars = Math.max(0, asset.high24h - asset.low24h);
      const rangePct = asset.low24h > 0 ? (rangeDollars / asset.low24h) * 100 : 0;
      const absChange = Math.abs(asset.change24h);

      // Compute standard deviation and coefficient of variation from sparkline
      const sparkline = asset.sparkline && asset.sparkline.length > 0 ? asset.sparkline : [asset.price];
      const mean = sparkline.reduce((s, p) => s + p, 0) / sparkline.length;
      const variance =
        sparkline.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / sparkline.length;
      const stdDev = Math.sqrt(variance);
      const coeffOfVariation = mean > 0 ? (stdDev / mean) * 100 : 0;

      // Composite Normalized Volatility Score (0 to 100)
      const rawScore = rangePct * 8.5 + absChange * 4.2 + coeffOfVariation * 10.5;
      const volatilityScore = Math.min(100, Math.max(12, Math.round(rawScore)));

      // Classification
      let regime: 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW' = 'LOW';
      if (volatilityScore >= 70 || rangePct >= 7.5) regime = 'EXTREME';
      else if (volatilityScore >= 45 || rangePct >= 4.0) regime = 'HIGH';
      else if (volatilityScore >= 25 || rangePct >= 2.0) regime = 'MODERATE';

      // Directional Breakout Bias
      let breakoutBias: 'BULLISH EXPANSION' | 'BEARISH FLUSH' | 'EXPANDING RANGE' = 'EXPANDING RANGE';
      if (asset.change24h >= 2.5) breakoutBias = 'BULLISH EXPANSION';
      else if (asset.change24h <= -2.5) breakoutBias = 'BEARISH FLUSH';

      return {
        asset,
        rank: 1,
        rangeDollars,
        rangePct,
        absChange,
        stdDev,
        coeffOfVariation,
        volatilityScore,
        regime,
        breakoutBias,
      };
    });

    // Sort according to user preference
    computed.sort((a, b) => {
      if (sortBy === 'score') return b.volatilityScore - a.volatilityScore;
      if (sortBy === 'range') return b.rangePct - a.rangePct;
      if (sortBy === 'change') return b.absChange - a.absChange;
      if (sortBy === 'volume') return b.asset.volume24h - a.asset.volume24h;
      return 0;
    });

    // Assign rank #
    return computed.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [assets, sortBy]);

  // Filtered assets
  const filteredAssets = useMemo(() => {
    return scoredAssets.filter((item) => {
      const matchCat = categoryFilter === 'ALL' || item.asset.category === categoryFilter;
      const matchScore = item.volatilityScore >= minScoreThreshold;
      return matchCat && matchScore;
    });
  }, [scoredAssets, categoryFilter, minScoreThreshold]);

  // Overall Market Volatility Analytics
  const summaryStats = useMemo(() => {
    if (scoredAssets.length === 0) return { topVolatile: null, avgVariance: 0, extremeCount: 0 };
    const avgVariance = scoredAssets.reduce((sum, a) => sum + a.rangePct, 0) / scoredAssets.length;
    const extremeCount = scoredAssets.filter((a) => a.regime === 'EXTREME' || a.regime === 'HIGH').length;
    return {
      topVolatile: scoredAssets[0],
      avgVariance,
      extremeCount,
    };
  }, [scoredAssets]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="bg-[#0b0e17] border border-amber-500/40 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative font-mono text-xs overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0e1320] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/25 ring-1 ring-amber-400/40">
              <Flame className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Market Volatility Scanner
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/80 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  REAL-TIME VARIANCE RANKING
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Identifies extreme price variance, intraday spread expansions, and high-beta breakout candidates.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Headline Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:px-5 bg-slate-900/60 border-b border-slate-800/80 text-[11px]">
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Top Volatile Asset</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-amber-400 font-bold text-xs sm:text-sm">
                {summaryStats.topVolatile?.asset.symbol}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-950/80 text-rose-300 border border-rose-800">
                {summaryStats.topVolatile?.volatilityScore}/100
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Avg Market Range (24h)</span>
            <div className="text-xs sm:text-sm font-bold text-cyan-400 mt-1">
              {summaryStats.avgVariance.toFixed(2)}% Spread
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">High-Beta Opportunities</span>
            <div className="text-xs sm:text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
              <span>{summaryStats.extremeCount} Assets</span>
              <span className="text-[10px] text-slate-400 font-normal">in expansion</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Scanning Engine</span>
            <div className="text-xs sm:text-sm font-semibold text-slate-300 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Variance & StdDev</span>
            </div>
          </div>
        </div>

        {/* Filter & Sorting Controls */}
        <div className="p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-[#0c101a] text-xs">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            {(['ALL', 'Crypto', 'Commodities', 'Forex', 'Equities'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-amber-600 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-500 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-slate-400" />
              <span>Sort By:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-xs"
            >
              <option value="score">Volatility Score (High → Low)</option>
              <option value="range">24h Range % (True Variance)</option>
              <option value="change">24h Net Movement (|%|)</option>
              <option value="volume">24h Trading Volume</option>
            </select>
          </div>
        </div>

        {/* Ranked Asset List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5">
          {filteredAssets.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p>No assets match current scanner criteria.</p>
            </div>
          ) : (
            filteredAssets.map((item) => {
              const isCurrent = item.asset.symbol === currentAsset.symbol;
              const isProfit = item.asset.change24h >= 0;

              return (
                <div
                  key={item.asset.symbol}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3.5 ${
                    isCurrent
                      ? 'bg-amber-950/20 border-amber-500/60 shadow-lg'
                      : 'bg-slate-900/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  {/* Left Column: Rank, Symbol, Name & Badges */}
                  <div className="flex items-center gap-3 min-w-[200px]">
                    {/* Rank Badge */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        item.rank === 1
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                          : item.rank === 2
                          ? 'bg-slate-300 text-slate-950'
                          : item.rank === 3
                          ? 'bg-amber-800 text-amber-100'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      #{item.rank}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{item.asset.symbol}</span>
                        <span className="text-[10px] text-slate-400">{item.asset.name}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                        <span className="text-slate-500">{item.asset.category}</span>
                        <span>·</span>
                        <span
                          className={`font-semibold ${
                            item.breakoutBias === 'BULLISH EXPANSION'
                              ? 'text-emerald-400'
                              : item.breakoutBias === 'BEARISH FLUSH'
                              ? 'text-rose-400'
                              : 'text-cyan-400'
                          }`}
                        >
                          {item.breakoutBias}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Price & 24h Variance Range */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-6 flex-1 text-[11px]">
                    {/* Price & 24h Change */}
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Mark Price</span>
                      <div className="font-bold text-white text-xs mt-0.5">
                        ${item.asset.price.toLocaleString(undefined, { minimumFractionDigits: item.asset.decimals, maximumFractionDigits: item.asset.decimals })}
                      </div>
                      <div className={`text-[10px] font-semibold flex items-center gap-0.5 mt-0.5 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfit ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        <span>{isProfit ? '+' : ''}{item.asset.change24h.toFixed(2)}%</span>
                      </div>
                    </div>

                    {/* 24h High - Low Spread (Variance) */}
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">24h Variance (H - L)</span>
                      <div className="font-bold text-amber-400 text-xs mt-0.5">
                        {item.rangePct.toFixed(2)}% <span className="text-[10px] text-slate-400">(${item.rangeDollars.toFixed(2)})</span>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5 font-sans">
                        ${item.asset.low24h.toLocaleString()} → ${item.asset.high24h.toLocaleString()}
                      </div>
                    </div>

                    {/* Volatility Index Gauge */}
                    <div className="hidden sm:block">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 uppercase">Vol Score</span>
                        <span
                          className={`font-bold ${
                            item.regime === 'EXTREME'
                              ? 'text-rose-400'
                              : item.regime === 'HIGH'
                              ? 'text-amber-400'
                              : 'text-cyan-400'
                          }`}
                        >
                          {item.volatilityScore}/100 ({item.regime})
                        </span>
                      </div>
                      {/* Gauge Bar */}
                      <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.regime === 'EXTREME'
                              ? 'bg-gradient-to-r from-orange-500 to-rose-500'
                              : item.regime === 'HIGH'
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                              : 'bg-cyan-500'
                          }`}
                          style={{ width: `${item.volatilityScore}%` }}
                        />
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        Vol: ${(item.asset.volume24h / 1e9).toFixed(2)}B
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Trade Action CTA */}
                  <div className="flex items-center gap-2 justify-end shrink-0">
                    <button
                      onClick={() => {
                        onSelectAsset(item.asset);
                        onClose();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                        isCurrent
                          ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 hover:shadow-amber-500/20'
                      }`}
                    >
                      <span>{isCurrent ? 'Trading Active' : 'Trade Asset'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-5 border-t border-slate-800 bg-[#0d111d] flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Real-time algorithm: Normalized price variance + true range % + sparkline std dev.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
