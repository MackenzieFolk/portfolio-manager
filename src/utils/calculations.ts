import { Position, ClosedTrade, PositionMetrics, ClosedTradeMetrics, PerformanceStats, HistogramBucket } from '../types';

const COMMISSION = 9.99;

export function calculatePositionMetrics(
  position: Position,
  totalEquity: number
): PositionMetrics {
  const bookCost = position.entryPrice * position.shares + COMMISSION;
  const riskPerShare = position.type === 'short'
    ? position.stopPrice - position.entryPrice
    : position.entryPrice - position.stopPrice;
  const initialRiskDollar = riskPerShare * position.shares;
  const initialRiskPercent = (initialRiskDollar / bookCost) * 100;
  const riskPercentOfEquity = (initialRiskDollar / totalEquity) * 100;

  // For shorts, profit targets are below entry; for longs, above entry
  const targetDir = position.type === 'short' ? -1 : 1;

  return {
    bookCost,
    initialRiskDollar,
    initialRiskPercent,
    riskPercentOfEquity,
    targets: {
      r2: position.entryPrice + targetDir * riskPerShare * 2,
      r3: position.entryPrice + targetDir * riskPerShare * 3,
      r4: position.entryPrice + targetDir * riskPerShare * 4,
      r5: position.entryPrice + targetDir * riskPerShare * 5,
    },
  };
}

export function calculateClosedTradeMetrics(
  trade: ClosedTrade,
  initialEquity: number
): ClosedTradeMetrics {
  const dir = trade.type === 'short' ? -1 : 1;
  const pnlDollar =
    dir * (trade.exitPrice - trade.entryPrice) * trade.shares - COMMISSION * 2;
  const bookCost = trade.entryPrice * trade.shares + COMMISSION;
  const pnlPercent = (pnlDollar / bookCost) * 100;

  const riskPerShare = trade.type === 'short'
    ? trade.stopPrice - trade.entryPrice
    : trade.entryPrice - trade.stopPrice;
  const rrMultiple = riskPerShare !== 0
    ? dir * (trade.exitPrice - trade.entryPrice) / riskPerShare
    : 0;

  const entryDate = new Date(trade.entryDate);
  const exitDate = new Date(trade.exitDate);
  const daysHeld = Math.floor(
    (exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const returnOnEquityPercent = (pnlDollar / initialEquity) * 100;

  return {
    pnlDollar,
    pnlPercent,
    rrMultiple,
    daysHeld,
    returnOnEquityPercent,
  };
}

export function calculateTotalEquity(positions: Position[], cash: number): number {
  const positionsValue = positions.reduce((sum, pos) => {
    const currentPrice = pos.lastPrice ?? pos.entryPrice;
    if (pos.type === 'short') {
      // Cash was debited by entryPrice*shares when added (same as long).
      // For a short, equity moves inversely to price, so we use
      // (2*entryPrice - currentPrice)*shares to correctly reflect P&L direction.
      return sum + (2 * pos.entryPrice - currentPrice) * pos.shares;
    }
    return sum + currentPrice * pos.shares;
  }, 0);
  return positionsValue + cash;
}

export function calculateDaysHeld(entryDate: string): number {
  const entry = new Date(entryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24)));
}

export function calculateOpenRMultiple(position: Position): number | null {
  if (position.lastPrice == null) return null;
  const riskPerShare = position.type === 'long'
    ? position.entryPrice - position.stopPrice
    : position.stopPrice - position.entryPrice;
  if (riskPerShare === 0) return null;
  const gainPerShare = position.type === 'long'
    ? position.lastPrice - position.entryPrice
    : position.entryPrice - position.lastPrice;
  return gainPerShare / riskPerShare;
}

export function calculatePerformanceStats(trades: ClosedTrade[], initialEquity: number): PerformanceStats {
  const metrics = trades.map(t => calculateClosedTradeMetrics(t, initialEquity));

  const winners = trades.filter((_, i) => metrics[i].rrMultiple > 0);
  const losers = trades.filter((_, i) => metrics[i].rrMultiple <= 0);
  const winnerMetrics = metrics.filter(m => m.rrMultiple > 0);
  const loserMetrics = metrics.filter(m => m.rrMultiple <= 0);

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const winRate = trades.length > 0 ? (winners.length / trades.length) * 100 : 0;
  const avgWinR = avg(winnerMetrics.map(m => m.rrMultiple));
  const avgLossR = avg(loserMetrics.map(m => m.rrMultiple));
  const expectancy = (winRate / 100) * avgWinR + (1 - winRate / 100) * avgLossR;

  return {
    totalTrades: trades.length,
    winCount: winners.length,
    lossCount: losers.length,
    winRate,
    avgWinDollar: avg(winnerMetrics.map(m => m.pnlDollar)),
    avgLossDollar: avg(loserMetrics.map(m => m.pnlDollar)),
    avgWinR,
    avgLossR,
    expectancy,
    avgDaysHeldWinners: avg(winners.map(t => metrics[trades.indexOf(t)].daysHeld)),
    avgDaysHeldLosers: avg(losers.map(t => metrics[trades.indexOf(t)].daysHeld)),
    pnlLong: metrics.filter((_, i) => trades[i].type === 'long').reduce((s, m) => s + m.pnlDollar, 0),
    pnlShort: metrics.filter((_, i) => trades[i].type === 'short').reduce((s, m) => s + m.pnlDollar, 0),
    rMultiples: metrics.map(m => m.rrMultiple),
  };
}

export function buildRHistogram(rMultiples: number[]): HistogramBucket[] {
  const buckets: HistogramBucket[] = [
    { label: '< -2R', min: -Infinity, max: -2, count: 0 },
    { label: '-2R to -1R', min: -2, max: -1, count: 0 },
    { label: '-1R to 0R', min: -1, max: 0, count: 0 },
    { label: '0R to 1R', min: 0, max: 1, count: 0 },
    { label: '1R to 2R', min: 1, max: 2, count: 0 },
    { label: '2R to 3R', min: 2, max: 3, count: 0 },
    { label: '> 3R', min: 3, max: Infinity, count: 0 },
  ];
  for (const r of rMultiples) {
    const bucket = buckets.find(b => r >= b.min && r < b.max);
    if (bucket) bucket.count++;
  }
  return buckets;
}

export function calculateOpenGain(position: Position): { dollar: number; percent: number } | null {
  if (position.lastPrice == null) return null;
  const bookCost = position.entryPrice * position.shares;
  const dollar =
    position.type === 'long'
      ? (position.lastPrice - position.entryPrice) * position.shares
      : (position.entryPrice - position.lastPrice) * position.shares;
  const percent = (dollar / bookCost) * 100;
  return { dollar, percent };
}
