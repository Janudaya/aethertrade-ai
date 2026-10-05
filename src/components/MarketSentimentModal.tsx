import React from 'react';
import { X, Globe, Gauge, TrendingUp, TrendingDown, Layers, ShieldCheck } from 'lucide-react';
import { MarketSentiment } from '../types';

interface MarketSentimentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sentiment: MarketSentiment | null;
  onRefresh: () => void;
  isLoading: boolean;
}

export const MarketSentimentModal: React.FC<MarketSentimentModalProps> = ({
  isOpen,
  onClose,
  sentiment,
  onRefresh,
  isLoading,
}) => {
  if (!isOpen) return null;

  const data = sentiment || {
    fearGreedIndex: 68,
    sentimentStatus: 'Greed',
    marketRegime: 'Bullish Expansion',
    macroSummary: 'Global liquidity aggregates expand alongside institutional capital allocation.',
    narratives: [
      { title: 'Global ETF Net Inflows', impact: 'Bullish', affected: 'BTC, ETH', description: 'Positive net inflows across primary digital asset trusts.' },
      { title: 'Central Bank Rate Dynamics', impact: 'Bullish', affected: 'Gold, Equities', description: 'Disinflation trajectory supporting soft-landing asset valuation multiples.' },
      { title: 'Derivatives Open Interest', impact: 'Neutral', affected: 'High Beta Altcoins', description: 'Leverage distribution remains stable below liquidation cascade threshold.' },
    ],
  };

  const fgValue = data.fearGreedIndex;
  const isGreed = fgValue >= 55;
  const isFear = fgValue <= 45;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
      <div className="bg-[#0e131d] border border-slate-700/80 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0a0d14]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Global Macro & Sentiment Intelligence
              </h2>
              <p className="text-xs text-slate-400">
                AI cross-market sentiment telemetry and narrative catalysts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Fear & Greed Index Gauge */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400">
                Fear & Greed Index
              </div>
              <div
                className={`text-2xl font-bold font-mono mt-0.5 ${
                  isGreed ? 'text-emerald-400' : isFear ? 'text-rose-400' : 'text-amber-400'
                }`}
              >
                {data.sentimentStatus} ({fgValue}/100)
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Market Regime: <span className="text-white font-medium">{data.marketRegime}</span>
              </div>
            </div>

            {/* Gauge visualization bar */}
            <div className="w-32 flex flex-col gap-1.5">
              <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isGreed ? 'bg-emerald-400' : isFear ? 'bg-rose-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${fgValue}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>0 Fear</span>
                <span>50</span>
                <span>100 Greed</span>
              </div>
            </div>
          </div>

          {/* Executive Macro Summary */}
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed">
            {data.macroSummary}
          </div>

          {/* Top Narratives */}
          <div className="space-y-2">
            <div className="font-semibold text-xs text-slate-300">Active Market Narratives</div>

            <div className="space-y-2">
              {data.narratives.map((item, idx) => {
                const isBull = item.impact === 'Bullish';
                const isBear = item.impact === 'Bearish';

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{item.title}</span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isBull
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isBear
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {item.impact}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{item.description}</div>
                    <div className="text-[10px] font-mono text-cyan-400 pt-0.5">
                      Target Assets: {item.affected}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
