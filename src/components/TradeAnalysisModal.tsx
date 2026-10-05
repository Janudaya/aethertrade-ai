import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
  Cell,
} from 'recharts';
import {
  BarChart3,
  X,
  Clock,
  TrendingUp,
  TrendingDown,
  Award,
  Sparkles,
  Filter,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Info,
  Download,
  Check,
  Loader2,
  FileDown,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { TradeHistoryItem, Asset } from '../types';

export type NormalizedTrade = TradeHistoryItem & {
  durationMinutes: number;
  isWin: boolean;
};

interface TradeAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeHistory: TradeHistoryItem[];
  assets: Asset[];
}

type SideFilter = 'ALL' | 'LONG' | 'SHORT';

export const TradeAnalysisModal: React.FC<TradeAnalysisModalProps> = ({
  isOpen,
  onClose,
  tradeHistory,
  assets,
}) => {
  const [sideFilter, setSideFilter] = useState<SideFilter>('ALL');
  const [selectedAsset, setSelectedAsset] = useState<string>('ALL');
  const [selectedTrade, setSelectedTrade] = useState<NormalizedTrade | null>(null);

  // Normalize trade durations in minutes
  const normalizedTrades: NormalizedTrade[] = useMemo(() => {
    return tradeHistory.map((trade, idx) => {
      let durationMinutes = 30; // fallback default
      if (trade.holdingDurationMs && trade.holdingDurationMs > 0) {
        durationMinutes = Math.round(trade.holdingDurationMs / (60 * 1000));
      } else if (trade.openedAt && trade.closedAt && trade.closedAt > trade.openedAt) {
        durationMinutes = Math.round((trade.closedAt - trade.openedAt) / (60 * 1000));
      } else {
        // Deterministic realistic spread for seed items without explicit timestamps
        durationMinutes = [18, 42, 70, 120, 55, 12, 35, 85][idx % 8] || 35;
      }

      // Minimum 1 min for visualization
      durationMinutes = Math.max(1, durationMinutes);

      return {
        ...trade,
        durationMinutes,
        isWin: trade.pnl >= 0,
      };
    });
  }, [tradeHistory]);

  // Apply filters
  const filteredTrades = useMemo(() => {
    return normalizedTrades.filter((trade) => {
      if (sideFilter !== 'ALL' && trade.side !== sideFilter) return false;
      if (selectedAsset !== 'ALL' && trade.symbol !== selectedAsset) return false;
      return true;
    });
  }, [normalizedTrades, sideFilter, selectedAsset]);

  // Unique symbols present in trade history
  const uniqueSymbols = useMemo(() => {
    const symbols = new Set<string>();
    tradeHistory.forEach((t) => symbols.add(t.symbol));
    return Array.from(symbols);
  }, [tradeHistory]);

  // Top KPIs
  const totalTradesCount = filteredTrades.length;
  const winsCount = filteredTrades.filter((t) => t.isWin).length;
  const lossesCount = totalTradesCount - winsCount;
  const winRate = totalTradesCount > 0 ? (winsCount / totalTradesCount) * 100 : 0;
  const totalPnL = filteredTrades.reduce((acc, t) => acc + t.pnl, 0);

  // 1. Bar Chart Data: Win / Loss by Asset
  const winLossByAssetData = useMemo(() => {
    const assetMap: Record<
      string,
      {
        asset: string;
        rawSymbol: string;
        wins: number;
        losses: number;
        winPnL: number;
        lossPnL: number;
        netPnL: number;
        totalTrades: number;
        winRate: number;
      }
    > = {};

    filteredTrades.forEach((trade) => {
      const cleanName = trade.symbol.split('/')[0];
      if (!assetMap[cleanName]) {
        assetMap[cleanName] = {
          asset: cleanName,
          rawSymbol: trade.symbol,
          wins: 0,
          losses: 0,
          winPnL: 0,
          lossPnL: 0,
          netPnL: 0,
          totalTrades: 0,
          winRate: 0,
        };
      }

      assetMap[cleanName].totalTrades += 1;
      assetMap[cleanName].netPnL += trade.pnl;

      if (trade.isWin) {
        assetMap[cleanName].wins += 1;
        assetMap[cleanName].winPnL += trade.pnl;
      } else {
        assetMap[cleanName].losses += 1;
        assetMap[cleanName].lossPnL += Math.abs(trade.pnl);
      }
    });

    return Object.values(assetMap).map((item) => ({
      ...item,
      winRate: item.totalTrades > 0 ? Number(((item.wins / item.totalTrades) * 100).toFixed(1)) : 0,
      netPnL: Number(item.netPnL.toFixed(2)),
    }));
  }, [filteredTrades]);

  // 2. Scatter Plot Data: Trade PnL vs. Duration
  const scatterPlotData = useMemo(() => {
    return filteredTrades.map((t) => ({
      id: t.id,
      symbol: t.symbol,
      side: t.side,
      durationMinutes: t.durationMinutes,
      pnl: Number(t.pnl.toFixed(2)),
      pnlPct: Number(t.pnlPct.toFixed(2)),
      reason: t.reason,
      agentName: t.agentName,
      isWin: t.isWin,
      originalTrade: t,
    }));
  }, [filteredTrades]);

  // Duration Bracket Analysis (Sweet Spot Detection)
  const durationBrackets = useMemo(() => {
    const brackets = [
      { label: '< 15m (Scalps)', min: 0, max: 15, wins: 0, total: 0, pnl: 0 },
      { label: '15m - 45m (Intraday)', min: 15, max: 45, wins: 0, total: 0, pnl: 0 },
      { label: '45m - 90m (Momentum)', min: 45, max: 90, wins: 0, total: 0, pnl: 0 },
      { label: '> 90m (Swing)', min: 90, max: 99999, wins: 0, total: 0, pnl: 0 },
    ];

    filteredTrades.forEach((t) => {
      const b = brackets.find((br) => t.durationMinutes >= br.min && t.durationMinutes < br.max);
      if (b) {
        b.total += 1;
        b.pnl += t.pnl;
        if (t.isWin) b.wins += 1;
      }
    });

    return brackets.map((b) => ({
      ...b,
      winRate: b.total > 0 ? (b.wins / b.total) * 100 : 0,
      avgPnL: b.total > 0 ? b.pnl / b.total : 0,
    }));
  }, [filteredTrades]);

  // Best Sweet-Spot Bracket
  const bestBracket = useMemo(() => {
    const viable = durationBrackets.filter((b) => b.total > 0);
    if (viable.length === 0) return null;
    return viable.reduce((prev, curr) => (curr.avgPnL > prev.avgPnL ? curr : prev), viable[0]);
  }, [durationBrackets]);

  // Most Profitable Asset
  const bestAsset = useMemo(() => {
    if (winLossByAssetData.length === 0) return null;
    return winLossByAssetData.reduce((prev, curr) => (curr.netPnL > prev.netPnL ? curr : prev), winLossByAssetData[0]);
  }, [winLossByAssetData]);

  // PDF Generation State
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);

  // Formatted PDF Report Generator using jsPDF
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 0;

      // 1. Header Banner Background (Dark Institutional Navy)
      doc.setFillColor(15, 23, 42); // slate-900 #0f172a
      doc.rect(0, 0, pageWidth, 84, 'F');

      // Top cyan accent line
      doc.setFillColor(6, 182, 212); // cyan-500
      doc.rect(0, 0, pageWidth, 4, 'F');

      // Title & Subtitle
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('AETHERTRADE QUANTITATIVE TERMINAL', 32, 34);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('Trade Performance Analysis & Holding Duration Distribution Audit', 32, 50);

      // Meta info (Date, filters)
      const nowStr = new Date().toLocaleString();
      doc.setFontSize(8);
      doc.setTextColor(56, 189, 248); // sky-400
      doc.text(`Generated: ${nowStr}   |   Scope: Side [${sideFilter}], Asset [${selectedAsset}]`, 32, 68);

      y = 104;

      // 2. Executive KPI Cards
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('EXECUTIVE PERFORMANCE SUMMARY', 32, y);
      y += 10;

      const cardWidth = (pageWidth - 64 - 24) / 4;
      const cardHeight = 48;
      const kpis = [
        {
          label: 'TOTAL TRADES',
          val: `${totalTradesCount}`,
          sub: `${winsCount}W / ${lossesCount}L`,
          color: [15, 23, 42],
        },
        {
          label: 'WIN RATE',
          val: `${winRate.toFixed(1)}%`,
          sub: winRate >= 50 ? 'Favorable Alpha' : 'Sub-50% Edge',
          color: winRate >= 50 ? [16, 185, 129] : [244, 63, 94],
        },
        {
          label: 'NET REALIZED PNL',
          val: `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}`,
          sub: totalPnL >= 0 ? 'Net Profitable' : 'Net Drawdown',
          color: totalPnL >= 0 ? [16, 185, 129] : [244, 63, 94],
        },
        {
          label: 'SWEET SPOT HOLDING',
          val: bestBracket ? bestBracket.label.split(' ')[0] : 'N/A',
          sub: bestBracket ? `${bestBracket.winRate.toFixed(0)}% Win Rate` : 'No data',
          color: [6, 182, 212],
        },
      ];

      kpis.forEach((kpi, idx) => {
        const x = 32 + idx * (cardWidth + 8);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, cardWidth, cardHeight, 4, 4, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, cardWidth, cardHeight, 4, 4, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, x + 8, y + 13);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.text(kpi.val, x + 8, y + 29);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(kpi.sub, x + 8, y + 41);
      });

      y += cardHeight + 20;

      // 3. Performance by Asset Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text('ASSET EXECUTION BREAKDOWN', 32, y);
      y += 8;

      // Header row
      doc.setFillColor(241, 245, 249);
      doc.rect(32, y, pageWidth - 64, 16, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);

      doc.text('ASSET', 40, y + 11);
      doc.text('TRADES', 150, y + 11);
      doc.text('WINS / LOSSES', 230, y + 11);
      doc.text('WIN RATE', 320, y + 11);
      doc.text('NET PNL ($)', 410, y + 11);
      doc.text('REGIME', 490, y + 11);
      y += 16;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      const assetList = winLossByAssetData.slice(0, 6);
      assetList.forEach((row, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(32, y, pageWidth - 64, 14, 'F');
        }

        doc.setTextColor(15, 23, 42);
        doc.text(row.rawSymbol || row.asset, 40, y + 10);
        doc.text(`${row.totalTrades}`, 150, y + 10);
        doc.text(`${row.wins}W / ${row.losses}L`, 230, y + 10);

        if (row.winRate >= 50) doc.setTextColor(16, 185, 129);
        else doc.setTextColor(244, 63, 94);
        doc.text(`${row.winRate.toFixed(1)}%`, 320, y + 10);

        if (row.netPnL >= 0) {
          doc.setTextColor(16, 185, 129);
          doc.text(`+$${row.netPnL.toFixed(2)}`, 410, y + 10);
        } else {
          doc.setTextColor(244, 63, 94);
          doc.text(`-$${Math.abs(row.netPnL).toFixed(2)}`, 410, y + 10);
        }

        doc.setTextColor(100, 116, 139);
        doc.text(row.netPnL >= 0 ? 'PROFITABLE' : 'DRAWDOWN', 490, y + 10);

        y += 14;
      });

      y += 18;

      // 4. Holding Duration Brackets Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text('HOLDING TIME DURATION VS OUTCOME DISTRIBUTION', 32, y);
      y += 8;

      doc.setFillColor(241, 245, 249);
      doc.rect(32, y, pageWidth - 64, 16, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);

      doc.text('DURATION BRACKET', 40, y + 11);
      doc.text('TRADES COUNT', 170, y + 11);
      doc.text('WIN RATE', 270, y + 11);
      doc.text('TOTAL PNL ($)', 370, y + 11);
      doc.text('AVG EXPECTANCY', 465, y + 11);
      y += 16;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      durationBrackets.forEach((b, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(32, y, pageWidth - 64, 14, 'F');
        }

        doc.setTextColor(15, 23, 42);
        doc.text(b.label, 40, y + 10);
        doc.text(`${b.total} (${b.wins}W / ${b.total - b.wins}L)`, 170, y + 10);

        if (b.winRate >= 50) doc.setTextColor(16, 185, 129);
        else doc.setTextColor(244, 63, 94);
        doc.text(`${b.winRate.toFixed(1)}%`, 270, y + 10);

        if (b.pnl >= 0) {
          doc.setTextColor(16, 185, 129);
          doc.text(`+$${b.pnl.toFixed(2)}`, 370, y + 10);
        } else {
          doc.setTextColor(244, 63, 94);
          doc.text(`-$${Math.abs(b.pnl).toFixed(2)}`, 370, y + 10);
        }

        doc.setTextColor(100, 116, 139);
        doc.text(`$${b.avgPnL.toFixed(2)} / trade`, 465, y + 10);

        y += 14;
      });

      y += 18;

      // 5. Recent Executions Log
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text('CLOSED EXECUTIONS LOG (RECENT TRADES)', 32, y);
      y += 8;

      doc.setFillColor(241, 245, 249);
      doc.rect(32, y, pageWidth - 64, 16, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);

      doc.text('SYMBOL', 40, y + 11);
      doc.text('SIDE', 120, y + 11);
      doc.text('ENTRY -> EXIT PRICE', 180, y + 11);
      doc.text('HOLD DURATION', 320, y + 11);
      doc.text('PNL ($)', 410, y + 11);
      doc.text('ROI (%)', 485, y + 11);
      y += 16;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      const recentTrades = filteredTrades.slice(0, 8);
      recentTrades.forEach((t, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(32, y, pageWidth - 64, 14, 'F');
        }

        doc.setTextColor(15, 23, 42);
        doc.text(t.symbol, 40, y + 10);

        if (t.side === 'LONG') doc.setTextColor(16, 185, 129);
        else doc.setTextColor(244, 63, 94);
        doc.text(t.side, 120, y + 10);

        doc.setTextColor(15, 23, 42);
        doc.text(`$${t.entryPrice.toLocaleString()} -> $${t.exitPrice.toLocaleString()}`, 180, y + 10);

        doc.setTextColor(100, 116, 139);
        doc.text(`${t.durationMinutes}m`, 320, y + 10);

        if (t.pnl >= 0) {
          doc.setTextColor(16, 185, 129);
          doc.text(`+$${t.pnl.toFixed(2)}`, 410, y + 10);
          doc.text(`+${t.pnlPct.toFixed(2)}%`, 485, y + 10);
        } else {
          doc.setTextColor(244, 63, 94);
          doc.text(`-$${Math.abs(t.pnl).toFixed(2)}`, 410, y + 10);
          doc.text(`${t.pnlPct.toFixed(2)}%`, 485, y + 10);
        }

        y += 14;
      });

      y += 18;

      // 6. Quantitative Insight Box
      doc.setFillColor(240, 253, 250); // teal-50
      doc.roundedRect(32, y, pageWidth - 64, 40, 4, 4, 'F');
      doc.setDrawColor(204, 251, 241); // teal-100
      doc.roundedRect(32, y, pageWidth - 64, 40, 4, 4, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 118, 110); // teal-700
      doc.text('QUANTITATIVE STRATEGY TAKEAWAY:', 40, y + 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      const sweetSpotText = bestBracket
        ? `Top performance observed in ${bestBracket.label} with ${bestBracket.winRate.toFixed(1)}% win rate ($${bestBracket.avgPnL.toFixed(2)} average PnL per trade).`
        : 'Sufficient sample size required to isolate holding duration edge.';
      const assetInsight = bestAsset
        ? ` ${bestAsset.rawSymbol || bestAsset.asset} is your primary alpha driver yielding +$${bestAsset.netPnL.toFixed(2)}.`
        : '';
      doc.text(`${sweetSpotText}${assetInsight} Maintain disciplined risk parameters and protective stops.`, 40, y + 26);

      // 7. Footer
      const footerY = pageHeight - 20;
      doc.setDrawColor(226, 232, 240);
      doc.line(32, footerY - 8, pageWidth - 32, footerY - 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('AetherTrade Quantitative Paper Trading Platform • Institutional Performance Audit', 32, footerY);
      doc.text('Page 1 of 1 • Strictly Confidential', pageWidth - 160, footerY);

      // Save PDF
      const filename = `AetherTrade_Performance_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);

      setPdfDownloaded(true);
      setTimeout(() => setPdfDownloaded(false), 3000);
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="bg-[#0b0e17] border border-cyan-500/40 rounded-2xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl relative font-mono text-xs overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0e1320] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Trade Analysis Dashboard
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  RECHARTS ANALYTICS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Outcome distributions, win/loss ratios by asset, and trade duration vs profitability scatter analysis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Download Report Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-mono font-bold transition-all cursor-pointer shadow-md ${
                pdfDownloaded
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/30 border border-cyan-400/40 hover:scale-105 active:scale-95'
              } disabled:opacity-50 disabled:pointer-events-none`}
              title="Download formatted PDF performance report"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : pdfDownloaded ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Report Saved!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters & KPI Bar */}
        <div className="px-4 py-3 bg-[#0d121f] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Side Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-sans">Side:</span>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px]">
                {(['ALL', 'LONG', 'SHORT'] as const).map((side) => (
                  <button
                    key={side}
                    onClick={() => setSideFilter(side)}
                    className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
                      sideFilter === side
                        ? 'bg-cyan-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {side === 'ALL' ? 'All Sides' : side}
                  </button>
                ))}
              </div>
            </div>

            {/* Asset Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-sans">Asset:</span>
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 px-2.5 py-1 rounded-lg text-[11px] focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="ALL">All Assets ({uniqueSymbols.length})</option>
                {uniqueSymbols.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-slate-400">
              Trades: <strong className="text-white">{totalTradesCount}</strong>
            </span>
            <span className="text-slate-400">
              Win Rate:{' '}
              <strong className={winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}>
                {winRate.toFixed(1)}% ({winsCount}W / {lossesCount}L)
              </strong>
            </span>
            <span className="text-slate-400">
              Net PnL:{' '}
              <strong className={totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </strong>
            </span>
          </div>
        </div>

        {/* Scrollable Dashboard Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* Top Insights Callouts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Sweet Spot Duration */}
            <div className="p-3 bg-gradient-to-br from-slate-900 via-slate-950 to-[#0e1320] rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Holding Sweet Spot</span>
                </span>
                <span className="text-cyan-400 font-bold">Optimal Setup</span>
              </div>
              <div className="text-base font-bold text-white mt-1">
                {bestBracket ? bestBracket.label : 'N/A'}
              </div>
              <p className="text-[10px] text-slate-400 font-sans">
                {bestBracket
                  ? `Yields highest avg return of +$${bestBracket.avgPnL.toFixed(1)} with ${bestBracket.winRate.toFixed(0)}% win rate.`
                  : 'Execute trades to discover duration sweet spots.'}
              </p>
            </div>

            {/* Top Asset */}
            <div className="p-3 bg-gradient-to-br from-slate-900 via-slate-950 to-[#0e1320] rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>Top Asset Performer</span>
                </span>
                <span className="text-emerald-400 font-bold">Alpha</span>
              </div>
              <div className="text-base font-bold text-white mt-1">
                {bestAsset ? `${bestAsset.asset} (+${bestAsset.winRate}%)` : 'N/A'}
              </div>
              <p className="text-[10px] text-slate-400 font-sans">
                {bestAsset
                  ? `Accumulated +$${bestAsset.netPnL.toFixed(2)} net profit across ${bestAsset.totalTrades} closed trades.`
                  : 'Accumulate trade history to view asset ranking.'}
              </p>
            </div>

            {/* Trade Quality Score */}
            <div className="p-3 bg-gradient-to-br from-slate-900 via-slate-950 to-[#0e1320] rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  <span>Execution Quality</span>
                </span>
                <span className="text-purple-300 font-bold">Discipline</span>
              </div>
              <div className="text-base font-bold text-white mt-1">
                {winRate >= 60 ? 'Institutional Grade' : winRate >= 45 ? 'Balanced Momentum' : 'Refinement Needed'}
              </div>
              <p className="text-[10px] text-slate-400 font-sans">
                Win/loss ratio combined with risk-to-reward payoff distribution.
              </p>
            </div>
          </div>

          {/* Chart 1: Win / Loss by Asset Bar Chart */}
          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-xs">
                  Win / Loss Distribution by Asset
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-sans">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  <span className="text-slate-300 font-mono">Wins</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                  <span className="text-slate-300 font-mono">Losses</span>
                </span>
              </div>
            </div>

            {winLossByAssetData.length > 0 ? (
              <div className="h-[240px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={winLossByAssetData}
                    margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                    <XAxis
                      dataKey="asset"
                      stroke="#64748b"
                      fontSize={11}
                      fontFamily="monospace"
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      fontFamily="monospace"
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-700 shadow-xl text-xs font-mono space-y-1">
                              <div className="font-bold text-white border-b border-slate-800 pb-1 flex justify-between gap-3">
                                <span>{data.rawSymbol}</span>
                                <span className={data.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                  {data.netPnL >= 0 ? '+' : ''}${data.netPnL}
                                </span>
                              </div>
                              <div className="text-[11px] text-emerald-400">
                                Winning Trades: <strong>{data.wins}</strong> (+${data.winPnL.toFixed(0)})
                              </div>
                              <div className="text-[11px] text-rose-400">
                                Losing Trades: <strong>{data.losses}</strong> (-${data.lossPnL.toFixed(0)})
                              </div>
                              <div className="text-[10px] text-slate-400 pt-0.5 border-t border-slate-800 flex justify-between">
                                <span>Win Rate:</span>
                                <strong className="text-cyan-400">{data.winRate}%</strong>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="wins" name="Wins" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="losses" name="Losses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-slate-500 font-sans">
                No trades found for selected filter criteria.
              </div>
            )}
          </div>

          {/* Chart 2: Trade PnL vs. Duration Scatter Plot */}
          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-white text-xs">
                  Trade PnL vs. Duration (Holding Time in Minutes)
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-sans">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-slate-300 font-mono">Profitable Trades</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span className="text-slate-300 font-mono">Loss Trades</span>
                </span>
              </div>
            </div>

            {scatterPlotData.length > 0 ? (
              <div className="h-[280px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 15, right: 20, left: -5, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                    <XAxis
                      type="number"
                      dataKey="durationMinutes"
                      name="Duration"
                      unit="m"
                      stroke="#64748b"
                      fontSize={11}
                      fontFamily="monospace"
                      tickLine={false}
                      label={{
                        value: 'Holding Duration (Minutes)',
                        position: 'insideBottom',
                        offset: -8,
                        fill: '#64748b',
                        fontSize: 10,
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="pnl"
                      name="PnL"
                      unit="$"
                      stroke="#64748b"
                      fontSize={11}
                      fontFamily="monospace"
                      tickLine={false}
                      label={{
                        value: 'Realized PnL ($)',
                        angle: -90,
                        position: 'insideLeft',
                        offset: 15,
                        fill: '#64748b',
                        fontSize: 10,
                      }}
                    />
                    <ZAxis range={[70, 70]} />
                    <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3', stroke: '#06b6d4' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          const isProfit = item.pnl >= 0;
                          return (
                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-2xl text-xs font-mono space-y-1.5 min-w-[180px]">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                                <span className="font-bold text-white">{item.symbol}</span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    item.side === 'LONG'
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                                  }`}
                                >
                                  {item.side}
                                </span>
                              </div>
                              <div className="flex justify-between items-baseline pt-0.5">
                                <span className="text-slate-400 text-[10px]">Realized PnL:</span>
                                <span className={`font-bold text-sm ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {isProfit ? '+' : ''}${item.pnl} ({isProfit ? '+' : ''}{item.pnlPct}%)
                                </span>
                              </div>
                              <div className="flex justify-between text-[11px] text-slate-300">
                                <span className="text-slate-500">Duration:</span>
                                <strong className="text-amber-300">{item.durationMinutes} mins</strong>
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Exit Trigger:</span>
                                <span className="uppercase text-slate-300">{item.reason?.replace('_', ' ')}</span>
                              </div>
                              {item.agentName && (
                                <div className="text-[9px] text-indigo-300 bg-indigo-950/60 p-1 rounded border border-indigo-800 mt-1">
                                  Agent: {item.agentName}
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter
                      data={scatterPlotData}
                      onClick={(node: any) => {
                        if (node && node.originalTrade) {
                          setSelectedTrade(node.originalTrade);
                        }
                      }}
                    >
                      {scatterPlotData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.isWin ? '#10b981' : '#f43f5e'}
                          stroke={entry.isWin ? '#059669' : '#e11d48'}
                          strokeWidth={1.5}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-500 font-sans">
                No scatter data available.
              </div>
            )}

            <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between border-t border-slate-800/80 pt-2">
              <span className="flex items-center gap-1 text-slate-400">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>
                  Clustering above the zero line ($y &gt; 0$) indicates setups where profits were preserved with optimal holding duration.
                </span>
              </span>
              <span className="text-slate-500 font-mono">
                Click any point to inspect trade setup
              </span>
            </div>
          </div>

          {/* Selected Trade Detail Drawer / Card */}
          {selectedTrade && (
            <div className="p-3.5 bg-gradient-to-r from-cyan-950/30 via-slate-900 to-indigo-950/30 rounded-xl border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center">
                  {selectedTrade.pnl >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-rose-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{selectedTrade.symbol}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        selectedTrade.side === 'LONG'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {selectedTrade.side}
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      Entry: ${selectedTrade.entryPrice.toLocaleString()} → Exit: ${selectedTrade.exitPrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                    Closed via <strong className="text-slate-200">{selectedTrade.reason.replace('_', ' ')}</strong> · Duration: <strong className="text-amber-300">{selectedTrade.durationMinutes} mins</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div
                    className={`font-bold text-sm ${
                      selectedTrade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {selectedTrade.pnl >= 0 ? '+' : ''}${selectedTrade.pnl.toFixed(2)} ({selectedTrade.pnlPct >= 0 ? '+' : ''}{selectedTrade.pnlPct.toFixed(2)}%)
                  </div>
                  <span className="text-[9px] text-slate-500">Realized Outcome</span>
                </div>

                <button
                  onClick={() => setSelectedTrade(null)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Section 3: Duration Bracket Breakdown */}
          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-xs">
                Performance by Holding Duration Bracket
              </span>
              <span className="text-[10px] text-slate-400 font-sans">
                Evaluate which timeframes give your strategy the statistical edge
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {durationBrackets.map((bracket, idx) => {
                const hasTrades = bracket.total > 0;
                const isProfitable = bracket.pnl >= 0;
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all ${
                      hasTrades && isProfitable
                        ? 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/40'
                        : hasTrades
                        ? 'bg-slate-950/80 border-slate-800 hover:border-rose-500/40'
                        : 'bg-slate-950/40 border-slate-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-white mb-1">
                      <span>{bracket.label}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {bracket.total} {bracket.total === 1 ? 'trade' : 'trades'}
                      </span>
                    </div>

                    {hasTrades ? (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">Win Rate:</span>
                          <span className={bracket.winRate >= 50 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {bracket.winRate.toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">Total PnL:</span>
                          <span className={isProfitable ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {isProfitable ? '+' : ''}${bracket.pnl.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] pt-1 border-t border-slate-800">
                          <span className="text-slate-500">Avg Return / Trade:</span>
                          <span className={bracket.avgPnL >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                            {bracket.avgPnL >= 0 ? '+' : ''}${bracket.avgPnL.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-600 font-sans py-2">
                        No closed trades in this bracket.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-5 border-t border-slate-800 bg-[#0d121f] flex flex-wrap items-center justify-between gap-3 text-[11px]">
          <div className="text-slate-400 font-sans">
            Data refreshes automatically as live positions or autonomous agents close trades.
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors cursor-pointer"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
