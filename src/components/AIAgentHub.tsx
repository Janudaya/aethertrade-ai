import React, { useState } from 'react';
import {
  X,
  Bot,
  Play,
  Pause,
  Plus,
  Sparkles,
  Shield,
  Activity,
  CheckCircle,
  TrendingUp,
  Cpu,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { AutonomousAgent, Asset } from '../types';

interface AIAgentHubProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AutonomousAgent[];
  currentAsset: Asset;
  onToggleAgentStatus: (agentId: string) => void;
  onCreateCustomAgent: (agent: AutonomousAgent) => void;
  onRunAgentCycleNow: (agentId: string) => void;
}

export const AIAgentHub: React.FC<AIAgentHubProps> = ({
  isOpen,
  onClose,
  agents,
  currentAsset,
  onToggleAgentStatus,
  onCreateCustomAgent,
  onRunAgentCycleNow,
}) => {
  const [activeTab, setActiveTab] = useState<'agents' | 'builder'>('agents');
  const [selectedAgent, setSelectedAgent] = useState<AutonomousAgent>(agents[0]);

  // Strategy Builder State
  const [promptInput, setPromptInput] = useState('');
  const [riskTolerance, setRiskTolerance] = useState('Balanced');
  const [targetPair, setTargetPair] = useState(currentAsset.symbol);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateCustomAgent = async () => {
    if (!promptInput.trim()) return;
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const response = await fetch('/api/ai/agent-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyPrompt: promptInput,
          selectedPair: targetPair,
          riskTolerance,
          preferredTimeframe: '15m',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate agent strategy');
      }

      const data = await response.json();
      const newAgent: AutonomousAgent = {
        id: `agent-custom-${Date.now()}`,
        name: data.name || 'Neural Quant Bot',
        tagline: data.tagline || 'Custom Algorithmic Engine',
        description: data.description || promptInput,
        strategyType: data.strategyType || 'MOMENTUM_SCALPING',
        status: 'ACTIVE',
        targetPair: targetPair,
        winRateProjected: data.winRateProjected || 70.5,
        profitFactor: data.profitFactor || 2.2,
        maxDrawdown: data.maxDrawdown || 4.5,
        totalTrades: 0,
        winTrades: 0,
        totalPnl: 0,
        executionRules: data.executionRules || {
          entryConditions: ['RSI breakout', 'EMA bullish momentum alignment'],
          exitConditions: ['Target reached', 'Trailing stop triggered'],
          leverage: 5,
          stopLossPct: 1.0,
          takeProfitPct: 2.5,
          trailingStopPct: 0.5,
          cooldownMinutes: 5,
          positionSizePct: 5,
        },
        systemDirective: data.systemDirective || 'Execute automated discipline.',
        recentLogs: [
          {
            id: `log-init-${Date.now()}`,
            time: 'Just now',
            message: `Agent initialized & deployed for ${targetPair}. Monitoring real-time order book flow.`,
            type: 'info',
          },
        ],
      };

      onCreateCustomAgent(newAgent);
      setSelectedAgent(newAgent);
      setActiveTab('agents');
      setPromptInput('');
    } catch (err: any) {
      console.error(err);
      setGenerationError('Failed to generate strategy. Please try refining your prompt.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
      <div className="bg-[#0e131d] border border-slate-700/80 rounded-2xl max-w-4xl w-full h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0a0d14]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Autonomous AI Trading Agents
                </h2>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                  Algorithmic Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Deploy autonomous quant models that monitor order books and execute automated trades.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab('agents')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === 'agents'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Active Roster ({agents.length})
              </button>
              <button
                onClick={() => setActiveTab('builder')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === 'builder'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>Custom Strategy Builder</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        {activeTab === 'agents' ? (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
            {/* Left Column: Agents List */}
            <div className="md:col-span-5 border-r border-slate-800 p-4 overflow-y-auto space-y-2.5 bg-[#0a0d14]/40">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1 pb-1">
                <span>Deployable Bots</span>
                <span className="text-emerald-400">
                  {agents.filter((a) => a.status === 'ACTIVE').length} Running
                </span>
              </div>

              {agents.map((agent) => {
                const isSelected = selectedAgent.id === agent.id;
                const isActive = agent.status === 'ACTIVE';

                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/30 border-indigo-500/50 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/30'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{agent.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            {agent.targetPair}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {agent.tagline}
                        </p>
                      </div>

                      {/* Power status indicator button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleAgentStatus(agent.id);
                        }}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                        title={isActive ? 'Pause Bot' : 'Activate Bot'}
                      >
                        {isActive ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Stats pills */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-800/80 font-mono text-[11px]">
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase">Win Rate</div>
                        <div className="text-cyan-400 font-semibold">{agent.winRateProjected}%</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase">Profit Fac.</div>
                        <div className="text-indigo-300 font-semibold">{agent.profitFactor}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-slate-500 uppercase">Realized PnL</div>
                        <div className={`font-semibold ${agent.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {agent.totalPnl >= 0 ? '+' : ''}${agent.totalPnl.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add Custom Bot Button */}
              <button
                onClick={() => setActiveTab('builder')}
                className="w-full py-3 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-950/10 text-slate-400 hover:text-indigo-300 text-xs font-medium flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Custom AI Strategy</span>
              </button>
            </div>

            {/* Right Column: Detailed Selected Agent Info & Live Audit Log */}
            <div className="md:col-span-7 p-6 overflow-y-auto space-y-5 bg-[#0e131d]">
              {/* Agent Overview Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-bold text-white">{selectedAgent.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${
                        selectedAgent.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedAgent.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      {selectedAgent.status}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-300 font-mono mt-0.5">{selectedAgent.tagline}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onRunAgentCycleNow(selectedAgent.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Run Scan Now</span>
                  </button>

                  <button
                    onClick={() => onToggleAgentStatus(selectedAgent.id)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-xs transition-all shadow-md ${
                      selectedAgent.status === 'ACTIVE'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                    }`}
                  >
                    {selectedAgent.status === 'ACTIVE' ? 'Pause Automation' : 'Activate Bot'}
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                {selectedAgent.description}
              </div>

              {/* Execution Protocol & Rules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Entry Rules */}
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Entry Criteria
                  </div>
                  <ul className="space-y-1.5 text-slate-300 text-[11px]">
                    {selectedAgent.executionRules.entryConditions.map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">›</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Exit Rules */}
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Risk & Exit Controls
                  </div>
                  <ul className="space-y-1.5 text-slate-300 text-[11px]">
                    {selectedAgent.executionRules.exitConditions.map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-rose-500 font-bold">›</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Quant Risk Parameters Pill Row */}
              <div className="grid grid-cols-4 gap-2 font-mono text-[11px]">
                <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500">Leverage</div>
                  <div className="text-white font-bold">{selectedAgent.executionRules.leverage}x</div>
                </div>
                <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500">Stop Loss</div>
                  <div className="text-rose-400 font-bold">-{selectedAgent.executionRules.stopLossPct}%</div>
                </div>
                <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500">Take Profit</div>
                  <div className="text-emerald-400 font-bold">+{selectedAgent.executionRules.takeProfitPct}%</div>
                </div>
                <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500">Max Position</div>
                  <div className="text-cyan-400 font-bold">{selectedAgent.executionRules.positionSizePct}% Portfolio</div>
                </div>
              </div>

              {/* Live Agent Decision Audit Log */}
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    Real-time Agent Decision Audit Log
                  </span>
                  <span className="text-[10px] text-slate-500">Auto-refreshing</span>
                </div>

                <div className="bg-[#0a0d14] rounded-xl border border-slate-800 p-3 max-h-48 overflow-y-auto space-y-2 font-mono text-xs">
                  {selectedAgent.recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-2.5 text-[11px] pb-1.5 border-b border-slate-900 last:border-none"
                    >
                      <span className="text-slate-500 whitespace-nowrap">{log.time}</span>
                      <span
                        className={
                          log.type === 'trade'
                            ? 'text-cyan-400'
                            : log.type === 'profit'
                            ? 'text-emerald-400 font-semibold'
                            : log.type === 'alert'
                            ? 'text-amber-400'
                            : 'text-slate-300'
                        }
                      >
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Custom Strategy Agent Builder Tab */
          <div className="flex-1 p-6 overflow-y-auto max-w-2xl mx-auto w-full flex flex-col justify-center space-y-5">
            <div className="text-center space-y-1.5">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 text-cyan-400 mb-1">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">
                Gemini Neural Strategy Compiler
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Describe any trading strategy in plain English. The AI quant engine will synthesize execution algorithms, backtested risk ratios, and deploy your custom bot.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Natural Language Strategy Directive
                </label>
                <textarea
                  rows={4}
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="e.g. Scalp Bitcoin aggressively with 10x leverage on 5m charts. Buy when RSI is below 35 and EMA 9 crosses above EMA 21. Take profit at 1.4%, stop loss at 0.7% with a trailing stop to protect gains."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                />
              </div>

              {/* Preset suggestion chips */}
              <div className="space-y-1.5">
                <div className="text-[11px] text-slate-500">Quick Strategy Templates:</div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() =>
                      setPromptInput(
                        'Momentum breakout bot on SOL: Enter long when volume spikes 2x above average and price pierces upper Bollinger Band, take profit at +2.5%, stop loss -1.2%.'
                      )
                    }
                    className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    ⚡ SOL Volume Breakout
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPromptInput(
                        'Mean reversion scalper on ETH: Fade extreme RSI levels (>75 sell, <25 buy) with 6x leverage, target 20-period moving average.'
                      )
                    }
                    className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    🎯 ETH RSI Mean Reversion
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPromptInput(
                        'Institutional macro trend follower on Gold (XAU/USD): 50 EMA alignment with 3x leverage, trailing stop of 0.8% and +3% profit target.'
                      )
                    }
                    className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    🏆 Gold Institutional Trend
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1 text-[11px]">Target Market Pair</label>
                  <select
                    value={targetPair}
                    onChange={(e) => setTargetPair(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  >
                    <option value="BTC/USDT">BTC/USDT (Bitcoin)</option>
                    <option value="ETH/USDT">ETH/USDT (Ethereum)</option>
                    <option value="SOL/USDT">SOL/USDT (Solana)</option>
                    <option value="XAU/USD">XAU/USD (Gold)</option>
                    <option value="NVDA">NVDA (NVIDIA)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 text-[11px]">Risk Management Profile</label>
                  <select
                    value={riskTolerance}
                    onChange={(e) => setRiskTolerance(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Conservative">Conservative (Low Drawdown, 2-3x)</option>
                    <option value="Balanced">Balanced (Quant Optimal, 5-8x)</option>
                    <option value="Aggressive">Aggressive (High Alpha Scalp, 10-20x)</option>
                  </select>
                </div>
              </div>

              {generationError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {generationError}
                </div>
              )}

              <button
                type="button"
                onClick={handleGenerateCustomAgent}
                disabled={isGenerating || !promptInput.trim()}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Compiling Quantitative Model & Backtesting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Compile & Deploy Autonomous Bot</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
