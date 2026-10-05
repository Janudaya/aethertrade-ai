import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Square,
  LayoutGrid,
  Maximize2,
  ChevronDown,
  Check,
  Search,
  Crosshair,
  TrendingUp,
  TrendingDown,
  Layers,
  Flame,
} from 'lucide-react';
import { CandleChart } from './CandleChart';
import { Asset, Candle, IndicatorSettings, Position, Timeframe } from '../types';
import { generateInitialCandles } from '../utils/indicators';

export type ChartLayoutMode = '1x1' | '2x2';

interface MultiChartAreaProps {
  layout: ChartLayoutMode;
  onChangeLayout: (layout: ChartLayoutMode) => void;
  currentAsset: Asset;
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  timeframe: Timeframe;
  indicators: IndicatorSettings;
  positions: Position[];
  primaryCandles: Candle[];
}

export const MultiChartArea: React.FC<MultiChartAreaProps> = ({
  layout,
  onChangeLayout,
  currentAsset,
  assets,
  onSelectAsset,
  timeframe,
  indicators,
  positions,
  primaryCandles,
}) => {
  // PnL Heatmap overlay state
  const [showPnLHeatmap, setShowPnLHeatmap] = useState<boolean>(true);
  // Quadrant asset symbols (4 slots for 2x2 mode)
  const [quadrantSymbols, setQuadrantSymbols] = useState<string[]>(() => {
    const s0 = currentAsset.symbol;
    const s1 = assets[1]?.symbol || 'ETH/USDT';
    const s2 = assets[2]?.symbol || 'SOL/USDT';
    const s3 = assets[3]?.symbol || 'XAU/USD';
    return [s0, s1, s2, s3];
  });

  // Track which quadrant is actively focused
  const [focusedQuadrant, setFocusedQuadrant] = useState<number>(0);

  // Dropdown open states for quadrant asset selection
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdownIndex(null);
      }
    };
    if (activeDropdownIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeDropdownIndex]);

  // Keep quadrant 0 synchronized if user selects asset from outside (e.g. MarketBar or News)
  useEffect(() => {
    setQuadrantSymbols((prev) => {
      if (prev[focusedQuadrant] !== currentAsset.symbol) {
        const next = [...prev];
        next[focusedQuadrant] = currentAsset.symbol;
        return next;
      }
      return prev;
    });
  }, [currentAsset.symbol, focusedQuadrant]);

  // Secondary candles storage for quadrants
  const [quadrantCandles, setQuadrantCandles] = useState<Record<string, Candle[]>>({});

  // Initialize or update secondary candles
  useEffect(() => {
    setQuadrantCandles((prev) => {
      const next = { ...prev };
      quadrantSymbols.forEach((sym) => {
        if (sym === currentAsset.symbol) {
          next[sym] = primaryCandles;
        } else if (!next[sym] || next[sym].length === 0) {
          const matched = assets.find((a) => a.symbol === sym);
          if (matched) {
            next[sym] = generateInitialCandles(matched.price, 75, timeframe);
          }
        }
      });
      return next;
    });
  }, [quadrantSymbols, currentAsset.symbol, primaryCandles, assets, timeframe]);

  // Re-generate candles when timeframe changes
  useEffect(() => {
    setQuadrantCandles((prev) => {
      const next = { ...prev };
      quadrantSymbols.forEach((sym) => {
        if (sym === currentAsset.symbol) {
          next[sym] = primaryCandles;
        } else {
          const matched = assets.find((a) => a.symbol === sym);
          if (matched) {
            next[sym] = generateInitialCandles(matched.price, 75, timeframe);
          }
        }
      });
      return next;
    });
  }, [timeframe]);

  // Tick simulation updates for secondary candles
  useEffect(() => {
    setQuadrantCandles((prev) => {
      let changed = false;
      const next = { ...prev };

      quadrantSymbols.forEach((sym) => {
        if (sym !== currentAsset.symbol && next[sym] && next[sym].length > 0) {
          const matched = assets.find((a) => a.symbol === sym);
          if (matched) {
            const candlesArr = [...next[sym]];
            const lastIdx = candlesArr.length - 1;
            const lastCandle = { ...candlesArr[lastIdx] };

            if (lastCandle.close !== matched.price) {
              lastCandle.close = matched.price;
              lastCandle.high = Math.max(lastCandle.high, matched.price);
              lastCandle.low = Math.min(lastCandle.low, matched.price);
              candlesArr[lastIdx] = lastCandle;
              next[sym] = candlesArr;
              changed = true;
            }
          }
        }
      });

      return changed ? next : prev;
    });
  }, [assets, quadrantSymbols, currentAsset.symbol]);

  // Change asset in quadrant slot
  const handleQuadrantAssetChange = (slotIndex: number, newAsset: Asset) => {
    setQuadrantSymbols((prev) => {
      const next = [...prev];
      next[slotIndex] = newAsset.symbol;
      return next;
    });
    setFocusedQuadrant(slotIndex);
    onSelectAsset(newAsset);
    setActiveDropdownIndex(null);
    setSearchQuery('');
  };

  // Maximize quadrant to single view
  const handleMaximizeQuadrant = (slotIndex: number) => {
    const sym = quadrantSymbols[slotIndex];
    const matched = assets.find((a) => a.symbol === sym);
    if (matched) {
      setFocusedQuadrant(slotIndex);
      onSelectAsset(matched);
    }
    onChangeLayout('1x1');
  };

  // Focus quadrant without maximizing
  const handleFocusQuadrant = (slotIndex: number) => {
    setFocusedQuadrant(slotIndex);
    const sym = quadrantSymbols[slotIndex];
    const matched = assets.find((a) => a.symbol === sym);
    if (matched && matched.symbol !== currentAsset.symbol) {
      onSelectAsset(matched);
    }
  };

  // Filter assets for quadrant dropdown
  const filteredAssets = useMemo(() => {
    return assets.filter(
      (a) =>
        a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [assets, searchQuery]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0a0d14] overflow-hidden">
      {/* Layout Mode 1: Single Expanded View */}
      {layout === '1x1' && (
        <div className="relative w-full h-full flex-1">
          <CandleChart
            candles={primaryCandles}
            indicators={indicators}
            positions={positions}
            symbol={currentAsset.symbol}
            decimals={currentAsset.decimals}
          />

          {/* Quick Floating Layout Toggle Button */}
          <div className="absolute top-2 right-3 z-30 flex items-center bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 shadow-xl backdrop-blur-sm">
            <button
              onClick={() => onChangeLayout('1x1')}
              className="p-1 px-2 rounded flex items-center gap-1.5 text-cyan-300 bg-cyan-950/80 border border-cyan-800 text-xs font-mono font-bold transition-all"
              title="Currently in Single View"
            >
              <Square className="w-3.5 h-3.5 text-cyan-400" />
              <span>Single</span>
            </button>
            <button
              onClick={() => onChangeLayout('2x2')}
              className="p-1 px-2 rounded flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-mono transition-all cursor-pointer group"
              title="Switch to 2x2 Multi-Chart Grid (Monitor 4 Assets Simultaneously)"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400" />
              <span>2x2 Grid</span>
            </button>
          </div>
        </div>
      )}

      {/* Layout Mode 2: 2x2 Multi-Chart Grid View */}
      {layout === '2x2' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top Multi-Chart Grid Toolbar */}
          <div className="h-8 bg-[#0d121c] border-b border-slate-800 px-3 flex items-center justify-between text-xs font-mono select-none shrink-0">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-white text-[11px] tracking-wide">
                MULTI-CHART WORKSPACE
              </span>
              <span className="text-[10px] text-cyan-300 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800">
                2x2 QUAD MONITOR
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                Click any quadrant to focus trading
              </span>

              {/* Segmented Layout Controls */}
              <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 shadow-sm">
                <button
                  onClick={() => onChangeLayout('1x1')}
                  className="p-1 px-2 rounded flex items-center gap-1 text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-all cursor-pointer"
                  title="Switch to Single Expanded View"
                >
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px]">Single</span>
                </button>
                <button
                  onClick={() => onChangeLayout('2x2')}
                  className="p-1 px-2 rounded flex items-center gap-1 text-cyan-300 bg-cyan-950/80 border border-cyan-800 text-xs font-bold transition-all"
                  title="2x2 Multi-Chart Grid Active"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px]">2x2 Grid</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2x2 Grid Container */}
          <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1 p-1 bg-[#070a10] overflow-hidden">
            {quadrantSymbols.map((symbol, idx) => {
              const matchedAsset = assets.find((a) => a.symbol === symbol) || assets[0];
              const isFocused = currentAsset.symbol === symbol;
              const isProfit = matchedAsset.change24h >= 0;
              const slotCandles =
                symbol === currentAsset.symbol
                  ? primaryCandles
                  : quadrantCandles[symbol] || generateInitialCandles(matchedAsset.price, 75, timeframe);

              // Check if user has open position for this quadrant asset
              const assetPosition = positions.find((p) => p.symbol === symbol);

              return (
                <div
                  key={`quadrant-${idx}-${symbol}`}
                  onClick={() => handleFocusQuadrant(idx)}
                  className={`relative flex flex-col h-full bg-[#0a0d14] rounded-lg border overflow-hidden transition-all group ${
                    isFocused
                      ? 'border-cyan-500/80 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                      : 'border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  {/* Quadrant Mini-Header */}
                  <div className="h-7 bg-[#0e1320] border-b border-slate-800/80 px-2 flex items-center justify-between text-xs font-mono shrink-0 select-none z-30">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {/* Asset Dropdown Trigger */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownIndex(activeDropdownIndex === idx ? null : idx);
                          }}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                          title="Change asset in this quadrant"
                        >
                          <span className="truncate">{matchedAsset.symbol}</span>
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>

                        {/* Quadrant Asset Selector Dropdown Menu */}
                        {activeDropdownIndex === idx && (
                          <div
                            ref={dropdownRef}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-full left-0 mt-1 w-64 bg-[#121722] border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in duration-100"
                          >
                            <div className="relative mb-1.5">
                              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                autoFocus
                                placeholder="Search asset..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-6 pr-2 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                              />
                            </div>

                            <div className="max-h-48 overflow-y-auto space-y-0.5">
                              {filteredAssets.map((asset) => (
                                <button
                                  key={asset.symbol}
                                  type="button"
                                  onClick={() => handleQuadrantAssetChange(idx, asset)}
                                  className={`w-full flex items-center justify-between p-1.5 rounded-lg text-[11px] transition-colors cursor-pointer ${
                                    asset.symbol === symbol
                                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="font-bold">{asset.symbol}</span>
                                    <span className="text-[10px] text-slate-500 truncate">
                                      {asset.name}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-mono text-white text-[11px]">
                                      ${asset.price.toLocaleString()}
                                    </div>
                                    <div
                                      className={`text-[9px] ${
                                        asset.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                      }`}
                                    >
                                      {asset.change24h >= 0 ? '+' : ''}
                                      {asset.change24h}%
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Live Price & Change Badge */}
                      <span className="font-bold text-white text-[11px] font-mono">
                        ${matchedAsset.price.toLocaleString()}
                      </span>
                      <span
                        className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                          isProfit
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {isProfit ? '+' : ''}
                        {matchedAsset.change24h}%
                      </span>

                      {/* Open Position Tag */}
                      {assetPosition && (
                        <span
                          className={`hidden md:inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-bold ${
                            assetPosition.side === 'LONG'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                          title={`Active position: ${assetPosition.side} (${assetPosition.pnl >= 0 ? '+' : ''}$${assetPosition.pnl.toFixed(2)})`}
                        >
                          <span>{assetPosition.side}</span>
                          <span
                            className={
                              assetPosition.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }
                          >
                            {assetPosition.pnl >= 0 ? '+' : ''}${assetPosition.pnl.toFixed(0)}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Quadrant Controls: Focus pill & Maximize button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isFocused ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          <span>TRADING</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFocusQuadrant(idx);
                          }}
                          className="text-[9px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                          title="Focus terminal on this asset"
                        >
                          Focus
                        </button>
                      )}

                      {/* Maximize to 1x1 Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMaximizeQuadrant(idx);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Maximize this chart to Single View"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Chart Body */}
                  <div className="flex-1 min-h-0 relative">
                    <CandleChart
                      candles={slotCandles}
                      indicators={indicators}
                      positions={positions}
                      symbol={matchedAsset.symbol}
                      decimals={matchedAsset.decimals}
                      isCompact={true}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
