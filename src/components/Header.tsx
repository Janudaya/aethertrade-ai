import React from 'react';
import {
  Sparkles,
  Bot,
  Globe,
  MessageSquare,
  Volume2,
  VolumeX,
  RotateCcw,
  TrendingUp,
  Activity,
  Layers,
  ShieldAlert,
  Flame,
  Network,
  BarChart3,
  CalendarClock,
  Scale,
} from 'lucide-react';
import { Asset } from '../types';
import { GlobalSearch } from './GlobalSearch';

interface HeaderProps {
  assets: Asset[];
  currentAsset: Asset;
  onSelectAsset: (asset: Asset) => void;
  portfolioBalance: number;
  unrealizedPnL: number;
  openPositionsCount: number;
  activeAgentsCount: number;
  onOpenSignalModal: () => void;
  onOpenAgentModal: () => void;
  onOpenSentimentModal: () => void;
  onOpenRiskHeatmap: () => void;
  onOpenMarketScanner: () => void;
  onOpenCorrelationModal?: () => void;
  onOpenTradeAnalysis?: () => void;
  onOpenBulkScheduler?: () => void;
  activeSchedulesCount?: number;
  onOpenRebalanceModal?: () => void;
  onToggleCopilot: () => void;
  copilotOpen: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onResetPortfolio: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  assets,
  currentAsset,
  onSelectAsset,
  portfolioBalance,
  unrealizedPnL,
  openPositionsCount,
  activeAgentsCount,
  onOpenSignalModal,
  onOpenAgentModal,
  onOpenSentimentModal,
  onOpenRiskHeatmap,
  onOpenMarketScanner,
  onOpenCorrelationModal,
  onOpenTradeAnalysis,
  onOpenBulkScheduler,
  activeSchedulesCount = 0,
  onOpenRebalanceModal,
  onToggleCopilot,
  copilotOpen,
  soundEnabled,
  onToggleSound,
  onResetPortfolio,
}) => {
  const totalEquity = portfolioBalance + unrealizedPnL;
  const pnlIsPositive = unrealizedPnL >= 0;

  return (
    <header className="bg-[#0b0e14] border-b border-slate-800/80 text-slate-200 select-none">
      {/* Top Main Navigation Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3 xl:gap-6">
        {/* Logo and Brand */}
        <div className="flex items-center gap-4 xl:gap-6 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-white">AETHER<span className="text-cyan-400">TRADE</span></span>
                <span className="text-[10px] font-mono tracking-widest text-cyan-400/90 uppercase bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">QUANT AI</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono -mt-0.5 hidden sm:block">High-Frequency Neural Terminal</p>
            </div>
          </div>

          {/* Quick Asset Selector Tabs */}
          <div className="hidden 2xl:flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            {assets.slice(0, 4).map((asset) => {
              const isSelected = asset.symbol === currentAsset.symbol;
              const isUp = asset.change24h >= 0;
              return (
                <button
                  key={asset.symbol}
                  onClick={() => onSelectAsset(asset)}
                  className={`flex items-center gap-2 px-2.5 py-1 text-xs rounded font-medium transition-all ${
                    isSelected
                      ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <span>{asset.symbol}</span>
                  <span className={`font-mono text-[11px] ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${asset.price >= 1000 ? asset.price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : asset.price.toFixed(asset.decimals)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Search Bar (Center) */}
        <div className="flex-1 flex justify-center max-w-sm lg:max-w-md mx-2">
          <GlobalSearch
            assets={assets}
            currentAsset={currentAsset}
            onSelectAsset={onSelectAsset}
          />
        </div>

        {/* Portfolio Live Capital Display */}
        <div className="flex items-center gap-3 xl:gap-4 shrink-0">
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg">
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                <span>Paper Equity</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <div className="text-sm font-bold font-mono text-white">
                ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400">
                Unrealized PnL
              </div>
              <div className={`text-xs font-bold font-mono flex items-center gap-1 ${pnlIsPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {pnlIsPositive ? '+' : ''}${unrealizedPnL.toFixed(2)}
                <span className="text-[10px] font-normal">
                  ({pnlIsPositive ? '+' : ''}{((unrealizedPnL / portfolioBalance) * 100).toFixed(2)}%)
                </span>
              </div>
            </div>

            <button
              onClick={onResetPortfolio}
              title="Reset Simulated Balance to $100,000"
              className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* AI Feature Toolbar */}
          <div className="flex items-center gap-1.5">
            {/* AI Signal Scanner */}
            <button
              onClick={onOpenSignalModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-medium transition-all shadow-sm group"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>AI Alpha Signal</span>
            </button>

            {/* AI Autonomous Agents Hub */}
            <button
              onClick={onOpenAgentModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium transition-all relative"
            >
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI Bot Hub</span>
              {activeAgentsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                  {activeAgentsCount}
                </span>
              )}
            </button>

            {/* Extreme Volatility Market Scanner */}
            <button
              onClick={onOpenMarketScanner}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-950/70 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-medium transition-all shadow-sm group"
              title="Scan market for extreme volatility & high-variance breakout assets"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform animate-pulse" />
              <span>Volatility Scanner</span>
            </button>

            {/* Visual Risk Heatmap */}
            <button
              onClick={onOpenRiskHeatmap}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium transition-all"
              title="Portfolio Visual Exposure & Risk Heatmap"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xl:inline">Risk Heatmap</span>
            </button>

            {/* Asset Correlation Matrix */}
            {onOpenCorrelationModal && (
              <button
                onClick={onOpenCorrelationModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-medium transition-all shadow-sm group"
                title="Cross-Asset Correlation Matrix & Diversification Heatmap"
              >
                <Network className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="hidden xl:inline">Correlation Matrix</span>
              </button>
            )}

            {/* Trade Analysis Dashboard */}
            {onOpenTradeAnalysis && (
              <button
                onClick={onOpenTradeAnalysis}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-medium transition-all shadow-sm group"
                title="Recharts Trade Outcome Analysis (Win/Loss by Asset & PnL vs Duration)"
              >
                <BarChart3 className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="hidden xl:inline">Trade Analysis</span>
              </button>
            )}

            {/* Bulk Order Scheduler */}
            {onOpenBulkScheduler && (
              <button
                onClick={onOpenBulkScheduler}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-950/40 hover:bg-teal-900/60 border border-teal-500/40 text-teal-300 hover:text-white text-xs font-medium transition-all shadow-sm group"
                title="Automated DCA & Multi-Stage Staged Execution Scheduler"
              >
                <CalendarClock className="w-3.5 h-3.5 text-teal-400 group-hover:scale-110 transition-transform" />
                <span className="hidden xl:inline">Order Scheduler</span>
                {activeSchedulesCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-teal-500/30 text-teal-300 border border-teal-500/40 animate-pulse">
                    {activeSchedulesCount}
                  </span>
                )}
              </button>
            )}

            {/* Portfolio Rebalancer */}
            {onOpenRebalanceModal && (
              <button
                onClick={onOpenRebalanceModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-medium transition-all shadow-sm group"
                title="Portfolio Rebalancer (Equal-Weight & Risk-Parity Distribution)"
              >
                <Scale className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="hidden xl:inline">Rebalancer</span>
              </button>
            )}

            {/* Market Sentiment / Macro */}
            <button
              onClick={onOpenSentimentModal}
              title="Market Sentiment & Macro Pulse"
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <Globe className="w-4 h-4 text-emerald-400" />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={onToggleSound}
              title={soundEnabled ? 'Mute Terminal Audio' : 'Unmute Terminal Audio'}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-slate-300" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* AI Copilot Drawer Toggle */}
            <button
              onClick={onToggleCopilot}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                copilotOpen
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-semibold'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Copilot</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
