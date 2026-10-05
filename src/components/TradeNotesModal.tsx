import React, { useState, useEffect } from 'react';
import {
  MessageSquareText,
  X,
  CheckCircle2,
  Trash2,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Save,
  Clock,
  Compass,
} from 'lucide-react';

export type TradeSentiment = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export interface TradeNoteEntry {
  text: string;
  sentiment: TradeSentiment;
  updatedAt?: number;
}

export interface TradeNoteTarget {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  pnl?: number;
  pnlPct?: number;
  price?: number;
  date?: string;
  note: string;
  sentiment?: TradeSentiment;
  isPosition?: boolean;
}

interface TradeNotesModalProps {
  isOpen: boolean;
  target: TradeNoteTarget | null;
  onClose: () => void;
  onSave: (id: string, note: string, sentiment: TradeSentiment) => void;
}

const QUICK_TAGS = [
  '#SetupValid',
  '#FollowedPlan',
  '#ExecutionFlaw',
  '#EmotionalExit',
  '#FOMO',
  '#NewsImpact',
  '#PrematureExit',
  '#HighConviction',
  '#KeySupport',
  '#TrailingStopWin',
];

export const TradeNotesModal: React.FC<TradeNotesModalProps> = ({
  isOpen,
  target,
  onClose,
  onSave,
}) => {
  const [noteContent, setNoteContent] = useState<string>('');
  const [sentiment, setSentiment] = useState<TradeSentiment>('NEUTRAL');
  const [saveToast, setSaveToast] = useState<boolean>(false);

  useEffect(() => {
    if (target) {
      setNoteContent(target.note || '');
      setSentiment(
        target.sentiment || (target.side === 'LONG' ? 'BULLISH' : 'BEARISH')
      );
    }
  }, [target]);

  if (!isOpen || !target) return null;

  const handleInsertTag = (tag: string) => {
    setNoteContent((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return `${tag} `;
      if (trimmed.includes(tag)) return prev;
      return `${trimmed} ${tag} `;
    });
  };

  const handleSave = () => {
    onSave(target.id, noteContent, sentiment);
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      onClose();
    }, 600);
  };

  const handleClear = () => {
    setNoteContent('');
  };

  const isLong = target.side === 'LONG';
  const hasPnL = target.pnl !== undefined;
  const isProfit = (target.pnl || 0) >= 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 select-none animate-in fade-in duration-150">
      <div className="bg-[#0b0f19] border border-cyan-500/40 rounded-2xl max-w-lg w-full shadow-2xl relative font-mono text-xs overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-[#0d121f] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center">
              <MessageSquareText className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">Trade Post-Mortem Notes</h3>
                <span className="text-[10px] text-cyan-300 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-800">
                  {target.isPosition ? 'Active Position' : 'Closed Trade'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                Record qualitative psychology, execution reviews, and market sentiment tags.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Trade Context Strip */}
        <div className="p-3 bg-slate-900/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-xs">{target.symbol}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 ${
                isLong
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{target.side}</span>
            </span>

            {target.date && (
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-600" />
                <span>{target.date}</span>
              </span>
            )}
          </div>

          {hasPnL && (
            <div className="text-right">
              <span
                className={`font-bold ${
                  isProfit ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isProfit ? '+' : ''}${target.pnl?.toFixed(2)}
                {target.pnlPct !== undefined && ` (${isProfit ? '+' : ''}${target.pnlPct.toFixed(2)}%)`}
              </span>
              <span className="text-[9px] text-slate-500 block font-sans">
                {target.isPosition ? 'Unrealized PnL' : 'Realized PnL'}
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3.5">
          {/* Market Sentiment Tag Selector */}
          <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5 font-bold text-slate-300">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Market Intuition Sentiment Tag:</span>
              </span>
              <span className="text-[10px] text-slate-500 font-sans">
                Audited in Performance Report
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setSentiment('BULLISH')}
                className={`py-1.5 px-2 rounded-lg border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  sentiment === 'BULLISH'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-emerald-300 hover:border-emerald-800'
                }`}
              >
                <span>🐂</span>
                <span>Bullish</span>
              </button>

              <button
                type="button"
                onClick={() => setSentiment('BEARISH')}
                className={`py-1.5 px-2 rounded-lg border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  sentiment === 'BEARISH'
                    ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-md shadow-rose-500/20 ring-1 ring-rose-400/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-rose-300 hover:border-rose-800'
                }`}
              >
                <span>🐻</span>
                <span>Bearish</span>
              </button>

              <button
                type="button"
                onClick={() => setSentiment('NEUTRAL')}
                className={`py-1.5 px-2 rounded-lg border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  sentiment === 'NEUTRAL'
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-800'
                }`}
              >
                <span>⚖️</span>
                <span>Neutral</span>
              </button>
            </div>
          </div>

          {/* Quick Post-Mortem Tags */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3 text-cyan-400" />
                <span>Quick Post-Mortem Tags:</span>
              </span>
              <span className="text-slate-500 font-sans">Click to insert tag</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleInsertTag(tag)}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/50 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Trade Notes & Analysis:</span>
              <span>{noteContent.length} characters</span>
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="e.g. Breakout confirmed on 15m 200 EMA retest. Scaled out at target resistance. Followed trade plan with strict stop discipline..."
              rows={4}
              autoFocus
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-xs font-mono resize-none leading-relaxed"
            />
          </div>

          {/* Feedback Toast */}
          {saveToast && (
            <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-1.5 font-sans">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Trade note & sentiment saved successfully!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-[#0d121f] flex items-center justify-between">
          <button
            type="button"
            onClick={handleClear}
            className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors text-[11px] flex items-center gap-1"
            title="Clear note text"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/30 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Note & Sentiment</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
