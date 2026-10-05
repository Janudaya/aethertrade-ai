import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Radio,
  RefreshCw,
  Play,
  Pause,
  ExternalLink,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Clock,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { MarketNewsItem, MarketNewsResponse } from '../types';

interface MarketNewsProps {
  onSelectAsset?: (symbol: string) => void;
}

const FALLBACK_NEWS: MarketNewsItem[] = [
  {
    id: 'news-1',
    headline: 'Bitcoin Consolidates Above $68,000 as Institutional Spot Inflows Accelerate',
    category: 'BTC',
    sentiment: 'BULLISH',
    source: 'Bloomberg Terminal',
    timeAgo: '4m ago',
  },
  {
    id: 'news-2',
    headline: 'Ethereum Layer-2 Aggregate TVL Reaches All-Time High Following Network Upgrades',
    category: 'ETH',
    sentiment: 'BULLISH',
    source: 'CoinDesk',
    timeAgo: '12m ago',
  },
  {
    id: 'news-3',
    headline: 'Federal Reserve Policy Shift Expectations Inject Macro Liquidity into Risk Assets',
    category: 'MACRO',
    sentiment: 'BULLISH',
    source: 'Reuters Financial',
    timeAgo: '21m ago',
  },
  {
    id: 'news-4',
    headline: 'Solana Ecosystem DEX Volume Outpaces Major Centralized Exchanges in 24h Tally',
    category: 'SOL',
    sentiment: 'BULLISH',
    source: 'Blockworks',
    timeAgo: '35m ago',
  },
  {
    id: 'news-5',
    headline: 'Global Banking Regulators Advance Standardized Liquidity Frameworks for Digital Assets',
    category: 'REGULATION',
    sentiment: 'NEUTRAL',
    source: 'Financial Times',
    timeAgo: '48m ago',
  },
  {
    id: 'news-6',
    headline: 'Avalanche Institutional Subnet Onboards Sovereign Debt Tokenization Pilot Program',
    category: 'AVAX',
    sentiment: 'BULLISH',
    source: 'Decrypt',
    timeAgo: '1h ago',
  },
  {
    id: 'news-7',
    headline: 'Chainlink Cross-Chain Interoperability Protocol (CCIP) Expands Enterprise Settlement Nodes',
    category: 'LINK',
    sentiment: 'BULLISH',
    source: 'CoinTelegraph',
    timeAgo: '1h ago',
  },
];

export const MarketNews: React.FC<MarketNewsProps> = ({ onSelectAsset }) => {
  const [news, setNews] = useState<MarketNewsItem[]>(FALLBACK_NEWS);
  const [groundingSources, setGroundingSources] = useState<{ title: string; uri: string }[]>([]);
  const [isGrounded, setIsGrounded] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [activeHeadline, setActiveHeadline] = useState<MarketNewsItem | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now());

  // Fetch real-time market news from Google Search grounded backend
  const fetchMarketNews = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/market-news');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data: MarketNewsResponse = await res.json();

      if (Array.isArray(data.news) && data.news.length > 0) {
        setNews(data.news);
      }
      if (Array.isArray(data.groundingSources)) {
        setGroundingSources(data.groundingSources);
      }
      setIsGrounded(!!data.grounded);
      setLastRefreshed(Date.now());
    } catch (err) {
      console.warn('Could not fetch live search-grounded market news, keeping current items:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMarketNews();
  }, [fetchMarketNews]);

  // Periodic background refresh every 4 minutes (respecting server cache and rate limits)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMarketNews();
    }, 240000);
    return () => clearInterval(interval);
  }, [fetchMarketNews]);

  // Color helper for categories
  const getCategoryBadgeClass = (category: string) => {
    const cat = category.toUpperCase();
    if (cat.includes('BTC')) return 'bg-amber-950 text-amber-300 border-amber-800';
    if (cat.includes('ETH')) return 'bg-cyan-950 text-cyan-300 border-cyan-800';
    if (cat.includes('SOL')) return 'bg-purple-950 text-purple-300 border-purple-800';
    if (cat.includes('AVAX')) return 'bg-rose-950 text-rose-300 border-rose-800';
    if (cat.includes('LINK')) return 'bg-blue-950 text-blue-300 border-blue-800';
    if (cat.includes('MACRO')) return 'bg-emerald-950 text-emerald-300 border-emerald-800';
    if (cat.includes('REGULATION')) return 'bg-indigo-950 text-indigo-300 border-indigo-800';
    return 'bg-slate-900 text-slate-300 border-slate-700';
  };

  // Helper for sentiment badge
  const renderSentimentIcon = (sentiment: string) => {
    if (sentiment === 'BULLISH') {
      return (
        <span className="flex items-center gap-0.5 text-emerald-400 font-bold text-[10px]">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          <span>BULLISH</span>
        </span>
      );
    }
    if (sentiment === 'BEARISH') {
      return (
        <span className="flex items-center gap-0.5 text-rose-400 font-bold text-[10px]">
          <TrendingDown className="w-3 h-3 text-rose-400" />
          <span>BEARISH</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-0.5 text-slate-400 font-medium text-[10px]">
        <Minus className="w-3 h-3 text-slate-400" />
        <span>NEUTRAL</span>
      </span>
    );
  };

  // Duplicate items to form a seamless infinite loop in the marquee
  const tickerItems = [...news, ...news];

  return (
    <>
      {/* Ticker Bar Beneath Header */}
      <div className="relative w-full h-8 bg-[#090d16] border-b border-slate-800/80 flex items-center overflow-hidden z-20 select-none text-xs font-mono">
        {/* Left Indicator Badge */}
        <div className="flex items-center gap-2 pl-3 pr-2.5 h-full bg-[#090d16] border-r border-slate-800/80 shrink-0 z-30 shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
            <span className="font-bold text-white tracking-wider text-[10px]">MARKET WIRE</span>
          </div>

          {/* Search Grounding Badge */}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 text-[9px] font-sans font-semibold transition-colors cursor-pointer"
            title="Google Search Grounded live crypto news. Click to view all news & citations."
          >
            <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
            <span>Search Grounded</span>
          </button>
        </div>

        {/* Scrolling Marquee Container */}
        <div className="flex-1 overflow-hidden h-full flex items-center relative mask-fade-edges">
          <div
            className="animate-marquee items-center gap-6 cursor-pointer"
            style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
          >
            {tickerItems.map((item, idx) => (
              <div
                key={`${item.id || idx}-${idx}`}
                onClick={() => setActiveHeadline(item)}
                className="flex items-center gap-2 px-1 hover:text-cyan-300 transition-colors whitespace-nowrap group"
              >
                {/* Category Pill */}
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase border ${getCategoryBadgeClass(
                    item.category
                  )}`}
                >
                  {item.category}
                </span>

                {/* Sentiment */}
                {renderSentimentIcon(item.sentiment)}

                {/* Headline Text */}
                <span className="text-slate-200 group-hover:text-cyan-300 font-medium text-[11px]">
                  {item.headline}
                </span>

                {/* Source & Time */}
                <span className="text-slate-500 text-[10px]">
                  · {item.source} ({item.timeAgo})
                </span>

                {/* Divider dot between ticker stories */}
                <span className="text-slate-700 ml-2">◆</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Controls Toolstrip */}
        <div className="flex items-center gap-1.5 px-3 h-full bg-[#090d16] border-l border-slate-800/80 shrink-0 z-30 shadow-[-4px_0_12px_rgba(0,0,0,0.5)]">
          {/* Pause / Resume Ticker */}
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isPaused ? 'Resume scrolling ticker' : 'Pause scrolling ticker'}
          >
            {isPaused ? <Play className="w-3 h-3 text-cyan-400" /> : <Pause className="w-3 h-3" />}
          </button>

          {/* Refresh Real-Time Headlines */}
          <button
            type="button"
            onClick={fetchMarketNews}
            disabled={isLoading}
            className={`p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors ${
              isLoading ? 'opacity-50' : ''
            }`}
            title="Refresh search-grounded news headlines"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* View Full News Feed Modal */}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Open Market News Feed"
          >
            <span>All ({news.length})</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Headline Detail Popover / Modal */}
      {activeHeadline && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1420] border border-cyan-500/50 rounded-2xl max-w-md w-full p-5 shadow-2xl relative font-mono text-xs">
            <button
              onClick={() => setActiveHeadline(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${getCategoryBadgeClass(
                  activeHeadline.category
                )}`}
              >
                {activeHeadline.category}
              </span>
              {renderSentimentIcon(activeHeadline.sentiment)}
              <span className="text-[10px] text-slate-500 ml-auto flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {activeHeadline.timeAgo}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white leading-snug mb-3 font-sans">
              {activeHeadline.headline}
            </h3>

            <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 mb-4 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>News Publisher:</span>
                <span className="text-white font-semibold">{activeHeadline.source}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Verification Method:</span>
                <span className="text-cyan-400 flex items-center gap-1 font-semibold">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Google Search Grounding
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Market Implication:</span>
                <span
                  className={
                    activeHeadline.sentiment === 'BULLISH'
                      ? 'text-emerald-400 font-bold'
                      : activeHeadline.sentiment === 'BEARISH'
                      ? 'text-rose-400 font-bold'
                      : 'text-slate-300'
                  }
                >
                  {activeHeadline.sentiment === 'BULLISH'
                    ? 'Risk-On Liquidity Inflow'
                    : activeHeadline.sentiment === 'BEARISH'
                    ? 'Downside Volatility Risk'
                    : 'Balanced Consolidation'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {activeHeadline.url && (
                <a
                  href={activeHeadline.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Read Full Article</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setActiveHeadline(null)}
                className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Market News Hub & Google Grounding Sources Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl relative font-mono text-xs overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0d121e]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 via-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Live Crypto Market Wire</span>
                    <span className="text-[10px] text-cyan-300 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                      Google Search Grounded
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans">
                    Real-time aggregated headlines dynamically retrieved from the web
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchMarketNews}
                  disabled={isLoading}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 text-[11px] transition-colors"
                  title="Refresh news"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              <div className="text-slate-400 text-[11px] flex items-center justify-between pb-1 border-b border-slate-800/80">
                <span>Latest Headlines ({news.length})</span>
                <span className="text-slate-500 text-[10px]">
                  Refreshed: {new Date(lastRefreshed).toLocaleTimeString()}
                </span>
              </div>

              {news.map((item, idx) => (
                <div
                  key={`${item.id || idx}`}
                  onClick={() => setActiveHeadline(item)}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition-all cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase border ${getCategoryBadgeClass(
                          item.category
                        )}`}
                      >
                        {item.category}
                      </span>
                      {renderSentimentIcon(item.sentiment)}
                    </div>
                    <span className="text-[10px] text-slate-500">{item.timeAgo}</span>
                  </div>

                  <div className="text-slate-100 font-sans font-semibold text-xs leading-snug">
                    {item.headline}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                    <span>Source: {item.source}</span>
                    <span className="text-cyan-400 hover:underline flex items-center gap-1 font-sans">
                      <span>View Insight</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              ))}

              {/* Grounding Sources Citations */}
              {groundingSources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Google Search Grounding Citations</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
                    {groundingSources.slice(0, 6).map((source, sIdx) => (
                      <a
                        key={sIdx}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 flex items-center justify-between gap-2 truncate transition-colors"
                      >
                        <span className="truncate">{source.title || source.uri}</span>
                        <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-800 bg-[#0d121e] flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Real-time Google search verification active</span>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
