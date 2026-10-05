import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  TrendingUp,
  TrendingDown,
  CornerDownLeft,
  Command,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Asset } from '../types';

interface GlobalSearchProps {
  assets: Asset[];
  currentAsset: Asset;
  onSelectAsset: (asset: Asset) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  assets,
  currentAsset,
  onSelectAsset,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const categories = ['All', 'Crypto', 'Equities', 'Commodities', 'Forex'];

  // Global keyboard shortcut to focus search: Ctrl+K or ⌘K or '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      const isInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA';

      // ⌘K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }

      // Single forward slash '/' when not inside an input
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Filter assets based on query and selected category
  const filteredAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchesCategory = selectedCategory === 'All' || asset.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!q) return true;

      const matchesSymbol = asset.symbol.toLowerCase().includes(q);
      const matchesName = asset.name.toLowerCase().includes(q);
      const matchesCategoryName = asset.category.toLowerCase().includes(q);

      return matchesSymbol || matchesName || matchesCategoryName;
    });
  }, [assets, query, selectedCategory]);

  // Reset highlighted index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredAssets]);

  // Handle keyboard navigation within results
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredAssets.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filteredAssets.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredAssets.length) % filteredAssets.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredAssets[highlightedIndex];
      if (target) {
        handleSelect(target);
      }
    }
  };

  const handleSelect = (asset: Asset) => {
    onSelectAsset(asset);
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  // Helper for category badge styling
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Crypto':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'Equities':
        return 'bg-blue-950/80 text-blue-300 border-blue-800';
      case 'Commodities':
        return 'bg-yellow-950/80 text-yellow-300 border-yellow-800';
      case 'Forex':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xs md:max-w-sm lg:max-w-md">
      {/* Search Input Bar */}
      <div
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-text bg-slate-900/90 ${
          isOpen
            ? 'border-cyan-500/80 ring-2 ring-cyan-500/20 shadow-lg shadow-cyan-500/10'
            : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
        }`}
      >
        <Search className={`w-3.5 h-3.5 shrink-0 transition-colors ${isOpen ? 'text-cyan-400' : 'text-slate-400'}`} />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleInputKeyDown}
          placeholder="Search ticker or name (e.g. BTC, NVDA, Gold)..."
          className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
        />

        {query ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setQuery('');
              inputRef.current?.focus();
            }}
            className="p-0.5 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="hidden sm:flex items-center gap-1 shrink-0 select-none">
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700/80 shadow-xs">
              ⌘K
            </kbd>
          </div>
        )}
      </div>

      {/* Dropdown Results Command Palette */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#0e1320] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl animate-in fade-in duration-150">
          {/* Category Tabs */}
          <div className="px-3 pt-2.5 pb-2 border-b border-slate-800 flex items-center justify-between gap-1 overflow-x-auto text-[11px] font-mono">
            <div className="flex items-center gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <span className="text-[10px] text-slate-500 shrink-0">
              {filteredAssets.length} found
            </span>
          </div>

          {/* Results List */}
          <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
            {filteredAssets.length > 0 ? (
              filteredAssets.map((asset, index) => {
                const isSelected = highlightedIndex === index;
                const isCurrentActive = asset.symbol === currentAsset.symbol;
                const isProfit = asset.change24h >= 0;

                return (
                  <div
                    key={asset.symbol}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(asset)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/60 border border-cyan-500/40 shadow-sm'
                        : 'border border-transparent hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Left: Symbol & Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-center font-bold text-xs text-cyan-400 shrink-0">
                        {asset.symbol.slice(0, 1)}
                      </div>

                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white tracking-wide">
                            {asset.symbol}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-sans font-medium border ${getCategoryBadgeClass(
                              asset.category
                            )}`}
                          >
                            {asset.category}
                          </span>
                          {isCurrentActive && (
                            <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950 px-1 py-0.2 rounded border border-cyan-800">
                              CHART ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {asset.name}
                        </div>
                      </div>
                    </div>

                    {/* Right: Price & Jump Hint */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-bold text-white">
                          ${asset.price >= 1000
                            ? asset.price.toLocaleString(undefined, {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })
                            : asset.price.toFixed(asset.decimals)}
                        </div>
                        <div
                          className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? (
                            <TrendingUp className="w-2.5 h-2.5" />
                          ) : (
                            <TrendingDown className="w-2.5 h-2.5" />
                          )}
                          <span>
                            {isProfit ? '+' : ''}
                            {asset.change24h}%
                          </span>
                        </div>
                      </div>

                      {/* Jump to chart indicator */}
                      <div
                        className={`p-1.5 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}
                        title="Jump directly to chart"
                      >
                        <CornerDownLeft className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-slate-400 font-mono">
                <Search className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                <p className="text-xs text-slate-300">No assets matching "{query}"</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Try searching "BTC", "ETH", "Gold", "NVDA", or "EUR"
                </p>
              </div>
            )}
          </div>

          {/* Footer Keyboard Hints */}
          <div className="px-3 py-1.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.2 rounded bg-slate-900 border border-slate-700">↑↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.2 rounded bg-slate-900 border border-slate-700">↵</kbd>
                <span>Jump to Chart</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.2 rounded bg-slate-900 border border-slate-700">esc</kbd>
                <span>Close</span>
              </span>
            </div>

            <div className="flex items-center gap-1 text-cyan-400">
              <Sparkles className="w-3 h-3" />
              <span>Instant Switch</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
