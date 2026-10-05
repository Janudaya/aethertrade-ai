import React from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { Position, Asset } from '../types';
import { RiskHeatmap } from './RiskHeatmap';

interface RiskHeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  positions: Position[];
  portfolioBalance: number;
  assets: Asset[];
  onSelectAsset?: (asset: Asset) => void;
}

export const RiskHeatmapModal: React.FC<RiskHeatmapModalProps> = ({
  isOpen,
  onClose,
  positions,
  portfolioBalance,
  assets,
  onSelectAsset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
      <div className="bg-[#0e131d] border border-slate-700/80 rounded-2xl max-w-5xl w-full h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0a0d14]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Portfolio Visual Exposure & Risk Heatmap
                </h2>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  Value-at-Risk Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visualizes notional exposure distribution, leverage multiplier weights, and liquidation buffers.
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

        {/* Heatmap Body */}
        <div className="flex-1 overflow-hidden">
          <RiskHeatmap
            positions={positions}
            portfolioBalance={portfolioBalance}
            assets={assets}
            onSelectAsset={(asset) => {
              if (onSelectAsset) onSelectAsset(asset);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};
