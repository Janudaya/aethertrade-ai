import React, { useState, useMemo } from 'react';
import {
  X,
  Share2,
  TrendingUp,
  TrendingDown,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bot,
  ShieldAlert,
  BarChart3,
  Scale,
  Percent,
  Zap,
  Download,
  FileSpreadsheet,
  FileText,
  MessageSquareText,
  Plus,
  Network,
  Filter,
  CalendarClock,
  Search,
} from 'lucide-react';
import { Position, Order, TradeHistoryItem, TradeCategory, Asset, OrderPlacementPayload } from '../types';
import { RiskHeatmap } from './RiskHeatmap';
import { CumulativePnLChart } from './CumulativePnLChart';
import { PortfolioPerformanceChart } from './PortfolioPerformanceChart';
import { PortfolioRebalanceModal } from './PortfolioRebalanceModal';
import { SessionPerformanceReportModal } from './SessionPerformanceReportModal';
import { TradeNotesModal, TradeNoteTarget, TradeSentiment, TradeNoteEntry } from './TradeNotesModal';
import { AssetCorrelationModal } from './AssetCorrelationModal';
import { TradeAnalysisModal } from './TradeAnalysisModal';

interface PositionsTableProps {
  positions: Position[];
  orders: Order[];
  tradeHistory: TradeHistoryItem[];
  assets: Asset[];
  portfolioBalance: number;
  onClosePosition: (positionId: string) => void;
  onCancelOrder: (orderId: string) => void;
  onSelectAsset?: (asset: Asset) => void;
  onPlaceOrder?: (orderData: OrderPlacementPayload) => void;
  onPlaceBatchOrders?: (orders: OrderPlacementPayload[]) => { success: boolean; count: number; error?: string };
  defaultTab?: 'positions' | 'orders' | 'history' | 'performance' | 'pnlChart' | 'heatmap' | 'analytics';
}

export const getTradeCategory = (trade: TradeHistoryItem): TradeCategory => {
  if (trade.category) return trade.category;

  const notesLower = (trade.notes || '').toLowerCase();
  const agentLower = (trade.agentName || '').toLowerCase();
  const reason = (trade.reason as string) || '';

  // 1. Schedule Category (DCA / Multi-Stage Ladder)
  if (
    reason === 'SCHEDULE' ||
    reason === 'SCHEDULED_DCA' ||
    notesLower.includes('schedule') ||
    notesLower.includes('dca') ||
    notesLower.includes('ladder') ||
    notesLower.includes('tranche') ||
    agentLower.includes('schedule') ||
    agentLower.includes('dca')
  ) {
    return 'Schedule';
  }

  // 2. Agent Category (AI Autonomous Bot)
  if (
    reason === 'AI_AGENT' ||
    (Boolean(trade.agentName) &&
      !agentLower.includes('manual') &&
      !agentLower.includes('schedule') &&
      !agentLower.includes('dca'))
  ) {
    return 'Agent';
  }

  // 3. Take Profit
  if (reason === 'TAKE_PROFIT') {
    return 'Take Profit';
  }

  // 4. Stop Loss
  if (reason === 'STOP_LOSS') {
    return 'Stop Loss';
  }

  // 5. Trailing Stop
  if (reason === 'TRAILING_STOP') {
    return 'Trailing Stop';
  }

  // Default: Manual
  return 'Manual';
};

export const renderCategoryBadge = (category: TradeCategory) => {
  switch (category) {
    case 'Agent':
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-950/90 border border-indigo-500/50 text-indigo-300 inline-flex items-center gap-1 shadow-sm">
          <Bot className="w-3 h-3 text-indigo-400" />
          <span>Agent</span>
        </span>
      );
    case 'Schedule':
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-950/90 border border-teal-500/50 text-teal-300 inline-flex items-center gap-1 shadow-sm">
          <CalendarClock className="w-3 h-3 text-teal-400" />
          <span>Schedule</span>
        </span>
      );
    case 'Manual':
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 inline-flex items-center gap-1 shadow-sm">
          <Zap className="w-3 h-3 text-cyan-400" />
          <span>Manual</span>
        </span>
      );
    case 'Take Profit':
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 inline-flex items-center gap-1 shadow-sm">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          <span>Take Profit</span>
        </span>
      );
    case 'Stop Loss':
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-950/90 border border-rose-500/50 text-rose-300 inline-flex items-center gap-1 shadow-sm">
          <ShieldAlert className="w-3 h-3 text-rose-400" />
          <span>Stop Loss</span>
        </span>
      );
    case 'Trailing Stop':
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/90 border border-amber-500/50 text-amber-300 inline-flex items-center gap-1 shadow-sm">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>Trailing Stop</span>
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 inline-flex items-center gap-1">
          <span>{category}</span>
        </span>
      );
  }
};

export const PositionsTable: React.FC<PositionsTableProps> = ({
  positions,
  orders,
  tradeHistory,
  assets,
  portfolioBalance,
  onClosePosition,
  onCancelOrder,
  onSelectAsset,
  onPlaceOrder,
  onPlaceBatchOrders,
  defaultTab = 'positions',
}) => {
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history' | 'performance' | 'pnlChart' | 'heatmap' | 'analytics'>(defaultTab);
  const [sharePosition, setSharePosition] = useState<Position | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [rebalanceModalOpen, setRebalanceModalOpen] = useState<boolean>(false);
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [correlationModalOpen, setCorrelationModalOpen] = useState<boolean>(false);
  const [analysisModalOpen, setAnalysisModalOpen] = useState<boolean>(false);

  // Trade History Auto-Categorization Filter & Search State
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<string>('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // Trade Notes & Sentiment state map: key is trade/position ID, value is TradeNoteEntry
  const [tradeNotes, setTradeNotes] = useState<Record<string, TradeNoteEntry>>(() => {
    try {
      const stored = localStorage.getItem('aethertrade_trade_notes');
      if (stored) {
        const parsed = JSON.parse(stored);
        const normalized: Record<string, TradeNoteEntry> = {};
        Object.entries(parsed).forEach(([k, v]) => {
          if (typeof v === 'string') {
            normalized[k] = { text: v, sentiment: 'NEUTRAL' };
          } else if (v && typeof v === 'object') {
            normalized[k] = {
              text: (v as any).text || '',
              sentiment: (v as any).sentiment || 'NEUTRAL',
              updatedAt: (v as any).updatedAt,
            };
          }
        });
        return normalized;
      }
    } catch {
      // fallback
    }
    // Pre-populate realistic post-mortem notes and sentiment tags for default trades
    return {
      'trade-init-1': {
        text: 'Breakout confirmed on 15m 200 EMA retest. Scaled out at target resistance with +12.3% ROI. Solid discipline.',
        sentiment: 'BULLISH',
      },
      'trade-init-2': {
        text: 'Overbought RSI divergence on ETH. Fast short scalp before support bounce. Clean take-profit hit.',
        sentiment: 'BEARISH',
      },
      'trade-init-3': {
        text: 'Premature stop out caused by sudden news wick. Next time widen SL by 1.5% during high volatility events.',
        sentiment: 'BULLISH',
      },
      'trade-init-4': {
        text: 'Inflation print macro hedge on Gold. Excellent risk:reward execution following plan.',
        sentiment: 'BULLISH',
      },
      'trade-init-6': {
        text: 'Counter-trend short during strong bull momentum. Avoid shorting parabolic breakout candles without confirmation.',
        sentiment: 'BEARISH',
      },
    };
  });

  const [editingNoteTarget, setEditingNoteTarget] = useState<TradeNoteTarget | null>(null);

  const handleSaveNote = (id: string, noteText: string, sentiment: TradeSentiment) => {
    setTradeNotes((prev) => {
      const next = { ...prev };
      if (noteText.trim()) {
        next[id] = {
          text: noteText.trim(),
          sentiment,
          updatedAt: Date.now(),
        };
      } else {
        delete next[id];
      }
      try {
        localStorage.setItem('aethertrade_trade_notes', JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save trade note to localStorage', err);
      }
      return next;
    });
  };

  // Export trade history to CSV file
  const handleExportCSV = () => {
    if (tradeHistory.length === 0) return;

    // Define CSV Headers
    const headers = [
      'Trade ID',
      'Date',
      'Time',
      'Symbol',
      'Side',
      'Category',
      'Entry Price (USDT)',
      'Exit Price (USDT)',
      'Quantity',
      'Realized PnL (USDT)',
      'ROI (%)',
      'Exit Reason',
      'Agent / Strategy',
      'Sentiment Tag',
      'Trade Notes',
    ];

    // Format each trade row
    const rows = tradeHistory.map((trade) => {
      const dateObj = new Date(trade.closedAt);
      const dateStr = dateObj.toLocaleDateString('en-US');
      const timeStr = dateObj.toLocaleTimeString('en-US');
      const entry = tradeNotes[trade.id];
      const sentimentStr = entry?.sentiment || 'NEUTRAL';
      const noteStr = entry?.text || trade.notes || '';

      return [
        `"${trade.id}"`,
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${trade.symbol}"`,
        `"${trade.side}"`,
        `"${getTradeCategory(trade)}"`,
        trade.entryPrice.toFixed(4),
        trade.exitPrice.toFixed(4),
        trade.quantity.toFixed(4),
        trade.pnl.toFixed(2),
        trade.pnlPct.toFixed(2),
        `"${trade.reason.replace(/_/g, ' ')}"`,
        `"${trade.agentName || 'Manual Execution'}"`,
        `"${sentimentStr}"`,
        `"${noteStr.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.setAttribute('href', url);
    link.setAttribute('download', `aethertrade-history-${timestampStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportFeedback(`Exported ${tradeHistory.length} trades to CSV!`);
    setTimeout(() => setExportFeedback(null), 3500);
  };

  // Analytics & Summary Metrics Calculation
  const totalTrades = tradeHistory.length;
  const winTrades = tradeHistory.filter((t) => t.pnl > 0).length;
  const lossTrades = tradeHistory.filter((t) => t.pnl < 0).length;
  const breakEvenTrades = tradeHistory.filter((t) => t.pnl === 0).length;
  const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;

  const totalRealizedPnl = tradeHistory.reduce((acc, t) => acc + t.pnl, 0);
  const totalGains = tradeHistory.filter((t) => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
  const totalLosses = Math.abs(tradeHistory.filter((t) => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));

  const avgWin = winTrades > 0 ? totalGains / winTrades : 0;
  const avgLoss = lossTrades > 0 ? totalLosses / lossTrades : 0;
  const avgRR = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : avgWin > 0 ? 'MAX' : '0.00';
  const profitFactor = totalLosses > 0 ? (totalGains / totalLosses).toFixed(2) : totalGains > 0 ? 'MAX' : '0.00';
  const tradeExpectancy = totalTrades > 0 ? totalRealizedPnl / totalTrades : 0;

  // Trade History Auto-Categorization Stats & Filtered Results
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: tradeHistory.length,
      Agent: 0,
      Manual: 0,
      Schedule: 0,
      'Take Profit': 0,
      'Stop Loss': 0,
      'Trailing Stop': 0,
    };

    tradeHistory.forEach((t) => {
      const cat = getTradeCategory(t);
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return counts;
  }, [tradeHistory]);

  const filteredTradeHistory = useMemo(() => {
    return tradeHistory.filter((trade) => {
      // 1. Category Filter
      if (historyCategoryFilter !== 'ALL') {
        const cat = getTradeCategory(trade);
        if (cat !== historyCategoryFilter) return false;
      }

      // 2. Search Query
      if (historySearchQuery.trim()) {
        const query = historySearchQuery.trim().toLowerCase();
        const matchSymbol = trade.symbol.toLowerCase().includes(query);
        const matchAgent = (trade.agentName || '').toLowerCase().includes(query);
        const matchNotes = (trade.notes || '').toLowerCase().includes(query);
        const noteEntry = tradeNotes[trade.id]?.text.toLowerCase() || '';
        const matchUserNote = noteEntry.includes(query);
        const matchReason = (trade.reason || '').toLowerCase().includes(query);
        const cat = getTradeCategory(trade).toLowerCase();
        const matchCat = cat.includes(query);

        if (!matchSymbol && !matchAgent && !matchNotes && !matchUserNote && !matchReason && !matchCat) {
          return false;
        }
      }

      return true;
    });
  }, [tradeHistory, historyCategoryFilter, historySearchQuery, tradeNotes]);

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] border-t border-slate-800 text-slate-300 select-none">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-[#0d111a]">
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'positions'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Open Positions</span>
            {positions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {positions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'orders'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Open Orders</span>
            {orders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-700 text-slate-300">
                {orders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Trade History ({tradeHistory.length})
          </button>

          <button
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'performance' || activeTab === 'pnlChart'
                ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/50 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>Portfolio Performance</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Performance KPIs
          </button>

          <button
            onClick={() => setActiveTab('heatmap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'heatmap'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-300" />
            <span>Risk Heatmap</span>
          </button>
        </div>

        {/* Quick Performance Indicators, Correlation & Rebalance in Dock Header */}
        <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono">
          {/* Trade Analysis Dashboard Modal Button */}
          <button
            type="button"
            onClick={() => setAnalysisModalOpen(true)}
            className="px-2.5 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white transition-all flex items-center gap-1 font-semibold cursor-pointer shadow-sm"
            title="Open Recharts Trade Analysis Dashboard (Win/Loss by Asset & PnL vs Duration)"
          >
            <BarChart3 className="w-3 h-3 text-cyan-400" />
            <span>Analysis</span>
          </button>

          {/* Asset Correlation Matrix Modal Button */}
          <button
            type="button"
            onClick={() => setCorrelationModalOpen(true)}
            className="px-2.5 py-0.5 rounded bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 hover:border-indigo-400 text-indigo-300 hover:text-white transition-all flex items-center gap-1 font-semibold cursor-pointer shadow-sm"
            title="Open Asset Correlation Matrix & Diversification Heatmap"
          >
            <Network className="w-3 h-3 text-indigo-400" />
            <span>Correlation</span>
          </button>

          {/* Session Performance Report Button */}
          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="px-2.5 py-0.5 rounded bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 hover:border-purple-400 text-purple-300 hover:text-white transition-all flex items-center gap-1 font-semibold cursor-pointer shadow-sm"
            title="Open detailed trading session performance report"
          >
            <FileText className="w-3 h-3 text-purple-400" />
            <span>Report</span>
          </button>

          {/* Rebalance Portfolio Button in Dock Header */}
          <button
            type="button"
            onClick={() => setRebalanceModalOpen(true)}
            className="px-2.5 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white transition-all flex items-center gap-1 font-semibold cursor-pointer shadow-sm"
            title="Automatically suggests trades to rebalance holdings to an equal-weight distribution"
          >
            <Scale className="w-3 h-3 text-cyan-400" />
            <span>Rebalance</span>
          </button>

          {tradeHistory.length > 0 && (
            <>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                Win Rate: <strong className="text-emerald-400">{winRate.toFixed(1)}%</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                Avg R:R: <strong className="text-cyan-400">1 : {avgRR}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                Profit Factor: <strong className="text-indigo-400">{profitFactor}</strong>
              </span>
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
                title="Export all closed trades to CSV"
              >
                <Download className="w-3 h-3" />
                <span>CSV</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-3 text-xs">
        {activeTab === 'heatmap' && (
          <div className="h-full min-h-[300px]">
            <RiskHeatmap
              positions={positions}
              portfolioBalance={portfolioBalance}
              assets={assets}
              onSelectAsset={onSelectAsset}
            />
          </div>
        )}
        {activeTab === 'positions' && (
          positions.length === 0 ? (
            <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-slate-500 gap-1.5">
              <Clock className="w-6 h-6 stroke-1 text-slate-600" />
              <p>No active positions opened.</p>
              <p className="text-[11px] text-slate-600">
                Place an order or trigger an AI Agent to execute automated trades.
              </p>
            </div>
          ) : (
            <table className="w-full text-left font-mono">
              <thead>
                <tr className="text-slate-500 text-[10px] uppercase border-b border-slate-800 pb-2">
                  <th className="pb-2 font-normal">Asset / Side</th>
                  <th className="pb-2 font-normal">Size (Margin)</th>
                  <th className="pb-2 font-normal">Entry Price</th>
                  <th className="pb-2 font-normal">Mark Price</th>
                  <th className="pb-2 font-normal">Est. Liq Price</th>
                  <th className="pb-2 font-normal">TP / SL</th>
                  <th className="pb-2 font-normal text-right">Unrealized PnL (ROI)</th>
                  <th className="pb-2 font-normal">Trade Notes</th>
                  <th className="pb-2 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {positions.map((pos) => {
                  const isLong = pos.side === 'LONG';
                  const isProfit = pos.pnl >= 0;

                  return (
                    <tr key={pos.id} className="hover:bg-slate-900/60 transition-colors">
                      {/* Asset & Side */}
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs">{pos.symbol}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isLong
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {pos.side} {pos.leverage}x
                          </span>
                          {pos.agentName && (
                            <span className="flex items-center gap-0.5 text-[9px] text-indigo-300 bg-indigo-950/70 border border-indigo-800 px-1 rounded">
                              <Bot className="w-2.5 h-2.5" />
                              {pos.agentName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Size */}
                      <td className="py-2.5">
                        <div className="text-white">${(pos.margin * pos.leverage).toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500">${pos.margin.toLocaleString()} margin</div>
                      </td>

                      {/* Entry Price */}
                      <td className="py-2.5 text-slate-300">${pos.entryPrice.toLocaleString()}</td>

                      {/* Mark Price */}
                      <td className="py-2.5 text-white font-semibold">${pos.currentPrice.toLocaleString()}</td>

                      {/* Liq Price */}
                      <td className="py-2.5 text-amber-400">${pos.liquidationPrice.toLocaleString()}</td>

                      {/* TP / SL */}
                      <td className="py-2.5 text-[11px]">
                        <div className="text-emerald-400">TP: {pos.takeProfit ? `$${pos.takeProfit}` : '--'}</div>
                        {pos.trailingStopPct ? (
                          <div className="flex items-center gap-1 text-cyan-400 font-bold" title={`Trailing Callback: ${pos.trailingStopPct}%`}>
                            <span>Trail SL:</span>
                            <span>${pos.trailingStopPrice || pos.stopLoss}</span>
                            <span className="text-[9px] bg-cyan-950 px-1 rounded border border-cyan-800 font-normal text-cyan-300">
                              {pos.trailingStopPct}%
                            </span>
                          </div>
                        ) : (
                          <div className="text-rose-400">SL: {pos.stopLoss ? `$${pos.stopLoss}` : '--'}</div>
                        )}
                      </td>

                      {/* Unrealized PnL */}
                      <td className="py-2.5 text-right font-bold">
                        <div className={isProfit ? 'text-emerald-400' : 'text-rose-400'}>
                          {isProfit ? '+' : ''}${pos.pnl.toFixed(2)}
                        </div>
                        <div className={`text-[10px] font-normal ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ({isProfit ? '+' : ''}{pos.pnlPct.toFixed(2)}%)
                        </div>
                      </td>

                      {/* Trade Notes & Sentiment */}
                      <td className="py-2.5">
                        {tradeNotes[pos.id] ? (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingNoteTarget({
                                id: pos.id,
                                symbol: pos.symbol,
                                side: pos.side,
                                pnl: pos.pnl,
                                pnlPct: pos.pnlPct,
                                price: pos.currentPrice,
                                date: new Date(pos.openedAt).toLocaleTimeString(),
                                note: tradeNotes[pos.id].text,
                                sentiment: tradeNotes[pos.id].sentiment,
                                isPosition: true,
                              })
                            }
                            className="max-w-[155px] truncate text-left text-[10px] px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-cyan-300 hover:text-cyan-200 transition-all flex items-center gap-1.5 group cursor-pointer"
                            title={`Sentiment: ${tradeNotes[pos.id].sentiment} | Note: "${tradeNotes[pos.id].text}"`}
                          >
                            <span
                              className={`px-1 py-0.2 rounded text-[8px] font-bold shrink-0 ${
                                tradeNotes[pos.id].sentiment === 'BULLISH'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : tradeNotes[pos.id].sentiment === 'BEARISH'
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                  : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                              }`}
                            >
                              {tradeNotes[pos.id].sentiment === 'BULLISH'
                                ? '🐂 BULL'
                                : tradeNotes[pos.id].sentiment === 'BEARISH'
                                ? '🐻 BEAR'
                                : '⚖️ NEUT'}
                            </span>
                            <span className="truncate">{tradeNotes[pos.id].text}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingNoteTarget({
                                id: pos.id,
                                symbol: pos.symbol,
                                side: pos.side,
                                pnl: pos.pnl,
                                pnlPct: pos.pnlPct,
                                price: pos.currentPrice,
                                date: new Date(pos.openedAt).toLocaleTimeString(),
                                note: '',
                                sentiment: pos.side === 'LONG' ? 'BULLISH' : 'BEARISH',
                                isPosition: true,
                              })
                            }
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-cyan-500/50 text-slate-500 hover:text-cyan-300 transition-all flex items-center gap-1 cursor-pointer"
                            title="Add trade notes and market sentiment tag"
                          >
                            <Plus className="w-2.5 h-2.5 text-slate-400" />
                            <span>Add Note</span>
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSharePosition(pos)}
                            title="Generate Share Card"
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onClosePosition(pos.id)}
                            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-semibold transition-colors"
                          >
                            Market Close
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}

        {/* Open Orders Tab */}
        {activeTab === 'orders' && (
          orders.length === 0 ? (
            <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-slate-500">
              <p>No active limit orders.</p>
            </div>
          ) : (
            <table className="w-full text-left font-mono">
              <thead>
                <tr className="text-slate-500 text-[10px] uppercase border-b border-slate-800 pb-2">
                  <th className="pb-2 font-normal">Asset</th>
                  <th className="pb-2 font-normal">Type / Side</th>
                  <th className="pb-2 font-normal">Duration</th>
                  <th className="pb-2 font-normal">Order Price</th>
                  <th className="pb-2 font-normal">Quantity</th>
                  <th className="pb-2 font-normal">Leverage</th>
                  <th className="pb-2 font-normal">Time</th>
                  <th className="pb-2 font-normal text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-2 font-bold text-white">{ord.symbol}</td>
                    <td className="py-2">
                      <span className={ord.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                        {ord.type} {ord.side}
                      </span>
                    </td>
                    <td className="py-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-cyan-300 border border-slate-700 font-semibold">
                        {ord.duration || 'GTC'}
                      </span>
                    </td>
                    <td className="py-2 text-white">${ord.price.toLocaleString()}</td>
                    <td className="py-2 text-slate-300">{ord.quantity.toFixed(3)}</td>
                    <td className="py-2 text-cyan-400">{ord.leverage}x</td>
                    <td className="py-2 text-slate-500">{new Date(ord.createdAt).toLocaleTimeString()}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => onCancelOrder(ord.id)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* Trade History Tab */}
        {activeTab === 'history' && (
          tradeHistory.length === 0 ? (
            <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-slate-500">
              <p>No closed trade history yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Key Trading Metrics Summary Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900/90 via-[#0d121d] to-slate-900/90 border border-slate-800 shadow-lg font-mono">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-sm">
                      <BarChart3 className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white tracking-wide">
                        Key Trading Performance Summary
                      </span>
                      <span className="ml-2 text-[10px] text-slate-400 font-sans">
                        Based on {totalTrades} closed paper trades
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                      Net PnL:{' '}
                      <strong className={totalRealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {totalRealizedPnl >= 0 ? '+' : ''}${totalRealizedPnl.toFixed(2)}
                      </strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                      Expectancy:{' '}
                      <strong className={tradeExpectancy >= 0 ? 'text-cyan-400' : 'text-rose-400'}>
                        {tradeExpectancy >= 0 ? '+' : ''}${tradeExpectancy.toFixed(2)}/trade
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      disabled={tradeHistory.length === 0}
                      className="px-2.5 py-1 rounded bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 hover:border-cyan-500/70 flex items-center gap-1.5 transition-all text-[10px] font-bold shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Export trade history to CSV file"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* 3 Core Requested Metrics Grid: Win Rate, Average R:R Ratio, Total Profit Factor */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Metric 1: Win Rate */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/90 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
                      <span className="flex items-center gap-1">
                        <Percent className="w-3 h-3 text-emerald-400" />
                        <span>Win Rate</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {winTrades}W - {lossTrades}L
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl font-black text-emerald-400">
                        {winRate.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({winTrades}/{totalTrades || 1} trades)
                      </span>
                    </div>
                    {/* Win/Loss Progress Bar */}
                    <div className="w-full h-1.5 bg-rose-950/60 rounded-full mt-2 overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, winRate))}%` }}
                      />
                    </div>
                  </div>

                  {/* Metric 2: Average R:R Ratio */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/90 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
                      <span className="flex items-center gap-1">
                        <Scale className="w-3 h-3 text-cyan-400" />
                        <span>Average R:R Ratio</span>
                      </span>
                      <span className="text-[10px] text-cyan-400/80 font-mono">Risk/Reward</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl font-black text-cyan-400">
                        1 : {avgRR}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({avgRR}x payoff)
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-2 flex justify-between pt-1 border-t border-slate-800/60 font-sans">
                      <span>Avg Win: <strong className="text-emerald-400 font-mono">${avgWin.toFixed(0)}</strong></span>
                      <span>Avg Loss: <strong className="text-rose-400 font-mono">${avgLoss.toFixed(0)}</strong></span>
                    </div>
                  </div>

                  {/* Metric 3: Total Profit Factor */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/90 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-indigo-400" />
                        <span>Total Profit Factor</span>
                      </span>
                      <span className={`text-[10px] font-bold ${Number(profitFactor) >= 1.5 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {Number(profitFactor) >= 2.0 ? 'Elite' : Number(profitFactor) >= 1.2 ? 'Healthy' : 'Baseline'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl font-black text-indigo-400">
                        {profitFactor}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Gross P/L Ratio
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-2 flex justify-between pt-1 border-t border-slate-800/60 font-sans">
                      <span>Gains: <strong className="text-emerald-400 font-mono">${totalGains.toFixed(0)}</strong></span>
                      <span>Losses: <strong className="text-rose-400 font-mono">${totalLosses.toFixed(0)}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trade History Category Filter & Search Bar */}
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
                {/* Left: Category Filters */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mr-1 font-bold">
                    <Filter className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Category:</span>
                  </div>

                  {/* Filter chips */}
                  {[
                    { key: 'ALL', label: 'All', count: categoryCounts.ALL, icon: null, color: 'slate' },
                    { key: 'Agent', label: 'Agent', count: categoryCounts.Agent, icon: Bot, color: 'indigo' },
                    { key: 'Manual', label: 'Manual', count: categoryCounts.Manual, icon: Zap, color: 'cyan' },
                    { key: 'Schedule', label: 'Schedule', count: categoryCounts.Schedule, icon: CalendarClock, color: 'teal' },
                    { key: 'Take Profit', label: 'Take Profit', count: categoryCounts['Take Profit'], icon: TrendingUp, color: 'emerald' },
                    { key: 'Stop Loss', label: 'Stop Loss', count: categoryCounts['Stop Loss'], icon: ShieldAlert, color: 'rose' },
                    ...(categoryCounts['Trailing Stop'] > 0
                      ? [{ key: 'Trailing Stop', label: 'Trailing Stop', count: categoryCounts['Trailing Stop'], icon: Clock, color: 'amber' }]
                      : []),
                  ].map((cat) => {
                    const isSelected = historyCategoryFilter === cat.key;
                    const IconComp = cat.icon;

                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setHistoryCategoryFilter(cat.key)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? cat.color === 'indigo'
                              ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                              : cat.color === 'teal'
                              ? 'bg-teal-600 text-white shadow-sm ring-1 ring-teal-400'
                              : cat.color === 'cyan'
                              ? 'bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400'
                              : cat.color === 'emerald'
                              ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                              : cat.color === 'rose'
                              ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400'
                              : cat.color === 'amber'
                              ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400'
                              : 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-500'
                            : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {IconComp && <IconComp className="w-3 h-3 shrink-0" />}
                        <span>{cat.label}</span>
                        <span
                          className={`text-[9px] px-1 rounded-full font-mono ${
                            isSelected
                              ? 'bg-black/30 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {cat.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Right: Search Filter Input */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter by symbol, note, reason..."
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-7 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-44 sm:w-56"
                    />
                    {historySearchQuery && (
                      <button
                        type="button"
                        onClick={() => setHistorySearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {(historyCategoryFilter !== 'ALL' || historySearchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryCategoryFilter('ALL');
                        setHistorySearchQuery('');
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Closed Trades List Table */}
              <table className="w-full text-left font-mono">
                <thead>
                  <tr className="text-slate-500 text-[10px] uppercase border-b border-slate-800 pb-2">
                    <th className="pb-2 font-normal">Asset / Side</th>
                    <th className="pb-2 font-normal">Category</th>
                    <th className="pb-2 font-normal">Entry / Exit</th>
                    <th className="pb-2 font-normal">Reason / Trigger</th>
                    <th className="pb-2 font-normal">Closed At</th>
                    <th className="pb-2 font-normal text-right">Realized PnL (ROI)</th>
                    <th className="pb-2 font-normal text-right">Trade Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTradeHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                        <Filter className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                        <p className="text-xs text-slate-400 font-bold">
                          No closed trades found matching category &apos;{historyCategoryFilter}&apos;
                          {historySearchQuery ? ` and query "${historySearchQuery}"` : ''}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setHistoryCategoryFilter('ALL');
                            setHistorySearchQuery('');
                          }}
                          className="mt-2 text-[11px] text-cyan-400 hover:underline cursor-pointer"
                        >
                          Reset filters to view all {tradeHistory.length} trades
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredTradeHistory.map((trade) => {
                      const isProfit = trade.pnl >= 0;
                      const category = getTradeCategory(trade);

                      return (
                        <tr key={trade.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-2">
                            <span className="font-bold text-white mr-1.5">{trade.symbol}</span>
                            <span className={trade.side === 'LONG' ? 'text-emerald-400 text-[10px]' : 'text-rose-400 text-[10px]'}>
                              {trade.side}
                            </span>
                          </td>
                          <td className="py-2">
                            {renderCategoryBadge(category)}
                          </td>
                          <td className="py-2 text-slate-300 text-xs">
                            ${trade.entryPrice.toLocaleString()} → ${trade.exitPrice.toLocaleString()}
                          </td>
                          <td className="py-2 text-slate-300 text-[10px]">
                            <div className="font-semibold text-slate-200">
                              {trade.reason.replace(/_/g, ' ')}
                            </div>
                            {trade.agentName && (
                              <div className="text-[9px] text-indigo-300 truncate max-w-[150px]" title={trade.agentName}>
                                {trade.agentName}
                              </div>
                            )}
                          </td>
                          <td className="py-2 text-slate-500 text-[10px]">
                            {new Date(trade.closedAt).toLocaleTimeString()}
                          </td>
                          <td className="py-2 text-right font-bold">
                            <span className={isProfit ? 'text-emerald-400' : 'text-rose-400'}>
                              {isProfit ? '+' : ''}${trade.pnl.toFixed(2)} ({isProfit ? '+' : ''}{trade.pnlPct.toFixed(2)}%)
                            </span>
                          </td>
                          {/* Trade Notes & Sentiment */}
                          <td className="py-2 text-right">
                            {tradeNotes[trade.id] ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingNoteTarget({
                                    id: trade.id,
                                    symbol: trade.symbol,
                                    side: trade.side,
                                    pnl: trade.pnl,
                                    pnlPct: trade.pnlPct,
                                    price: trade.exitPrice,
                                    date: new Date(trade.closedAt).toLocaleTimeString(),
                                    note: tradeNotes[trade.id].text,
                                    sentiment: tradeNotes[trade.id].sentiment,
                                    isPosition: false,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 max-w-[190px] truncate text-left text-[10px] px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-cyan-300 hover:text-cyan-200 transition-all group cursor-pointer"
                                title={`Sentiment: ${tradeNotes[trade.id].sentiment} | Note: "${tradeNotes[trade.id].text}"`}
                              >
                                <span
                                  className={`px-1 py-0.2 rounded text-[8px] font-bold shrink-0 ${
                                    tradeNotes[trade.id].sentiment === 'BULLISH'
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                      : tradeNotes[trade.id].sentiment === 'BEARISH'
                                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                      : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                                  }`}
                                >
                                  {tradeNotes[trade.id].sentiment === 'BULLISH'
                                    ? '🐂 BULL'
                                    : tradeNotes[trade.id].sentiment === 'BEARISH'
                                    ? '🐻 BEAR'
                                    : '⚖️ NEUT'}
                                </span>
                                <span className="truncate">{tradeNotes[trade.id].text}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingNoteTarget({
                                    id: trade.id,
                                    symbol: trade.symbol,
                                    side: trade.side,
                                    pnl: trade.pnl,
                                    pnlPct: trade.pnlPct,
                                    price: trade.exitPrice,
                                    date: new Date(trade.closedAt).toLocaleTimeString(),
                                    note: '',
                                    sentiment: trade.side === 'LONG' ? 'BULLISH' : 'BEARISH',
                                    isPosition: false,
                                  })
                                }
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-cyan-500/50 text-slate-500 hover:text-cyan-300 transition-all cursor-pointer"
                                title="Add trade notes and market sentiment tag"
                              >
                                <Plus className="w-2.5 h-2.5 text-slate-400" />
                                <span>Add Note</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Portfolio Performance Line Chart Tab (Recharts) */}
        {(activeTab === 'performance' || activeTab === 'pnlChart') && (
          <div className="h-full min-h-[250px]">
            <PortfolioPerformanceChart
              tradeHistory={tradeHistory}
              positions={positions}
              portfolioBalance={portfolioBalance}
              assets={assets}
              onPlaceOrder={onPlaceOrder}
              onPlaceBatchOrders={onPlaceBatchOrders}
              onSelectAsset={onSelectAsset}
            />
          </div>
        )}

        {/* Analytics Performance Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div className="h-56 min-h-[210px] bg-slate-900/40 rounded-xl border border-slate-800/80 overflow-hidden">
              <PortfolioPerformanceChart
                tradeHistory={tradeHistory}
                positions={positions}
                portfolioBalance={portfolioBalance}
                assets={assets}
                onPlaceOrder={onPlaceOrder}
                onPlaceBatchOrders={onPlaceBatchOrders}
                onSelectAsset={onSelectAsset}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 py-1 font-mono">
              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Total Net Realized PnL</div>
                <div className={`text-base font-bold mt-1 ${totalRealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {totalRealizedPnl >= 0 ? '+' : ''}${totalRealizedPnl.toFixed(2)}
                </div>
              </div>

              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Win Rate</div>
                <div className="text-base font-bold text-emerald-400 mt-1">
                  {winRate.toFixed(1)}% <span className="text-xs font-normal text-slate-500">({winTrades}/{totalTrades})</span>
                </div>
              </div>

              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Average R:R Ratio</div>
                <div className="text-base font-bold text-cyan-400 mt-1">
                  1 : {avgRR} <span className="text-xs font-normal text-slate-500">({avgRR}x)</span>
                </div>
              </div>

              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Total Profit Factor</div>
                <div className="text-base font-bold text-indigo-400 mt-1">
                  {profitFactor}
                </div>
              </div>

              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Execution Engine</div>
                <div className="text-sm font-semibold text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Live Paper Terminal
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Share PnL Card Modal */}
      {sharePosition && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10141e] border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative">
            <button
              onClick={() => setSharePosition(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Futuristic Trading Badge Card */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-slate-900 via-[#0d121c] to-slate-950 border border-slate-700/80 shadow-inner text-center font-mono relative overflow-hidden">
              <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold mb-1">
                AETHERTRADE AI TERMINAL
              </div>
              <div className="text-xs text-slate-400 mb-3">{sharePosition.symbol} Perpetual</div>

              <div className="my-4">
                <div className="text-[10px] uppercase text-slate-500">Return On Equity</div>
                <div
                  className={`text-4xl font-black tracking-tight ${
                    sharePosition.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {sharePosition.pnl >= 0 ? '+' : ''}{sharePosition.pnlPct.toFixed(2)}%
                </div>
                <div className="text-xs font-semibold text-slate-300 mt-1">
                  {sharePosition.pnl >= 0 ? '+' : ''}${sharePosition.pnl.toFixed(2)} USDT
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-left border-t border-slate-800/80 pt-3">
                <div>
                  <div className="text-slate-500">Position</div>
                  <div className="text-white font-bold">{sharePosition.side} {sharePosition.leverage}x</div>
                </div>
                <div>
                  <div className="text-slate-500">Entry Price</div>
                  <div className="text-white">${sharePosition.entryPrice.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-slate-500">Mark Price</div>
                  <div className="text-white">${sharePosition.currentPrice.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-slate-500">Execution</div>
                  <div className="text-cyan-400 font-medium">AI Quant Engine</div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setSharePosition(null)}
                className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
              >
                Close Badge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Export Success Toast */}
      {exportFeedback && (
        <div className="absolute bottom-3 right-4 z-40 px-3.5 py-2 rounded-lg bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-xs font-mono shadow-2xl flex items-center gap-2 animate-bounce-once">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{exportFeedback}</span>
        </div>
      )}

      {/* Portfolio Equal-Weight & Risk-Parity Rebalance Modal */}
      <PortfolioRebalanceModal
        isOpen={rebalanceModalOpen}
        onClose={() => setRebalanceModalOpen(false)}
        positions={positions}
        assets={assets}
        portfolioBalance={portfolioBalance}
        onPlaceOrder={onPlaceOrder}
        onPlaceBatchOrders={onPlaceBatchOrders}
        onClosePosition={onClosePosition}
        onSelectAsset={onSelectAsset}
      />

      {/* Session Performance Report Modal */}
      <SessionPerformanceReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        tradeHistory={tradeHistory}
        positions={positions}
        assets={assets}
        portfolioBalance={portfolioBalance}
        tradeNotes={tradeNotes}
      />

      {/* Trade Post-Mortem Notes Modal */}
      <TradeNotesModal
        isOpen={Boolean(editingNoteTarget)}
        target={editingNoteTarget}
        onClose={() => setEditingNoteTarget(null)}
        onSave={handleSaveNote}
      />

      {/* Asset Correlation Matrix Modal */}
      <AssetCorrelationModal
        isOpen={correlationModalOpen}
        onClose={() => setCorrelationModalOpen(false)}
        assets={assets}
        positions={positions}
        onSelectAsset={onSelectAsset}
      />

      {/* Trade Analysis Dashboard Modal */}
      <TradeAnalysisModal
        isOpen={analysisModalOpen}
        onClose={() => setAnalysisModalOpen(false)}
        tradeHistory={tradeHistory}
        assets={assets}
      />
    </div>
  );
};
