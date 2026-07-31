import { Candle } from '../types';

function ema(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((s, v) => s + v, 0) / period;
  result.push(ema);
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
    result.push(ema);
  }
  return result;
}

function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((s, v) => s + v, 0);
    result.push(sum / period);
  }
  return result;
}

function stdDev(data: number[], period: number): number[] {
  const means = sma(data, period);
  const result: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = means[i - period + 1];
    const sqDiff = slice.reduce((s, v) => s + (v - mean) ** 2, 0);
    result.push(Math.sqrt(sqDiff / period));
  }
  return result;
}

function highest(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    result.push(Math.max(...data.slice(i - period + 1, i + 1)));
  }
  return result;
}

function lowest(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    result.push(Math.min(...data.slice(i - period + 1, i + 1)));
  }
  return result;
}

export function calculateRSI(candles: Candle[], period: number = 14): number[] {
  if (candles.length < period + 1) return [];
  const changes: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    changes.push(candles[i].close - candles[i - 1].close);
  }

  const gains: number[] = [];
  const losses: number[] = [];
  for (const change of changes) {
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  const avgGain = sma(gains, period);
  const avgLoss = sma(losses, period);
  const rsi: number[] = [];

  const minLen = Math.min(avgGain.length, avgLoss.length);
  for (let i = 0; i < minLen; i++) {
    if (avgLoss[i] === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain[i] / avgLoss[i];
      rsi.push(100 - 100 / (1 + rs));
    }
  }

  return rsi;
}

export function calculateMACD(candles: Candle[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  const closes = candles.map(c => c.close);
  const fastEMA = ema(closes, fastPeriod);
  const slowEMA = ema(closes, slowPeriod);

  const macdLine: number[] = [];
  const offset = slowPeriod - fastPeriod;
  for (let i = 0; i < Math.min(fastEMA.length, slowEMA.length); i++) {
    macdLine.push(fastEMA[i + offset] - slowEMA[i]);
  }

  const signal = ema(macdLine, signalPeriod);
  const histogram: number[] = [];
  const minLen = Math.min(macdLine.length, signal.length);
  const signalOffset = macdLine.length - signal.length;

  for (let i = 0; i < minLen; i++) {
    histogram.push(macdLine[i + (signalOffset >= 0 ? signalOffset : 0)] - signal[i]);
  }

  return { macdLine, signal, histogram };
}

export function calculateBollingerBands(candles: Candle[], period: number = 20, stdDevMultiplier: number = 2) {
  const closes = candles.map(c => c.close);
  const middle = sma(closes, period);
  const stds = stdDev(closes, period);

  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = 0; i < middle.length; i++) {
    upper.push(middle[i] + stdDevMultiplier * stds[i]);
    lower.push(middle[i] - stdDevMultiplier * stds[i]);
  }

  return { upper, middle, lower };
}

export function calculateMovingAverage(candles: Candle[], period: number): number[] {
  return sma(candles.map(c => c.close), period);
}

export function calculateStochastic(candles: Candle[], period: number = 14, smoothK: number = 3, smoothD: number = 3) {
  const highs = candles.map(c => c.max);
  const lows = candles.map(c => c.min);
  const closes = candles.map(c => c.close);

  const highMax = highest(highs, period);
  const lowMin = lowest(lows, period);

  const rawK: number[] = [];
  const minLen = Math.min(closes.length - period + 1, highMax.length, lowMin.length);
  for (let i = 0; i < minLen; i++) {
    const idx = i + period - 1;
    const diff = highMax[i] - lowMin[i];
    rawK.push(diff > 0 ? ((closes[idx] - lowMin[i]) / diff) * 100 : 50);
  }

  const k = sma(rawK, smoothK);
  const d = sma(k, smoothD);
  return { k, d };
}

export function findSupportResistance(candles: Candle[], lookback: number = 50, threshold: number = 0.005) {
  const highs = candles.slice(-lookback).map(c => c.max);
  const lows = candles.slice(-lookback).map(c => c.min);

  const pivotHighs: number[] = [];
  const pivotLows: number[] = [];

  for (let i = 1; i < highs.length - 1; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) pivotHighs.push(highs[i]);
    if (lows[i] < lows[i - 1] && lows[i] < lows[i + 1]) pivotLows.push(lows[i]);
  }

  const resistance = pivotHighs.length > 0
    ? pivotHighs.reduce((s, v) => s + v, 0) / pivotHighs.length
    : Math.max(...highs);
  const support = pivotLows.length > 0
    ? pivotLows.reduce((s, v) => s + v, 0) / pivotLows.length
    : Math.min(...lows);

  return { support, resistance };
}

export function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length < period + 1) return 0;
  const ranges: number[] = [];
  for (let i = candles.length - period; i < candles.length; i++) {
    const candle = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      candle.max - candle.min,
      Math.abs(candle.max - prev.close),
      Math.abs(candle.min - prev.close)
    );
    ranges.push(tr);
  }
  return ranges.reduce((a, b) => a + b, 0) / ranges.length;
}

export function detectCandlePattern(candles: Candle[]): string[] {
  if (candles.length < 2) return [];
  const patterns: string[] = [];
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const body = Math.abs(last.close - last.open);
  const wick = last.max - Math.max(last.close, last.open);
  const tail = Math.min(last.close, last.open) - last.min;

  if (body > 0 && wick > body * 2 && tail < body * 0.3) patterns.push('shooting_star');
  if (body > 0 && tail > body * 2 && wick < body * 0.3) patterns.push('hammer');
  if (last.close > last.open && prev.close < prev.open && last.open < prev.close && last.close > prev.open) patterns.push('bullish_engulfing');
  if (last.close < last.open && prev.close > prev.open && last.open > prev.close && last.close < prev.open) patterns.push('bearish_engulfing');
  if (body < (last.max - last.min) * 0.1 && body > 0) patterns.push('doji');

  return patterns;
}
