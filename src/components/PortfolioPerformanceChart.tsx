import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BarChart3,
  Activity,
  Layers,
  CheckSquare,
  Square,
  Clock,
  Scale,
  FileText,
} from 'lucide-react';
import { TradeHistoryItem, Position, Asset, OrderPlacementPayload } from '../types';
import { PortfolioRebalanceModal } from './PortfolioRebalanceModal';
import { SessionPerformanceReportModal } from './SessionPerformanceReportModal';

interface PortfolioPerformanceChartProps {
  tradeHistory: TradeHistoryItem[];
  positions: Position[];
  portfolioBalance: number;
  assets?: Asset[];
  onPlaceOrder?: (orderData: OrderPlacementPayload) => void;
  onPlaceBatchOrders?: (orders: OrderPlacementPayload[]) => { success: boolean; count: number; error?: string };
  onSelectAsset?: (asset: Asset) => void;
}

export interface PortfolioPerformancePoint {
  timestamp: number;
  timeLabel: string;
  date: string;
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  equity: number;
  tradeCount?: number;
}

export const PortfolioPerformanceChart: React.FC<PortfolioPerformanceChartProps> = ({
  tradeHistory,
  positions,
  portfolioBalance,
  assets = [],
  onPlaceOrder,
  onPlaceBatchOrders,
  onSelectAsset,
}) => {
  const [timeRange, setTimeRange] = useState<'1H' | '24H' | '7D' | '30D' | 'ALL'>('7D');
  const [rebalanceModalOpen, setRebalanceModalOpen] = useState<boolean>(false);
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);

  // Series visibility toggles
  const [showTotal, setShowTotal] = useState<boolean>(true);
  const [showRealized, setShowRealized] = useState<boolean>(true);
  const [showUnrealized, setShowUnrealized] = useState<boolean>(true);
  const [showEquity, setShowEquity] = useState<boolean>(false);

  // Live real-time streaming points buffer
  const [livePoints, setLivePoints] = useState<PortfolioPerformancePoint[]>([]);
  const lastSampleTimeRef = useRef<number>(0);

  // Live unrealized PnL from all currently open positions
  const currentUnrealizedPnL = useMemo(
    () => positions.reduce((acc, p) => acc + p.pnl, 0),
    [positions]
  );

  // Total cumulative realized PnL from closed trades
  const totalRealizedPnL = useMemo(
    () => tradeHistory.reduce((acc, t) => acc + t.pnl, 0),
    [tradeHistory]
  );

  const netCurrentPnL = totalRealizedPnL + currentUnrealizedPnL;
  const currentEquity = portfolioBalance + currentUnrealizedPnL;

  // Real-time live sampling effect: records ticks as market moves
  useEffect(() => {
    const now = Date.now();
    if (now - lastSampleTimeRef.current < 2500) return; // Sample every 2.5s
    lastSampleTimeRef.current = now;

    const timeStr = new Date(now).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const newPoint: PortfolioPerformancePoint = {
      timestamp: now,
      timeLabel: timeStr,
      date: new Date(now).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      realizedPnL: Number(totalRealizedPnL.toFixed(2)),
      unrealizedPnL: Number(currentUnrealizedPnL.toFixed(2)),
      totalPnL: Number(netCurrentPnL.toFixed(2)),
      equity: Number(currentEquity.toFixed(2)),
    };

    setLivePoints((prev) => {
      const updated = [...prev, newPoint];
      // Keep up to 50 live streaming points
      return updated.slice(-50);
    });
  }, [currentUnrealizedPnL, totalRealizedPnL, netCurrentPnL, currentEquity]);

  // Generate historical timeline based on selected time range
  const chartData = useMemo<PortfolioPerformancePoint[]>(() => {
    const now = Date.now();

    if (timeRange === '1H') {
      // 1-Hour micro view using live buffer + synthesized past hour
      const pointsCount = 20;
      const stepMs = (60 * 60 * 1000) / pointsCount;
      const points: PortfolioPerformancePoint[] = [];

      for (let i = pointsCount - 1; i >= 0; i--) {
        const t = now - i * stepMs;
        const dObj = new Date(t);
        const timeLabel = dObj.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });

        // Drift backwards from current live values
        const progress = (pointsCount - i) / pointsCount;
        const driftRealized = totalRealizedPnL - (1 - progress) * 80;
        const driftUnrealized = currentUnrealizedPnL + Math.sin(i * 0.8) * 45;
        const total = driftRealized + driftUnrealized;

        points.push({
          timestamp: t,
          timeLabel,
          date: dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          realizedPnL: Number(driftRealized.toFixed(2)),
          unrealizedPnL: Number(driftUnrealized.toFixed(2)),
          totalPnL: Number(total.toFixed(2)),
          equity: Number((portfolioBalance + total).toFixed(2)),
        });
      }

      // Anchor last point to exact live values
      if (points.length > 0) {
        const last = points[points.length - 1];
        last.timeLabel = 'Now';
        last.realizedPnL = Number(totalRealizedPnL.toFixed(2));
        last.unrealizedPnL = Number(currentUnrealizedPnL.toFixed(2));
        last.totalPnL = Number(netCurrentPnL.toFixed(2));
        last.equity = Number(currentEquity.toFixed(2));
      }

      return points;
    }

    if (timeRange === '24H') {
      // 24 Hours hourly timeline
      const hoursCount = 24;
      const hourMs = 60 * 60 * 1000;
      const startTime = now - 24 * hourMs;
      const points: PortfolioPerformancePoint[] = [];

      let runningRealized = Math.max(-200, totalRealizedPnL - 650);

      for (let h = 0; h < hoursCount; h++) {
        const pointTime = startTime + h * hourMs;
        const dateObj = new Date(pointTime);
        const hourLabel = `${dateObj.getHours().toString().padStart(2, '0')}:00`;

        const tradesInHour = tradeHistory.filter(
          (t) => t.closedAt >= pointTime && t.closedAt < pointTime + hourMs
        );

        let deltaRealized = 0;
        if (tradesInHour.length > 0) {
          deltaRealized = tradesInHour.reduce((sum, t) => sum + t.pnl, 0);
        } else {
          const step = (totalRealizedPnL - runningRealized) / (hoursCount - h);
          deltaRealized = step + Math.sin(h * 0.7) * 25;
        }

        runningRealized += deltaRealized;
        const estUnrealized =
          h === hoursCount - 1
            ? currentUnrealizedPnL
            : Math.sin(h * 0.9) * 120 + (currentUnrealizedPnL * (h / hoursCount));
        const total = runningRealized + estUnrealized;

        points.push({
          timestamp: pointTime,
          timeLabel: hourLabel,
          date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          realizedPnL: Number(runningRealized.toFixed(2)),
          unrealizedPnL: Number(estUnrealized.toFixed(2)),
          totalPnL: Number(total.toFixed(2)),
          equity: Number((portfolioBalance + total).toFixed(2)),
          tradeCount: tradesInHour.length,
        });
      }

      if (points.length > 0) {
        const last = points[points.length - 1];
        last.timeLabel = 'Now';
        last.realizedPnL = Number(totalRealizedPnL.toFixed(2));
        last.unrealizedPnL = Number(currentUnrealizedPnL.toFixed(2));
        last.totalPnL = Number(netCurrentPnL.toFixed(2));
        last.equity = Number(currentEquity.toFixed(2));
      }

      return points;
    }

    // Daily Timeline for 7D, 30D, ALL
    const oneDayMs = 24 * 60 * 60 * 1000;
    let daysCount = 7;
    if (timeRange === '7D') daysCount = 7;
    else if (timeRange === '30D') daysCount = 30;
    else if (timeRange === 'ALL') daysCount = 45;

    const points: PortfolioPerformancePoint[] = [];
    const startTime = now - (daysCount - 1) * oneDayMs;

    let runningRealized = Math.max(-500, totalRealizedPnL - daysCount * 110);

    for (let d = 0; d < daysCount; d++) {
      const dayStart = startTime + d * oneDayMs;
      const dayEnd = dayStart + oneDayMs;
      const dateObj = new Date(dayStart);

      const dayLabel = dateObj.toLocaleDateString('en-US', {
        weekday: daysCount <= 7 ? 'short' : undefined,
        month: 'short',
        day: 'numeric',
      });

      const tradesOnDay = tradeHistory.filter(
        (t) => t.closedAt >= dayStart && t.closedAt < dayEnd
      );

      let delta = 0;
      if (tradesOnDay.length > 0) {
        delta = tradesOnDay.reduce((sum, t) => sum + t.pnl, 0);
      } else {
        const trend = (totalRealizedPnL - runningRealized) / (daysCount - d);
        delta = trend + Math.sin(d * 1.2) * 65 + (Math.random() - 0.4) * 35;
      }

      runningRealized += delta;
      const estUnrealized =
        d === daysCount - 1
          ? currentUnrealizedPnL
          : Math.sin(d * 0.8) * 150 + (currentUnrealizedPnL * (d / daysCount));
      const total = runningRealized + estUnrealized;

      points.push({
        timestamp: dayStart,
        timeLabel: dayLabel,
        date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        realizedPnL: Number(runningRealized.toFixed(2)),
        unrealizedPnL: Number(estUnrealized.toFixed(2)),
        totalPnL: Number(total.toFixed(2)),
        equity: Number((portfolioBalance + total).toFixed(2)),
        tradeCount: tradesOnDay.length,
      });
    }

    if (points.length > 0) {
      const last = points[points.length - 1];
      last.timeLabel = 'Today';
      last.realizedPnL = Number(totalRealizedPnL.toFixed(2));
      last.unrealizedPnL = Number(currentUnrealizedPnL.toFixed(2));
      last.totalPnL = Number(netCurrentPnL.toFixed(2));
      last.equity = Number(currentEquity.toFixed(2));
    }

    return points;
  }, [
    tradeHistory,
    totalRealizedPnL,
    currentUnrealizedPnL,
    netCurrentPnL,
    currentEquity,
    portfolioBalance,
    timeRange,
  ]);

  const pnlIsPositive = netCurrentPnL >= 0;
  const totalReturnPct = portfolioBalance > 0 ? (netCurrentPnL / portfolioBalance) * 100 : 0;

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: PortfolioPerformancePoint = payload[0].payload;
      const isTotalProf = data.totalPnL >= 0;
      const isRealProf = data.realizedPnL >= 0;
      const isUnrealProf = data.unrealizedPnL >= 0;

      return (
        <div className="bg-[#0b0e14]/95 border border-cyan-500/50 backdrop-blur-md rounded-xl p-3 shadow-2xl font-mono text-xs z-50 min-w-[210px]">
          <div className="flex items-center justify-between text-slate-400 text-[10px] pb-1.5 border-b border-slate-800">
            <span className="font-bold text-white">{data.timeLabel}</span>
            <span>{data.date}</span>
          </div>

          <div className="mt-2 space-y-1.5 text-[11px]">
            {/* Total Net PnL */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Total Net PnL:</span>
              </span>
              <span className={`font-bold ${isTotalProf ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isTotalProf ? '+' : ''}${data.totalPnL.toLocaleString()}
              </span>
            </div>

            {/* Realized PnL */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Realized PnL:</span>
              </span>
              <span className={`font-semibold ${isRealProf ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isRealProf ? '+' : ''}${data.realizedPnL.toLocaleString()}
              </span>
            </div>

            {/* Unrealized PnL */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Unrealized PnL:</span>
              </span>
              <span className={`font-semibold ${isUnrealProf ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isUnrealProf ? '+' : ''}${data.unrealizedPnL.toLocaleString()}
              </span>
            </div>

            {/* Portfolio Equity */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-slate-300">
              <span className="text-slate-400">Total Equity:</span>
              <span className="text-white font-bold">${data.equity.toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-[#080b11] text-slate-200 select-none p-3.5 font-mono overflow-y-auto">
      {/* Top Controls & Headline Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 via-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wide">
                  Portfolio Performance
                </span>
                <span className="text-[10px] text-cyan-300 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  RECHARTS ENGINE
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-sans">
                Real-time tracking of cumulative realized, floating unrealized, and total equity
              </div>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="hidden lg:flex items-center gap-4 pl-4 border-l border-slate-800 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Total Net PnL</span>
              <span
                className={`text-sm font-bold ${
                  pnlIsPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {pnlIsPositive ? '+' : ''}${netCurrentPnL.toFixed(2)} ({pnlIsPositive ? '+' : ''}
                {totalReturnPct.toFixed(2)}%)
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Realized (Closed)</span>
              <span
                className={`text-sm font-semibold ${
                  totalRealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {totalRealizedPnL >= 0 ? '+' : ''}${totalRealizedPnL.toFixed(2)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Unrealized (Open)</span>
              <span
                className={`text-sm font-semibold ${
                  currentUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {currentUnrealizedPnL >= 0 ? '+' : ''}${currentUnrealizedPnL.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Session Performance Report Button */}
          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600/30 via-indigo-600/30 to-cyan-600/30 hover:from-purple-600/50 hover:to-cyan-600/50 border border-purple-500/40 hover:border-cyan-400 text-purple-200 hover:text-white font-medium text-xs transition-all shadow-sm group"
            title="Open detailed trading session performance report"
          >
            <FileText className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
            <span>Performance Report</span>
          </button>

          {/* Rebalance Portfolio Button */}
          <button
            type="button"
            onClick={() => setRebalanceModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-600/30 via-indigo-600/30 to-blue-600/30 hover:from-cyan-600/50 hover:to-indigo-600/50 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white font-medium text-xs transition-all shadow-sm group"
            title="Automatically suggests trades to rebalance holdings to an equal-weight distribution"
          >
            <Scale className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Rebalance Portfolio</span>
          </button>

          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs">
            {(['1H', '24H', '7D', '30D', 'ALL'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 rounded font-medium transition-colors text-[11px] ${
                  timeRange === range
                    ? 'bg-cyan-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {range === '1H' ? '1H (Live)' : range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Legend & Series Filter Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 text-[11px]">
        <div className="flex items-center gap-3">
          {/* Total PnL Toggle */}
          <button
            type="button"
            onClick={() => setShowTotal(!showTotal)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all ${
              showTotal
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Total PnL ({pnlIsPositive ? '+' : ''}${netCurrentPnL.toFixed(0)})</span>
          </button>

          {/* Realized PnL Toggle */}
          <button
            type="button"
            onClick={() => setShowRealized(!showRealized)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all ${
              showRealized
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Realized PnL (${totalRealizedPnL.toFixed(0)})</span>
          </button>

          {/* Unrealized PnL Toggle */}
          <button
            type="button"
            onClick={() => setShowUnrealized(!showUnrealized)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all ${
              showUnrealized
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Unrealized PnL (${currentUnrealizedPnL.toFixed(0)})</span>
          </button>

          {/* Portfolio Equity Toggle */}
          <button
            type="button"
            onClick={() => setShowEquity(!showEquity)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all ${
              showEquity
                ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>Equity Curve</span>
          </button>
        </div>

        <div className="text-[10px] text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3 text-cyan-400" />
          <span>Last updated: Live tick</span>
        </div>
      </div>

      {/* Main Recharts Area & Composed Chart */}
      <div className="flex-1 min-h-[190px] w-full mt-2 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 12, right: 25, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="rechartsTotalGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="rechartsTotalRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.0} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.35} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#151d2b" strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="timeLabel"
              stroke="#475569"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
            />

            <YAxis
              stroke="#475569"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
              tickFormatter={(val) =>
                val >= 0 ? `+$${val.toLocaleString()}` : `-$${Math.abs(val).toLocaleString()}`
              }
            />

            <ReferenceLine y={0} stroke="#334155" strokeDasharray="4 4" />

            <Tooltip content={<CustomTooltip />} />

            {/* Total PnL Area fill */}
            {showTotal && (
              <Area
                type="monotone"
                dataKey="totalPnL"
                stroke="none"
                fill={pnlIsPositive ? 'url(#rechartsTotalGreen)' : 'url(#rechartsTotalRed)'}
              />
            )}

            {/* Realized PnL Line */}
            {showRealized && (
              <Line
                type="monotone"
                dataKey="realizedPnL"
                name="Realized PnL"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 3"
              />
            )}

            {/* Unrealized PnL Line */}
            {showUnrealized && (
              <Line
                type="monotone"
                dataKey="unrealizedPnL"
                name="Unrealized PnL"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                strokeDasharray="2 2"
              />
            )}

            {/* Total Combined PnL Line */}
            {showTotal && (
              <Line
                type="monotone"
                dataKey="totalPnL"
                name="Total Net PnL"
                stroke="#06b6d4"
                strokeWidth={2.4}
                dot={{ r: 2.5, fill: '#06b6d4', strokeWidth: 1 }}
                activeDot={{ r: 6, fill: '#ffffff', stroke: '#06b6d4', strokeWidth: 2 }}
              />
            )}

            {/* Optional Equity Line */}
            {showEquity && (
              <Line
                type="monotone"
                dataKey="equity"
                name="Portfolio Equity"
                stroke="#818cf8"
                strokeWidth={1.8}
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-800/80 text-[11px]">
        <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase">Realized Profit/Loss</div>
          <div
            className={`font-bold mt-0.5 ${
              totalRealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totalRealizedPnL >= 0 ? '+' : ''}${totalRealizedPnL.toFixed(2)}
          </div>
        </div>

        <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase">Unrealized (Open Mark)</div>
          <div
            className={`font-bold mt-0.5 ${
              currentUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {currentUnrealizedPnL >= 0 ? '+' : ''}${currentUnrealizedPnL.toFixed(2)}
          </div>
        </div>

        <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase">Total Portfolio Return</div>
          <div
            className={`font-bold mt-0.5 ${
              netCurrentPnL >= 0 ? 'text-cyan-400' : 'text-rose-400'
            }`}
          >
            {netCurrentPnL >= 0 ? '+' : ''}${netCurrentPnL.toFixed(2)} ({totalReturnPct >= 0 ? '+' : ''}
            {totalReturnPct.toFixed(2)}%)
          </div>
        </div>

        <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase">Total Portfolio Equity</div>
          <div className="text-white font-bold mt-0.5">
            ${currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Portfolio Equal-Weight Rebalance Modal */}
      <PortfolioRebalanceModal
        isOpen={rebalanceModalOpen}
        onClose={() => setRebalanceModalOpen(false)}
        positions={positions}
        assets={assets}
        portfolioBalance={portfolioBalance}
        onPlaceOrder={onPlaceOrder}
        onPlaceBatchOrders={onPlaceBatchOrders}
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
      />
    </div>
  );
};
