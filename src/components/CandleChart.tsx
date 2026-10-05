import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Candle, IndicatorSettings, Position } from '../types';
import { calculateEMA, calculateBollingerBands, calculateRSI, calculateMACD } from '../utils/indicators';

interface CandleChartProps {
  candles: Candle[];
  indicators: IndicatorSettings;
  positions: Position[];
  symbol: string;
  decimals: number;
  isCompact?: boolean;
  showPnLHeatmap?: boolean;
}

export const CandleChart: React.FC<CandleChartProps> = ({
  candles,
  indicators,
  positions,
  symbol,
  decimals,
  isCompact = false,
  showPnLHeatmap = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // ResizeObserver to handle fluid layout switches and window resizes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Compute indicators
  const ema9 = useMemo(() => (indicators.showEMA9 ? calculateEMA(candles, 9) : []), [candles, indicators.showEMA9]);
  const ema21 = useMemo(() => (indicators.showEMA21 ? calculateEMA(candles, 21) : []), [candles, indicators.showEMA21]);
  const ema50 = useMemo(() => (indicators.showEMA50 ? calculateEMA(candles, 50) : []), [candles, indicators.showEMA50]);
  const bb = useMemo(() => (indicators.showBollinger ? calculateBollingerBands(candles, 20, 2) : null), [candles, indicators.showBollinger]);
  const rsi = useMemo(() => (indicators.showRSI ? calculateRSI(candles, 14) : []), [candles, indicators.showRSI]);
  const macd = useMemo(() => (indicators.showMACD ? calculateMACD(candles) : null), [candles, indicators.showMACD]);

  // Relevant positions for this active symbol
  const symbolPositions = useMemo(() => positions.filter((p) => p.symbol === symbol), [positions, symbol]);

  // Aggregate average entry price and metrics for PnL Heatmap
  const pnlHeatmapData = useMemo(() => {
    if (symbolPositions.length === 0) return null;

    let longQty = 0;
    let longWeightedPrice = 0;
    let shortQty = 0;
    let shortWeightedPrice = 0;
    let pnlSum = 0;
    let marginSum = 0;

    symbolPositions.forEach((pos) => {
      pnlSum += pos.pnl;
      marginSum += pos.margin;
      if (pos.side === 'LONG') {
        longQty += pos.quantity;
        longWeightedPrice += pos.entryPrice * pos.quantity;
      } else {
        shortQty += pos.quantity;
        shortWeightedPrice += pos.entryPrice * pos.quantity;
      }
    });

    const netSide: 'LONG' | 'SHORT' = longQty >= shortQty ? 'LONG' : 'SHORT';
    const netQty = netSide === 'LONG' ? longQty : shortQty;
    const avgEntryPrice =
      netQty > 0
        ? (netSide === 'LONG' ? longWeightedPrice : shortWeightedPrice) / netQty
        : symbolPositions[0]?.entryPrice || 0;

    const totalPnLPct = marginSum > 0 ? (pnlSum / marginSum) * 100 : 0;

    return {
      avgEntryPrice,
      totalQuantity: netQty,
      netSide,
      totalPnL: pnlSum,
      totalPnLPct,
      positionCount: symbolPositions.length,
    };
  }, [symbolPositions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI display
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Layout configuration
    const paddingRight = isCompact ? 58 : 75; // for price axis
    const paddingBottom = isCompact ? 20 : 26; // for time axis
    const paddingTop = isCompact ? 18 : 24;

    // Sub-panels heights
    let subPanelsCount = 0;
    if (indicators.showRSI) subPanelsCount++;
    if (indicators.showMACD && !isCompact) subPanelsCount++;

    const maxSubHeight = isCompact ? 36 : 80;
    const subPanelHeight = subPanelsCount > 0 ? Math.min(maxSubHeight, (height - (isCompact ? 60 : 100)) / (subPanelsCount + 2.5)) : 0;
    const totalSubPanelHeight = subPanelHeight * subPanelsCount;
    const mainChartHeight = Math.max(50, height - paddingTop - paddingBottom - totalSubPanelHeight);
    const chartWidth = width - paddingRight;

    // Clear background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, width, height);

    // Find price min / max for main chart
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    candles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    });

    // Also include BB or EMAs in price range if enabled
    if (bb) {
      bb.upper.forEach((v) => { if (v !== null && v > maxPrice) maxPrice = v; });
      bb.lower.forEach((v) => { if (v !== null && v < minPrice) minPrice = v; });
    }

    // Add 2% padding to price bounds
    const pricePadding = (maxPrice - minPrice) * 0.05 || 1;
    minPrice -= pricePadding;
    maxPrice += pricePadding;
    const priceRange = maxPrice - minPrice || 1;

    // Helper to convert price to Y coord
    const getY = (price: number) => {
      return paddingTop + (1 - (price - minPrice) / priceRange) * mainChartHeight;
    };

    // Helper to convert Y coord to price
    const getPriceFromY = (y: number) => {
      return minPrice + (1 - (y - paddingTop) / mainChartHeight) * priceRange;
    };

    // ----------------------------------------------------
    // PnL Heatmap Background Gradient Overlay
    // Overlays color-coded gradient based on Average Entry Price
    // ----------------------------------------------------
    if (showPnLHeatmap && pnlHeatmapData && pnlHeatmapData.avgEntryPrice > 0) {
      const entryY = getY(pnlHeatmapData.avgEntryPrice);
      const clampedEntryY = Math.max(paddingTop, Math.min(paddingTop + mainChartHeight, entryY));
      const entryRatio = Math.max(0.01, Math.min(0.99, (clampedEntryY - paddingTop) / mainChartHeight));

      const heatmapGrad = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + mainChartHeight);

      if (pnlHeatmapData.netSide === 'LONG') {
        // LONG: Above entry price (lower Y, canvas top) = PROFIT (Emerald Green)
        //       Below entry price (higher Y, canvas bottom) = LOSS (Rose Red)
        heatmapGrad.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
        heatmapGrad.addColorStop(Math.max(0, entryRatio - 0.20), 'rgba(16, 185, 129, 0.08)');
        heatmapGrad.addColorStop(Math.max(0, entryRatio - 0.03), 'rgba(16, 185, 129, 0.01)');
        heatmapGrad.addColorStop(entryRatio, 'rgba(245, 158, 11, 0.08)'); // Breakeven zone
        heatmapGrad.addColorStop(Math.min(1, entryRatio + 0.03), 'rgba(239, 68, 68, 0.01)');
        heatmapGrad.addColorStop(Math.min(1, entryRatio + 0.20), 'rgba(239, 68, 68, 0.08)');
        heatmapGrad.addColorStop(1, 'rgba(239, 68, 68, 0.22)');
      } else {
        // SHORT: Above entry price (lower Y, canvas top) = LOSS (Rose Red)
        //        Below entry price (higher Y, canvas bottom) = PROFIT (Emerald Green)
        heatmapGrad.addColorStop(0, 'rgba(239, 68, 68, 0.22)');
        heatmapGrad.addColorStop(Math.max(0, entryRatio - 0.20), 'rgba(239, 68, 68, 0.08)');
        heatmapGrad.addColorStop(Math.max(0, entryRatio - 0.03), 'rgba(239, 68, 68, 0.01)');
        heatmapGrad.addColorStop(entryRatio, 'rgba(245, 158, 11, 0.08)'); // Breakeven zone
        heatmapGrad.addColorStop(Math.min(1, entryRatio + 0.03), 'rgba(16, 185, 129, 0.01)');
        heatmapGrad.addColorStop(Math.min(1, entryRatio + 0.20), 'rgba(16, 185, 129, 0.08)');
        heatmapGrad.addColorStop(1, 'rgba(16, 185, 129, 0.22)');
      }

      ctx.fillStyle = heatmapGrad;
      ctx.fillRect(0, paddingTop, chartWidth, mainChartHeight);

      // Average Entry Horizon Line
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(0, entryY);
      ctx.lineTo(chartWidth, entryY);
      ctx.stroke();

      // Avg Entry Beacon on Right Price Axis
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(chartWidth + 2, entryY - 9, isCompact ? 54 : 70, 18);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(
        isCompact
          ? `$${pnlHeatmapData.avgEntryPrice.toFixed(0)}`
          : `AVG $${pnlHeatmapData.avgEntryPrice.toFixed(decimals > 2 ? 2 : decimals)}`,
        chartWidth + 5,
        entryY + 3
      );
      ctx.restore();
    }

    // Draw grid lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#161d2b';

    // Horizontal price grid lines
    const gridSteps = 6;
    for (let i = 0; i <= gridSteps; i++) {
      const y = paddingTop + (i / gridSteps) * mainChartHeight;
      const price = maxPrice - (i / gridSteps) * priceRange;

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Price label on right axis
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(price.toFixed(decimals), chartWidth + 8, y + 3);
    }

    // Candle geometry
    const candleCount = candles.length;
    const candleWidth = Math.max(3, chartWidth / candleCount - 2);
    const stepX = chartWidth / candleCount;

    // Vertical time grid lines & timestamps
    const timeStep = Math.max(1, Math.floor(candleCount / 7));
    candles.forEach((c, idx) => {
      if (idx % timeStep === 0) {
        const x = idx * stepX + stepX / 2;
        ctx.beginPath();
        ctx.moveTo(x, paddingTop);
        ctx.lineTo(x, height - paddingBottom);
        ctx.stroke();

        const date = new Date(c.time);
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(timeStr, x, height - 8);
      }
    });

    // Draw Bollinger Bands if enabled
    if (bb) {
      // Shaded band area
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < candleCount; i++) {
        const u = bb.upper[i];
        if (u !== null) {
          const x = i * stepX + stepX / 2;
          const y = getY(u);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      for (let i = candleCount - 1; i >= 0; i--) {
        const l = bb.lower[i];
        if (l !== null) {
          const x = i * stepX + stepX / 2;
          const y = getY(l);
          ctx.lineTo(x, y);
        }
      }
      ctx.fillStyle = 'rgba(59, 130, 246, 0.04)';
      ctx.fill();

      // Band boundaries
      const drawLine = (data: (number | null)[], color: string, widthLine: number = 1) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = widthLine;
        let startedLine = false;
        for (let i = 0; i < candleCount; i++) {
          const val = data[i];
          if (val !== null) {
            const x = i * stepX + stepX / 2;
            const y = getY(val);
            if (!startedLine) {
              ctx.moveTo(x, y);
              startedLine = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        ctx.stroke();
      };

      drawLine(bb.upper, 'rgba(59, 130, 246, 0.35)');
      drawLine(bb.middle, 'rgba(59, 130, 246, 0.5)', 1);
      drawLine(bb.lower, 'rgba(59, 130, 246, 0.35)');
    }

    // Draw EMAs
    const drawIndicatorLine = (data: (number | null)[], color: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      let started = false;
      for (let i = 0; i < candleCount; i++) {
        const val = data[i];
        if (val !== null) {
          const x = i * stepX + stepX / 2;
          const y = getY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
    };

    if (indicators.showEMA9) drawIndicatorLine(ema9, '#22d3ee');
    if (indicators.showEMA21) drawIndicatorLine(ema21, '#fbbf24');
    if (indicators.showEMA50) drawIndicatorLine(ema50, '#c084fc');

    // Draw Candlesticks & Volume overlay bars
    const maxVolume = Math.max(...candles.map((c) => c.volume)) || 1;
    const volumeHeight = mainChartHeight * 0.18;

    candles.forEach((c, idx) => {
      const isGreen = c.close >= c.open;
      const x = idx * stepX + (stepX - candleWidth) / 2;
      const centerX = x + candleWidth / 2;

      // Draw Volume bar
      if (indicators.showVolume) {
        const vH = (c.volume / maxVolume) * volumeHeight;
        const vY = paddingTop + mainChartHeight - vH;
        ctx.fillStyle = isGreen ? 'rgba(34, 197, 94, 0.18)' : 'rgba(239, 68, 68, 0.18)';
        ctx.fillRect(x, vY, candleWidth, vH);
      }

      // Draw Wicks
      ctx.strokeStyle = isGreen ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(centerX, getY(c.high));
      ctx.lineTo(centerX, getY(c.low));
      ctx.stroke();

      // Draw Body
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const topY = Math.min(openY, closeY);
      const bodyH = Math.max(1.5, Math.abs(closeY - openY));

      ctx.fillStyle = isGreen ? '#22c55e' : '#ef4444';
      ctx.fillRect(x, topY, candleWidth, bodyH);
    });

    // Draw active positions lines on chart
    symbolPositions.forEach((pos) => {
      const entryY = getY(pos.entryPrice);
      const isLong = pos.side === 'LONG';
      const posColor = isLong ? '#10b981' : '#f43f5e';

      // Entry Price line
      ctx.save();
      ctx.strokeStyle = posColor;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, entryY);
      ctx.lineTo(chartWidth, entryY);
      ctx.stroke();

      // Position Tag
      ctx.fillStyle = posColor;
      ctx.fillRect(chartWidth + 4, entryY - 9, 65, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${pos.side} ${pos.leverage}x`, chartWidth + 8, entryY + 3);
      ctx.restore();

      // Stop Loss Line
      const activeStop = pos.trailingStopPrice || pos.stopLoss;
      if (activeStop) {
        const slY = getY(activeStop);
        ctx.save();
        ctx.strokeStyle = pos.trailingStopPct ? '#06b6d4' : '#f43f5e';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(0, slY);
        ctx.lineTo(chartWidth, slY);
        ctx.stroke();
        ctx.fillStyle = pos.trailingStopPct ? '#06b6d4' : '#f43f5e';
        ctx.font = '9px monospace';
        ctx.fillText(pos.trailingStopPct ? `Trail SL $${activeStop}` : `SL $${activeStop}`, chartWidth + 8, slY + 3);
        ctx.restore();
      }

      // Take Profit Line
      if (pos.takeProfit) {
        const tpY = getY(pos.takeProfit);
        ctx.save();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(0, tpY);
        ctx.lineTo(chartWidth, tpY);
        ctx.stroke();
        ctx.fillStyle = '#10b981';
        ctx.font = '9px monospace';
        ctx.fillText(`TP $${pos.takeProfit}`, chartWidth + 8, tpY + 3);
        ctx.restore();
      }
    });

    // Current price pulse line
    const lastCandle = candles[candles.length - 1];
    const currentPriceY = getY(lastCandle.close);
    const lastIsUp = lastCandle.close >= lastCandle.open;
    ctx.save();
    ctx.strokeStyle = lastIsUp ? '#10b981' : '#f43f5e';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(0, currentPriceY);
    ctx.lineTo(chartWidth, currentPriceY);
    ctx.stroke();

    // Price badge on axis
    ctx.fillStyle = lastIsUp ? '#10b981' : '#f43f5e';
    ctx.fillRect(chartWidth + 2, currentPriceY - 9, 68, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(lastCandle.close.toFixed(decimals), chartWidth + 6, currentPriceY + 3);
    ctx.restore();

    // Render Sub-panels: RSI & MACD
    let currentPanelTop = paddingTop + mainChartHeight + 10;

    if (indicators.showRSI) {
      // Panel separator
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, currentPanelTop - 5);
      ctx.lineTo(width, currentPanelTop - 5);
      ctx.stroke();

      // RSI Label
      const lastRSI = rsi[rsi.length - 1] || 50;
      ctx.fillStyle = '#818cf8';
      ctx.font = '10px monospace';
      ctx.fillText(`RSI (14): ${lastRSI}`, 12, currentPanelTop + 10);

      // RSI Levels (70 overbought, 30 oversold, 50 midline)
      const rsiY70 = currentPanelTop + subPanelHeight * 0.3;
      const rsiY30 = currentPanelTop + subPanelHeight * 0.7;

      ctx.save();
      ctx.strokeStyle = '#334155';
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(0, rsiY70);
      ctx.lineTo(chartWidth, rsiY70);
      ctx.moveTo(0, rsiY30);
      ctx.lineTo(chartWidth, rsiY30);
      ctx.stroke();
      ctx.restore();

      // RSI Line
      ctx.beginPath();
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1.3;
      let rsiStarted = false;
      for (let i = 0; i < candleCount; i++) {
        const val = rsi[i];
        if (val !== null) {
          const x = i * stepX + stepX / 2;
          const y = currentPanelTop + (1 - val / 100) * (subPanelHeight - 16) + 8;
          if (!rsiStarted) {
            ctx.moveTo(x, y);
            rsiStarted = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();

      currentPanelTop += subPanelHeight + 10;
    }

    if (indicators.showMACD && macd) {
      // MACD Panel
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, currentPanelTop - 5);
      ctx.lineTo(width, currentPanelTop - 5);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px monospace';
      ctx.fillText('MACD (12, 26, 9)', 12, currentPanelTop + 10);

      const panelMidY = currentPanelTop + subPanelHeight / 2;

      // Draw histogram bars
      for (let i = 0; i < candleCount; i++) {
        const h = macd.histogram[i];
        if (h !== null) {
          const x = i * stepX + (stepX - candleWidth) / 2;
          const barH = Math.min(subPanelHeight / 2.2, Math.abs(h) * 4);
          ctx.fillStyle = h >= 0 ? '#10b981' : '#f43f5e';
          if (h >= 0) {
            ctx.fillRect(x, panelMidY - barH, candleWidth, barH);
          } else {
            ctx.fillRect(x, panelMidY, candleWidth, barH);
          }
        }
      }

      // MACD Line
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      let macdStarted = false;
      for (let i = 0; i < candleCount; i++) {
        const val = macd.macdLine[i];
        if (val !== null) {
          const x = i * stepX + stepX / 2;
          const y = panelMidY - val * 3;
          if (!macdStarted) {
            ctx.moveTo(x, y);
            macdStarted = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();

      // Signal Line
      ctx.beginPath();
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 1.2;
      let sigStarted = false;
      for (let i = 0; i < candleCount; i++) {
        const val = macd.signalLine[i];
        if (val !== null) {
          const x = i * stepX + stepX / 2;
          const y = panelMidY - val * 3;
          if (!sigStarted) {
            ctx.moveTo(x, y);
            sigStarted = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
    }

    // Crosshair rendering
    if (mousePos && mousePos.x < chartWidth && mousePos.y < height - paddingBottom) {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(mousePos.x, paddingTop);
      ctx.lineTo(mousePos.x, height - paddingBottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(chartWidth, mousePos.y);
      ctx.stroke();

      // Crosshair Price Tag on Y axis
      if (mousePos.y <= paddingTop + mainChartHeight) {
        const crosshairPrice = getPriceFromY(mousePos.y);
        ctx.fillStyle = '#334155';
        ctx.fillRect(chartWidth + 2, mousePos.y - 8, 68, 16);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(crosshairPrice.toFixed(decimals), chartWidth + 6, mousePos.y + 4);
      }

      ctx.restore();
    }
  }, [candles, indicators, positions, symbol, decimals, mousePos, ema9, ema21, ema50, bb, rsi, macd, symbolPositions, dimensions, isCompact]);

  // Mouse move handler for crosshair & tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    const chartWidth = rect.width - (isCompact ? 58 : 75);
    const stepX = chartWidth / candles.length;
    const candleIndex = Math.min(candles.length - 1, Math.max(0, Math.floor(x / stepX)));
    setHoveredCandle(candles[candleIndex] || null);
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    setHoveredCandle(null);
  };

  const displayCandle = hoveredCandle || candles[candles.length - 1];

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col bg-[#0a0d14] overflow-hidden">
      {/* Top Chart HUD Bar with OHLC values */}
      {displayCandle && (
        <div className={`absolute ${isCompact ? 'top-1 left-2 text-[10px]' : 'top-2 left-3 text-[11px]'} z-20 flex flex-wrap items-center gap-2.5 font-mono pointer-events-none select-none`}>
          <div className="flex items-center gap-1 text-slate-400">
            <span className="text-white font-semibold">{symbol}</span>
            {!isCompact && (
              <>
                <span>·</span>
                <span>{new Date(displayCandle.time).toLocaleTimeString()}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">C:</span>
            <span className={displayCandle.close >= displayCandle.open ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {displayCandle.close.toFixed(decimals)}
            </span>

            {!isCompact && (
              <>
                <span className="text-slate-500">O:</span>
                <span className="text-slate-200">{displayCandle.open.toFixed(decimals)}</span>

                <span className="text-slate-500">H:</span>
                <span className="text-emerald-400">{displayCandle.high.toFixed(decimals)}</span>

                <span className="text-slate-500">L:</span>
                <span className="text-rose-400">{displayCandle.low.toFixed(decimals)}</span>

                <span className="text-slate-500">Vol:</span>
                <span className="text-slate-300">{(displayCandle.volume / 1000).toFixed(0)}k</span>
              </>
            )}
          </div>

          {/* Quick Active Indicators Badges */}
          {!isCompact && (
            <div className="hidden xl:flex items-center gap-2 text-[10px]">
              {indicators.showEMA9 && <span className="text-cyan-400">EMA9</span>}
              {indicators.showEMA21 && <span className="text-amber-400">EMA21</span>}
              {indicators.showEMA50 && <span className="text-purple-400">EMA50</span>}
              {indicators.showBollinger && <span className="text-blue-400">BB(20,2)</span>}
            </div>
          )}

          {/* Active PnL Heatmap Status Pill */}
          {showPnLHeatmap && pnlHeatmapData && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950/85 border border-amber-500/50 text-[10px] shadow-sm font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="text-amber-300 font-bold">
                Avg Entry: ${pnlHeatmapData.avgEntryPrice.toLocaleString(undefined, { minimumFractionDigits: decimals > 2 ? 2 : decimals, maximumFractionDigits: decimals > 2 ? 2 : decimals })}
              </span>
              <span className="text-slate-400 text-[9px]">({pnlHeatmapData.netSide})</span>
              <span className="text-slate-600">•</span>
              <span className={pnlHeatmapData.totalPnL >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {pnlHeatmapData.totalPnL >= 0 ? '+' : ''}${pnlHeatmapData.totalPnL.toFixed(1)} ({pnlHeatmapData.totalPnL >= 0 ? '+' : ''}{pnlHeatmapData.totalPnLPct.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full block cursor-crosshair"
      />
    </div>
  );
};
