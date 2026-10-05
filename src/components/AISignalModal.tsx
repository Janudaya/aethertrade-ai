import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Target,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { Asset, AISignal, Candle } from '../types';

interface AISignalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAsset: Asset;
  candles: Candle[];
  activeSignal: AISignal | null;
  onRefreshSignal: () => void;
  onExecuteSignal: (signal: AISignal) => void;
  isLoading: boolean;
}

export const AISignalModal: React.FC<AISignalModalProps> = ({
  isOpen,
  onClose,
  currentAsset,
  candles,
  activeSignal,
  onRefreshSignal,
  onExecuteSignal,
  isLoading,
}) => {
  if (!isOpen) return null;

  const isBuy = activeSignal?.action.includes('BUY');
  const isSell = activeSignal?.action.includes('SELL');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
      <div className="bg-[#0e131d] border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0a0d14]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/40">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  AI Alpha Signal Scanner
                </h2>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  {currentAsset.symbol}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Institutional neural analysis fusing multi-timeframe indicators with order book liquidity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshSignal}
              disabled={isLoading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
              title="Re-run Neural Scan"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <div className="text-white font-semibold text-sm">
                Analyzing Live Market Data & Technical Orderflow...
              </div>
              <p className="text-xs text-slate-500 max-w-sm">
                Evaluating 14-period RSI, Exponential Moving Averages ribbon, Bollinger Band dispersion, and liquidity depth.
              </p>
            </div>
          ) : activeSignal ? (
            <>
              {/* Executive Signal Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                  isBuy
                    ? 'bg-emerald-950/30 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                    : isSell
                    ? 'bg-rose-950/30 border-rose-500/40 shadow-lg shadow-rose-950/20'
                    : 'bg-slate-900 border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${
                      isBuy
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : isSell
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {isBuy ? <TrendingUp className="w-6 h-6" /> : isSell ? <TrendingDown className="w-6 h-6" /> : '—'}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
                      Algorithmic Verdict
                    </div>
                    <div
                      className={`text-xl font-black tracking-tight ${
                        isBuy ? 'text-emerald-400' : isSell ? 'text-rose-400' : 'text-slate-200'
                      }`}
                    >
                      {activeSignal.action}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-mono text-slate-400">Confidence</div>
                  <div className="text-2xl font-bold font-mono text-cyan-400">
                    {activeSignal.confidence}%
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    R:R {activeSignal.riskRewardRatio}
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/70 p-3 rounded-lg border border-slate-800">
                {activeSignal.summary}
              </p>

              {/* Execution Targets Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Entry Price</div>
                  <div className="text-white font-bold text-sm mt-0.5">
                    ${activeSignal.recommendedEntry.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-emerald-400 uppercase">Take Profit 1</div>
                  <div className="text-emerald-400 font-bold text-sm mt-0.5">
                    ${activeSignal.targetPrice1.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-emerald-400 uppercase">Take Profit 2</div>
                  <div className="text-emerald-400 font-bold text-sm mt-0.5">
                    ${activeSignal.targetPrice2.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-rose-400 uppercase">Stop Loss</div>
                  <div className="text-rose-400 font-bold text-sm mt-0.5">
                    ${activeSignal.stopLoss.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Signal Dimensions Breakdown */}
              <div className="space-y-2 text-xs">
                <div className="font-semibold text-slate-300">Technical Breakdown</div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">Trend Alignment</div>
                    <div
                      className={`font-semibold capitalize text-xs mt-0.5 ${
                        activeSignal.signals.trend.status === 'bullish'
                          ? 'text-emerald-400'
                          : activeSignal.signals.trend.status === 'bearish'
                          ? 'text-rose-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {activeSignal.signals.trend.status}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                      {activeSignal.signals.trend.detail}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">Momentum State</div>
                    <div
                      className={`font-semibold capitalize text-xs mt-0.5 ${
                        activeSignal.signals.momentum.status === 'bullish'
                          ? 'text-emerald-400'
                          : activeSignal.signals.momentum.status === 'bearish'
                          ? 'text-rose-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {activeSignal.signals.momentum.status}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                      {activeSignal.signals.momentum.detail}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">Volatility</div>
                    <div className="text-cyan-400 font-semibold capitalize text-xs mt-0.5">
                      {activeSignal.signals.volatility.status}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                      {activeSignal.signals.volatility.detail}
                    </div>
                  </div>
                </div>
              </div>

              {/* Catalysts List */}
              <div className="space-y-1.5 text-xs">
                <div className="font-semibold text-slate-300">Identified Catalysts</div>
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
                  {activeSignal.catalysts.map((cat, i) => (
                    <div key={i} className="flex items-start gap-2 text-slate-300 text-[11px]">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>{cat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Execution Action Button */}
              <button
                onClick={() => {
                  onExecuteSignal(activeSignal);
                  onClose();
                }}
                className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isBuy
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
                    : isSell
                    ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/25'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/25'
                }`}
              >
                <span>Execute {activeSignal.action} Setup ({activeSignal.suggestedLeverage}x Leverage)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <p>No signal generated. Click below to scan {currentAsset.symbol}.</p>
              <button
                onClick={onRefreshSignal}
                className="mt-3 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs"
              >
                Run Analysis Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
