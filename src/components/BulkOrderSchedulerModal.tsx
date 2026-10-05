import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarClock,
  X,
  Play,
  Pause,
  Trash2,
  Plus,
  Zap,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  Shield,
  Target,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Sliders,
  DollarSign,
} from 'lucide-react';
import {
  Asset,
  BulkOrderSchedule,
  ScheduledStage,
  SchedulerStrategyType,
  OrderPlacementPayload,
} from '../types';

interface BulkOrderSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: BulkOrderSchedule[];
  currentAsset: Asset;
  assets: Asset[];
  portfolioBalance: number;
  onDeploySchedule: (schedule: BulkOrderSchedule) => void;
  onToggleScheduleStatus: (scheduleId: string) => void;
  onExecuteNextStageNow: (scheduleId: string) => void;
  onCancelSchedule: (scheduleId: string) => void;
  onDeleteSchedule: (scheduleId: string) => void;
}

export const BulkOrderSchedulerModal: React.FC<BulkOrderSchedulerModalProps> = ({
  isOpen,
  onClose,
  schedules,
  currentAsset,
  assets,
  portfolioBalance,
  onDeploySchedule,
  onToggleScheduleStatus,
  onExecuteNextStageNow,
  onCancelSchedule,
  onDeleteSchedule,
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'create'>('active');

  // Form State for creating a new schedule
  const [strategyType, setStrategyType] = useState<SchedulerStrategyType>('DCA');
  const [selectedSymbol, setSelectedSymbol] = useState<string>(currentAsset.symbol);
  const [side, setSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [totalMargin, setTotalMargin] = useState<number>(2000);
  const [stageCount, setStageCount] = useState<number>(5);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(10);
  const [leverage, setLeverage] = useState<number>(5);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitOffsetPct, setLimitOffsetPct] = useState<number>(0.5); // % offset for ladder
  const [stopLossPct, setStopLossPct] = useState<string>('3.0');
  const [takeProfitPct, setTakeProfitPct] = useState<string>('6.0');
  const [scheduleName, setScheduleName] = useState<string>('');

  // Live seconds countdown ticker state
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  const matchedAsset = useMemo(
    () => assets.find((a) => a.symbol === selectedSymbol) || currentAsset,
    [assets, selectedSymbol, currentAsset]
  );

  // Auto-generate a descriptive name if blank
  useEffect(() => {
    if (!scheduleName || scheduleName.includes('Auto')) {
      const typeLabel =
        strategyType === 'DCA'
          ? 'DCA Accumulation'
          : strategyType === 'MULTI_STAGE_LADDER'
          ? 'Stepped Dip Ladder'
          : 'Staged Sequence';
      setScheduleName(`${selectedSymbol.split('/')[0]} ${typeLabel} (${stageCount}x)`);
    }
  }, [strategyType, selectedSymbol, stageCount]);

  // Synchronize symbol if modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSymbol(currentAsset.symbol);
    }
  }, [isOpen, currentAsset.symbol]);

  // Compute calculated preview stages
  const previewStages: ScheduledStage[] = useMemo(() => {
    const stages: ScheduledStage[] = [];
    const basePrice = matchedAsset.price;
    const trancheMargin = totalMargin / stageCount;

    for (let i = 0; i < stageCount; i++) {
      let stageMargin = trancheMargin;

      // In Multi-stage ladder, weight later stages more (pyramiding)
      if (strategyType === 'MULTI_STAGE_LADDER') {
        const weights = [0.15, 0.2, 0.25, 0.4];
        const weight = weights[i] || 1 / stageCount;
        stageMargin = totalMargin * weight;
      }

      // Price target for limit ladder
      let targetPrice: number | undefined = undefined;
      if (orderType === 'LIMIT') {
        const offset = (i * limitOffsetPct) / 100;
        targetPrice = side === 'LONG' ? basePrice * (1 - offset) : basePrice * (1 + offset);
        targetPrice = Number(targetPrice.toFixed(matchedAsset.decimals));
      }

      stages.push({
        id: `preview-stage-${i + 1}`,
        stageNumber: i + 1,
        symbol: selectedSymbol,
        targetPrice,
        margin: Math.round(stageMargin),
        leverage,
        side,
        type: orderType,
        delaySeconds: i * intervalSeconds,
        status: 'PENDING',
      });
    }

    return stages;
  }, [
    matchedAsset,
    totalMargin,
    stageCount,
    strategyType,
    orderType,
    side,
    limitOffsetPct,
    selectedSymbol,
    leverage,
    intervalSeconds,
  ]);

  const handleDeploy = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalMargin <= 0 || totalMargin > portfolioBalance) return;

    const newSchedule: BulkOrderSchedule = {
      id: `sched-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: scheduleName.trim() || `${selectedSymbol} ${strategyType} (${stageCount}x)`,
      symbol: selectedSymbol,
      strategyType,
      side,
      status: 'ACTIVE',
      totalStages: stageCount,
      completedStages: 0,
      intervalSeconds,
      totalMarginAllocated: totalMargin,
      totalMarginFilled: 0,
      leverage,
      stopLossPct: stopLossPct ? parseFloat(stopLossPct) : undefined,
      takeProfitPct: takeProfitPct ? parseFloat(takeProfitPct) : undefined,
      createdAt: Date.now(),
      nextExecutionTime: Date.now() + 1000, // First tranche executes within 1 sec
      stages: previewStages.map((stg) => ({
        ...stg,
        id: `stage-${Date.now()}-${stg.stageNumber}-${Math.random().toString(36).substr(2, 3)}`,
      })),
      notes: `Target price $${matchedAsset.price} • ${intervalSeconds}s intervals`,
    };

    onDeploySchedule(newSchedule);
    setActiveTab('active');
  };

  const activeSchedulesCount = schedules.filter((s) => s.status === 'ACTIVE').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="bg-[#0b0e17] border border-teal-500/40 rounded-2xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl relative font-mono text-xs overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0e1320] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 via-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/20 ring-1 ring-teal-400/30">
              <CalendarClock className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Bulk Order Scheduler
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-teal-400" />
                  DCA / TWAP ENGINE
                </span>
                {activeSchedulesCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 animate-pulse">
                    {activeSchedulesCount} ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Automated dollar-cost averaging, laddered tranches, and multi-stage execution sequences.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher Bar */}
        <div className="px-5 py-2.5 bg-[#0d121f] border-b border-slate-800/80 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'active'
                  ? 'bg-teal-600/30 text-teal-300 font-bold border border-teal-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5 text-teal-400" />
              <span>Active Schedulers ({schedules.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-teal-600/30 text-teal-300 font-bold border border-teal-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-teal-400" />
              <span>Configure New Schedule</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>Available Capital:</span>
            <span className="font-bold text-white font-mono">
              ${portfolioBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* TAB 1: ACTIVE & COMPLETED SCHEDULERS */}
          {activeTab === 'active' && (
            <div className="space-y-4">
              {schedules.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                  <CalendarClock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-white">No Bulk Order Schedules Configured</h3>
                  <p className="text-xs text-slate-400 font-sans max-w-md mx-auto mt-1 mb-4">
                    Deploy dollar-cost averaging (DCA) or staged dip-ladder entries to systematically scale into positions over fixed time intervals.
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 text-xs transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Your First Schedule</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {schedules.map((schedule) => {
                    const isRunning = schedule.status === 'ACTIVE';
                    const isCompleted = schedule.status === 'COMPLETED';
                    const isPaused = schedule.status === 'PAUSED';

                    // Countdown timer calculation
                    const msRemaining = Math.max(0, schedule.nextExecutionTime - now);
                    const secondsRemaining = Math.ceil(msRemaining / 1000);
                    const progressPct = Math.round(
                      (schedule.completedStages / schedule.totalStages) * 100
                    );

                    return (
                      <div
                        key={schedule.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isRunning
                            ? 'bg-[#0e1422] border-teal-500/50 shadow-lg shadow-teal-500/5'
                            : isCompleted
                            ? 'bg-[#0d121c] border-emerald-900/60'
                            : 'bg-[#0b0e14] border-slate-800'
                        }`}
                      >
                        {/* Schedule Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                schedule.side === 'LONG'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800'
                              }`}
                            >
                              {schedule.side === 'LONG' ? 'BUY' : 'SELL'}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white">{schedule.name}</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-900 text-slate-300 border border-slate-700">
                                  {schedule.symbol}
                                </span>
                                <span
                                  className={`px-2 py-0.2 rounded text-[9px] font-bold ${
                                    isRunning
                                      ? 'bg-teal-950 text-teal-300 border border-teal-800'
                                      : isCompleted
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : isPaused
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                      : 'bg-slate-900 text-slate-400 border border-slate-700'
                                  }`}
                                >
                                  {schedule.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                                Interval: {schedule.intervalSeconds}s • Leverage: {schedule.leverage}x • Strategy: {schedule.strategyType}
                              </div>
                            </div>
                          </div>

                          {/* Quick Controls */}
                          <div className="flex items-center gap-2">
                            {isRunning && (
                              <button
                                onClick={() => onExecuteNextStageNow(schedule.id)}
                                className="px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                title="Execute the next pending tranche immediately without waiting"
                              >
                                <Zap className="w-3 h-3" />
                                <span>Trigger Now</span>
                              </button>
                            )}

                            {isRunning ? (
                              <button
                                onClick={() => onToggleScheduleStatus(schedule.id)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700 transition-colors cursor-pointer"
                                title="Pause schedule"
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            ) : isPaused ? (
                              <button
                                onClick={() => onToggleScheduleStatus(schedule.id)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-700 transition-colors cursor-pointer"
                                title="Resume schedule"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            ) : null}

                            {!isCompleted && schedule.status !== 'CANCELLED' && (
                              <button
                                onClick={() => onCancelSchedule(schedule.id)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-700 transition-colors cursor-pointer"
                                title="Cancel schedule"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => onDeleteSchedule(schedule.id)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-slate-300 border border-slate-800 transition-colors cursor-pointer"
                              title="Delete schedule record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar & Telemetry Stats */}
                        <div className="py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                            <div className="text-[10px] text-slate-400 uppercase">Tranches Filled</div>
                            <div className="text-sm font-bold text-white mt-0.5">
                              {schedule.completedStages} / {schedule.totalStages} ({progressPct}%)
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-teal-500 to-cyan-400 h-full rounded-full transition-all duration-300"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                            <div className="text-[10px] text-slate-400 uppercase">Invested Capital</div>
                            <div className="text-sm font-bold text-white mt-0.5">
                              ${schedule.totalMarginFilled.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1">
                              Budget: ${schedule.totalMarginAllocated.toLocaleString()}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                            <div className="text-[10px] text-slate-400 uppercase">Avg Fill Price</div>
                            <div className="text-sm font-bold text-white mt-0.5">
                              {schedule.averageFillPrice
                                ? `$${schedule.averageFillPrice.toLocaleString()}`
                                : 'Pending fills'}
                            </div>
                            <div className="text-[10px] text-cyan-400 mt-1">
                              Live: ${matchedAsset.price.toLocaleString()}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex flex-col justify-between">
                            <div className="text-[10px] text-slate-400 uppercase">Next Tranche</div>
                            {isRunning ? (
                              <div className="text-sm font-bold text-teal-300 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-teal-400 animate-spin" />
                                <span>{secondsRemaining}s</span>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-500">
                                {isCompleted ? 'Completed' : 'Halted'}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-500">
                              {isRunning ? 'Auto-executing next leg' : 'No active countdown'}
                            </div>
                          </div>
                        </div>

                        {/* Stages Execution Ladder Details */}
                        <div className="mt-2 pt-2 border-t border-slate-800/60">
                          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center justify-between">
                            <span>Stage Sequence Ladder</span>
                            <span>{schedule.stages.filter((s) => s.status === 'FILLED').length} filled</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {schedule.stages.map((stg) => {
                              const isFilled = stg.status === 'FILLED';
                              const isExecuting = stg.status === 'EXECUTING';

                              return (
                                <div
                                  key={stg.id}
                                  className={`p-2 rounded-lg border text-[11px] ${
                                    isFilled
                                      ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                                      : isExecuting
                                      ? 'bg-teal-950/40 border-teal-500/80 text-teal-300 animate-pulse'
                                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                                  }`}
                                >
                                  <div className="flex items-center justify-between font-bold">
                                    <span>#{stg.stageNumber}</span>
                                    <span>${stg.margin}</span>
                                  </div>
                                  <div className="text-[10px] mt-1 truncate">
                                    {isFilled
                                      ? `@ $${stg.fillPrice?.toLocaleString()}`
                                      : `+${stg.delaySeconds}s`}
                                  </div>
                                  <div className="text-[9px] mt-0.5 flex items-center gap-1">
                                    {isFilled && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
                                    <span>{stg.status}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONFIGURE NEW SCHEDULE */}
          {activeTab === 'create' && (
            <form onSubmit={handleDeploy} className="space-y-6">
              {/* Strategy Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                  Select Execution Strategy
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Option 1: DCA */}
                  <div
                    onClick={() => setStrategyType('DCA')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      strategyType === 'DCA'
                        ? 'bg-teal-950/60 border-teal-500/80 shadow-md shadow-teal-500/10 ring-1 ring-teal-500/50'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">Automated DCA</span>
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans mt-1.5">
                      Splits total capital into identical tranches executed at fixed time intervals to smooth market fluctuations.
                    </p>
                  </div>

                  {/* Option 2: Multi-Stage Ladder */}
                  <div
                    onClick={() => setStrategyType('MULTI_STAGE_LADDER')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      strategyType === 'MULTI_STAGE_LADDER'
                        ? 'bg-teal-950/60 border-teal-500/80 shadow-md shadow-teal-500/10 ring-1 ring-teal-500/50'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">Pyramid Dip Ladder</span>
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans mt-1.5">
                      Scales in with increasing tranche weights (15% → 25% → 60%) to buy dips aggressively as market moves.
                    </p>
                  </div>

                  {/* Option 3: Custom Staged Sequence */}
                  <div
                    onClick={() => setStrategyType('CUSTOM_SEQUENCE')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      strategyType === 'CUSTOM_SEQUENCE'
                        ? 'bg-teal-950/60 border-teal-500/80 shadow-md shadow-teal-500/10 ring-1 ring-teal-500/50'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">Custom Sequence</span>
                      <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans mt-1.5">
                      Custom-timed execution sequence with individual step intervals and risk controls.
                    </p>
                  </div>
                </div>
              </div>

              {/* Core Parameters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Target Asset */}
                <div>
                  <label className="block text-[11px] text-slate-400 uppercase mb-1.5 font-bold">
                    Target Asset
                  </label>
                  <select
                    value={selectedSymbol}
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-teal-500"
                  >
                    {assets.map((asset) => (
                      <option key={asset.symbol} value={asset.symbol}>
                        {asset.symbol} — ${asset.price.toLocaleString()} ({asset.name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Side */}
                <div>
                  <label className="block text-[11px] text-slate-400 uppercase mb-1.5 font-bold">
                    Order Direction
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSide('LONG')}
                      className={`p-2 rounded-lg font-bold transition-all cursor-pointer ${
                        side === 'LONG'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      LONG (Accumulate)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSide('SHORT')}
                      className={`p-2 rounded-lg font-bold transition-all cursor-pointer ${
                        side === 'SHORT'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      SHORT (Distribute)
                    </button>
                  </div>
                </div>

                {/* Total Margin Allocation */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] text-slate-400 uppercase font-bold">
                      Total Allocated Margin
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Avail: ${portfolioBalance.toLocaleString()}
                    </span>
                  </div>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min={10}
                      max={portfolioBalance}
                      step={50}
                      value={totalMargin}
                      onChange={(e) => setTotalMargin(Math.max(10, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-white font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Staging & Timing Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Number of Tranches */}
                <div>
                  <label className="block text-[11px] text-slate-400 uppercase mb-1.5 font-bold">
                    Tranche Stages: <strong className="text-teal-400">{stageCount} orders</strong>
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={10}
                    value={stageCount}
                    onChange={(e) => setStageCount(parseInt(e.target.value))}
                    className="w-full accent-teal-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>2 stages</span>
                    <span>5 stages</span>
                    <span>10 stages</span>
                  </div>
                </div>

                {/* Interval Between Tranches */}
                <div>
                  <label className="block text-[11px] text-slate-400 uppercase mb-1.5 font-bold">
                    Execution Interval
                  </label>
                  <select
                    value={intervalSeconds}
                    onChange={(e) => setIntervalSeconds(parseInt(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-teal-500"
                  >
                    <option value={5}>5 Seconds (Hyper DCA)</option>
                    <option value={10}>10 Seconds (Fast DCA)</option>
                    <option value={15}>15 Seconds (Rapid Tranche)</option>
                    <option value={30}>30 Seconds (Half-Minute)</option>
                    <option value={60}>1 Minute (Standard Intraday)</option>
                    <option value={300}>5 Minutes (Swing Pacing)</option>
                    <option value={900}>15 Minutes (Macro Staging)</option>
                  </select>
                </div>

                {/* Leverage */}
                <div>
                  <label className="block text-[11px] text-slate-400 uppercase mb-1.5 font-bold">
                    Leverage: <strong className="text-cyan-400">{leverage}x</strong>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={leverage}
                    onChange={(e) => setLeverage(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>1x (Spot)</span>
                    <span>10x</span>
                    <span>50x Max</span>
                  </div>
                </div>
              </div>

              {/* Protective Stop Loss & Take Profit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                    Target Take Profit (%)
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    value={takeProfitPct}
                    onChange={(e) => setTakeProfitPct(e.target.value)}
                    placeholder="e.g. 6.0"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                    Target Stop Loss (%)
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    value={stopLossPct}
                    onChange={(e) => setStopLossPct(e.target.value)}
                    placeholder="e.g. 3.0"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Sequence Timeline Visual Preview */}
              <div className="p-4 rounded-xl bg-[#0e1422] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    <span>Projected Sequence Timeline Preview</span>
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Total Notional: ${(totalMargin * leverage).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {previewStages.map((stg) => (
                    <div
                      key={stg.id}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px]"
                    >
                      <div className="flex items-center justify-between font-bold text-white">
                        <span>Leg #{stg.stageNumber}</span>
                        <span className="text-teal-400">${stg.margin}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        T + {stg.delaySeconds}s
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {orderType} • {leverage}x
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deploy Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('active')}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={totalMargin <= 0 || totalMargin > portfolioBalance}
                  className="px-6 py-2.5 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 text-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none hover:scale-105 active:scale-95"
                >
                  <Zap className="w-4 h-4" />
                  <span>Deploy {stageCount}-Stage {strategyType} Schedule</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
