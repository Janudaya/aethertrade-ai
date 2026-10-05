import React, { useState } from 'react';
import { OrderBookEntry, ExecutionTapeItem } from '../types';

interface OrderBookProps {
  currentPrice: number;
  decimals: number;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  recentTrades: ExecutionTapeItem[];
  onSelectPrice: (price: number) => void;
}

export const OrderBook: React.FC<OrderBookProps> = ({
  currentPrice,
  decimals,
  bids,
  asks,
  recentTrades,
  onSelectPrice,
}) => {
  const [activeTab, setActiveTab] = useState<'book' | 'trades'>('book');

  const maxBidTotal = bids[bids.length - 1]?.total || 1;
  const maxAskTotal = asks[asks.length - 1]?.total || 1;
  const maxTotal = Math.max(maxBidTotal, maxAskTotal);

  const topBid = bids[0]?.price || currentPrice;
  const topAsk = asks[0]?.price || currentPrice;
  const spread = Math.max(0, topAsk - topBid);
  const spreadPct = topBid > 0 ? (spread / topBid) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-[#0d111a] border-l border-slate-800 text-slate-300 select-none">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-[#0b0e14]">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('book')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'book'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Order Book
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'trades'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Market Trades
          </button>
        </div>
        <div className="text-[10px] font-mono text-slate-500">Live Depth</div>
      </div>

      {activeTab === 'book' ? (
        <div className="flex-1 flex flex-col justify-between overflow-hidden text-[11px] font-mono p-2">
          {/* Header Labels */}
          <div className="grid grid-cols-3 text-slate-500 text-[10px] pb-1 px-1 border-b border-slate-800/60">
            <div>Price</div>
            <div className="text-right">Size</div>
            <div className="text-right">Total</div>
          </div>

          {/* Asks (Sell Orders) - Red - Rendered bottom-to-top */}
          <div className="flex-1 flex flex-col justify-end space-y-0.5 overflow-hidden my-1">
            {asks.slice(0, 9).reverse().map((ask, i) => {
              const depthPct = (ask.total / maxTotal) * 100;
              return (
                <div
                  key={`ask-${i}`}
                  onClick={() => onSelectPrice(ask.price)}
                  className="relative grid grid-cols-3 px-1 py-0.5 hover:bg-rose-500/10 cursor-pointer rounded transition-colors group"
                >
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-rose-500/12 pointer-events-none transition-all"
                    style={{ width: `${depthPct}%` }}
                  />
                  <div className="text-rose-400 font-medium group-hover:underline">
                    {ask.price.toFixed(decimals)}
                  </div>
                  <div className="text-right text-slate-300">{ask.amount.toFixed(3)}</div>
                  <div className="text-right text-slate-400">{ask.total.toFixed(2)}</div>
                </div>
              );
            })}
          </div>

          {/* Mid Market Spread Bar */}
          <div className="py-2 px-2 my-1 bg-[#121722] rounded border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                ${currentPrice.toFixed(decimals)}
              </span>
              <span className="text-[10px] text-slate-400">Spread</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              ${spread.toFixed(decimals)} ({spreadPct.toFixed(3)}%)
            </div>
          </div>

          {/* Bids (Buy Orders) - Green */}
          <div className="flex-1 flex flex-col space-y-0.5 overflow-hidden my-1">
            {bids.slice(0, 9).map((bid, i) => {
              const depthPct = (bid.total / maxTotal) * 100;
              return (
                <div
                  key={`bid-${i}`}
                  onClick={() => onSelectPrice(bid.price)}
                  className="relative grid grid-cols-3 px-1 py-0.5 hover:bg-emerald-500/10 cursor-pointer rounded transition-colors group"
                >
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-emerald-500/12 pointer-events-none transition-all"
                    style={{ width: `${depthPct}%` }}
                  />
                  <div className="text-emerald-400 font-medium group-hover:underline">
                    {bid.price.toFixed(decimals)}
                  </div>
                  <div className="text-right text-slate-300">{bid.amount.toFixed(3)}</div>
                  <div className="text-right text-slate-400">{bid.total.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Market Executions Tape */
        <div className="flex-1 flex flex-col overflow-hidden text-[11px] font-mono p-2">
          <div className="grid grid-cols-3 text-slate-500 text-[10px] pb-1 px-1 border-b border-slate-800/60">
            <div>Price</div>
            <div className="text-right">Amount</div>
            <div className="text-right">Time</div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 my-1">
            {recentTrades.map((trade) => {
              const isBuy = trade.side === 'BUY';
              return (
                <div
                  key={trade.id}
                  className="grid grid-cols-3 px-1 py-0.5 hover:bg-slate-800/50 rounded transition-colors"
                >
                  <div className={isBuy ? 'text-emerald-400' : 'text-rose-400'}>
                    {trade.price.toFixed(decimals)}
                  </div>
                  <div className="text-right text-slate-300">{trade.amount.toFixed(3)}</div>
                  <div className="text-right text-slate-500">{trade.time}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
