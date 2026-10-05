import { Asset, Candle, Timeframe } from '../types';

export const INITIAL_ASSETS: Asset[] = [
  {
    symbol: 'BTC/USDT',
    name: 'Bitcoin',
    category: 'Crypto',
    price: 68450.5,
    change24h: 3.42,
    high24h: 69200.0,
    low24h: 66180.0,
    volume24h: 38450000000,
    decimals: 2,
    spread: 0.5,
    fundingRate: 0.0102,
    sparkline: [66200, 66800, 66400, 67200, 67900, 68450],
  },
  {
    symbol: 'ETH/USDT',
    name: 'Ethereum',
    category: 'Crypto',
    price: 3520.8,
    change24h: 4.18,
    high24h: 3590.0,
    low24h: 3370.0,
    volume24h: 19800000000,
    decimals: 2,
    spread: 0.2,
    fundingRate: 0.0084,
    sparkline: [3380, 3420, 3400, 3460, 3510, 3520],
  },
  {
    symbol: 'SOL/USDT',
    name: 'Solana',
    category: 'Crypto',
    price: 184.25,
    change24h: 6.85,
    high24h: 189.5,
    low24h: 171.2,
    volume24h: 7420000000,
    decimals: 2,
    spread: 0.05,
    fundingRate: 0.0145,
    sparkline: [172, 175, 178, 181, 180, 184.25],
  },
  {
    symbol: 'XAU/USD',
    name: 'Gold Spot',
    category: 'Commodities',
    price: 2652.4,
    change24h: 0.64,
    high24h: 2665.0,
    low24h: 2638.0,
    volume24h: 41200000000,
    decimals: 2,
    spread: 0.3,
    fundingRate: 0.0012,
    sparkline: [2640, 2645, 2642, 2649, 2650, 2652.4],
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corp',
    category: 'Equities',
    price: 138.8,
    change24h: 2.94,
    high24h: 141.2,
    low24h: 134.5,
    volume24h: 22600000000,
    decimals: 2,
    spread: 0.02,
    fundingRate: 0.0,
    sparkline: [134.5, 136, 135.5, 137.8, 138.2, 138.8],
  },
  {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    category: 'Forex',
    price: 1.0845,
    change24h: -0.18,
    high24h: 1.0885,
    low24h: 1.0820,
    volume24h: 84000000000,
    decimals: 4,
    spread: 0.0001,
    fundingRate: 0.0,
    sparkline: [1.086, 1.087, 1.085, 1.084, 1.085, 1.0845],
  },
];

// Generate realistic starting historical candles
export function generateInitialCandles(basePrice: number, count: number = 80, timeframe: Timeframe = '15m'): Candle[] {
  const candles: Candle[] = [];
  const now = Date.now();
  let intervalMs = 15 * 60 * 1000;
  if (timeframe === '1m') intervalMs = 1 * 60 * 1000;
  else if (timeframe === '5m') intervalMs = 5 * 60 * 1000;
  else if (timeframe === '15m') intervalMs = 15 * 60 * 1000;
  else if (timeframe === '1h') intervalMs = 60 * 60 * 1000;
  else if (timeframe === '1D') intervalMs = 24 * 60 * 60 * 1000;

  let currentClose = basePrice * 0.96;
  const startTime = now - count * intervalMs;

  for (let i = 0; i < count; i++) {
    const time = startTime + i * intervalMs;
    const volatility = basePrice * 0.0045;
    const trendDrift = (basePrice * 0.04) / count;
    const randomChange = (Math.random() - 0.48) * volatility * 2 + trendDrift;

    const open = currentClose;
    const close = Math.max(basePrice * 0.5, open + randomChange);
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    const volume = Math.round(500000 + Math.random() * 2000000);

    candles.push({
      time,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    currentClose = close;
  }

  // Adjust last candle close to match basePrice exactly
  if (candles.length > 0) {
    const last = candles[candles.length - 1];
    last.close = basePrice;
    last.high = Math.max(last.high, basePrice);
    last.low = Math.min(last.low, basePrice);
  }

  return candles;
}

// Calculate Exponential Moving Average
export function calculateEMA(candles: Candle[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];
  let ema: number | null = null;

  for (let i = 0; i < candles.length; i++) {
    const close = candles[i].close;
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      // SMA for initial seed
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += candles[j].close;
      }
      ema = sum / period;
      result.push(Number(ema.toFixed(2)));
    } else {
      if (ema !== null) {
        ema = close * k + ema * (1 - k);
        result.push(Number(ema.toFixed(2)));
      }
    }
  }
  return result;
}

// Calculate Relative Strength Index (RSI 14)
export function calculateRSI(candles: Candle[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  if (candles.length <= period) {
    return candles.map(() => 50);
  }

  const changes: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    changes.push(candles[i].close - candles[i - 1].close);
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    const change = changes[i];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }

  avgGain /= period;
  avgLoss /= period;

  result.push(null); // first candle has no change
  for (let i = 0; i < period - 1; i++) {
    result.push(null);
  }

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = 100 - 100 / (1 + rs);
  result.push(Number(rsi.toFixed(1)));

  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - 100 / (1 + rs);
    result.push(Number(rsi.toFixed(1)));
  }

  return result;
}

// Calculate Bollinger Bands (period 20, multiplier 2)
export function calculateBollingerBands(
  candles: Candle[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { middle: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const middle: (number | null)[] = [];
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      middle.push(null);
      upper.push(null);
      lower.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += candles[j].close;
      }
      const mean = sum / period;

      let varianceSum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        varianceSum += Math.pow(candles[j].close - mean, 2);
      }
      const stdDev = Math.sqrt(varianceSum / period);

      middle.push(Number(mean.toFixed(2)));
      upper.push(Number((mean + stdDev * stdDevMultiplier).toFixed(2)));
      lower.push(Number((mean - stdDev * stdDevMultiplier).toFixed(2)));
    }
  }

  return { middle, upper, lower };
}

// Calculate MACD (12, 26, 9)
export function calculateMACD(
  candles: Candle[]
): { macdLine: (number | null)[]; signalLine: (number | null)[]; histogram: (number | null)[] } {
  const ema12 = calculateEMA(candles, 12);
  const ema26 = calculateEMA(candles, 26);

  const macdLine: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (ema12[i] !== null && ema26[i] !== null) {
      macdLine.push(Number(((ema12[i] as number) - (ema26[i] as number)).toFixed(2)));
    } else {
      macdLine.push(null);
    }
  }

  // Calculate signal line as 9 EMA of MACD
  const validMacdIndices = macdLine.map((val, idx) => (val !== null ? idx : -1)).filter((idx) => idx !== -1);
  const signalLine: (number | null)[] = new Array(candles.length).fill(null);
  const histogram: (number | null)[] = new Array(candles.length).fill(null);

  if (validMacdIndices.length >= 9) {
    const k = 2 / (9 + 1);
    let ema: number | null = null;

    for (let i = 0; i < validMacdIndices.length; i++) {
      const originalIdx = validMacdIndices[i];
      const val = macdLine[originalIdx] as number;

      if (i < 8) {
        signalLine[originalIdx] = null;
      } else if (i === 8) {
        let sum = 0;
        for (let j = 0; j < 9; j++) {
          sum += macdLine[validMacdIndices[j]] as number;
        }
        ema = sum / 9;
        signalLine[originalIdx] = Number(ema.toFixed(2));
        histogram[originalIdx] = Number((val - ema).toFixed(2));
      } else {
        if (ema !== null) {
          ema = val * k + ema * (1 - k);
          signalLine[originalIdx] = Number(ema.toFixed(2));
          histogram[originalIdx] = Number((val - ema).toFixed(2));
        }
      }
    }
  }

  return { macdLine, signalLine, histogram };
}
