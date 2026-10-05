import React, { useState } from 'react';
import {
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Clock,
  SlidersHorizontal,
  Search,
  Square,
  LayoutGrid,
} from 'lucide-react';
import { Asset, Timeframe, IndicatorSettings } from '../types';

interface MarketBarProps {
  currentAsset: Asset;
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  timeframe: Timeframe;
  onChangeTimeframe: (tf: Timeframe) => void;
  indicators: IndicatorSettings;
  onToggleIndicator: (key: keyof IndicatorSettings) => void;
  priceTickDirection: 'up' | 'down' | 'none';
  chartLayout?: '1x1' | '2x2';
  onChangeLayout?: (mode: '1x1' | '2x2') => void;
}

export const MarketBar: React.FC<MarketBarProps> = ({
  currentAsset,
  assets,
  onSelectAsset,
  timeframe,
  onChangeTimeframe,
  indicators,
  onToggleIndicator,
  priceTickDirection,
  chartLayout = '1x1',
  onChangeLayout,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [indicatorsMenuOpen, setIndicatorsMenuOpen] = useState(false);

  const isUp = currentAsset.change24h >= 0;

  const categories = ['All', 'Crypto', 'Commodities', 'Equities', 'Forex'];

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || asset.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '1D'];

  return (
    <div className="bg-[#0f141d] border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-slate-300 select-none relative z-30">
      {/* Left: Asset Selector & Core Pricing */}
      <div className="flex items-center gap-5">
        {/* Asset Dropdown Trigger */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-slate-600 hover:bg-slate-800/80 transition-all cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-cyan-400">
              {currentAsset.symbol.slice(0, 1)}
            </div>
            <div className="text-left">
              <div className="font-bold text-sm text-white tracking-wide flex items-center gap-1.5">
                <span>{currentAsset.symbol}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-[10px] text-slate-400">{currentAsset.name}</div>
            </div>
          </button>

          {/* Modal Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-80 bg-[#121722] border border-slate-700 rounded-xl shadow-2xl p-2.5 z-50">
              {/* Search input */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Category Filter tabs */}
              <div className="flex gap-1 mb-2 overflow-x-auto pb-1 text-[11px]">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Asset List */}
              <div className="max-h-56 overflow-y-auto space-y-1">
                {filteredAssets.map((asset) => {
                  const assetUp = asset.change24h >= 0;
                  return (
                    <button
                      key={asset.symbol}
                      onClick={() => {
                        onSelectAsset(asset);
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left"
                    >
                      <div>
                        <div className="text-xs font-semibold text-white">{asset.symbol}</div>
                        <div className="text-[10px] text-slate-400">{asset.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-medium text-white">
                          ${asset.price.toFixed(asset.decimals)}
                        </div>
                        <div className={`text-[10px] font-mono ${assetUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {assetUp ? '+' : ''}{asset.change24h.toFixed(2)}%
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Live Asset Big Price & Pulse */}
        <div className="flex items-baseline gap-3">
          <div
            className={`text-xl font-bold font-mono tracking-tight transition-all duration-300 ${
              priceTickDirection === 'up'
                ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                : priceTickDirection === 'down'
                ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]'
                : 'text-white'
            }`}
          >
            ${currentAsset.price.toLocaleString(undefined, {
              minimumFractionDigits: currentAsset.decimals,
              maximumFractionDigits: currentAsset.decimals,
            })}
          </div>

          <div className={`flex items-center text-xs font-semibold font-mono ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isUp ? <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />}
            <span>{isUp ? '+' : ''}{currentAsset.change24h.toFixed(2)}%</span>
          </div>
        </div>

        {/* Quick Market Stats */}
        <div className="hidden md:flex items-center gap-4 text-xs font-mono border-l border-slate-800 pl-4">
          <div>
            <div className="text-[10px] uppercase text-slate-500">24h High</div>
            <div className="text-slate-300 font-medium">${currentAsset.high24h.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-500">24h Low</div>
            <div className="text-slate-300 font-medium">${currentAsset.low24h.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-500">24h Vol</div>
            <div className="text-slate-300 font-medium">
              ${(currentAsset.volume24h / 1000000000).toFixed(2)}B
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-500">Funding / 8h</div>
            <div className="text-cyan-400 font-medium">
              {(currentAsset.fundingRate * 100).toFixed(3)}%
            </div>
          </div>
        </div>
      </div>

      {/* Right: Timeframe Switcher & Indicator Controls */}
      <div className="flex items-center gap-3">
        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-0.5 rounded-lg">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onChangeTimeframe(tf)}
              className={`px-2 py-1 text-xs font-mono rounded font-medium transition-all ${
                timeframe === tf
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Indicators Settings Toggle Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIndicatorsMenuOpen(!indicatorsMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Indicators</span>
          </button>

          {indicatorsMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-[#121722] border border-slate-700 rounded-xl shadow-2xl p-2.5 z-50 text-xs">
              <div className="font-semibold text-slate-200 pb-1.5 mb-1.5 border-b border-slate-800">
                Chart Overlays
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
                  <span>EMA 9 (Cyan)</span>
                  <input
                    type="checkbox"
                    checked={indicators.showEMA9}
                    onChange={() => onToggleIndicator('showEMA9')}
                    className="accent-cyan-400"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
                  <span>EMA 21 (Gold)</span>
                  <input
                    type="checkbox"
                    checked={indicators.showEMA21}
                    onChange={() => onToggleIndicator('showEMA21')}
                    className="accent-amber-400"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
                  <span>EMA 50 (Purple)</span>
                  <input
                    type="checkbox"
                    checked={indicators.showEMA50}
                    onChange={() => onToggleIndicator('showEMA50')}
                    className="accent-purple-400"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
                  <span>Bollinger Bands</span>
                  <input
                    type="checkbox"
                    checked={indicators.showBollinger}
                    onChange={() => onToggleIndicator('showBollinger')}
                    className="accent-blue-400"
                  />
                </label>
                <div className="font-semibold text-slate-200 pt-1.5 pb-1 border-t border-slate-800">
                  Sub-Panels
                </div>
                <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
                  <span>Volume Bars</span>
                  <input
                    type="checkbox"
                    checked={indicators.showVolume}
                    onChange={() => onToggleIndicator('showVolume')}
                    className="accent-emerald-400"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
                  <span>RSI (14) Oscillator</span>
                  <input
                    type="checkbox"
                    checked={indicators.showRSI}
                    onChange={() => onToggleIndicator('showRSI')}
                    className="accent-indigo-400"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
                  <span>MACD (12, 26, 9)</span>
                  <input
                    type="checkbox"
                    checked={indicators.showMACD}
                    onChange={() => onToggleIndicator('showMACD')}
                    className="accent-cyan-400"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Multi-Chart Grid Layout Toggle */}
        {onChangeLayout && (
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => onChangeLayout('1x1')}
              className={`px-2 py-1 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
                chartLayout === '1x1'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Single Expanded Chart View"
            >
              <Square className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">Single</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeLayout('2x2')}
              className={`px-2 py-1 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
                chartLayout === '2x2'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
              title="2x2 Multi-Chart Grid (Monitor 4 Assets Simultaneously)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">2x2 Grid</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
